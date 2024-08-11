;;; ridge.el --- Your Second Brain -*- lexical-binding: t -*-

;; Copyright (C) 2021-2023 Ridge Inc.

;; Author: Debanjum Singh Solanky <debanjum@ridge.dev>
;;         Saba Imran <saba@ridge.dev>
;; Description: Your Second Brain
;; Keywords: search, chat, ai, org-mode, outlines, markdown, pdf, image
;; Version: 1.20.4
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

;; Bootstrap your Second Brain from your `org-mode', `markdown' notes,
;; PDFs and images. Ridge exposes 2 modes, search and chat:
;;
;; Chat provides faster answers, iterative discovery and assisted
;; creativity.
;;
;; Search allows natural language, incremental search.
;;
;; Quickstart
;; -------------
;; 1. Install ridge.el from MELPA Stable
;;    (use-package ridge :pin melpa-stable :bind ("C-c s" . 'ridge))
;; 2. Set API key from https://app.ridge.dev/settings#clients (if not self-hosting)
;;    (setq ridge-api-key "YOUR_RIDGE_API_KEY")
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

(defcustom ridge-server-url "https://app.ridge.dev"
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

(defcustom ridge-results-count 8
  "Number of results to show in search and use for chat responses."
  :group 'ridge
  :type 'integer)

(defcustom ridge-search-on-idle-time 0.3
  "Idle time (in seconds) to wait before triggering search."
  :group 'ridge
  :type 'number)

(defcustom ridge-auto-find-similar t
  "Should try find similar notes automatically."
  :group 'ridge
  :type 'boolean)

(defcustom ridge-api-key nil
  "API Key to your Ridge. Default at https://app.ridge.dev/settings#clients."
  :group 'ridge
  :type 'string)

(defcustom ridge-auto-index t
  "Should content be automatically re-indexed every `ridge-index-interval' seconds."
  :group 'ridge
  :type 'boolean)

(defcustom ridge-index-interval 3600
  "Interval (in seconds) to wait before updating content index."
  :group 'ridge
  :type 'number)

(defcustom ridge-index-files-batch 30
  "Number of files to send for indexing in each request."
  :group 'ridge
  :type 'number)

(defcustom ridge-default-content-type "all"
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

(defvar ridge--indexed-files '()
  "Files that were indexed in previous content indexing run.")

(declare-function org-element-property "org-mode" (PROPERTY ELEMENT))
(declare-function org-element-type "org-mode" (ELEMENT))
(declare-function markdown-mode "markdown-mode" ())
(declare-function which-key--show-keymap "which-key" (KEYMAP-NAME KEYMAP &optional PRIOR-ARGS ALL
NO-PAGING FILTER))

(defun ridge--keybindings-info-message ()
  "Show available ridge keybindings in-context, when ridge invoked."
  (concat
   "
     Set Content Type
-------------------------\n"
   "C-c RET | improve sort \n"))

(defvar ridge--rerank nil "Track when re-rank of results triggered.")
(defvar ridge--reference-count 0 "Track number of references currently in chat bufffer.")
(defun ridge--improve-sort () "Use cross-encoder to improve sorting of search results." (interactive) (ridge--incremental-search t))
(defun ridge--make-search-keymap (&optional existing-keymap)
  "Setup keymap to configure Ridge search. Build of EXISTING-KEYMAP when passed."
  (let ((kmap (or existing-keymap (make-sparse-keymap))))
    (define-key kmap (kbd "C-c RET") #'ridge--improve-sort)
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

(defvar ridge--last-heading-pos nil
  "The last heading position point was in.")


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

(defcustom ridge-org-files nil
  "List of org-files to index on ridge server."
  :type '(repeat string)
  :group 'ridge)

(defcustom ridge-org-directories nil
  "List of directories with `org-mode' files to index on ridge server."
  :type '(repeat string)
  :group 'ridge)

(make-obsolete-variable 'ridge-org-directories 'ridge-index-directories "1.2.0" 'set)
(make-obsolete-variable 'ridge-org-files 'ridge-index-files "1.2.0" 'set)

(defcustom ridge-index-files (org-agenda-files t t)
  "List of org, md, text, pdf to index on ridge server."
  :type '(repeat string)
  :group 'ridge)

(defcustom ridge-index-directories nil
  "List of directories with org, md, text, pdf to index on ridge server."
  :type '(repeat string)
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
                   '("ridge"))
            0)
        (message "ridge.el: Failed to install Ridge server. Please install it manually using pip install `ridge'.\n%s" (buffer-string))
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
                              (setq ridge--server-ready? t)))
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
          (url-retrieve-synchronously (format "%s/api/health" ridge-server-url)))
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

(defun ridge-setup (&optional interact)
  "Install and start Ridge server. Get permission if INTERACT is non-nil."
  (interactive "p")
  ;; Setup ridge server if not running
  (let* ((not-started (not (ridge--server-started?)))
         (permitted (if (and not-started interact)
                        (y-or-n-p "Could not connect to Ridge server. Should I install, start it for you?")
                      t)))
    ;; If user permits setup of ridge server from ridge.el
    (when permitted
      ; Install, start server if server not running
      (when not-started
        (ridge--server-setup))

      ;; Wait until server is ready
      ;; As server can be started but not ready to use
      (while (not ridge--server-ready?)
        (sit-for 0.5)))))


;; -------------------
;; Ridge Index Content
;; -------------------

(defun ridge--server-index-files (&optional force content-type file-paths)
  "Send files at `FILE-PATHS' to the Ridge server to index for search and chat.
`FORCE' re-indexes all files of `CONTENT-TYPE' even if they are already indexed."
  (interactive)
  (let* ((boundary (format "-------------------------%d" (random (expt 10 10))))
         ;; Use `ridge-index-directories', `ridge-index-files' when set, else fallback to `ridge-org-directories', `ridge-org-files'
         ;; This is a temporary change. `ridge-org-directories', `ridge-org-files' are deprecated. They will be removed in a future release
         (content-directories (or ridge-index-directories ridge-org-directories))
         (content-files (or ridge-index-files ridge-org-files))
         (files-to-index (mapcar
                          #'expand-file-name
                          (or file-paths
                              (append (mapcan (lambda (dir) (directory-files-recursively dir "\\.\\(org\\|md\\|markdown\\|pdf\\|txt\\|rst\\|xml\\|htm\\|html\\)$")) content-directories) content-files))))
         (type-query (if (or (equal content-type "all") (not content-type)) "" (format "t=%s" content-type)))
         (delete-files (-difference ridge--indexed-files files-to-index))
         (inhibit-message t)
         (message-log-max nil)
         (batch-size ridge-index-files-batch))
    (dolist (files (-partition-all batch-size files-to-index))
      (ridge--send-index-update-request (ridge--render-update-files-as-request-body files boundary) boundary content-type type-query force))
    (when delete-files
        (ridge--send-index-update-request (ridge--render-delete-files-as-request-body delete-files boundary) boundary content-type type-query force))
    (setq ridge--indexed-files files-to-index)))

(defun ridge--send-index-update-request (body boundary &optional content-type type-query force)
  "Send multi-part form `BODY' of `CONTENT-TYPE' in request to ridge server.
Append 'TYPE-QUERY' as query parameter in request url.
Specify `BOUNDARY' used to separate files in request header."
  (let ((url-request-method ((if force) "PUT" "PATCH"))
        (url-request-data body)
          (url-request-extra-headers `(("content-type" . ,(format "multipart/form-data; boundary=%s" boundary))
                                       ("Authorization" . ,(format "Bearer %s" ridge-api-key)))))
      (with-current-buffer
          (url-retrieve (format "%s/api/content?%s&client=emacs" ridge-server-url type-query)
                        ;; render response from indexing API endpoint on server
                        (lambda (status)
                          (if (not (plist-get status :error))
                              (message "ridge.el: %scontent index %supdated" (if content-type (format "%s " content-type) "all ") (if force "force " ""))
                            (progn
                              (ridge--delete-open-network-connections-to-server)
                              (with-current-buffer (current-buffer)
                                (search-forward "\n\n" nil t)
                                (message "ridge.el: Failed to %supdate %scontent index. Status: %s%s"
                                         (if force "force " "")
                                         (if content-type (format "%s " content-type) "all")
                                         (string-trim (format "%s %s" (nth 1 (nth 1 status)) (nth 2 (nth 1 status))))
                                         (if (> (- (point-max) (point)) 0) (format ". Response: %s" (string-trim (buffer-substring-no-properties (point) (point-max)))) ""))))))
                        nil t t))))

(defun ridge--render-update-files-as-request-body (files-to-index boundary)
  "Render `FILES-TO-INDEX', `PREVIOUSLY-INDEXED-FILES' as multi-part form body.
Use `BOUNDARY' to separate files. This is sent to Ridge server as a POST request."
  (with-temp-buffer
    (set-buffer-multibyte nil)
    (insert "\n")
    (dolist (file-to-index files-to-index)
      ;; find file content-type. Choose from org, markdown, pdf, plaintext
      (let ((content-type (ridge--filename-to-mime-type file-to-index))
            (file-name (encode-coding-string  file-to-index 'utf-8)))
      (insert (format "--%s\r\n" boundary))
      (insert (format "Content-Disposition: form-data; name=\"files\"; filename=\"%s\"\r\n" file-name))
      (insert (format "Content-Type: %s\r\n\r\n" content-type))
      (insert (with-temp-buffer
                (insert-file-contents-literally file-to-index)
                (buffer-string)))
      (insert "\r\n")))
    (insert (format "--%s--\r\n" boundary))
    (buffer-string)))

(defun ridge--render-delete-files-as-request-body (delete-files boundary)
  "Render `DELETE-FILES' as multi-part form body.
Use `BOUNDARY' to separate files. This is sent to Ridge server as a POST request."
  (with-temp-buffer
    (set-buffer-multibyte nil)
    (insert "\n")
    (dolist (file-to-index delete-files)
      (let ((content-type (ridge--filename-to-mime-type file-to-index))
            (file-name (encode-coding-string  file-to-index 'utf-8)))
          (insert (format "--%s\r\n" boundary))
          (insert (format "Content-Disposition: form-data; name=\"files\"; filename=\"%s\"\r\n" file-name))
          (insert (format "Content-Type: %s\r\n\r\n" content-type))
          (insert "")
          (insert "\r\n")))
    (insert (format "--%s--\r\n" boundary))
    (buffer-string)))

(defun ridge--filename-to-mime-type (file-name)
  "`FILE-NAME' to mimeType."
  (cond ((string-match "\\.org$" file-name) "text/org")
        ((string-match "\\.\\(md\\|markdown\\)$" file-name) "text/markdown")
        ((string-match "\\.pdf$" file-name) "application/pdf")
        (t "text/plain")))

;; Cancel any running indexing timer, first
(when ridge--index-timer
    (cancel-timer ridge--index-timer))
;; Send files to index on server every `ridge-index-interval' seconds
(when ridge-auto-index
  (setq ridge--index-timer
        (run-with-timer 60 ridge-index-interval 'ridge--server-index-files)))


;; -------------------------------------------
;; Render Response from Ridge server for Emacs
;; -------------------------------------------
(defun ridge--construct-find-similar-title (query)
  "Construct title for find-similar QUERY."
  (format "Similar to: %s"
          (replace-regexp-in-string "^[#\\*]* " "" (car (split-string query "\n")))))

(defun ridge--extract-entries-as-markdown (json-response query is-find-similar)
  "Convert JSON-RESPONSE, QUERY from API to markdown entries.
Use IS-FIND-SIMILAR bool to filter out first result.
As first result is the current entry at point."
  (thread-last
    json-response
    ;; filter our first result if is find similar as it'll be the current entry at point
    ((lambda (response) (if is-find-similar (seq-drop response 1) response)))
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
    (format "# %s\n%s" (if is-find-similar (ridge--construct-find-similar-title query) query))
    ;; remove leading (, ) or SPC from extracted entries string
    (replace-regexp-in-string "^[\(\) ]" "")))

(defun ridge--extract-entries-as-org (json-response query is-find-similar)
  "Convert JSON-RESPONSE, QUERY from API to `org-mode' entries.
Use IS-FIND-SIMILAR bool to filter out first result.
As first result is the current entry at point."
  (thread-last
    json-response
    ;; filter our first result if is find similar as it'll be the current entry at point
    ((lambda (response) (if is-find-similar (seq-drop response 1) response)))
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
    (format "* %s\n%s\n" (if is-find-similar (ridge--construct-find-similar-title query) query))
    ;; remove leading (, ) or SPC from extracted entries string
    (replace-regexp-in-string "^[\(\) ]" "")))

(defun ridge--extract-entries-as-pdf (json-response query is-find-similar)
  "Convert JSON-RESPONSE, QUERY from API to PDF entries.
Use IS-FIND-SIMILAR bool to filter out first result.
As first result is the current entry at point."
  (thread-last
    json-response
    ;; filter our first result if is find similar as it'll be the current entry at point
    ((lambda (response) (if is-find-similar (seq-drop response 1) response)))
    ;; Extract and render each pdf entry from response
    (mapcar (lambda (json-response-item)
              (thread-last
                ;; Extract pdf entry from each item in json response
                (cdr (assoc 'compiled (assoc 'additional json-response-item)))
                ;; Format pdf entry as a org entry string
                (format "** %s\n\n"))))
    ;; Render entries into org formatted string with query set as as top level heading
    (format "* %s\n%s\n" (if is-find-similar (ridge--construct-find-similar-title query) query))
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

(defun ridge--extract-entries (json-response query is-find-similar)
  "Convert JSON-RESPONSE, QUERY from API to text entries.
Use IS-FIND-SIMILAR bool to filter out first result.
As first result is the current entry at point."
  (thread-last json-response
               ;; filter our first result if is find similar as it'll be the current entry at point
               ((lambda (response) (if is-find-similar (seq-drop response 1) response)))
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
               (format "* %s\n%s\n" (if is-find-similar (ridge--construct-find-similar-title query) query))
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


(defun ridge--org-cycle-content (&optional arg)
  "Show all headlines in the buffer, like a table of contents.
With numerical argument ARG, show content up to level ARG.

Simplified fork of `org-cycle-content' from Emacs 29.1 to work with >=27.1."
  (interactive "p")
  (save-excursion
    (goto-char (point-max))
    (let ((regexp (if (and (wholenump arg) (> arg 0))
                      (format "^\\*\\{1,%d\\} " arg)
                    "^\\*+ "))
          (last (point)))
      (while (re-search-backward regexp nil t)
        (org-fold-region (line-end-position) last t 'outline)
        (setq last (line-end-position 0))))))


;; --------------
;; Query Ridge API
;; --------------
(defun ridge--call-api (path &optional method params callback &rest cbargs)
  "Sync call API at PATH with METHOD and query PARAMS as kv assoc list.
Optionally apply CALLBACK with JSON parsed response and CBARGS."
  (let* ((url-request-method (or method "GET"))
         (url-request-extra-headers `(("Authorization" . ,(format "Bearer %s" ridge-api-key))))
         (param-string (if params (url-build-query-string params) ""))
         (query-url (format "%s%s?%s&client=emacs" ridge-server-url path param-string))
         (cbargs (if (and (listp cbargs) (listp (car cbargs))) (car cbargs) cbargs))) ; normalize cbargs to (a b) from ((a b)) if required
    (with-temp-buffer
      (condition-case ex
          (progn
            (url-insert-file-contents query-url)
            (if (and callback cbargs)
                (apply callback (json-parse-buffer :object-type 'alist) cbargs)
              (if callback
                  (funcall callback (json-parse-buffer :object-type 'alist))
            (json-parse-buffer :object-type 'alist))))
        ('file-error (message "Chat exception: [%s]" ex))))))

(defun ridge--call-api-async (path &optional method params callback &rest cbargs)
  "Async call to API at PATH with METHOD and query PARAMS as kv assoc list.
Optionally apply CALLBACK with JSON parsed response and CBARGS."
  (let* ((url-request-method (or method "GET"))
         (url-request-extra-headers `(("Authorization" . ,(format "Bearer %s" ridge-api-key))))
         (param-string (if params (url-build-query-string params) ""))
         (cbargs (if (and (listp cbargs) (listp (car cbargs))) (car cbargs) cbargs)) ; normalize cbargs to (a b) from ((a b)) if required
         (query-url (format "%s%s?%s&client=emacs" ridge-server-url path param-string)))
    (url-retrieve query-url
                  (lambda (status)
                    (if (plist-get status :error)
                        (message "Chat exception: [%s]" (plist-get status :error))
                      (goto-char (point-min))
                      (re-search-forward "^$")
                      (delete-region (point) (point-min))
                      (if (and callback cbargs)
                          (apply callback (json-parse-buffer :object-type 'alist) cbargs)
                        (if callback
                            (funcall callback (json-parse-buffer :object-type 'alist))
                          (json-parse-buffer :object-type 'alist))))))))

(defun ridge--get-enabled-content-types ()
  "Get content types enabled for search from API."
  (ridge--call-api "/api/content/types" "GET" nil `(lambda (item) (mapcar #'intern item))))

(defun ridge--query-search-api-and-render-results (query content-type buffer-name &optional rerank is-find-similar)
  "Query Ridge Search API with QUERY, CONTENT-TYPE and RERANK as query params.
Render search results in BUFFER-NAME using CONTENT-TYPE and QUERY.
Filter out first similar result if IS-FIND-SIMILAR set."
  (let* ((rerank (or rerank "false"))
         (params `((q ,query) (t ,content-type) (r ,rerank) (n ,ridge-results-count)))
         (path "/api/search"))
    (ridge--call-api-async path
                    "GET"
                    params
                    'ridge--render-search-results
                    content-type query buffer-name is-find-similar)))

(defun ridge--render-search-results (json-response content-type query buffer-name &optional is-find-similar)
  "Render search results in BUFFER-NAME using JSON-RESPONSE, CONTENT-TYPE, QUERY.
Filter out first similar result if IS-FIND-SIMILAR set."
  ;; render json response into formatted entries
  (with-current-buffer buffer-name
    (let ((is-find-similar (or is-find-similar nil))
          (inhibit-read-only t))
      (erase-buffer)
      (insert
       (cond ((equal content-type "org") (ridge--extract-entries-as-org json-response query is-find-similar))
             ((equal content-type "markdown") (ridge--extract-entries-as-markdown json-response query is-find-similar))
             ((equal content-type "pdf") (ridge--extract-entries-as-pdf json-response query is-find-similar))
             ((equal content-type "image") (ridge--extract-entries-as-images json-response query))
             (t (ridge--extract-entries json-response query is-find-similar))))
      (cond ((or (equal content-type "all")
                 (equal content-type "pdf")
                 (equal content-type "org"))
             (progn (visual-line-mode)
                    (org-mode)
                    (setq-local
                     org-hide-leading-stars t
                     org-startup-with-inline-images t)
                    (ridge--org-cycle-content 2)))
            ((equal content-type "markdown") (progn (markdown-mode)
                                                    (visual-line-mode)))
            ((equal content-type "image") (progn (shr-render-region (point-min) (point-max))
                                                 (goto-char (point-min))))
            (t (fundamental-mode))))
    ;; keep cursor at top of ridge buffer by default
    (goto-char (point-min))
    ;; enable minor modes for ridge chat
    (visual-line-mode)
    (read-only-mode t)))


;; ----------------
;; Ridge Chat
;; ----------------

(defun ridge--chat (&optional session-id)
  "Chat with Ridge in session with SESSION-ID."
  (interactive)
  (when (or session-id (not (get-buffer ridge--chat-buffer-name)))
    (ridge--load-chat-session ridge--chat-buffer-name session-id))
  (let ((query (read-string "Query: ")))
    (when (not (string-empty-p query))
      (ridge--query-chat-api-and-render-messages query ridge--chat-buffer-name session-id))))

(defun ridge--open-side-pane (buffer-name)
  "Open Ridge BUFFER-NAME in right side pane."
  (save-selected-window
    (if (get-buffer-window-list buffer-name)
        ;; if window is already open, switch to it
        (progn
          (select-window (get-buffer-window buffer-name))
          (switch-to-buffer buffer-name))
      ;; else if window is not open, open it as a right-side window pane
      (let ((bottomright-window (some-window (lambda (window) (and (window-at-side-p window 'right) (window-at-side-p window 'bottom))))))
        (progn
          ;; Select the right-most window
          (select-window bottomright-window)
          ;; if bottom-right window is not a vertical pane, split it vertically, else use the existing bottom-right vertical window
          (let ((ridge-window (if (window-at-side-p bottomright-window 'left)
                                 (split-window-right)
                               bottomright-window)))
            ;; Set the buffer in the ridge window
            (set-window-buffer ridge-window buffer-name)
            ;; Switch to the ridge window
            (select-window ridge-window)
            ;; Resize the window to 1/3 of the frame width
            (window-resize ridge-window
                           (- (truncate (* 0.33 (frame-width))) (window-width))
                           t)))))
    (goto-char (point-max))))

(defun ridge--load-chat-session (buffer-name &optional session-id)
  "Load Ridge Chat conversation history from SESSION-ID into BUFFER-NAME."
  (setq ridge--reference-count 0)
  (let ((inhibit-read-only t)
        (json-response (cdr (assoc 'chat (cdr (assoc 'response (ridge--get-chat-session session-id)))))))
    (with-current-buffer (get-buffer-create buffer-name)
      (progn
        (erase-buffer)
        (insert "* Ridge Chat\n")
        (when json-response
          (thread-last
            json-response
            ;; generate chat messages from Ridge Chat API response
            (mapcar #'ridge--format-chat-response)
            ;; insert chat messages into Ridge Chat Buffer
            (mapc #'insert)))
        (org-mode)
        ;; commented add-hover-text func due to perf issues with the implementation
        ;;(ridge--add-hover-text-to-footnote-refs (point-min))
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
        (local-set-key (kbd "q") #'ridge--close)
        (local-set-key (kbd "m") #'ridge--chat)
        (local-set-key (kbd "C-x m") #'ridge--chat)

        ;; enable minor modes for ridge chat
        (visual-line-mode)
        (read-only-mode t)))
    (ridge--open-side-pane buffer-name)))

(defun ridge--close ()
  "Kill Ridge buffer and window."
  (interactive)
  (progn
    (kill-buffer (current-buffer))
    (delete-window)))

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

(defun ridge--query-chat-api-and-render-messages (query buffer-name &optional session-id)
  "Send QUERY to Chat SESSION-ID. Render the chat messages in BUFFER-NAME."
  ;; render json response into formatted chat messages
  (with-current-buffer (get-buffer buffer-name)
    (let ((inhibit-read-only t)
          (query-time (format-time-string "%F %T")))
      (goto-char (point-max))
      (insert
       (ridge--render-chat-message query "you" query-time))
      (ridge--query-chat-api query
                            session-id
                            #'ridge--format-chat-response
                            #'ridge--render-chat-response buffer-name))))

(defun ridge--query-chat-api (query session-id callback &rest cbargs)
  "Send QUERY for SESSION-ID to Ridge Chat API.
Call CALLBACK func with response and CBARGS."
  (let ((params `(("q" ,query) ("n" ,ridge-results-count))))
    (when session-id (push `("conversation_id" ,session-id) params))
    (ridge--call-api-async "/api/chat"
                          "GET"
                          params
                          callback cbargs)))

(defun ridge--get-chat-sessions ()
  "Get all chat sessions from Ridge server."
  (ridge--call-api "/api/chat/sessions" "GET"))

(defun ridge--get-chat-session (&optional session-id)
  "Get chat messages from default or SESSION-ID chat session."
  (ridge--call-api "/api/chat/history"
                  "GET"
                  (when session-id `(("conversation_id" ,session-id)))))

(defun ridge--select-conversation-session (&optional completion-action)
  "Select Ridge conversation session to perform COMPLETION-ACTION on."
  (let* ((completion-text (format "%s Conversation:" (or completion-action "Open")))
         (sessions (ridge--get-chat-sessions))
         (session-alist (-map (lambda (session)
                                (cons (if (not (equal :null (cdr (assoc 'slug session))))
                                          (cdr (assoc 'slug session))
                                        (format "New Conversation (%s)" (cdr (assoc 'conversation_id session))))
                                      (cdr (assoc 'conversation_id session))))
                              sessions))
         (selected-session-slug (completing-read completion-text session-alist nil t)))
    (cdr (assoc selected-session-slug session-alist))))

(defun ridge--open-conversation-session ()
  "Menu to select Ridge conversation session to open."
  (let ((selected-session-id (ridge--select-conversation-session "Open")))
    (ridge--load-chat-session ridge--chat-buffer-name selected-session-id)))

(defun ridge--create-chat-session ()
  "Create new chat session."
  (ridge--call-api "/api/chat/sessions" "POST"))

(defun ridge--new-conversation-session ()
  "Create new Ridge conversation session."
  (thread-last
    (ridge--create-chat-session)
    (assoc 'conversation_id)
    (cdr)
    (ridge--chat)))

(defun ridge--delete-chat-session (session-id)
  "Delete chat session with SESSION-ID."
  (ridge--call-api "/api/chat/history" "DELETE" `(("conversation_id" ,session-id))))

(defun ridge--delete-conversation-session ()
  "Delete new Ridge conversation session."
  (thread-last
    (ridge--select-conversation-session "Delete")
    (ridge--delete-chat-session)))

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
  (let ((compiled-reference (if (stringp reference) reference (cdr (assoc 'compiled reference)))))
    (cons
     (propertize (format "^{ [fn:%x]}" ridge--reference-count) 'help-echo compiled-reference)
     (thread-last
       compiled-reference
       ;; remove filename top heading line from reference
       ;; prevents actual reference heading in next line jumping out of references footnote section
       (replace-regexp-in-string "^\* .*\n" "")
       ;; remove multiple, consecutive empty lines from reference
       (replace-regexp-in-string "\n\n" "\n")
       (format "\n[fn:%x] %s" ridge--reference-count)))))

(defun ridge--generate-online-reference (reference)
  "Create `org-mode' footnotes for online REFERENCE."
  (setq ridge--reference-count (1+ ridge--reference-count))
  (let* ((link (cdr (assoc 'link reference)))
        (title (or (cdr (assoc 'title reference)) link))
        (description (or (cdr (assoc 'description reference)) title)))
    (cons
     (propertize (format "^{ [fn:%x]}" ridge--reference-count) 'help-echo (format "%s\n%s" link description))
     (thread-last
       description
       ;; remove multiple, consecutive empty lines from reference
       (replace-regexp-in-string "\n\n" "\n")
       (format "\n[fn:%x] [[%s][%s]]\n%s\n" ridge--reference-count link title)))))

(defun ridge--extract-online-references (result-types query-result-pairs)
  "Extract link, title and description from RESULT-TYPES in QUERY-RESULT-PAIRS."
  (let ((result '()))
    (-map
     (lambda (search)
      (let ((search-q (car search))
            (search-results (cdr search)))
        (-map-when
         ;; filter search results by specified result types
         (lambda (search-result) (member (car search-result) result-types))
         ;; extract link, title, and description from search results
         (lambda (search-result)
           (-map
            (lambda (entry)
              (let* ((link (cdr (or (assoc 'link entry) (assoc 'descriptionLink entry))))
                     (title (cdr (or (assoc 'title entry) `(title . ,link))))
                     (description (cdr (or (assoc 'snippet entry) (assoc 'description entry)))))
                (setq result (append result `(((title . ,title) (link . ,link) (description . ,description) (search . ,search-q)))))))
            ;; wrap search results in a list if it is not already a list
            (if (or (equal 'knowledgeGraph (car search-result)) (equal 'webpages (car search-result)))
                (if (arrayp (cdr search-result))
                    (list (elt (cdr search-result) 0))
                  (list (cdr search-result)))
              (cdr search-result))))
         search-results)))
     query-result-pairs)
    result))

(defun ridge--render-chat-response (response buffer-name)
  "Insert chat message from RESPONSE into BUFFER-NAME."
  (with-current-buffer (get-buffer buffer-name)
    (let ((start-pos (point))
          (inhibit-read-only t))
      (goto-char (point-max))
      (insert
       response
       (or (ridge--add-hover-text-to-footnote-refs start-pos) ""))
      (progn
        (org-set-startup-visibility)
        (visual-line-mode)
        (re-search-backward "^\*+ 🏮" nil t)))))

(defun ridge--format-chat-response (json-response &optional callback &rest cbargs)
  "Format chat message using JSON-RESPONSE from Ridge Chat API.
Run CALLBACK with CBARGS on formatted message."
  (let* ((message (cdr (or (assoc 'response json-response) (assoc 'message json-response))))
         (sender (cdr (assoc 'by json-response)))
         (receive-date (cdr (assoc 'created json-response)))
         (online-references  (or (cdr (assoc 'onlineContext json-response)) '()))
         (online-footnotes (-map #'ridge--generate-online-reference
                                 (ridge--extract-online-references '(organic knowledgeGraph peopleAlsoAsk webpages)
                                                                  online-references)))
         (doc-references (or (cdr (assoc 'context json-response)) '()))
         (doc-footnotes (mapcar #'ridge--generate-reference doc-references))
         (footnote-links (mapcar #'car (append doc-footnotes online-footnotes)))
         (footnote-defs (mapcar #'cdr (append doc-footnotes online-footnotes)))
         (formatted-response
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
    (if callback
        (apply callback formatted-response cbargs)
        formatted-response)))


;; ------------------
;; Incremental Search
;; ------------------

(defun ridge--incremental-search (&optional rerank)
  "Perform Incremental Search on Ridge. Allow optional RERANK of results."
  (let* ((rerank-str (cond (rerank "true") (t "false")))
         (ridge-buffer-name (get-buffer-create ridge--search-buffer-name))
         (query (minibuffer-contents-no-properties)))
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
         query
         ridge--content-type
         ridge-buffer-name
         rerank-str))))))

(defun ridge--delete-open-network-connections-to-server ()
  "Delete all network connections to ridge server."
  (dolist (proc (process-list))
    (let ((proc-buf (buffer-name (process-buffer proc)))
          (ridge-network-proc-buf (string-join (split-string ridge-server-url "://") " ")))
      (when (string-match (format "%s" ridge-network-proc-buf) proc-buf)
        (ignore-errors (delete-process proc))))))

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
    ;; switch to ridge search buffer
    (ridge--open-side-pane ridge-buffer-name)
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

(defun ridge--get-current-outline-entry-pos ()
  "Get heading position of current outline section."
  ;; get heading position of current outline entry
  (cond
   ;; when at heading of entry
   ((looking-at outline-regexp)
    (point))
   ;; when within entry
   (t (save-excursion (outline-previous-heading) (point)))))

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
         (buffer-name (get-buffer-create ridge--search-buffer-name)))
    (progn
      (ridge--query-search-api-and-render-results
       query
       content-type
       buffer-name
       rerank
       t)
      (ridge--open-side-pane buffer-name))))

(defun ridge--auto-find-similar ()
  "Call find similar on current element, if point has moved to a new element."
  ;; Call find similar
  (when (and (derived-mode-p 'org-mode)
             (org-element-at-point)
             (not (string= (buffer-name (current-buffer)) ridge--search-buffer-name))
             (get-buffer-window ridge--search-buffer-name))
    (let ((current-heading-pos (ridge--get-current-outline-entry-pos)))
      (unless (eq current-heading-pos ridge--last-heading-pos)
          (setq ridge--last-heading-pos current-heading-pos)
          (ridge--find-similar)))))

(defun ridge--setup-auto-find-similar ()
  "Setup automatic call to find similar to current element."
  (if ridge-auto-find-similar
      (add-hook 'post-command-hook #'ridge--auto-find-similar)
    (remove-hook 'post-command-hook #'ridge--auto-find-similar)))

(defun ridge-toggle-auto-find-similar ()
    "Toggle automatic call to find similar to current element."
    (interactive)
    (setq ridge-auto-find-similar (not ridge-auto-find-similar))
    (ridge--setup-auto-find-similar)
    (if ridge-auto-find-similar
        (message "Auto find similar enabled")
      (message "Auto find similar disabled")))


;; ---------
;; Ridge Menu
;; ---------

(defun ridge--setup-and-show-menu ()
  "Create main Transient menu for Ridge and show it."
  ;; Create the Ridge Transient menu
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
           (url-request-method "GET"))
      (progn
        (setq ridge--content-type content-type)
        (ridge--server-index-files force-update content-type))))

  (transient-define-suffix ridge--chat-command (&optional _)
    "Command to Chat with Ridge."
    (interactive (list (transient-args transient-current-command)))
    (ridge--chat))

  (transient-define-suffix ridge--open-conversation-session-command (&optional _)
    "Command to select Ridge conversation sessions to open."
    (interactive (list (transient-args transient-current-command)))
    (ridge--open-conversation-session))

  (transient-define-suffix ridge--new-conversation-session-command (&optional _)
    "Command to select Ridge conversation sessions to open."
    (interactive (list (transient-args transient-current-command)))
    (ridge--new-conversation-session))

  (transient-define-suffix ridge--delete-conversation-session-command (&optional _)
    "Command to select Ridge conversation sessions to delete."
    (interactive (list (transient-args transient-current-command)))
    (ridge--delete-conversation-session))

  (transient-define-prefix ridge--chat-menu ()
    "Open the Ridge chat menu."
    ["Act"
     ("c" "Chat" ridge--chat-command)
     ("o" "Open Conversation" ridge--open-conversation-session-command)
     ("n" "New Conversation" ridge--new-conversation-session-command)
     ("d" "Delete Conversation" ridge--delete-conversation-session-command)
     ("q" "Quit" transient-quit-one)
     ])

  (transient-define-prefix ridge--menu ()
    "Create Ridge Menu to Configure and Execute Commands."
    [["Configure Search"
      ("-n" "Results Count" "--results-count=" :init-value (lambda (obj) (oset obj value (format "%s" ridge-results-count))))
      ("t" "Content Type" ridge--content-type-switch)]
     ["Configure Update"
      ("-f" "Force Update" "--force-update")]]
    [["Act"
      ("c" "Chat" ridge--chat-menu)
      ("s" "Search" ridge--search-command)
      ("f" "Find Similar" ridge--find-similar-command)
      ("u" "Update" ridge--update-command)
      ("q" "Quit" transient-quit-one)]])

  ;; Show the Ridge Transient menu
  (ridge--menu))


;; ----------
;; Entrypoint
;; ----------

;;;###autoload
(defun ridge ()
  "Search and chat with your knowledge base using your personal AI copilot.

Collaborate with Ridge to search, create, review and update your knowledge base.
Research across the internet & your documents from the comfort of Emacs."
  (interactive)
  (when ridge-auto-setup
    (ridge-setup t))
  (ridge--setup-and-show-menu))

(provide 'ridge)

;;; ridge.el ends here
