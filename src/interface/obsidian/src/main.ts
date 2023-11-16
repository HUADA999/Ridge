import { Notice, Plugin, request } from 'obsidian';
import { RidgeSetting, RidgeSettingTab, DEFAULT_SETTINGS } from 'src/settings'
import { RidgeSearchModal } from 'src/search_modal'
import { RidgeChatModal } from 'src/chat_modal'
import { updateContentIndex } from './utils';


export default class Ridge extends Plugin {
    settings: RidgeSetting;
    indexingTimer: NodeJS.Timeout;

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
                if (!checking && this.settings.connectedToBackend)
                    new RidgeChatModal(this.app, this.settings).open();
                return this.settings.connectedToBackend;
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

        // Add scheduled job to update index every 60 minutes
        this.indexingTimer = setInterval(async () => {
            if (this.settings.autoConfigure) {
                this.settings.lastSyncedFiles = await updateContentIndex(
                    this.app.vault, this.settings, this.settings.lastSyncedFiles
                );
            }
        }, 60 * 60 * 1000);
    }

    async loadSettings() {
        // Load ridge obsidian plugin settings
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Check if ridge backend is configured, note if cannot connect to backend
        let headers = { "Authorization": `Bearer ${this.settings.ridgeApiKey}` };

        if (this.settings.ridgeUrl === "https://app.ridge.dev") {
            if (this.settings.ridgeApiKey === "") {
                new Notice(`❗️Ridge API key is not configured. Please visit https://app.ridge.dev to get an API key.`);
                return;
            }

            await request({ url: this.settings.ridgeUrl ,method: "GET", headers: headers })
                .then(response => {
                    this.settings.connectedToBackend = true;
                })
                .catch(error => {
                    this.settings.connectedToBackend = false;
                    new Notice(`❗️Ensure Ridge backend is running and Ridge URL is pointing to it in the plugin settings.\n\n${error}`);
                });
        }
    }

    async saveSettings() {
        this.saveData(this.settings);
    }

    async onunload() {
        // Remove scheduled job to update index at regular cadence
        if (this.indexingTimer)
            clearInterval(this.indexingTimer);

        this.unload();
    }
}
