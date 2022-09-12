# Standard Packages
import json

# Internal Packages
from src.processor.org_mode.org_to_jsonl import convert_org_entries_to_jsonl, convert_org_nodes_to_entries, extract_org_entries, get_org_files
from src.utils.helpers import is_none_or_empty


def test_configure_heading_entry_to_jsonl(tmp_path):
    '''Ensure entries with empty body are ignored, unless explicitly configured to index heading entries.
    Property drawers not considered Body. Ignore control characters for evaluating if Body empty.'''
    # Arrange
    entry = f'''*** Heading
    :PROPERTIES:
    :ID:       42-42-42
    :END:
    \t \r
    '''
    orgfile = create_file(tmp_path, entry)

    for index_heading_entries in [True, False]:
        # Act
        # Extract entries into jsonl from specified Org files
        jsonl_string = convert_org_entries_to_jsonl(convert_org_nodes_to_entries(
            *extract_org_entries(org_files=[orgfile]),
            index_heading_entries=index_heading_entries))
        jsonl_data = [json.loads(json_string) for json_string in jsonl_string.splitlines()]

        # Assert
        if index_heading_entries:
            # Entry with empty body indexed when index_heading_entries set to True
            assert len(jsonl_data) == 1
        else:
            # Entry with empty body ignored when index_heading_entries set to False
            assert is_none_or_empty(jsonl_data)


def test_entry_with_body_to_jsonl(tmp_path):
    "Ensure entries with valid body text are loaded."
    # Arrange
    entry = f'''*** Heading
    :PROPERTIES:
    :ID:       42-42-42
    :END:
    \t\r
    Body Line 1
    '''
    orgfile = create_file(tmp_path, entry)

    # Act
    # Extract Entries from specified Org files
    entries, entry_to_file_map = extract_org_entries(org_files=[orgfile])

    # Process Each Entry from All Notes Files
    jsonl_string = convert_org_entries_to_jsonl(convert_org_nodes_to_entries(entries, entry_to_file_map))
    jsonl_data = [json.loads(json_string) for json_string in jsonl_string.splitlines()]

    # Assert
    assert len(jsonl_data) == 1


def test_file_with_no_headings_to_jsonl(tmp_path):
    "Ensure files with no heading, only body text are loaded."
    # Arrange
    entry = f'''
    - Bullet point 1
    - Bullet point 2
    '''
    orgfile = create_file(tmp_path, entry)

    # Act
    # Extract Entries from specified Org files
    entry_nodes, file_to_entries = extract_org_entries(org_files=[orgfile])

    # Process Each Entry from All Notes Files
    entries = convert_org_nodes_to_entries(entry_nodes, file_to_entries)
    jsonl_string = convert_org_entries_to_jsonl(entries)
    jsonl_data = [json.loads(json_string) for json_string in jsonl_string.splitlines()] 

    # Assert
    assert len(jsonl_data) == 1


def test_get_org_files(tmp_path):
    "Ensure Org files specified via input-filter, input-files extracted"
    # Arrange
    # Include via input-filter globs
    group1_file1 = create_file(tmp_path, filename="group1-file1.org")
    group1_file2 = create_file(tmp_path, filename="group1-file2.org")
    group2_file1 = create_file(tmp_path, filename="group2-file1.org")
    group2_file2 = create_file(tmp_path, filename="group2-file2.org")
    # Include via input-file field
    orgfile1 = create_file(tmp_path, filename="orgfile1.org")
    # Not included by any filter
    create_file(tmp_path, filename="orgfile2.org")
    create_file(tmp_path, filename="text1.txt")

    expected_files = sorted(map(str, [group1_file1, group1_file2, group2_file1, group2_file2, orgfile1]))

    # Setup input-files, input-filters
    input_files = [tmp_path / 'orgfile1.org']
    input_filter = [tmp_path / 'group1*.org', tmp_path / 'group2*.org']

    # Act
    extracted_org_files = get_org_files(input_files, input_filter)

    # Assert
    assert len(extracted_org_files) == 5
    assert extracted_org_files == expected_files


# Helper Functions
def create_file(tmp_path, entry=None, filename="test.org"):
    org_file = tmp_path / filename
    org_file.touch()
    if entry:
        org_file.write_text(entry)
    return org_file
