import { Notice, Plugin } from 'obsidian';
import { RidgeSetting, RidgeSettingTab, DEFAULT_SETTINGS } from 'src/settings'
import { RidgeSearchModal } from 'src/search_modal'
import { RidgeChatModal } from 'src/chat_modal'
import { configureRidgeBackend } from './utils';


export default class Ridge extends Plugin {
    settings: RidgeSetting;

    async onload() {
        await this.loadSettings();

        // Add search command. It can be triggered from anywhere
        this.addCommand({
            id: 'search',
            name: 'Search',
            checkCallback: (checking) => {
                if (!checking && this.settings.connectedToBackend)
                    new RidgeSearchModal(this.app, this.settings).open();
                return this.settings.connectedToBackend;
            }
        });

        // Add similar notes command. It can only be triggered from the editor
        this.addCommand({
            id: 'similar',
            name: 'Find similar notes',
            editorCheckCallback: (checking) => {
                if (!checking && this.settings.connectedToBackend)
                    new RidgeSearchModal(this.app, this.settings, true).open();
                return this.settings.connectedToBackend;
            }
        });

        // Add chat command. It can be triggered from anywhere
        this.addCommand({
            id: 'chat',
            name: 'Chat',
            checkCallback: (checking) => {
                if (!checking && this.settings.connectedToBackend && (!!this.settings.openaiApiKey || this.settings.enableOfflineChat))
                    new RidgeChatModal(this.app, this.settings).open();
                return !!this.settings.openaiApiKey || this.settings.enableOfflineChat;
            }
        });

        // Create an icon in the left ribbon.
        this.addRibbonIcon('search', 'Ridge', (_: MouseEvent) => {
            // Called when the user clicks the icon.
            this.settings.connectedToBackend
                ? new RidgeSearchModal(this.app, this.settings).open()
                : new Notice(`❗️Ensure Ridge backend is running and Ridge URL is pointing to it in the plugin settings`);
        });

        // Add a settings tab so the user can configure ridge
        this.addSettingTab(new RidgeSettingTab(this.app, this));
    }

    async loadSettings() {
        // Load ridge obsidian plugin settings
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        if (this.settings.autoConfigure) {
            // Load, configure ridge server settings
            await configureRidgeBackend(this.app.vault, this.settings);
        }
    }

    async saveSettings() {
        if (this.settings.autoConfigure) {
            await configureRidgeBackend(this.app.vault, this.settings, false);
        }
        this.saveData(this.settings);
    }
}
