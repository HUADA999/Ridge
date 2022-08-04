# Standard Modules
from pathlib import Path
from random import random

# External Modules
import pytest

# Internal Packages
from src.utils.cli import cli


# Test
# ----------------------------------------------------------------------------------------------------
def test_cli_minimal_default():
    # Act
    actual_args = cli(['tests/data/config.yml'])

    # Assert
    assert actual_args.config_file == Path('tests/data/config.yml')
    assert actual_args.regenerate == False
    assert actual_args.verbose == 0

# ----------------------------------------------------------------------------------------------------
def test_cli_invalid_config_file_path():
    # Act
    with pytest.raises(ValueError):
        cli([f"non-existent-ridge-{random()}.yml"])

# ----------------------------------------------------------------------------------------------------
def test_cli_config_from_file():
    # Act
    actual_args = cli(['tests/data/config.yml',
                       '--regenerate',
                       '-vvv'])

    # Assert
    assert actual_args.config_file == Path('tests/data/config.yml')
    assert actual_args.regenerate == True
    assert actual_args.config is not None
    assert actual_args.config.content_type.org.input_files == [Path('~/first_from_config.org'), Path('~/second_from_config.org')]
    assert actual_args.verbose == 3
