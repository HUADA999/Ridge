from pathlib import Path

app_root_directory = Path(__file__).parent.parent.parent
web_directory = app_root_directory / "ridge/interface/web/"
empty_escape_sequences = "\n|\r|\t| "
app_env_filepath = "~/.ridge/env"
telemetry_server = "https://ridge.beta.haletic.com/v1/telemetry"

# default app config to use
default_config = {
    "content-type": {
        "org": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/org/org.jsonl.gz",
            "embeddings-file": "~/.ridge/content/org/org_embeddings.pt",
            "index_heading_entries": False,
        },
        "markdown": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/markdown/markdown.jsonl.gz",
            "embeddings-file": "~/.ridge/content/markdown/markdown_embeddings.pt",
        },
        "ledger": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/ledger/ledger.jsonl.gz",
            "embeddings-file": "~/.ridge/content/ledger/ledger_embeddings.pt",
        },
        "pdf": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/pdf/pdf.jsonl.gz",
            "embeddings-file": "~/.ridge/content/pdf/pdf_embeddings.pt",
        },
        "image": {
            "input-directories": None,
            "input-filter": None,
            "embeddings-file": "~/.ridge/content/image/image_embeddings.pt",
            "batch-size": 50,
            "use-xmp-metadata": False,
        },
        "music": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/music/music.jsonl.gz",
            "embeddings-file": "~/.ridge/content/music/music_embeddings.pt",
        },
        "github": {
            "pat-token": None,
            "repo-name": None,
            "repo-owner": None,
            "repo-branch": "master",
            "compressed-jsonl": "~/.ridge/content/github/github.jsonl.gz",
            "embeddings-file": "~/.ridge/content/github/github_embeddings.pt",
        },
    },
    "search-type": {
        "symmetric": {
            "encoder": "sentence-transformers/all-MiniLM-L6-v2",
            "cross-encoder": "cross-encoder/ms-marco-MiniLM-L-6-v2",
            "model_directory": "~/.ridge/search/symmetric/",
        },
        "asymmetric": {
            "encoder": "sentence-transformers/multi-qa-MiniLM-L6-cos-v1",
            "cross-encoder": "cross-encoder/ms-marco-MiniLM-L-6-v2",
            "model_directory": "~/.ridge/search/asymmetric/",
        },
        "image": {"encoder": "sentence-transformers/clip-ViT-B-32", "model_directory": "~/.ridge/search/image/"},
    },
    "processor": {
        "conversation": {
            "openai-api-key": None,
            "model": "text-davinci-003",
            "conversation-logfile": "~/.ridge/processor/conversation/conversation_logs.json",
        }
    },
}
