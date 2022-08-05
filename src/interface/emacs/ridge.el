;;; ridge.el --- Natural, Incremental Search via Emacs

;; Copyright (C) 2021-2022 Debanjum Singh Solanky

;; Author: Debanjum Singh Solanky <debanjum@gmail.com>
;; Version: 2.0
;; Keywords: search, org-mode, outlines, markdown, image
;; URL: http://github.com/debanjum/ridge/interface/emacs

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

;; This package provides a natural, incremental search interface to your
;; org-mode notes, markdown files, beancount transactions and images.
;; It is a wrapper that interfaces with transformer based ML models.
;; The models search capabilities are exposed via the Ridge HTTP API.

;;; Code:

(require 'url)
(require 'json)

(defcustom ridge--server-url "http://localhost:8000"
  "Location of Ridge API server."
  :group 'ridge
  :type 'string)

(defcustom ridge--image-width 156
  "Width of rendered images returned by Ridge."
  :group 'ridge
  :type 'integer)

(defcustom ridge--rerank-after-idle-time 1.0
  "Idle time (in seconds) to trigger cross-encoder to rerank incremental search results."
  :group 'ridge
  :type 'float)

(defcustom ridge--results-count 5
  "Number of results to get from Ridge API for each query."
  :group 'ridge
  :type 'integer)

(defvar ridge--rerank-timer nil
  "Idle timer to make cross-encoder re-rank incremental search results if user idle.")

(defvar ridge--minibuffer-window nil
  "Minibuffer window being used by user to enter query.")

(defconst ridge--query-prompt "🦅Ridge: "
  "Query prompt shown to user in the minibuffer.")

(defconst ridge--buffer-name "*🦅Ridge*"
  "Name of buffer to show results from Ridge.")

(defvar ridge--search-type "org"
  "The type of content to perform search on.")

(defun ridge--make-search-keymap (&optional existing-keymap)
  "Setup keymap to configure Ridge search"
  (let ((kmap (or existing-keymap (make-sparse-keymap))))
    (define-key kmap (kbd "C-x m") '(lambda () (interactive) (setq ridge--search-type "markdown")))
    (define-key kmap (kbd "C-x o") '(lambda () (interactive) (setq ridge--search-type "org")))
    (define-key kmap (kbd "C-x l") '(lambda () (interactive) (setq ridge--search-type "ledger")))
    (define-key kmap (kbd "C-x i") '(lambda () (interactive) (setq ridge--search-type "image")))
    kmap))

(defun ridge--extract-entries-as-markdown (json-response query)
  "Convert json response from API to markdown entries"
  ;; remove leading (, ) or SPC from extracted entries string
  (replace-regexp-in-string
   "^[\(\) ]" ""
   ;; extract entries from response as single string and convert to entries
   (format "# %s\n%s"
           query
           (mapcar
            (lambda (args)
              (replace-regexp-in-string
               "^\#+" "##"
               (format "%s" (cdr (assoc 'entry args)))))
            json-response))))

(defun ridge--extract-entries-as-org (json-response query)
  "Convert json response from API to org-mode entries"
  ;; remove leading (, ) or SPC from extracted entries string
  (replace-regexp-in-string
   "^[\(\) ]" ""
   ;; extract entries from response as single string and convert to entries
   (format "#+STARTUP: showall hidestars inlineimages\n* %s\n%s"
           query
           (mapcar
            (lambda (args)
              (replace-regexp-in-string
               "^\*+" "**"
               (format "%s" (cdr (assoc 'entry args)))))
              json-response))))

(defun ridge--extract-entries-as-images (json-response query)
  "Convert json response from API to html with images"
  ;; remove leading (, ) or SPC from extracted entries string
  (replace-regexp-in-string
   "[\(\) ]$" ""
   ;; remove leading (, ) or SPC from extracted entries string
   (replace-regexp-in-string
    "^[\(\) ]" ""
    ;; extract entries from response as single string and convert to entries
    (format "<html>\n<body>\n<h1>%s</h1>%s\n\n</body>\n</html>"
            query
            (mapcar
             (lambda (args) (format
                             "\n\n<h2>Score: %s Meta: %s Image: %s</h2>\n\n<a href=\"%s%s\">\n<img src=\"%s%s?%s\" width=100 height=100>\n</a>"
                             (cdr (assoc 'score args))
                             (cdr (assoc 'metadata_score args))
                             (cdr (assoc 'image_score args))
                             ridge--server-url
                             (cdr (assoc 'entry args))
                             ridge--server-url
                             (cdr (assoc 'entry args))
                             (random 10000)))
             json-response)))))

(defun ridge--extract-entries-as-ledger (json-response query)
  "Convert json response from API to ledger entries"
  ;; remove leading (, ) or SPC from extracted entries string
  (replace-regexp-in-string
   "[\(\) ]$" ""
   (replace-regexp-in-string
    "^[\(\) ]" ""
    ;; extract entries from response as single string and convert to entries
    (format ";; %s\n\n%s\n"
            query
            (mapcar
             (lambda (args)
               (format "%s\n\n" (cdr (assoc 'entry args))))
             json-response)))))

(defun ridge--buffer-name-to-search-type (buffer-name)
  (let ((file-extension (file-name-extension buffer-name)))
    (cond
     ((equal buffer-name "Music.org") "music")
     ((or (equal file-extension "bean") (equal file-extension "beancount")) "ledger")
     ((equal file-extension "org") "org")
     ((or (equal file-extension "markdown") (equal file-extension "md")) "markdown")
     (t "org"))))

(defun ridge--construct-api-query (query search-type &optional rerank)
  (let ((rerank (or rerank "false"))
        (results-count (or ridge--results-count 5))
        (encoded-query (url-hexify-string query)))
    (format "%s/search?q=%s&t=%s&r=%s&n=%s" ridge--server-url encoded-query search-type rerank results-count)))

(defun ridge--query-api-and-render-results (query search-type query-url buffer-name)
  ;; get json response from api
  (with-current-buffer buffer-name
    (let ((inhibit-read-only t))
      (erase-buffer)
      (url-insert-file-contents query-url)))
  ;; render json response into formatted entries
  (with-current-buffer buffer-name
    (let ((inhibit-read-only t)
          (json-response (json-parse-buffer :object-type 'alist)))
      (erase-buffer)
      (insert
       (cond ((or (equal search-type "org") (equal search-type "music")) (ridge--extract-entries-as-org json-response query))
             ((equal search-type "markdown") (ridge--extract-entries-as-markdown json-response query))
             ((equal search-type "ledger") (ridge--extract-entries-as-ledger json-response query))
             ((equal search-type "image") (ridge--extract-entries-as-images json-response query))
             (t (format "%s" json-response))))
      (cond ((equal search-type "org") (org-mode))
            ((equal search-type "markdown") (markdown-mode))
            ((equal search-type "ledger") (beancount-mode))
            ((equal search-type "music") (progn (org-mode)
                                                (org-music-mode)))
            ((equal search-type "image") (progn (shr-render-region (point-min) (point-max))
                                                (goto-char (point-min))))
            (t (fundamental-mode))))
    (read-only-mode t)))


;; Incremental Search on Ridge
(defun ridge--incremental-search (&optional rerank)
  (let* ((rerank-str (cond (rerank "true") (t "false")))
         (ridge-buffer-name (get-buffer-create ridge--buffer-name))
         (query (minibuffer-contents-no-properties))
         (query-url (ridge--construct-api-query query ridge--search-type rerank-str)))
    ;; Query ridge API only when user in ridge minibuffer.
    ;; Prevents querying during recursive edits or with contents of other buffers user may jump to
    (when (and (active-minibuffer-window) (equal (current-buffer) ridge--minibuffer-window))
      (progn
        (when rerank
          (message "[Ridge]: Rerank Results"))
        (ridge--query-api-and-render-results
         query
         ridge--search-type
         query-url
         ridge-buffer-name)))))

(defun delete-open-network-connections-to-ridge ()
  "Delete all network connections to ridge server"
  (dolist (proc (process-list))
    (let ((proc-buf (buffer-name (process-buffer proc)))
          (ridge-network-proc-buf (string-join (split-string ridge--server-url "://") " ")))
      (when (string-match (format "%s" ridge-network-proc-buf) proc-buf)
        (delete-process proc)))))

(defun ridge--teardown-incremental-search ()
  (message "[Ridge]: Teardown Incremental Search")
  ;; remove advice to rerank results on normal exit from minibuffer
  (advice-remove 'exit-minibuffer #'ridge--minibuffer-exit-advice)
  ;; unset ridge minibuffer window
  (setq ridge--minibuffer-window nil)
  ;; cancel rerank timer
  (when (timerp ridge--rerank-timer)
    (cancel-timer ridge--rerank-timer))
  ;; delete open connections to ridge
  (delete-open-network-connections-to-ridge)
  ;; remove hooks for ridge incremental query and self
  (remove-hook 'post-command-hook #'ridge--incremental-search)
  (remove-hook 'minibuffer-exit-hook #'ridge--teardown-incremental-search))

(defun ridge--minibuffer-exit-advice (&rest _args)
  (ridge--incremental-search t))

;;;###autoload
(defun ridge ()
  "Natural, Incremental Search for your personal notes, transactions and music using Ridge"
  (interactive)
  (let* ((ridge-buffer-name (get-buffer-create ridge--buffer-name)))
    ;; set ridge search type to last used or based on current buffer
    (setq ridge--search-type (or ridge--search-type (ridge--buffer-name-to-search-type (buffer-name))))
    ;; setup temporary keymap for ridge
    (set-transient-map (ridge--search-keymap) t)
    ;; setup rerank to improve results once user idle for RIDGE--RERANK-AFTER-IDLE-TIME seconds
    (setq ridge--rerank-timer (run-with-idle-timer ridge--rerank-after-idle-time t 'ridge--incremental-search t))
    ;; switch to ridge results buffer
    (switch-to-buffer ridge-buffer-name)
    ;; open and setup minibuffer for incremental search
    (minibuffer-with-setup-hook
        (lambda ()
          ;; set current (mini-)buffer entered as ridge minibuffer
          ;; used to query ridge API only when user in ridge minibuffer
          (setq ridge--minibuffer-window (current-buffer))
          ;; rerank results on normal exit from minibuffer
          (advice-add 'exit-minibuffer :before #'ridge--minibuffer-exit-advice)
          (add-hook 'post-command-hook #'ridge--incremental-search) ; do ridge incremental search after every user action
          (add-hook 'minibuffer-exit-hook #'ridge--teardown-incremental-search)) ; teardown ridge incremental search on minibuffer exit
      (read-string ridge--query-prompt))))

;;;###autoload
(defun ridge-simple (query)
  "Natural Search for QUERY in your personal notes, transactions, music and images using Ridge"
  (interactive "s🦅Ridge: ")
  (let* ((rerank "true")
         (default-type (ridge--buffer-name-to-search-type (buffer-name)))
         (search-type (completing-read "Type: " '("org" "markdown" "ledger" "music" "image") nil t default-type))
         (query-url (ridge--construct-api-query query search-type rerank))
         (buffer-name (get-buffer-create (format "*%s (q:%s t:%s)*" ridge--buffer-name query search-type))))
    (ridge--query-api-and-render-results
        query
        search-type
        query-url
        buffer-name)
    (switch-to-buffer buffer-name)))

(provide 'ridge)

;;; ridge.el ends here
