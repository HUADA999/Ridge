---
sidebar_position: 2
---

# Emacs

<img src="https://stable.melpa.org/packages/ridge-badge.svg" width="130" alt="Melpa Stable Badge" />
<img src="https://melpa.org/packages/ridge-badge.svg" width="150" alt="Melpa Badge" />

<img src="https://github.com/ridge-ai/ridge/actions/workflows/build_ridge_el.yml/badge.svg" width="150" alt="Build Badge" />
<img src="https://github.com/ridge-ai/ridge/actions/workflows/test_ridge_el.yml/badge.svg" width="150" alt="Test Badge" />

<br />
<br />
> Query your Second Brain from Emacs

## Features
- **Chat**
  - **Faster answers**: Find answers quickly, from your private notes or the public internet
  - **Assisted creativity**: Smoothly weave across retrieving answers and generating content
  - **Iterative discovery**: Iteratively explore and re-discover your notes
- **Search**
  - **Natural**: Advanced natural language understanding using Transformer based ML Models
  - **Incremental**: Incremental search for a fast, search-as-you-type experience

## Interface

| Search | Chat |
|:------:|:----:|
| ![ridge search on emacs](/img/ridge_search_on_emacs.png) | ![ridge chat on emacs](/img/ridge_chat_on_emacs.png) |

## Setup
:::info[Self Hosting]
If you are self-hosting the Ridge server modify the install steps below:
- Set `ridge-server-url` to your Ridge server URL. By default, use `http://127.0.0.1:42110`.
- Do not set `ridge-api-key` if your Ridge server runs in anonymous mode. For example, `ridge --anonymous-mode`
:::

1. Generate an API key on the [Ridge Web App](https://app.ridge.dev/settings#clients)
2. Add below snippet to your Emacs config file, usually at `~/.emacs.d/init.el`


#### **Direct Install**
*Ridge will index your org-agenda files, by default*

```elisp
;; Install Ridge.el
M-x package-install ridge

; Set your Ridge API key
(setq ridge-api-key "YOUR_RIDGE_CLOUD_API_KEY")
(setq ridge-server-url "https://app.ridge.dev")
```

#### **Minimal Install**
*Ridge will index your org-agenda files, by default*

```elisp
;; Install Ridge client from MELPA Stable
(use-package ridge
  :ensure t
  :pin melpa-stable
  :bind ("C-c s" . 'ridge)
  :config (setq ridge-api-key "YOUR_RIDGE_CLOUD_API_KEY"
                ridge-server-url "https://app.ridge.dev"))
```

#### **Standard Install**
*Configures the specified org files, directories to be indexed by Ridge*

```elisp
;; Install Ridge client from MELPA Stable
(use-package ridge
  :ensure t
  :pin melpa-stable
  :bind ("C-c s" . 'ridge)
  :config (setq ridge-api-key "YOUR_RIDGE_CLOUD_API_KEY"
                ridge-server-url "https://app.ridge.dev"
                ridge-org-directories '("~/docs/org-roam" "~/docs/notes")
                ridge-org-files '("~/docs/todo.org" "~/docs/work.org")))
```

#### **Straight.el**
*Configures the specified org files, directories to be indexed by Ridge*

```elisp
;; Install Ridge client using Straight.el
(use-package ridge
  :after org
  :straight (ridge :type git :host github :repo "ridge-ai/ridge" :files (:defaults "src/interface/emacs/ridge.el"))
  :bind ("C-c s" . 'ridge)
  :config (setq ridge-api-key "YOUR_RIDGE_CLOUD_API_KEY"
                ridge-server-url "https://app.ridge.dev"
                ridge-org-directories '("~/docs/org-roam" "~/docs/notes")
                ridge-org-files '("~/docs/todo.org" "~/docs/work.org")))
```

## Use
### Search
See [Ridge Search](/features/search) for details
1. Hit  `C-c s s` (or `M-x ridge RET s`) to open ridge search
2. Enter your query in natural language<br/>
  E.g. *"What is the meaning of life?"*, *"My life goals for 2023"*

### Chat
See [Ridge Chat](/features/chat) for details
1. Hit `C-c s c` (or `M-x ridge RET c`) to open ridge chat
2. Ask questions in a natural, conversational style<br/>
  E.g. *"When did I file my taxes last year?"*

### Find Similar Entries
This feature finds entries similar to the one you are currently on.
1. Move cursor to the org-mode entry, markdown section or text paragraph you want to find similar entries for
2. Hit `C-c s f` (or `M-x ridge RET f`) to find similar entries

### Advanced Usage
- Add [query filters](https://github.com/ridge-ai/ridge/#query-filters) during search to narrow down results further
  e.g. `What is the meaning of life? -"god" +"none" dt>"last week"`

- Use `C-c C-o 2` to open the current result at cursor in its source org file
  - This calls `M-x org-open-at-point` on the current entry and opens the second link in the entry.
  - The second link is the entries [org-id](https://orgmode.org/manual/Handling-Links.html#FOOT28), if set, or the heading text.
    The first link is the line number of the entry in the source file. This link is less robust to file changes.
  - Note: If you have [speed keys](https://orgmode.org/manual/Speed-Keys.html) enabled, `o 2` will also work

### Ridge Menu
![](/img/ridge_emacs_menu.png)
Hit `C-c s` (or `M-x ridge`) to open the ridge menu above. Then:
- Hit `t` until you preferred content type is selected in the ridge menu
  `Content Type` specifies the content to perform `Search`, `Update` or `Find Similar` actions on
- Hit `n` twice and then enter number of results you want to see
  `Results Count` is used by the `Search` and `Find Similar` actions
- Hit `-f u` to `force` update the ridge content index
  The `Force Update` switch is only used by the `Update` action

## Upgrade
Use your Emacs package manager to upgrade `ridge.el`
<!-- tabs:start -->

#### **With MELPA**
1. Run `M-x package-refresh-content`
2. Run `M-x package-reinstall ridge`

#### **With Straight.el**
- Run `M-x straight-pull-package ridge`

<!-- tabs:end -->
