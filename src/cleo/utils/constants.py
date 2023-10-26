from pathlib import Path

app_root_directory = Path(__file__).parent.parent.parent
web_directory = app_root_directory / "ridge/interface/web/"
empty_escape_sequences = "\n|\r|\t| "
app_env_filepath = "~/.ridge/env"
telemetry_server = "https://ridge.beta.haletic.com/v1/telemetry"
content_directory = "~/.ridge/content/"

empty_config = {
    "content-type": {
        "org": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/org/org.jsonl.gz",
            "embeddings-file": "~/.ridge/content/org/org_embeddings.pt",
            "index-heading-entries": False,
        },
        "markdown": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/markdown/markdown.jsonl.gz",
            "embeddings-file": "~/.ridge/content/markdown/markdown_embeddings.pt",
        },
        "pdf": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/pdf/pdf.jsonl.gz",
            "embeddings-file": "~/.ridge/content/pdf/pdf_embeddings.pt",
        },
        "plaintext": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/plaintext/plaintext.jsonl.gz",
            "embeddings-file": "~/.ridge/content/plaintext/plaintext_embeddings.pt",
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
            "openai": {
                "api-key": None,
                "chat-model": "gpt-3.5-turbo",
            },
            "offline-chat": {
                "enable-offline-chat": False,
                "chat-model": "llama-2-7b-chat.ggmlv3.q4_0.bin",
            },
            "tokenizer": None,
            "max-prompt-size": None,
            "conversation-logfile": "~/.ridge/processor/conversation/conversation_logs.json",
        }
    },
}

# default app config to use
default_config = {
    "content-type": {
        "org": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/org/org.jsonl.gz",
            "embeddings-file": "~/.ridge/content/org/org_embeddings.pt",
            "index-heading-entries": False,
        },
        "markdown": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/markdown/markdown.jsonl.gz",
            "embeddings-file": "~/.ridge/content/markdown/markdown_embeddings.pt",
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
        "github": {
            "pat-token": None,
            "repos": [],
            "compressed-jsonl": "~/.ridge/content/github/github.jsonl.gz",
            "embeddings-file": "~/.ridge/content/github/github_embeddings.pt",
        },
        "notion": {
            "token": None,
            "compressed-jsonl": "~/.ridge/content/notion/notion.jsonl.gz",
            "embeddings-file": "~/.ridge/content/notion/notion_embeddings.pt",
        },
        "plaintext": {
            "input-files": None,
            "input-filter": None,
            "compressed-jsonl": "~/.ridge/content/plaintext/plaintext.jsonl.gz",
            "embeddings-file": "~/.ridge/content/plaintext/plaintext_embeddings.pt",
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
            "openai": {
                "api-key": None,
                "chat-model": "gpt-3.5-turbo",
            },
            "offline-chat": {
                "enable-offline-chat": False,
                "chat-model": "llama-2-7b-chat.ggmlv3.q4_0.bin",
            },
            "tokenizer": None,
            "max-prompt-size": None,
            "conversation-logfile": "~/.ridge/processor/conversation/conversation_logs.json",
        }
    },
}
