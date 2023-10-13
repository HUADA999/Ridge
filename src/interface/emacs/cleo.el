;;; ridge.el --- AI personal assistant for your digital brain -*- lexical-binding: t -*-

;; Copyright (C) 2021-2022 Debanjum Singh Solanky

;; Author: Debanjum Singh Solanky <debanjum@gmail.com>
;; Description: An AI personal assistant for your digital brain
;; Keywords: search, chat, org-mode, outlines, markdown, pdf, image
;; Version: 0.12.3
;; Package-Requires: ((emacs "27.1") (transient "0.3.0") (dash "2.19.1"))
;; URL: https://github.com/ridge-ai/ridge/tree/master/src/interface/emacs

;; This file is NOT part of GNU Emacs.

;;; License:

;; This program is free software; you can redistribute it and/or
;; modify it under the terms of the GNU General Public License
;; as published by the Free Software Foundation; either version 3
;; of the License, or (at your option) any later version.

;; This program is distributed in the hope that it will be useful,
;; but WITHOUT ANY WARRANTY; without even the implied warranty of
;; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
;; GNU General Public License for more details.

;; You should have received a copy of the GNU General Public License
;; along with this program. If not, see <http://www.gnu.org/licenses/>.

;;; Commentary:

;; Create an AI personal assistant for your `org-mode', `markdown' notes,
;; PDFs and images. The assistant exposes 2 modes, search and chat:
;;
;; Chat provides faster answers, iterative discovery and assisted
;; creativity. It requires your OpenAI API key to access GPT models
;;
;; Search allows natural language, incremental and local search.
;; It relies on AI models that run locally on your machine.
;;
;; Quickstart
;; -------------
;; 1. Install ridge.el from MELPA Stable
;;    (use-package ridge :pin melpa-stable :bind ("C-c s" . 'ridge))
;; 2. Start ridge from Emacs
;;    C-c s or M-x ridge
;;
;; See the repository docs for detailed setup and configuration steps.

;;; Code:

(require 'url)
(require 'json)
(require 'transient)
(require 'outline)
(require 'dash)
(require 'org)

(eval-when-compile (require 'subr-x)) ;; for string-trim before Emacs 28.2


;; -------------------------
;; Ridge Static Configuration
;; -------------------------

(defcustom ridge-server-url "http://localhost:42110"
  "Location of Ridge API server."
  :group 'ridge
  :type 'string)

(defcustom ridge-server-is-local t
  "Is Ridge server on local machine?."
  :group 'ridge
  :type 'boolean)

(defcustom ridge-image-width 156
  "Width of rendered images returned by Ridge."
  :group 'ridge
  :type 'integer)

(defcustom ridge-image-height 156
  "Height of rendered images returned by Ridge."
  :group 'ridge
  :type 'integer)

(defcustom ridge-results-count 5
  "Number of results to show in search and use for chat responses."
  :group 'ridge
  :type 'integer)

(defcustom ridge-search-on-idle-time 0.3
  "Idle time (in seconds) to wait before triggering search."
  :group 'ridge
  :type 'number)

(defcustom ridge-server-api-key "secret"
  "API Key to Ridge server."
  :group 'ridge
  :type 'string)

(defcustom ridge-index-interval 3600
  "Interval (in seconds) to wait before updating content index."
  :group 'ridge
  :type 'number)

(defcustom ridge-default-content-type "org"
  "The default content type to perform search on."
  :group 'ridge
  :type '(choice (const "org")
                 (const "markdown")
                 (const "image")
                 (const "pdf")))


;; --------------------------
;; Ridge Dynamic Configuration
;; --------------------------

(defvar ridge--minibuffer-window nil
  "Minibuffer window used to enter query.")

(defconst ridge--query-prompt "🏮 Ridge: "
  "Query prompt shown in the minibuffer.")

(defconst ridge--search-buffer-name "*🏮 Ridge Search*"
  "Name of buffer to show search results from Ridge.")

(defconst ridge--chat-buffer-name "*🏮 Ridge Chat*"
  "Name of chat buffer for Ridge.")

(defvar ridge--content-type "org"
  "The type of content to perform search on.")

(defvar ridge--search-on-idle-timer nil
  "Idle timer to trigger incremental search.")

(defvar ridge--index-timer nil
  "Timer to trigger content indexing.")

(declare-function org-element-property "org-mode" (PROPERTY ELEMENT))
(declare-function org-element-type "org-mode" (ELEMENT))
(declare-function markdown-mode "markdown-mode" ())
(declare-function which-key--show-keymap "which-key" (KEYMAP-NAME KEYMAP &optional PRIOR-ARGS ALL
NO-PAGING FILTER))

(defun ridge--keybindings-info-message ()
  "Show available ridge keybindings in-context, when ridge invoked."
  (let ((enabled-content-types (ridge--get-enabled-content-types)))
    (concat
     "
     Set Content Type
-------------------------\n"
     (when (member 'markdown enabled-content-types)
       "C-x m  | markdown\n")
     (when (member 'org enabled-content-types)
       "C-x o  | org-mode\n")
     (when (member 'image enabled-content-types)
       "C-x i  | image\n")
     (when (member 'pdf enabled-content-types)
       "C-x p  | pdf\n"))))

(defvar ridge--rerank nil "Track when re-rank of results triggered.")
(defvar ridge--reference-count 0 "Track number of references currently in chat bufffer.")
(defun ridge--search-markdown () "Set content-type to `markdown'." (interactive) (setq ridge--content-type "markdown"))
(defun ridge--search-org () "Set content-type to `org-mode'." (interactive) (setq ridge--content-type "org"))
(defun ridge--search-images () "Set content-type to image." (interactive) (setq ridge--content-type "image"))
(defun ridge--search-pdf () "Set content-type to pdf." (interactive) (setq ridge--content-type "pdf"))
(defun ridge--improve-rank () "Use cross-encoder to rerank search results." (interactive) (ridge--incremental-search t))
(defun ridge--make-search-keymap (&optional existing-keymap)
  "Setup keymap to configure Ridge search. Build of EXISTING-KEYMAP when passed."
  (let ((enabled-content-types (ridge--get-enabled-content-types))
        (kmap (or existing-keymap (make-sparse-keymap))))
    (define-key kmap (kbd "C-c RET") #'ridge--improve-rank)
    (when (member 'markdown enabled-content-types)
      (define-key kmap (kbd "C-x m") #'ridge--search-markdown))
    (when (member 'org enabled-content-types)
      (define-key kmap (kbd "C-x o") #'ridge--search-org))
    (when (member 'image enabled-content-types)
      (define-key kmap (kbd "C-x i") #'ridge--search-images))
    (when (member 'pdf enabled-content-types)
      (define-key kmap (kbd "C-x p") #'ridge--search-pdf))
    kmap))

(defvar ridge--keymap nil "Track Ridge keymap in this variable.")
(defun ridge--display-keybinding-info ()
  "Display information on keybindings to customize ridge search.
Use `which-key` if available, else display simple message in echo area"
  (if (fboundp 'which-key-show-full-keymap)
      (let ((ridge--keymap (ridge--make-search-keymap)))
        (which-key--show-keymap (symbol-name 'ridge--keymap)
                                (symbol-value 'ridge--keymap)
                                nil t t))
    (message "%s" (ridge--keybindings-info-message))))


;; ----------------
;; Ridge Setup
;; ----------------
(defcustom ridge-server-command
  (or (executable-find "ridge")
      (executable-find "ridge.exe")
      "ridge")
  "Command to interact with Ridge server."
  :type 'string
  :group 'ridge)

(defcustom ridge-server-args '()
  "Arguments to pass to Ridge server on startup."
  :type '(repeat string)
  :group 'ridge)

(defcustom ridge-server-python-command
  (if (equal system-type 'windows-nt)
      (or (executable-find "py")
          (executable-find "pythonw")
          "python")
    (if (executable-find "python")
        "python"
      ;; Fallback on systems where python is not
      ;; symlinked to python3.
      "python3"))
  "The Python interpreter used for the Ridge server.

Ridge will try to use the system interpreter if it exists. If you wish
to use a specific python interpreter (from a virtual environment
for example), set this to the full interpreter path."
  :type '(choice (const :tag "python" "python")
                 (const :tag "python3" "python3")
                 (const :tag "pythonw (Python on Windows)" "pythonw")
                 (const :tag "py (other Python on Windows)" "py")
                 (string :tag "Other"))
  :safe (lambda (val)
          (member val '("python" "python3" "pythonw" "py")))
  :group 'ridge)

(defcustom ridge-org-files (org-agenda-files t t)
  "List of org-files to index on ridge server."
  :type '(repeat string)
  :group 'ridge)

(defcustom ridge-org-directories nil
  "List of directories with `org-mode' files to index on ridge server."
  :type '(repeat string)
  :group 'ridge)

(defcustom ridge-chat-model "gpt-3.5-turbo"
  "Specify chat model to use for chat with ridge."
  :type 'string
  :group 'ridge)

(defcustom ridge-openai-api-key nil
  "OpenAI API key used to configure chat on ridge server."
  :type 'string
  :group 'ridge)

(defcustom ridge-chat-offline nil
  "Use offline model to chat with ridge."
  :type 'boolean
  :group 'ridge)

(defcustom ridge-auto-setup t
  "Automate install, configure and start of ridge server.
Auto invokes setup steps on calling main entrypoint."
  :type 'string
  :group 'ridge)

(defvar ridge--server-process nil "Track ridge server process.")
(defvar ridge--server-name "*ridge-server*" "Track ridge server buffer.")
(defvar ridge--server-ready? nil "Track if ridge server is ready to receive API calls.")
(defvar ridge--server-configured? t "Track if ridge server is configured to receive API calls.")
(defvar ridge--progressbar '(🌑 🌘 🌗 🌖 🌕 🌔 🌓 🌒) "Track progress via moon phase animations.")

(defun ridge--server-get-version ()
  "Return the ridge server version."
  (with-temp-buffer
    (call-process ridge-server-command nil t nil "--version")
    (goto-char (point-min))
    (re-search-forward "\\([a-z0-9.]+\\)")
    (match-string 1)))

(defun ridge--server-install-upgrade ()
  "Install or upgrade the ridge server."
  (with-temp-buffer
    (message "ridge.el: Installing server...")
    (if (/= (apply #'call-process ridge-server-python-command
                   nil t nil
                   "-m" "pip" "install" "--upgrade"
                   '("ridge-assistant"))
            0)
        (message "ridge.el: Failed to install Ridge server. Please install it manually using pip install `ridge-assistant'.\n%s" (buffer-string))
      (message "ridge.el: Installed and upgraded Ridge server version: %s" (ridge--server-get-version)))))

(defun ridge--server-start ()
  "Start the ridge server."
  (interactive)
  (let* ((url-parts (split-string (cadr (split-string ridge-server-url "://")) ":"))
         (server-host (nth 0 url-parts))
         (server-port (or (nth 1 url-parts) "80"))
         (server-args (append ridge-server-args
                              (list (format "--host=%s" server-host)
                                    (format "--port=%s" server-port)))))
    (message "ridge.el: Starting server at %s %s..." server-host server-port)
    (setq ridge--server-process
          (make-process
           :name ridge--server-name
           :buffer ridge--server-name
           :command (append (list ridge-server-command) server-args)
           :sentinel (lambda (_ event)
                       (message "ridge.el: ridge server stopped with: %s" event)
                       (setq ridge--server-ready? nil))
           :filter (lambda (process msg)
                     (cond ((string-match (format "Uvicorn running on %s" ridge-server-url) msg)
                            (progn
                              (setq ridge--server-ready? t)
                              (ridge--server-configure)))
                           ((string-match "Batches:  " msg)
                            (when (string-match "\\([0-9]+\\.[0-9]+\\|\\([0-9]+\\)\\)%?" msg)
                              (message "ridge.el: %s updating index %s"
                                       (nth (% (string-to-number (match-string 1 msg)) (length ridge--progressbar)) ridge--progressbar)
                                       (match-string 0 msg)))
                            (setq ridge--server-configured? nil))
                           ((and (not ridge--server-configured?)
                                 (string-match "Processor reconfigured via API" msg))
                            (setq ridge--server-configured? t))
                           ((and (not ridge--server-ready?)
                                 (or (string-match "configure.py" msg)
                                     (string-match "main.py" msg)
                                     (string-match "api.py" msg)))
                            (dolist (line (split-string msg "\n"))
                              (when (string-match "  " line)
                                (message "ridge.el: %s" (nth 1 (split-string line "  " t " *")))))))
                     ;; call default process filter to write output to process buffer
                     (internal-default-process-filter process msg))))
    (set-process-query-on-exit-flag ridge--server-process nil)
    (when (not ridge--server-process)
        (message "ridge.el: Failed to start Ridge server. Please start it manually by running `ridge' on terminal.\n%s" (buffer-string)))))

(defun ridge--server-started? ()
  "Check if the ridge server has been started."
  ;; check for when server process handled from within emacs
  (if (and ridge--server-process
           (process-live-p ridge--server-process))
      t
    ;; else general check via ping to ridge-server-url
    (if (ignore-errors
          (url-retrieve-synchronously (format "%s/api/config/data/default" ridge-server-url)))
        ;; Successful ping to non-emacs ridge server indicates it is started and ready.
        ;; So update ready state tracker variable (and implicitly return true for started)
        (setq ridge--server-ready? t)
      nil)))

(defun ridge--server-restart ()
  "Restart the ridge server."
  (interactive)
  (ridge--server-stop)
  (ridge--server-start))

(defun ridge--server-stop ()
  "Stop the ridge server."
  (interactive)
  (when (ridge--server-started?)
    (message "ridge.el: Stopping server...")
    (kill-process ridge--server-process)
    (message "ridge.el: Stopped server.")))

(defun ridge--server-setup ()
  "Install and start the ridge server, if required."
  (interactive)
  ;; Install ridge server, if not available but expected on local machine
  (when (and ridge-server-is-local
             (or (not (executable-find ridge-server-command))
                 (not (ridge--server-get-version))))
      (ridge--server-install-upgrade))
  ;; Start ridge server if not already started
  (when (not (ridge--server-started?))
    (ridge--server-start)))

(defun ridge--get-directory-from-config (config keys &optional level)
  "Extract directory under specified KEYS in CONFIG and trim it to LEVEL.
CONFIG is json obtained from Ridge config API."
  (let ((item config))
    (dolist (key keys)
      (setq item (cdr (assoc key item))))
      (-> item
          (split-string "/")
          (butlast (or level nil))
          (string-join "/"))))

(defun ridge--server-configure ()
  "Configure the Ridge server for search and chat."
  (interactive)
  (let* ((org-directory-regexes (or (mapcar (lambda (dir) (format "%s/**/*.org" dir)) ridge-org-directories) json-null))
         (url-request-method "GET")
         (current-config
          (with-temp-buffer
            (url-insert-file-contents (format "%s/api/config/data" ridge-server-url))
            (ignore-error json-end-of-file (json-parse-buffer :object-type 'alist :array-type 'list :null-object json-null :false-object json-false))))
         (default-config
           (with-temp-buffer
             (url-insert-file-contents (format "%s/api/config/data/default" ridge-server-url))
             (ignore-error json-end-of-file (json-parse-buffer :object-type 'alist :array-type 'list :null-object json-null :false-object json-false))))
         (default-index-dir (ridge--get-directory-from-config default-config '(content-type org embeddings-file)))
         (default-chat-dir (ridge--get-directory-from-config default-config '(processor conversation conversation-logfile)))
         (chat-model (or ridge-chat-model (alist-get 'chat-model (alist-get 'openai (alist-get 'conversation (alist-get 'processor default-config))))))
         (enable-offline-chat (or ridge-chat-offline (alist-get 'enable-offline-chat (alist-get 'conversation (alist-get 'processor default-config)))))
         (config (or current-config default-config)))

    ;; Configure content types
    (cond
     ;; If ridge backend is not configured yet
     ((not current-config)
      (message "ridge.el: Server not configured yet.")
      (setq config (delq (assoc 'content-type config) config))
      (cl-pushnew `(content-type . ((org . ((input-files . ,ridge-org-files)
                                            (input-filter . ,org-directory-regexes)
                                            (compressed-jsonl . ,(format "%s/org.jsonl.gz" default-index-dir))
                                            (embeddings-file . ,(format "%s/org.pt" default-index-dir))
                                            (index-heading-entries . ,json-false)))))
                  config))

     ;; Else if ridge config has no org content config
     ((not (alist-get 'org (alist-get 'content-type config)))
      (message "ridge.el: Org-mode content on server not configured yet.")
     (let ((new-content-type (alist-get 'content-type config)))
        (setq new-content-type (delq (assoc 'org new-content-type) new-content-type))
        (cl-pushnew `(org . ((input-files . ,ridge-org-files)
                             (input-filter . ,org-directory-regexes)
                             (compressed-jsonl . ,(format "%s/org.jsonl.gz" default-index-dir))
                             (embeddings-file . ,(format "%s/org.pt" default-index-dir))
                             (index-heading-entries . ,json-false)))
                    new-content-type)
        (setq config (delq (assoc 'content-type config) config))
        (cl-pushnew `(content-type . ,new-content-type) config)))

     ;; Else if ridge is not configured to index specified org files
     ((not (and (equal (alist-get 'input-files (alist-get 'org (alist-get 'content-type config))) ridge-org-files)
                (equal (alist-get 'input-filter (alist-get 'org (alist-get 'content-type config))) org-directory-regexes)))
      (message "ridge.el: Org-mode content on server is stale.")
      (let* ((index-directory (ridge--get-directory-from-config config '(content-type org embeddings-file)))
             (new-content-type (alist-get 'content-type config)))
        (setq new-content-type (delq (assoc 'org new-content-type) new-content-type))
        (cl-pushnew `(org . ((input-files . ,ridge-org-files)
                             (input-filter . ,org-directory-regexes)
                             (compressed-jsonl . ,(format "%s/org.jsonl.gz" index-directory))
                             (embeddings-file . ,(format "%s/org.pt" index-directory))
                             (index-heading-entries . ,json-false)))
                    new-content-type)
        (setq config (delq (assoc 'content-type config) config))
        (cl-pushnew `(content-type . ,new-content-type) config))))

    ;; Configure processors
    (cond
     ((not ridge-openai-api-key)
      (let* ((processor (assoc 'processor config))
             (conversation (assoc 'conversation processor))
             (openai (assoc 'openai conversation)))
        (when openai
          ;; Unset the `openai' field in the ridge conversation processor config
          (message "ridge.el: Disable Chat using OpenAI as your OpenAI API key got removed from config")
          (setcdr conversation (delq openai (cdr conversation)))
          (push conversation (cdr processor))
          (push processor config))))

     ;; If ridge backend isn't configured yet
     ((not current-config)
      (message "ridge.el: Chat not configured yet.")
      (setq config (delq (assoc 'processor config) config))
      (cl-pushnew `(processor . ((conversation . ((conversation-logfile . ,(format "%s/conversation.json" default-chat-dir))
                                                  (enable-offline-chat . ,enable-offline-chat)
                                                  (openai . ((chat-model . ,chat-model)
                                                             (api-key . ,ridge-openai-api-key)))))))
                  config))

     ;; Else if chat isn't configured in ridge backend
     ((not (alist-get 'conversation (alist-get 'processor config)))
      (message "ridge.el: Chat not configured yet.")
       (let ((new-processor-type (alist-get 'processor config)))
         (setq new-processor-type (delq (assoc 'conversation new-processor-type) new-processor-type))
         (cl-pushnew `(conversation . ((conversation-logfile . ,(format "%s/conversation.json" default-chat-dir))
                                       (enable-offline-chat . ,enable-offline-chat)
                                       (openai . ((chat-model . ,chat-model)
                                                  (api-key . ,ridge-openai-api-key)))))
                     new-processor-type)
        (setq config (delq (assoc 'processor config) config))
        (cl-pushnew `(processor . ,new-processor-type) config)))

     ;; Else if chat configuration in ridge backend has gone stale
     ((not (and (equal (alist-get 'api-key (alist-get 'openai (alist-get 'conversation (alist-get 'processor config)))) ridge-openai-api-key)
                (equal (alist-get 'chat-model (alist-get 'openai (alist-get 'conversation (alist-get 'processor config)))) ridge-chat-model)
                (equal (alist-get 'enable-offline-chat (alist-get 'conversation (alist-get 'processor config))) enable-offline-chat)))
      (message "ridge.el: Chat configuration has gone stale.")
      (let* ((chat-directory (ridge--get-directory-from-config config '(processor conversation conversation-logfile)))
             (new-processor-type (alist-get 'processor config)))
        (setq new-processor-type (delq (assoc 'conversation new-processor-type) new-processor-type))
        (cl-pushnew `(conversation . ((conversation-logfile . ,(format "%s/conversation.json" chat-directory))
                                      (enable-offline-chat . ,enable-offline-chat)
                                      (openai . ((chat-model . ,ridge-chat-model)
                                                 (api-key . ,ridge-openai-api-key)))))
                    new-processor-type)
        (setq config (delq (assoc 'processor config) config))
        (cl-pushnew `(processor . ,new-processor-type) config))))

      ;; Update server with latest configuration, if required
      (cond ((not current-config)
            (ridge--post-new-config config)
            (message "ridge.el: ⚙️ Generated new ridge server configuration."))
           ((not (equal config current-config))
            (ridge--post-new-config config)
            (message "ridge.el: ⚙️ Updated ridge server configuration.")))))

(defun ridge-setup (&optional interact)
  "Install, start and configure Ridge server. Get permission if INTERACT is non-nil."
  (interactive "p")
  ;; Setup ridge server if not running
  (let* ((not-started (not (ridge--server-started?)))
         (permitted (if (and not-started interact)
                        (y-or-n-p "Could not connect to Ridge server. Should I install, start and configure it for you?")
                      t)))
    ;; If user permits setup of ridge server from ridge.el
    (when permitted
      ; Install, start server if server not running
      (when not-started
        (ridge--server-setup))

      ;; Wait until server is ready
      ;; As server can be started but not ready to use/configure
      (while (not ridge--server-ready?)
        (sit-for 0.5))

      ;; Configure server once it's ready
      (ridge--server-configure))))


;; -------------------
;; Ridge Index Content
;; -------------------

(defun ridge--server-index-files (&optional file-paths)
  "Send files to the Ridge server to index for search and chat."
  (interactive)
  (let ((boundary (format "-------------------------%d" (random (expt 10 10))))
        (files-to-index (or file-paths
                            (append (mapcan (lambda (dir) (directory-files-recursively dir "\\.org$")) ridge-org-directories) ridge-org-files))))
    (let* ((url-request-method "POST")
           (url-request-extra-headers `(("content-type" . ,(format "multipart/form-data; boundary=%s" boundary))
                                        ("x-api-key" . ,ridge-server-api-key)))
           ;; add files to index as form data
           (url-request-data (with-temp-buffer
                               (set-buffer-multibyte t)
                               (insert "\n")
                               (dolist (file-to-index files-to-index)
                                 (insert (format "--%s\r\n" boundary))
                                 (insert (format "Content-Disposition: form-data; name=\"files\"; filename=\"%s\"\r\n" file-to-index))
                                 (insert "Content-Type: text/org\r\n\r\n")
                                 (insert (with-temp-buffer
                                           (insert-file-contents-literally file-to-index)
                                           (buffer-string)))
                                 (insert "\r\n"))
                               (insert (format "--%s--\r\n" boundary))
                               (buffer-string))))
      (with-current-buffer
          (url-retrieve (format "%s/api/v1/indexer/batch" ridge-server-url)
                        ;; render response from indexing API endpoint on server
                        (lambda (status)
                          (with-current-buffer (current-buffer)
                            (goto-char url-http-end-of-headers)
                            (message "ridge.el: Update Content Index. Status: %s. response: %s" status (string-trim (buffer-substring-no-properties (point) (point-max))))))
                        nil t t)))))

;; Cancel any running indexing timer
(when ridge--index-timer
    (cancel-timer ridge--index-timer))
;; Send files to index on server every `ridge-index-interval' seconds
(setq ridge--index-timer
      (run-with-timer 60 ridge-index-interval 'ridge--server-index-files))


;; -------------------------------------------
;; Render Response from Ridge server for Emacs
;; -------------------------------------------

(defun ridge--extract-entries-as-markdown (json-response query)
  "Convert JSON-RESPONSE, QUERY from API to markdown entries."
  (thread-last
    json-response
    ;; Extract and render each markdown entry from response
    (mapcar (lambda (json-response-item)
              (thread-last
                ;; Extract markdown entry from each item in json response
                (cdr (assoc 'entry json-response-item))
                ;; Format markdown entry as a string
                (format "%s\n\n")
                ;; Standardize results to 2nd level heading for consistent rendering
                (replace-regexp-in-string "^\#+" "##"))))
    ;; Render entries into markdown formatted string with query set as as top level heading
    (format "# %s\n%s" query)
    ;; remove leading (, ) or SPC from extracted entries string
    (replace-regexp-in-string "^[\(\) ]" "")))

(defun ridge--extract-entries-as-org (json-response query)
  "Convert JSON-RESPONSE, QUERY from API to `org-mode' entries."
  (thread-last
    json-response
    ;; Extract and render each org-mode entry from response
    (mapcar (lambda (json-response-item)
              (thread-last
                ;; Extract org entry from each item in json response
                (cdr (assoc 'entry json-response-item))
                ;; Format org entry as a string
                (format "%s")
                ;; Standardize results to 2nd level heading for consistent rendering
                (replace-regexp-in-string "^\*+" "**"))))
    ;; Render entries into org formatted string with query set as as top level heading
    (format "* %s\n%s\n" query)
    ;; remove leading (, ) or SPC from extracted entries string
    (replace-regexp-in-string "^[\(\) ]" "")))

(defun ridge--extract-entries-as-pdf (json-response query)
  "Convert QUERY, JSON-RESPONSE from API with PDF results to `org-mode' entries."
  (thread-last
    json-response
    ;; Extract and render each pdf entry from response
    (mapcar (lambda (json-response-item)
              (thread-last
                ;; Extract pdf entry from each item in json response
                (cdr (assoc 'compiled (assoc 'additional json-response-item)))
                ;; Format pdf entry as a org entry string
                (format "** %s\n\n"))))
    ;; Render entries into org formatted string with query set as as top level heading
    (format "* %s\n%s\n" query)
    ;; remove leading (, ) or SPC from extracted entries string
    (replace-regexp-in-string "^[\(\) ]" "")))

(defun ridge--extract-entries-as-images (json-response query)
  "Convert JSON-RESPONSE, QUERY from API to html with images."
  (let ((image-results-buffer-html-format-str "<html>\n<body>\n<h1>%s</h1>%s\n\n</body>\n</html>")
        ;; Format string to wrap images into html img, href tags with metadata in headings
        (image-result-html-format-str "\n\n<h2>Score: %s Meta: %s Image: %s</h2>\n\n<a href=\"%s\">\n<img src=\"%s?%s\" width=%s height=%s>\n</a>"))
    (thread-last
      json-response
      ;; Extract each image entry from response and render as html
      (mapcar (lambda (json-response-item)
                (let ((score (cdr (assoc 'score json-response-item)))
                      (metadata_score (cdr (assoc 'metadata_score (assoc 'additional json-response-item))))
                      (image_score (cdr (assoc 'image_score (assoc 'additional json-response-item))))
                      (image_url (concat ridge-server-url (cdr (assoc 'entry json-response-item)))))
                  ;; Wrap images into html img, href tags with metadata in headings
                  (format image-result-html-format-str
                          ;; image scores metadata
                          score metadata_score image_score
                          ;; image url
                          image_url image_url (random 10000)
                          ;; image dimensions
                          ridge-image-width ridge-image-height))))
      ;; Collate entries into single html page string
      (format image-results-buffer-html-format-str query)
      ;; remove leading (, ) or SPC from extracted entries string
      (replace-regexp-in-string "^[\(\) ]" "")
      ;; remove trailing (, ) or SPC from extracted entries string
      (replace-regexp-in-string "[\(\) ]$" ""))))

(defun ridge--extract-entries (json-response query)
  "Convert JSON-RESPONSE, QUERY from API to text entries."
  (thread-last json-response
               ;; extract and render entries from API response
               (mapcar (lambda (json-response-item)
                         (thread-last
                           ;; Extract pdf entry from each item in json response
                           (cdr (assoc 'entry json-response-item))
                           (format "%s\n\n")
                           ;; Standardize results to 2nd level heading for consistent rendering
                           (replace-regexp-in-string "^\*+" "")
                           ;; Standardize results to 2nd level heading for consistent rendering
                           (replace-regexp-in-string "^\#+" "")
                           ;; Format entries as org entry string
                           (format "** %s"))))
               ;; Set query as heading in rendered results buffer
               (format "* %s\n%s\n" query)
               ;; remove leading (, ) or SPC from extracted entries string
               (replace-regexp-in-string "^[\(\) ]" "")
               ;; remove trailing (, ) or SPC from extracted entries string
               (replace-regexp-in-string "[\(\) ]$" "")))

(defun ridge--buffer-name-to-content-type (buffer-name)
  "Infer content type based on BUFFER-NAME."
  (let ((enabled-content-types (ridge--get-enabled-content-types))
        (file-extension (file-name-extension buffer-name)))
    (cond
     ((and (member 'org enabled-content-types) (equal file-extension "org")) "org")
     ((and (member 'pdf enabled-content-types) (equal file-extension "pdf")) "pdf")
     ((and (member 'markdown enabled-content-types) (or (equal file-extension "markdown") (equal file-extension "md"))) "markdown")
     (t ridge-default-content-type))))


;; --------------
;; Query Ridge API
;; --------------

(defun ridge--post-new-config (config)
  "Configure ridge server with provided CONFIG."
  ;; POST provided config to ridge server
  (let ((url-request-method "POST")
        (url-request-extra-headers '(("Content-Type" . "application/json")))
        (url-request-data (encode-coding-string (json-encode-alist config) 'utf-8))
        (config-url (format "%s/api/config/data" ridge-server-url)))
    (with-current-buffer (url-retrieve-synchronously config-url)
      (buffer-string)))
  ;; Update index on ridge server after configuration update
  (let ((ridge--server-ready? nil))
    (url-retrieve (format "%s/api/update?client=emacs" ridge-server-url) #'identity)))

(defun ridge--get-enabled-content-types ()
  "Get content types enabled for search from API."
  (let ((config-url (format "%s/api/config/types" ridge-server-url))
        (url-request-method "GET"))
    (with-temp-buffer
      (url-insert-file-contents config-url)
      (thread-last
        (json-parse-buffer :object-type 'alist)
        (mapcar #'intern)))))

(defun ridge--construct-search-api-query (query content-type &optional rerank)
  "Construct Search API Query.
Use QUERY, CONTENT-TYPE and (optional) RERANK as query params"
  (let ((rerank (or rerank "false"))
        (encoded-query (url-hexify-string query)))
    (format "%s/api/search?q=%s&t=%s&r=%s&n=%s&client=emacs" ridge-server-url encoded-query content-type rerank ridge-results-count)))

(defun ridge--query-search-api-and-render-results (query-url content-type query buffer-name)
  "Query Ridge Search with QUERY-URL.
Render results in BUFFER-NAME using QUERY, CONTENT-TYPE."
  ;; get json response from api
  (with-current-buffer buffer-name
    (let ((inhibit-read-only t)
          (url-request-method "GET"))
      (erase-buffer)
      (url-insert-file-contents query-url)))
  ;; render json response into formatted entries
  (with-current-buffer buffer-name
    (let ((inhibit-read-only t)
          (json-response (json-parse-buffer :object-type 'alist)))
      (erase-buffer)
      (insert
       (cond ((equal content-type "org") (ridge--extract-entries-as-org json-response query))
             ((equal content-type "markdown") (ridge--extract-entries-as-markdown json-response query))
             ((equal content-type "pdf") (ridge--extract-entries-as-pdf json-response query))
             ((equal content-type "image") (ridge--extract-entries-as-images json-response query))
             (t (ridge--extract-entries json-response query))))
      (cond ((or (equal content-type "all")
                 (equal content-type "pdf")
                 (equal content-type "org"))
             (progn (visual-line-mode)
                    (org-mode)
                   (setq-local
                    org-startup-folded "showall"
                    org-hide-leading-stars t
                    org-startup-with-inline-images t)
                   (org-set-startup-visibility)))
            ((equal content-type "markdown") (progn (markdown-mode)
                                                    (visual-line-mode)))
            ((equal content-type "image") (progn (shr-render-region (point-min) (point-max))
                                                (goto-char (point-min))))
            (t (fundamental-mode))))
    (read-only-mode t)))


;; ----------------
;; Ridge Chat
;; ----------------

(defun ridge--chat ()
  "Chat with Ridge."
  (interactive)
  (when (not (get-buffer ridge--chat-buffer-name))
      (ridge--load-chat-history ridge--chat-buffer-name))
  (switch-to-buffer ridge--chat-buffer-name)
  (let ((query (read-string "Query: ")))
    (when (not (string-empty-p query))
      (ridge--query-chat-api-and-render-messages query ridge--chat-buffer-name))))

(defun ridge--load-chat-history (buffer-name)
  "Load Ridge Chat conversation history into BUFFER-NAME."
  (let ((json-response (cdr (assoc 'response (ridge--get-chat-history-api)))))
    (with-current-buffer (get-buffer-create buffer-name)
      (erase-buffer)
      (insert "* Ridge Chat\n")
      (thread-last
        json-response
        ;; generate chat messages from Ridge Chat API response
        (mapcar #'ridge--render-chat-response)
        ;; insert chat messages into Ridge Chat Buffer
        (mapc #'insert))
      (progn
        (org-mode)
        (ridge--add-hover-text-to-footnote-refs (point-min))

        ;; render reference footnotes as superscript
        (setq-local
         org-startup-folded "showall"
         org-hide-leading-stars t
         org-use-sub-superscripts '{}
         org-pretty-entities-include-sub-superscripts t
         org-pretty-entities t)
        (org-set-startup-visibility)

        ;; create ridge chat shortcut keybindings
        (use-local-map (copy-keymap org-mode-map))
        (local-set-key (kbd "m") #'ridge--chat)
        (local-set-key (kbd "C-x m") #'ridge--chat)

        ;; enable minor modes for ridge chat
        (visual-line-mode)
        (read-only-mode t)))))

(defun ridge--add-hover-text-to-footnote-refs (start-pos)
  "Show footnote defs on mouse hover on footnote refs from START-POS."
  (org-with-wide-buffer
   (goto-char start-pos)
   (while (re-search-forward org-footnote-re nil t)
     (backward-char)
     (let* ((context (org-element-context))
            (label (org-element-property :label context))
            (footnote-def (nth 3 (org-footnote-get-definition label)))
            (footnote-width (if (< (length footnote-def) 70) nil 70))
            (begin-pos (org-element-property :begin context))
            (end-pos (org-element-property :end context))
            (overlay (make-overlay begin-pos end-pos)))
       (when (memq (org-element-type context)
                   '(footnote-reference))
         (-->
          footnote-def
          ;; truncate footnote definition if required
          (substring it 0 footnote-width)
          ;; append continuation suffix if truncated
          (concat it (if footnote-width "..." ""))
          ;; show definition on hover on footnote reference
          (overlay-put overlay 'help-echo it)))))))

(defun ridge--query-chat-api-and-render-messages (query buffer-name)
  "Send QUERY to Ridge Chat. Render the chat messages from exchange in BUFFER-NAME."
  ;; render json response into formatted chat messages
  (with-current-buffer (get-buffer buffer-name)
    (let ((inhibit-read-only t)
          (new-content-start-pos (point-max))
          (query-time (format-time-string "%F %T"))
          (json-response (ridge--query-chat-api query)))
      (goto-char new-content-start-pos)
      (insert
       (ridge--render-chat-message query "you" query-time)
       (ridge--render-chat-response json-response))
      (ridge--add-hover-text-to-footnote-refs new-content-start-pos))
    (progn
      (org-set-startup-visibility)
      (visual-line-mode)
      (re-search-backward "^\*+ 🏮" nil t))))

(defun ridge--query-chat-api (query)
  "Send QUERY to Ridge Chat API."
  (let* ((url-request-method "GET")
         (encoded-query (url-hexify-string query))
         (query-url (format "%s/api/chat?q=%s&n=%s&client=emacs" ridge-server-url encoded-query ridge-results-count)))
    (with-temp-buffer
      (condition-case ex
          (progn
            (url-insert-file-contents query-url)
            (json-parse-buffer :object-type 'alist))
        ('file-error (cond ((string-match "Internal server error" (nth 2 ex))
                      (message "Chat processor not configured. Configure OpenAI API key and restart it. Exception: [%s]" ex))
                     (t (message "Chat exception: [%s]" ex))))))))


(defun ridge--get-chat-history-api ()
  "Send QUERY to Ridge Chat History API."
  (let* ((url-request-method "GET")
         (query-url (format "%s/api/chat/history?client=emacs" ridge-server-url)))
    (with-temp-buffer
      (condition-case ex
          (progn
            (url-insert-file-contents query-url)
            (json-parse-buffer :object-type 'alist))
        ('file-error (cond ((string-match "Internal server error" (nth 2 ex))
                      (message "Chat processor not configured. Configure OpenAI API key and restart it. Exception: [%s]" ex))
                     (t (message "Chat exception: [%s]" ex))))))))


(defun ridge--render-chat-message (message sender &optional receive-date)
  "Render chat messages as `org-mode' list item.
MESSAGE is the text of the chat message.
SENDER is the message sender.
RECEIVE-DATE is the message receive date."
  (let ((first-message-line (car (split-string message "\n" t)))
        (rest-message-lines (string-join (cdr (split-string message "\n" t)) "\n"))
        (heading-level (if (equal sender "you") "**" "***"))
        (emojified-sender (if (equal sender "you") "🤔 *You*" "🏮 *Ridge*"))
        (suffix-newlines (if (equal sender "ridge") "\n\n" ""))
        (received (or receive-date (format-time-string "%F %T"))))
    (format "%s %s: %s\n   :PROPERTIES:\n   :RECEIVED: [%s]\n   :END:\n%s\n%s"
            heading-level
            emojified-sender
            first-message-line
            received
            rest-message-lines
            suffix-newlines)))

(defun ridge--generate-reference (reference)
  "Create `org-mode' footnotes with REFERENCE."
  (setq ridge--reference-count (1+ ridge--reference-count))
  (cons
   (propertize (format "^{ [fn:%x]}" ridge--reference-count) 'help-echo reference)
   (thread-last
     reference
     ;; remove filename top heading line from reference
     ;; prevents actual reference heading in next line jumping out of references footnote section
     (replace-regexp-in-string "^\* .*\n" "")
     ;; remove multiple, consecutive empty lines from reference
     (replace-regexp-in-string "\n\n" "\n")
     (format "\n[fn:%x] %s" ridge--reference-count))))

(defun ridge--render-chat-response (json-response)
  "Render chat message using JSON-RESPONSE from Ridge Chat API."
  (let* ((message (cdr (or (assoc 'response json-response) (assoc 'message json-response))))
         (sender (cdr (assoc 'by json-response)))
         (receive-date (cdr (assoc 'created json-response)))
         (references (or (cdr (assoc 'context json-response)) '()))
         (footnotes (mapcar #'ridge--generate-reference references))
         (footnote-links (mapcar #'car footnotes))
         (footnote-defs (mapcar #'cdr footnotes)))
    (thread-first
      ;; concatenate ridge message and references from API
      (concat
       message
       ;; append reference links to ridge message
       (string-join footnote-links "")
       ;; append reference sub-section to ridge message and fold it
       (if footnote-defs "\n**** References\n:PROPERTIES:\n:VISIBILITY: folded\n:END:" "")
       ;; append reference definitions to references subsection
       (string-join footnote-defs " "))
      ;; Render chat message using data obtained from API
      (ridge--render-chat-message sender receive-date))))


;; ------------------
;; Incremental Search
;; ------------------

(defun ridge--incremental-search (&optional rerank)
  "Perform Incremental Search on Ridge. Allow optional RERANK of results."
  (let* ((rerank-str (cond (rerank "true") (t "false")))
         (ridge-buffer-name (get-buffer-create ridge--search-buffer-name))
         (query (minibuffer-contents-no-properties))
         (query-url (ridge--construct-search-api-query query ridge--content-type rerank-str)))
    ;; Query ridge API only when user in ridge minibuffer and non-empty query
    ;; Prevents querying if
    ;;   1. user hasn't started typing query
    ;;   2. during recursive edits
    ;;   3. with contents of other buffers user may jump to
    ;;   4. search not triggered right after rerank
    ;;      ignore to not overwrite reranked results before the user even sees them
    (if ridge--rerank
        (setq ridge--rerank nil)
      (when
          (and
           (not (equal query ""))
           (active-minibuffer-window)
           (equal (current-buffer) ridge--minibuffer-window))
      (progn
        (when rerank
          (setq ridge--rerank t)
          (message "ridge.el: Rerank Results"))
        (ridge--query-search-api-and-render-results
         query-url
         ridge--content-type
         query
         ridge-buffer-name))))))

(defun ridge--delete-open-network-connections-to-server ()
  "Delete all network connections to ridge server."
  (dolist (proc (process-list))
    (let ((proc-buf (buffer-name (process-buffer proc)))
          (ridge-network-proc-buf (string-join (split-string ridge-server-url "://") " ")))
      (when (string-match (format "%s" ridge-network-proc-buf) proc-buf)
        (delete-process proc)))))

(defun ridge--teardown-incremental-search ()
  "Teardown hooks used for incremental search."
  (message "ridge.el: Teardown Incremental Search")
  ;; unset ridge minibuffer window
  (setq ridge--minibuffer-window nil)
  (when (and ridge--search-on-idle-timer
             (timerp ridge--search-on-idle-timer))
    (cancel-timer ridge--search-on-idle-timer))
  ;; delete open connections to ridge server
  (ridge--delete-open-network-connections-to-server)
  ;; remove hooks for ridge incremental query and self
  (remove-hook 'post-command-hook #'ridge--incremental-search)
  (remove-hook 'minibuffer-exit-hook #'ridge--teardown-incremental-search))

(defun ridge-incremental ()
  "Natural, Incremental Search for your personal notes and documents."
  (interactive)
  (let* ((ridge-buffer-name (get-buffer-create ridge--search-buffer-name)))
    ;; switch to ridge results buffer
    (switch-to-buffer ridge-buffer-name)
    ;; open and setup minibuffer for incremental search
    (minibuffer-with-setup-hook
        (lambda ()
          ;; Add ridge keybindings for configuring search to minibuffer keybindings
          (ridge--make-search-keymap minibuffer-local-map)
          ;; Display information on keybindings to customize ridge search
          (ridge--display-keybinding-info)
          ;; set current (mini-)buffer entered as ridge minibuffer
          ;; used to query ridge API only when user in ridge minibuffer
          (setq ridge--minibuffer-window (current-buffer))
          ; do ridge incremental search after idle time
          (setq ridge--search-on-idle-timer (run-with-idle-timer ridge-search-on-idle-time t #'ridge--incremental-search))
          ; teardown ridge incremental search on minibuffer exit
          (add-hook 'minibuffer-exit-hook #'ridge--teardown-incremental-search))
      (read-string ridge--query-prompt))))


;; --------------
;; Similar Search
;; --------------

(defun ridge--get-current-outline-entry-text ()
  "Get text under current outline section."
  (string-trim
   ;; get text of current outline entry
   (cond
    ;; when at heading of entry
    ((looking-at outline-regexp)
     (buffer-substring-no-properties
      (point)
      (save-excursion (outline-next-heading) (point))))
    ;; when within entry
    (t (buffer-substring-no-properties
        (save-excursion (outline-previous-heading) (point))
        (save-excursion (outline-next-heading) (point)))))))

(defun ridge--get-current-paragraph-text ()
  "Get trimmed text in current paragraph at point.
Paragraph only starts at first text after blank line."
  (string-trim
   (cond
    ;; when at end of a middle paragraph
    ((and (looking-at paragraph-start) (not (equal (point) (point-min))))
     (buffer-substring-no-properties
      (save-excursion (backward-paragraph) (point))
      (point)))
    ;; else
    (t (thing-at-point 'paragraph t)))))


(defun ridge--find-similar (&optional content-type)
  "Find items of CONTENT-TYPE in ridge index similar to text surrounding point."
  (interactive)
  (let* ((rerank "true")
         ;; set content type to: specified > based on current buffer > default type
         (content-type (or content-type (ridge--buffer-name-to-content-type (buffer-name))))
         ;; get text surrounding current point based on the major mode context
         (query (cond
                 ;; get section outline derived mode like org or markdown
                 ((or (derived-mode-p 'outline-mode) (equal major-mode 'markdown-mode))
                  (ridge--get-current-outline-entry-text))
                 ;; get paragraph, if in text mode
                 (t
                  (ridge--get-current-paragraph-text))))
         (query-url (ridge--construct-search-api-query query content-type rerank))
         ;; extract heading to show in result buffer from query
         (query-title
          (format "Similar to: %s"
                  (replace-regexp-in-string "^[#\\*]* " "" (car (split-string query "\n")))))
         (buffer-name (get-buffer-create ridge--search-buffer-name)))
    (progn
      (ridge--query-search-api-and-render-results
       query-url
       content-type
       query-title
       buffer-name)
      (switch-to-buffer buffer-name)
      (goto-char (point-min)))))


;; ---------
;; Ridge Menu
;; ---------

(transient-define-argument ridge--content-type-switch ()
  :class 'transient-switches
  :argument-format "--content-type=%s"
  :argument-regexp ".+"
  ;; set content type to: last used > based on current buffer > default type
  :init-value (lambda (obj) (oset obj value (format "--content-type=%s" (or ridge--content-type (ridge--buffer-name-to-content-type (buffer-name))))))
  ;; dynamically set choices to content types enabled on ridge backend
  :choices (or (ignore-errors (mapcar #'symbol-name (ridge--get-enabled-content-types))) '("all" "org" "markdown" "pdf" "image")))

(transient-define-suffix ridge--search-command (&optional args)
  (interactive (list (transient-args transient-current-command)))
    (progn
      ;; set content type to: specified > last used > based on current buffer > default type
      (setq ridge--content-type (or (transient-arg-value "--content-type=" args) (ridge--buffer-name-to-content-type (buffer-name))))
      ;; set results count to: specified > last used > to default
      (setq ridge-results-count (or (transient-arg-value "--results-count=" args) ridge-results-count))
      ;; trigger incremental search
      (call-interactively #'ridge-incremental)))

(transient-define-suffix ridge--find-similar-command (&optional args)
  "Find items similar to current item at point."
  (interactive (list (transient-args transient-current-command)))
    (progn
      ;; set content type to: specified > last used > based on current buffer > default type
      (setq ridge--content-type (or (transient-arg-value "--content-type=" args) (ridge--buffer-name-to-content-type (buffer-name))))
      ;; set results count to: specified > last used > to default
      (setq ridge-results-count (or (transient-arg-value "--results-count=" args) ridge-results-count))
      (ridge--find-similar ridge--content-type)))

(transient-define-suffix ridge--update-command (&optional args)
  "Call ridge API to update index of specified content type."
  (interactive (list (transient-args transient-current-command)))
  (let* ((force-update (if (member "--force-update" args) "true" "false"))
         ;; set content type to: specified > last used > based on current buffer > default type
         (content-type (or (transient-arg-value "--content-type=" args) (ridge--buffer-name-to-content-type (buffer-name))))
         (type-query (if (equal content-type "all") "" (format "t=%s" content-type)))
         (update-url (format "%s/api/update?%s&force=%s&client=emacs" ridge-server-url type-query force-update))
         (url-request-method "GET"))
    (progn
      (setq ridge--content-type content-type)
      (url-retrieve update-url (lambda (_) (message "ridge.el: %s index %supdated!" content-type (if (member "--force-update" args) "force " "")))))))

(transient-define-suffix ridge--chat-command (&optional _)
  "Command to Chat with Ridge."
  (interactive (list (transient-args transient-current-command)))
  (ridge--chat))

(transient-define-prefix ridge--menu ()
  "Create Ridge Menu to Configure and Execute Commands."
  [["Configure Search"
    ("n" "Results Count" "--results-count=" :init-value (lambda (obj) (oset obj value (format "%s" ridge-results-count))))
    ("t" "Content Type" ridge--content-type-switch)]
   ["Configure Update"
    ("-f" "Force Update" "--force-update")]]
  [["Act"
    ("c" "Chat" ridge--chat-command)
    ("s" "Search" ridge--search-command)
    ("f" "Find Similar" ridge--find-similar-command)
    ("u" "Update" ridge--update-command)
    ("q" "Quit" transient-quit-one)]])


;; ----------
;; Entrypoint
;; ----------

;;;###autoload
(defun ridge ()
  "Provide natural, search assistance for your notes, documents and images."
  (interactive)
  (when ridge-auto-setup
    (ridge-setup t))
  (ridge--menu))

(provide 'ridge)

;;; ridge.el ends here
