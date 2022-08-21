# Standard Packages
import json
from posixpath import split

# Internal Packages
from src.processor.org_mode.org_to_jsonl import convert_org_entries_to_jsonl, extract_org_entries
from src.utils.helpers import is_none_or_empty


def test_entry_with_empty_body_line_to_jsonl(tmp_path):
    '''Ensure entries with empty body are ignored.
    Property drawers not considered Body. Ignore control characters for evaluating if Body empty.'''
    # Arrange
    entry = f'''*** Heading
    :PROPERTIES:
    :ID:       42-42-42
    :END:
    \t\r\n 
    '''
    orgfile = create_file(tmp_path, entry)

    # Act
    # Extract Entries from specified Org files
    entries = extract_org_entries(org_files=[orgfile])

    # Process Each Entry from All Notes Files
    jsonl_data = convert_org_entries_to_jsonl(entries)

    # Assert
    assert is_none_or_empty(jsonl_data)


def test_entry_with_body_to_jsonl(tmp_path):
    "Ensure entries with valid body text are loaded."
    # Arrange
    entry = f'''*** Heading
    :PROPERTIES:
    :ID:       42-42-42
    :END:
    \t\r\nBody Line 1\n
    '''
    orgfile = create_file(tmp_path, entry)

    # Act
    # Extract Entries from specified Org files
    entries = extract_org_entries(org_files=[orgfile])

    # Process Each Entry from All Notes Files
    jsonl_string = convert_org_entries_to_jsonl(entries)
    jsonl_data = [json.loads(json_string) for json_string in jsonl_string.splitlines()] 

    # Assert
    assert len(jsonl_data) == 1


# Helper Functions
def create_file(tmp_path, entry, filename="test.org"):
    org_file = tmp_path / f"notes/{filename}"
    org_file.parent.mkdir()
    org_file.touch()
    org_file.write_text(entry)
    return org_file