## Demos

### Screenshots
#### Web
![](./assets/ridge_search_on_web.png ':size=300px')
![](./assets/ridge_chat_on_web.png ':size=300px')

#### Obsidian
![](./assets/ridge_search_on_obsidian.png ':size=300px')
![](./assets/ridge_chat_on_obsidian.png ':size=300px')

#### Emacs
![](./assets/ridge_search_on_emacs.png ':size=300px')
![](./assets/ridge_chat_on_emacs.png ':size=400px')


### Videos
#### Ridge in Obsidian
[RidgeObsidian](https://github-production-user-asset-6210df.s3.amazonaws.com/6413477/240061700-3e33d8ea-25bb-46c8-a3bf-c92f78d0f56b.mp4 ':include :type=mp4')

##### Installation

1. Install Ridge via `pip` and start Ridge backend in a terminal (Run `ridge`)
    ```bash
    python -m pip install ridge-assistant
    ridge
    ```
2. Install Ridge plugin via Community Plugins settings pane on Obsidian app
    - Check the new Ridge plugin settings
    - Let Ridge backend index the markdown, pdf, Github markdown files in the current Vault
    - Open Ridge plugin on Obsidian via Search button on Left Pane
    - Search \"*Announce plugin to folks*\" in the [Obsidian Plugin docs](https://marcus.se.net/obsidian-plugin-docs/)
    - Jump to the [search result](https://marcus.se.net/obsidian-plugin-docs/publishing/submit-your-plugin)

#### Ridge in Emacs, Browser
[RidgeEmacs](https://user-images.githubusercontent.com/6413477/184735169-92c78bf1-d827-4663-9087-a1ea194b8f4b.mp4 ':include :type=mp4')

##### Installation

- Install Ridge via pip
- Start Ridge app
- Add this readme and [ridge.el readme](https://github.com/ridge-ai/ridge/tree/master/src/interface/emacs) as org-mode for Ridge to index
- Search \"*Setup editor*\" on the Web and Emacs. Re-rank the results for better accuracy
- Top result is what we are looking for, the [section to Install Ridge.el on Emacs](https://github.com/ridge-ai/ridge/tree/master/src/interface/emacs#2-Install-Ridgeel)

##### Analysis

- The results do not have any words used in the query
  - *Based on the top result it seems the re-ranking model understands that Emacs is an editor?*
- The results incrementally update as the query is entered
- The results are re-ranked, for better accuracy, once user hits enter
