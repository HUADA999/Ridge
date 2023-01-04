import { Plugin } from 'obsidian';
import { RidgeSetting, RidgeSettingTab, DEFAULT_SETTINGS } from 'src/settings'
import { RidgeModal } from 'src/modal'
import { configureRidgeBackend } from './utils';


export default class Ridge extends Plugin {
    settings: RidgeSetting;

    async onload() {
        await this.loadSettings();

        // Add a search command. It can be triggered from anywhere
        this.addCommand({
            id: 'search',
            name: 'Search',
            callback: () => {
                new RidgeModal(this.app, this.settings).open();
            }
        });

        // Create an icon in the left ribbon.
        this.addRibbonIcon('search', 'Ridge', (_: MouseEvent) => {
            // Called when the user clicks the icon.
            new RidgeModal(this.app, this.settings).open();
        });

        // Add a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new RidgeSettingTab(this.app, this));
    }

    onunload() {
    }

    async loadSettings() {
        // Load ridge obsidian plugin settings
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Load, configure ridge server settings
        await configureRidgeBackend(this.settings);
    }

    async saveSettings() {
        await this.saveData(this.settings)
            .then(() => configureRidgeBackend(this.settings));
    }
}
