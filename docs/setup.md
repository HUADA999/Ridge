## Setup
These are the general setup instructions for Ridge.

- Make sure [python](https://realpython.com/installing-python/) and [pip](https://pip.pypa.io/en/stable/installation/) are installed on your machine
- Check the [Ridge Emacs docs](/emacs?id=setup) to setup Ridge with Emacs<br />
  Its simpler as it can skip the server *install*, *run* and *configure* step below.
- Check the [Ridge Obsidian docs](/obsidian?id=_2-setup-plugin) to setup Ridge with Obsidian<br />
  Its simpler as it can skip the *configure* step below.

### 1. Install

#### 1.1 Local Server Setup
Run the following command in your terminal to install the Ridge backend.

- On Linux/MacOS
  ```shell
  python -m pip install ridge-assistant
  ```

- On Windows
  ```shell
  py -m pip install ridge-assistant
  ```
For more detailed Windows installation and troubleshooting, see [Windows Install](./windows_install.md).


##### 1.1.1 Local Server Start

Run the following command from your terminal to start the Ridge backend and open Ridge in your browser.

```shell
ridge
```

Ridge should now be running at http://localhost:42110. You can see the web UI in your browser.

Note: To start Ridge automatically in the background use [Task scheduler](https://www.windowscentral.com/how-create-automated-task-using-task-scheduler-windows-10) on Windows or [Cron](https://en.wikipedia.org/wiki/Cron) on Mac, Linux (e.g with `@reboot ridge`)

#### 1.2 Local Docker Setup
Use the sample docker-compose [in Github](https://github.com/ridge-ai/ridge/blob/master/docker-compose.yml) to run Ridge in Docker. To start the container, run the following command in the same directory as the docker-compose.yml file. You'll have to configure the mounted directories to match your local knowledge base.

```shell
docker-compose up
```

Ridge should now be running at http://localhost:42110. You can see the web UI in your browser.

### 1.2 Setup the frontend [Optional]
This part is currently optional, but may make setup and configuration slightly easier. It removes the need for setting up custom file paths for your Ridge data configurations. Instead, you can simply select the folders or files, and they'll be automatically uploaded to the server. Once you specify a file or file path, you don't need to update the configuration again; it will grab any data diffs dynamically over time.

**To download, go to https://download.ridge.dev** and the correct executable for your OS will automatically start downloading. Once downloaded, you can configure your folders for indexing using the settings tab. To set your chat configuration, you'll have to use the web interface for the Ridge server you setup in the previous step.


### 2. Configure
1. Set `File`, `Folder` and hit `Save` in each Plugins you want to enable for Search on the Ridge config page
2. Add your OpenAI API key to Chat Feature settings if you want to use Chat
3. Click `Configure` and wait. The app will download ML models and index the content for search and (optionally) chat

![configure demo](https://user-images.githubusercontent.com/6413477/255307879-61247d3f-c69a-46ef-b058-9bc533cb5c72.mp4 ':include :type=mp4')

### 3. Install Interface Plugins (Optional)
Ridge exposes a web interface to search, chat and configure by default.<br />
The optional steps below allow using Ridge from within an existing application like Obsidian or Emacs.

- **Ridge Obsidian**:<br />
[Install](/obsidian?id=_2-setup-plugin) the Ridge Obsidian plugin

- **Ridge Emacs**:<br />
[Install](/emacs?id=setup) ridge.el


## Upgrade
### Upgrade Ridge Server
```shell
pip install --upgrade ridge-assistant
```

*Note: To upgrade to the latest pre-release version of the ridge server run below command*
```shell
# Maps to the latest commit on the master branch
pip install --upgrade --pre ridge-assistant
```

### Upgrade Ridge on Emacs
- Use your Emacs Package Manager to Upgrade
- See [ridge.el package setup](/emacs?id=setup) for details

### Upgrade Ridge on Obsidian
- Upgrade via the Community plugins tab on the settings pane in the Obsidian app
- See the [ridge plugin setup](/obsidian.md?id=_2-setup-plugin) for details

## Uninstall
1. (Optional) Hit `Ctrl-C` in the terminal running the ridge server to stop it
2. Delete the ridge directory in your home folder (i.e `~/.ridge` on Linux, Mac or `C:\Users\<your-username>\.ridge` on Windows)
5. You might want to `rm -rf` the following directories:
- `~/.ridge`
- `~/.cache/gpt4all`
3. Uninstall the ridge server with `pip uninstall ridge-assistant`
4. (Optional) Uninstall ridge.el or the ridge obsidian plugin in the standard way on Emacs, Obsidian

## Troubleshoot

#### Install fails while building Tokenizer dependency
- **Details**: `pip install ridge-assistant` fails while building the `tokenizers` dependency. Complains about Rust.
- **Fix**: Install Rust to build the tokenizers package. For example on Mac run:
    ```shell
    brew install rustup
    rustup-init
    source ~/.cargo/env
    ```
- **Refer**: [Issue with Fix](https://github.com/ridge-ai/ridge/issues/82#issuecomment-1241890946) for more details

#### Search starts giving wonky results
- **Fix**: Open [/api/update?force=true](http://localhost:42110/api/update?force=true) in browser to regenerate index from scratch
- **Note**: *This is a fix for when you perceive the search results have degraded. Not if you think they've always given wonky results*

#### Ridge in Docker errors out with \"Killed\" in error message
- **Fix**: Increase RAM available to Docker Containers in Docker Settings
- **Refer**: [StackOverflow Solution](https://stackoverflow.com/a/50770267), [Configure Resources on Docker for Mac](https://docs.docker.com/desktop/mac/#resources)

#### Ridge errors out complaining about Tensors mismatch or null
- **Mitigation**: Disable `image` search using the desktop GUI
