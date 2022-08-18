from pathlib import Path

app_root_directory = Path(__file__).parent.parent.parent
web_directory = app_root_directory / 'src/interface/web/'
empty_escape_sequences = r'\n|\r\t '

# default app config to use
default_config = {
    'content-type': {
        'org': {
            'input-files': None,
            'input-filter': None,
            'compressed-jsonl': '~/.ridge/content/org/org.jsonl.gz',
            'embeddings-file': '~/.ridge/content/org/org_embeddings.pt'
        },
        'markdown': {
            'input-files': None,
            'input-filter': None,
            'compressed-jsonl': '~/.ridge/content/markdown/markdown.jsonl.gz',
            'embeddings-file': '~/.ridge/content/markdown/markdown_embeddings.pt'
        },
        'ledger': {
            'input-files': None,
            'input-filter': None,
            'compressed-jsonl': '~/.ridge/content/ledger/ledger.jsonl.gz',
            'embeddings-file': '~/.ridge/content/ledger/ledger_embeddings.pt'
        },
        'image': {
            'input-directories': None,
            'input-filter': None,
            'embeddings-file': '~/.ridge/content/image/image_embeddings.pt',
            'batch-size': 50,
            'use-xmp-metadata': False
        },
        'music': {
            'input-files': None,
            'input-filter': None,
            'compressed-jsonl': '~/.ridge/content/music/music.jsonl.gz',
            'embeddings-file': '~/.ridge/content/music/music_embeddings.pt'
        }
    },
    'search-type': {
        'symmetric': {
            'encoder': 'sentence-transformers/all-MiniLM-L6-v2',
            'cross-encoder': 'cross-encoder/ms-marco-MiniLM-L-6-v2',
            'model_directory': '~/.ridge/search/symmetric/'
        },
        'asymmetric': {
            'encoder': 'sentence-transformers/multi-qa-MiniLM-L6-cos-v1',
            'cross-encoder': 'cross-encoder/ms-marco-MiniLM-L-6-v2',
            'model_directory': '~/.ridge/search/asymmetric/'
        },
        'image': {
            'encoder': 'sentence-transformers/clip-ViT-B-32',
            'model_directory': '~/.ridge/search/image/'
        }
    },
    'processor': {
        'conversation': {
            'openai-api-key': None,
            'conversation-logfile': '~/.ridge/processor/conversation/conversation_logs.json'
        }
   }
}