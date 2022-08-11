# External Packages
from PyQt6 import QtWidgets
from PyQt6.QtCore import Qt

# Internal Packages
from src.configure import configure_server
from src.utils import constants, state, yaml as yaml_utils
from src.utils.cli import cli
from src.utils.config import SearchType
from src.interface.desktop.file_browser import FileBrowser


class ConfigureScreen(QtWidgets.QDialog):
    """Create Window to Configure Ridge
    Allow user to
    1. Enable/Disable search on 1. org-mode, 2. markdown, 3. beancount or 4. image content types
    2. Configure the server host and port
    3. Save the configuration to ridge.yml and start the server
    """

    def __init__(self, config_file, parent=None):
        super(ConfigureScreen, self).__init__(parent=parent)
        self.config_file = config_file

        # Load config from existing config, if exists, else load from default config
        self.config = yaml_utils.load_config_from_file(self.config_file)
        if self.config is None:
            self.config = yaml_utils.load_config_from_file(constants.app_root_directory / 'config/ridge_sample.yml')

        # Initialize Configure Window
        self.setWindowFlags(Qt.WindowType.WindowStaysOnTopHint)
        self.setWindowTitle("Ridge - Configure")

        # Initialize Configure Window Layout
        layout = QtWidgets.QVBoxLayout()
        self.setLayout(layout)

        # Add Settings Panels for each Search Type to Configure Window Layout
        self.settings_panels = []
        for search_type in SearchType:
            current_content_config = self.config['content-type'].get(search_type, {})
            self.settings_panels += [self.add_settings_panel(search_type, current_content_config, layout)]
        self.add_conversation_processor_panel(layout)
        self.add_action_panel(layout)

    def add_settings_panel(self, search_type: SearchType, current_content_config: dict, parent_layout: QtWidgets.QLayout):
        "Add Settings Panel for specified Search Type. Toggle Editable Search Types"
        # Get current files from config for given search type
        if search_type == SearchType.Image:
            current_content_files = current_content_config.get('input-directories', [])
        else:
            current_content_files = current_content_config.get('input-files', [])

        # Create widgets to display settings for given search type
        search_type_settings = QtWidgets.QWidget()
        search_type_layout = QtWidgets.QVBoxLayout(search_type_settings)
        enable_search_type = CheckBox(f"Search {search_type.name}", search_type)
        # Add file browser to set input files for given search type
        input_files = FileBrowser(f'{search_type.name} Files', search_type, current_content_files)

        # Set enabled/disabled based on checkbox state
        enable_search_type.setChecked(len(current_content_files) > 0)
        input_files.setEnabled(enable_search_type.isChecked())
        enable_search_type.stateChanged.connect(lambda _: input_files.setEnabled(enable_search_type.isChecked()))

        # Add setting widgets for given search type to panel
        search_type_layout.addWidget(enable_search_type)
        search_type_layout.addWidget(input_files)
        parent_layout.addWidget(search_type_settings)

        return search_type_settings

    def add_conversation_processor_panel(self, parent_layout: QtWidgets.QLayout):
        "Add Conversation Processor Panel"
        processor_type_settings = QtWidgets.QWidget()
        processor_type_layout = QtWidgets.QVBoxLayout(processor_type_settings)

        enable_conversation = QtWidgets.QCheckBox(f"Conversation")

        conversation_settings = QtWidgets.QWidget()
        conversation_settings_layout = QtWidgets.QHBoxLayout(conversation_settings)
        input_label = QtWidgets.QLabel()
        input_label.setText("OpenAI API Key")
        input_label.setFixedWidth(95)

        input_field = QtWidgets.QLineEdit()
        input_field.setFixedWidth(245)
        input_field.setEnabled(enable_conversation.isChecked())

        enable_conversation.stateChanged.connect(lambda _: input_field.setEnabled(enable_conversation.isChecked()))

        conversation_settings_layout.addWidget(input_label)
        conversation_settings_layout.addWidget(input_field)

        processor_type_layout.addWidget(enable_conversation)
        processor_type_layout.addWidget(conversation_settings)
        processor_type_layout.addStretch()

        parent_layout.addWidget(processor_type_settings)
        return processor_type_settings

    def add_action_panel(self, parent_layout: QtWidgets.QLayout):
        "Add Action Panel"
        # Button to Save Settings
        action_bar = QtWidgets.QWidget()
        action_bar_layout = QtWidgets.QHBoxLayout(action_bar)

        save_button = QtWidgets.QPushButton("Start", clicked=self.save_settings)

        action_bar_layout.addWidget(save_button)
        parent_layout.addWidget(action_bar)

    def save_settings(self, _):
        "Save the settings to ridge.yml"
        # Update config with settings from UI
        for settings_panel in self.settings_panels:
            for child in settings_panel.children():
                if isinstance(child, (CheckBox, FileBrowser)) and child.search_type not in self.config['content-type']:
                    continue
                if isinstance(child, CheckBox) and not child.isChecked():
                        del self.config['content-type'][child.search_type]
                elif isinstance(child, FileBrowser):
                    self.config['content-type'][child.search_type]['input-files'] = child.getPaths()
                    print(f"{child.search_type} files are {child.getPaths()}")

        # Save the config to app config file
        yaml_utils.save_config_to_file(self.config, self.config_file)

        # Load parsed, validated config from app config file
        args = cli(state.cli_args)

        # Configure server with loaded config
        configure_server(args, required=True)

        self.hide()


class CheckBox(QtWidgets.QCheckBox):
    def __init__(self, text, search_type: SearchType, parent=None):
        self.search_type = search_type
        super(CheckBox, self).__init__(text, parent=parent)
