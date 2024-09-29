---
sidebar_position: 1
---

# Desktop

> Query your Second Brain from your machine

Use the Desktop app to chat and search with Ridge.
You can also share your files, folders with Ridge using the app.
Ridge will keep these files in sync to provide contextual responses when you search or chat.

## Features
- **Chat**
  - **Faster answers**: Find answers quickly, from your private notes or the public internet
  - **Assisted creativity**: Smoothly weave across retrieving answers and generating content
  - **Iterative discovery**: Iteratively explore and re-discover your notes
  - **Quick access**: Use [Ridge Mini](/features/ridge_mini) on the desktop to quickly pull up a mini chat module for quicker answers
- **Search**
  - **Natural**: Advanced natural language understanding using Transformer based ML Models
  - **Incremental**: Incremental search for a fast, search-as-you-type experience

## Setup
:::info[Self Hosting]
If you are self-hosting the Ridge server, update the *Settings* page on the Ridge Desktop app to:
- Set the `Ridge URL` field to your Ridge server URL. By default, use `http://127.0.0.1:42110`.
- Do not set the `Ridge API Key` field if your Ridge server runs in anonymous mode. For example, `ridge --anonymous-mode`
:::


1. Install the [Ridge Desktop app](https://ridge.dev/downloads) for your OS
2. Generate an API key on the [Ridge Web App](https://app.ridge.dev/settings#clients)
3. Set your Ridge API Key on the *Settings* page of the Ridge Desktop app
4. [Optional] Add any files, folders you'd like Ridge to be aware of on the *Settings* page and Click *Save*.
   These files and folders will be automatically kept in sync for you

## Interface
| Chat | Search |
|:----:|:------:|
| ![](/img/ridge_chat_on_desktop.png) | ![](/img/ridge_search_on_desktop.png) |
