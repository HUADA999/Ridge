from pathlib import Path

app_root_directory = Path(__file__).parent.parent.parent
web_directory = app_root_directory / "ridge/interface/web/"
next_js_directory = app_root_directory / "ridge/interface/built/"
pypi_static_directory = app_root_directory / "ridge/interface/compiled/"
empty_escape_sequences = "\n|\r|\t| "
app_env_filepath = "~/.ridge/env"
telemetry_server = "https://ridge.beta.haletic.com/v1/telemetry"
content_directory = "~/.ridge/content/"
default_offline_chat_model = "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF"
default_online_chat_model = "gpt-4-turbo-preview"

empty_config = {
    "search-type": {
        "image": {"encoder": "sentence-transformers/clip-ViT-B-32", "model_directory": "~/.ridge/search/image/"},
    },
}

# default app config to use
default_config = {
    "search-type": {
        "image": {"encoder": "sentence-transformers/clip-ViT-B-32", "model_directory": "~/.ridge/search/image/"},
    },
}
