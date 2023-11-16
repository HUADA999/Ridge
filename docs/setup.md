## Setup
These are the general setup instructions for Ridge.

- Make sure [python](https://realpython.com/installing-python/) and [pip](https://pip.pypa.io/en/stable/installation/) are installed on your machine
- Check the [Ridge Emacs docs](/emacs?id=setup) to setup Ridge with Emacs<br />
  It's simpler as it can skip the server *install*, *run* and *configure* step below.
- Check the [Ridge Obsidian docs](/obsidian?id=_2-setup-plugin) to setup Ridge with Obsidian<br />
  Its simpler as it can skip the *configure* step below.

For Installation, you can either use Docker or install Ridge locally.

### 1. Installation (Docker)

Use the sample docker-compose [in Github](https://github.com/ridge-ai/ridge/blob/master/docker-compose.yml) to run Ridge in Docker. Start by configuring all the environment variables to your choosing. Your admin account will automatically be created based on the admin credentials in that file, so pay attention to those. To start the container, run the following command in the same directory as the docker-compose.yml file. This will automatically setup the database and run the Ridge server.

```shell
docker-compose up
```

Ridge should now be running at http://localhost:42110. You can see the web UI in your browser.

### 1. Installation (Local)

#### Prerequisites

##### Install Postgres (with PgVector)

Ridge uses the `pgvector` package to store embeddings of your index in a Postgres database. In order to use this, you need to have Postgres installed.

<!-- tabs:start -->

#### **MacOS**

Install [Postgres.app](https://postgresapp.com/). This comes pre-installed with `pgvector` and relevant dependencies.

#### **Windows**

Use the [recommended installer](https://www.postgresql.org/download/windows/)

#### **Linux**
From [official instructions](https://wiki.postgresql.org/wiki/Apt)

```bash
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt install postgres-16 postgresql-16-pgvector
```

##### **From Source**
1. Follow instructions to [Install Postgres](https://www.postgresql.org/download/)
2. Follow instructions to [Install PgVector](https://github.com/pgvector/pgvector#installation) in case you need to manually install it. Reproduced instructions below for convenience.

```bash
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install # may need sudo
```

<!-- tabs:end -->


##### Create the Ridge database

Make sure to update your environment variables to match your Postgres configuration if you're using a different name. The default values should work for most people.

<!-- tabs:start -->

#### **MacOS**
```bash
createdb ridge -U postgres
```

#### **Windows**
```bash
createdb ridge -U postgres
```

#### **Linux**
```bash
sudo -u postgres createdb ridge
```

<!-- tabs:end -->

#### Install package

##### Local Server Setup
- *Make sure [python](https://realpython.com/installing-python/) and [pip](https://pip.pypa.io/en/stable/installation/) are installed on your machine*

Run the following command in your terminal to install the Ridge backend.

<!-- tabs:start -->

#### **MacOS**

```shell
python -m pip install ridge-assistant
```

#### **Windows**

```shell
py -m pip install ridge-assistant
```
For more detailed Windows installation and troubleshooting, see [Windows Install](./windows_install.md).

#### **Linux**

```shell
python -m pip install ridge-assistant
```

<!-- tabs:end -->

##### Local Server Start

Run the following command from your terminal to start the Ridge backend and open Ridge in your browser.

```shell
ridge --anonymous-mode
```
`--anonymous-mode` allows you to run the server without setting up Google credentials for login. This allows you to use any of the clients without a login wall. If you want to use Google login, you can skip this flag, but you will have to add your Google developer credentials.

On the first run, you will be prompted to input credentials for your admin account and do some basic configuration for your chat model settings. Once created, you can go to http://localhost:42110/server/admin and login with the credentials you just created.

Ridge should now be running at http://localhost:42110. You can see the web UI in your browser.

Note: To start Ridge automatically in the background use [Task scheduler](https://www.windowscentral.com/how-create-automated-task-using-task-scheduler-windows-10) on Windows or [Cron](https://en.wikipedia.org/wiki/Cron) on Mac, Linux (e.g with `@reboot ridge`)


### 2. Download the desktop client

You can use our desktop executables to select file paths and folders to index. You can simply select the folders or files, and they'll be automatically uploaded to the server. Once you specify a file or file path, you don't need to update the configuration again; it will grab any data diffs dynamically over time.

**To download the latest desktop client, go to https://download.ridge.dev** and the correct executable for your OS will automatically start downloading. Once downloaded, you can configure your folders for indexing using the settings tab. To set your chat configuration, you'll have to use the web interface for the Ridge server you setup in the previous step.

To use the desktop client, you need to go to your Ridge server's settings page (http://localhost:42110/config) and copy the API key. Then, paste it into the desktop client's settings page. Once you've done that, you can select files and folders to index.

### 3. Configure
1. Go to http://localhost:42110/server/admin and login with your admin credentials. Go to the ChatModelOptions if you want to add additional models for chat.
1. Select files and folders to index [using the desktop client](./setup.md?id=_2-download-the-desktop-client). When you click 'Save', the files will be sent to your server for indexing.
    - Select Notion workspaces and Github repositories to index using the web interface.

### 4. Install Client Plugins (Optional)
Ridge exposes a web interface to search, chat and configure by default.<br />
The optional steps below allow using Ridge from within an existing application like Obsidian or Emacs.

- **Ridge Obsidian**:<br />
[Install](/obsidian?id=_2-setup-plugin) the Ridge Obsidian plugin

- **Ridge Emacs**:<br />
[Install](/emacs?id=setup) ridge.el

### 5. Use Ridge 🚀

You can head to http://localhost:42110 to use the web interface. You can also use the desktop client to search and chat.

## Upgrade
### Upgrade Ridge Server

<!-- tabs:start -->

#### **Local Setup**

```shell
pip install --upgrade ridge-assistant
```

*Note: To upgrade to the latest pre-release version of the ridge server run below command*
```shell
# Maps to the latest commit on the master branch
pip install --upgrade --pre ridge-assistant
```

#### **Docker**
From the same directory where you have your `docker-compose` file, this will fetch the latest build and upgrade your server.

```shell
docker-compose up --build
```

<!-- tabs:end -->


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
