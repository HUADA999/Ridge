import { App, PluginSettingTab, Setting } from 'obsidian';
import Ridge from 'src/main';
import { getVaultAbsolutePath } from 'src/utils';

export interface RidgeSetting {
    resultsCount: number;
    ridgeUrl: string;
    obsidianVaultPath: string;
    connectedToBackend: boolean;
}

export const DEFAULT_SETTINGS: RidgeSetting = {
    resultsCount: 6,
    ridgeUrl: 'http://localhost:8000',
    obsidianVaultPath: getVaultAbsolutePath(),
    connectedToBackend: false,
}

export class RidgeSettingTab extends PluginSettingTab {
    plugin: Ridge;

    constructor(app: App, plugin: Ridge) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Add notice if unable to connect to ridge backend
        if (!this.plugin.settings.connectedToBackend) {
            containerEl.createEl('small', { text: '❗Ensure Ridge backend is running and Ridge URL is correctly set below' });
        }

        // Add ridge settings configurable from the plugin settings tab
        new Setting(containerEl)
            .setName('Vault Paths')
            .setDesc('The Obsidian Vault to search with Ridge')
            .addText(text => text
                .setValue(`${this.plugin.settings.obsidianVaultPath}`)
                .onChange(async (value) => {
                    this.plugin.settings.obsidianVaultPath = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Ridge URL')
            .setDesc('The URL of the Ridge backend')
            .addText(text => text
                .setValue(`${this.plugin.settings.ridgeUrl}`)
                .onChange(async (value) => {
                    this.plugin.settings.ridgeUrl = value;
                    await this.plugin.saveSettings();
                }));
         new Setting(containerEl)
            .setName('Number of Results')
            .setDesc('The number of search results to show')
            .addText(text => text
                .setPlaceholder('6')
                .setValue(`${this.plugin.settings.resultsCount}`)
                .onChange(async (value) => {
                    this.plugin.settings.resultsCount = parseInt(value);
                    await this.plugin.saveSettings();
                }));
    }
}
