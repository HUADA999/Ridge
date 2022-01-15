# Standard Modules
from pathlib import Path

# External Packages
from fastapi.testclient import TestClient
import pytest

# Internal Packages
from src.main import app, model, config
from src.search_type import asymmetric, image_search
from src.utils.helpers import resolve_absolute_path
from src.utils.rawconfig import ContentConfig, SearchConfig


# Arrange
# ----------------------------------------------------------------------------------------------------
client = TestClient(app)

# Test
# ----------------------------------------------------------------------------------------------------
def test_search_with_invalid_content_type():
    # Arrange
    user_query = "How to call semantic search from Emacs?"

    # Act
    response = client.get(f"/search?q={user_query}&t=invalid_content_type")

    # Assert
    assert response.status_code == 422


# ----------------------------------------------------------------------------------------------------
def test_search_with_valid_content_type(content_config: ContentConfig, search_config: SearchConfig):
    # Arrange
    config.content_type = content_config
    config.search_type = search_config

    # config.content_type.image = search_config.image
    for content_type in ["notes", "ledger", "music", "image"]:
        # Act
        response = client.get(f"/search?q=random&t={content_type}")
        # Assert
        assert response.status_code == 200


# ----------------------------------------------------------------------------------------------------
def test_regenerate_with_invalid_content_type():
    # Act
    response = client.get(f"/regenerate?t=invalid_content_type")

    # Assert
    assert response.status_code == 422


# ----------------------------------------------------------------------------------------------------
def test_regenerate_with_valid_content_type(content_config: ContentConfig, search_config: SearchConfig):
    # Arrange
    config.content_type = content_config
    config.search_type = search_config

    for content_type in ["notes", "ledger", "music", "image"]:
        # Act
        response = client.get(f"/regenerate?t={content_type}")
        # Assert
        assert response.status_code == 200


# ----------------------------------------------------------------------------------------------------
@pytest.mark.skip(reason="Flaky test. Search doesn't always return expected image path.")
def test_image_search(content_config: ContentConfig, search_config: SearchConfig):
    # Arrange
    config.content_type = content_config
    config.search_type = search_config
    model.image_search = image_search.setup(content_config.image, search_config.image, regenerate=False)
    query_expected_image_pairs = [("brown kitten next to fallen plant", "kitten_park.jpg"),
                                  ("a horse and dog on a leash", "horse_dog.jpg"),
                                  ("A guinea pig eating grass", "guineapig_grass.jpg")]

    # Act
    for query, expected_image_name in query_expected_image_pairs:
        response = client.get(f"/search?q={query}&n=1&t=image")

        # Assert
        assert response.status_code == 200
        actual_image = Path(response.json()[0]["Entry"])
        expected_image = resolve_absolute_path(content_config.image.input_directory.joinpath(expected_image_name))

        # Assert
        assert expected_image == actual_image


# ----------------------------------------------------------------------------------------------------
def test_notes_search(content_config: ContentConfig, search_config: SearchConfig):
    # Arrange
    model.notes_search = asymmetric.setup(content_config.org, search_config.asymmetric, regenerate=False)
    user_query = "How to git install application?"

    # Act
    response = client.get(f"/search?q={user_query}&n=1&t=notes")

    # Assert
    assert response.status_code == 200
    # assert actual_data contains "Semantic Search via Emacs" entry
    search_result = response.json()[0]["Entry"]
    assert "git clone" in search_result


# ----------------------------------------------------------------------------------------------------
def test_notes_search_with_include_filter(content_config: ContentConfig, search_config: SearchConfig):
    # Arrange
    model.notes_search = asymmetric.setup(content_config.org, search_config.asymmetric, regenerate=False)
    user_query = "How to git install application? +Emacs"

    # Act
    response = client.get(f"/search?q={user_query}&n=1&t=notes")

    # Assert
    assert response.status_code == 200
    # assert actual_data contains explicitly included word "Emacs"
    search_result = response.json()[0]["Entry"]
    assert "Emacs" in search_result


# ----------------------------------------------------------------------------------------------------
def test_notes_search_with_exclude_filter(content_config: ContentConfig, search_config: SearchConfig):
    # Arrange
    model.notes_search = asymmetric.setup(content_config.org, search_config.asymmetric, regenerate=False)
    user_query = "How to git install application? -clone"

    # Act
    response = client.get(f"/search?q={user_query}&n=1&t=notes")

    # Assert
    assert response.status_code == 200
    # assert actual_data does not contains explicitly excluded word "Emacs"
    search_result = response.json()[0]["Entry"]
    assert "clone" not in search_result
