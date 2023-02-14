![](https://github.com/debanjum/ridge/actions/workflows/test.yml/badge.svg)
![](https://github.com/debanjum/ridge/actions/workflows/build.yml/badge.svg)

# Ridge

*Allow natural language search on user content like notes, images,
transactions using transformer ML models*

User can interface with Ridge via [Web](./src/ridge/interface/web/index.html),
[Emacs](./src/ridge/interface/emacs/ridge.el) or the API. All search is done
locally[\*](https://github.com/debanjum/ridge#miscellaneous)

## Demo

<https://user-images.githubusercontent.com/6413477/168417719-8a8bc4e5-8404-42b2-89a7-4493e3d2582c.mp4>

## Setup

### 1. Clone

``` shell
git clone https://github.com/debanjum/ridge && cd ridge
```

### 2. Configure

-   \[Required\] Update [docker-compose.yml](./docker-compose.yml) to
    mount your images, (org-mode or markdown) notes and beancount
    directories
-   \[Optional\] Edit application configuration in
    [ridge_sample.yml](./config/ridge_sample.yml)

### 3. Run

``` shell
docker-compose up -d
```

*Note: The first run will take time. Let it run, it\'s mostly not hung,
just generating embeddings*

## Use

-   **Ridge via API**
    -   See [Ridge API Docs](http://localhost:8000/docs)
    -   [Query](http://localhost:8000/api/search?q=%22what%20is%20the%20meaning%20of%20life%22)
    -   [Update Index](http://localhost:8000/api/update?t=ledger)
    -   [Configure Application](https://localhost:8000/ui)
-   **Ridge via Emacs**
    -   [Install](https://github.com/debanjum/ridge/tree/master/src/ridge/interface/emacs#installation)
        [ridge.el](./src/ridge/interface/emacs/ridge.el)
    -   Run `M-x ridge <user-query>`

## Run Unit tests

``` shell
pytest
```

## Upgrade

``` shell
docker-compose build --pull
```

## Troubleshooting

-   Symptom: Errors out with \"Killed\" in error message
    -   Fix: Increase RAM available to Docker Containers in Docker
        Settings
    -   Refer: [StackOverflow
        Solution](https://stackoverflow.com/a/50770267), [Configure
        Resources on Docker for
        Mac](https://docs.docker.com/desktop/mac/#resources)
-   Symptom: Errors out complaining about Tensors mismatch, null etc
    -   Mitigation: Delete content-type \> image section from
        docker~sampleconfig~.yml

## Miscellaneous

-   The experimental [chat](localhost:8000/chat) API endpoint uses the
    [OpenAI API](https://openai.com/api/)
    -   It is disabled by default
    -   To use it add your `openai-api-key` to config.yml

## Development Setup

### Setup on Local Machine

1.  1\. Install Dependencies

    1.  Install Python3 \[Required\]

    2.  [Install
        Conda](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html)
        \[Required\]

2.  2\. Install Ridge

    ``` shell
    git clone https://github.com/debanjum/ridge && cd ridge
    conda env create -f config/environment.yml
    conda activate ridge
    ```

3.  3\. Configure

    -   Configure files/directories to search in `content-type` section
        of `ridge_sample.yml`
    -   To run application on test data, update file paths containing
        `/data/` to `tests/data/` in `ridge_sample.yml`
        -   Example replace `/data/org/*.org` with
            `tests/data/org/*.org`

4.  4\. Run

    Load ML model, generate embeddings and expose API to query notes,
    images, transactions etc specified in config YAML

    ``` shell
    python3 -m src.ridge.main -c=config/ridge_sample.yml -vv
    ```

### Upgrade On Local Machine

``` shell
cd ridge
git pull origin master
conda deactivate ridge
conda env update -f config/environment.yml
conda activate ridge
```

## Acknowledgments

-   [Multi-QA MiniLM
    Model](https://huggingface.co/sentence-transformers/multi-qa-MiniLM-L6-cos-v1)
    for Asymmetric Text Search. See [SBert
    Documentation](https://www.sbert.net/examples/applications/retrieve_rerank/README.html)
-   [OpenAI CLIP Model](https://github.com/openai/CLIP) for Image
    Search. See [SBert
    Documentation](https://www.sbert.net/examples/applications/image-search/README.html)
-   Charles Cave for [OrgNode
    Parser](http://members.optusnet.com.au/~charles57/GTD/orgnode.html)
