import { App, Notice, PluginSettingTab, Setting, TFile } from 'obsidian';
import Ridge from 'src/main';
import { canConnectToBackend, getBackendStatusMessage, updateContentIndex } from './utils';

export interface RidgeSetting {
    resultsCount: number;
    ridgeUrl: string;
    ridgeApiKey: string;
    connectedToBackend: boolean;
    autoConfigure: boolean;
    lastSync: Map<TFile, number>;
    userEmail: string;
}

export const DEFAULT_SETTINGS: RidgeSetting = {
    resultsCount: 6,
    ridgeUrl: 'https://app.ridge.dev',
    ridgeApiKey: '',
    connectedToBackend: false,
    autoConfigure: true,
    lastSync: new Map(),
    userEmail: '',
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

        // Add notice whether able to connect to ridge backend or not
        let backendStatusEl = containerEl.createEl('small', {
            text: getBackendStatusMessage(
                this.plugin.settings.connectedToBackend,
                this.plugin.settings.userEmail,
                this.plugin.settings.ridgeUrl,
                this.plugin.settings.ridgeApiKey
            )}
        );
        let backendStatusMessage: string = '';

        // Add ridge settings configurable from the plugin settings tab
        new Setting(containerEl)
            .setName('Ridge URL')
            .setDesc('The URL of the Ridge backend.')
            .addText(text => text
                .setValue(`${this.plugin.settings.ridgeUrl}`)
                .onChange(async (value) => {
                    this.plugin.settings.ridgeUrl = value.trim().replace(/\/$/, '');
                    ({
                        connectedToBackend: this.plugin.settings.connectedToBackend,
                        userEmail: this.plugin.settings.userEmail,
                        statusMessage: backendStatusMessage,
                    } = await canConnectToBackend(this.plugin.settings.ridgeUrl, this.plugin.settings.ridgeApiKey));

                    await this.plugin.saveSettings();
                    backendStatusEl.setText(backendStatusMessage);
                }));
        new Setting(containerEl)
            .setName('Ridge API Key')
            .setDesc('Use Ridge Cloud with your Ridge API Key')
            .addText(text => text
                .setValue(`${this.plugin.settings.ridgeApiKey}`)
                .onChange(async (value) => {
                    this.plugin.settings.ridgeApiKey = value.trim();
                    ({
                        connectedToBackend: this.plugin.settings.connectedToBackend,
                        userEmail: this.plugin.settings.userEmail,
                        statusMessage: backendStatusMessage,
                    } = await canConnectToBackend(this.plugin.settings.ridgeUrl, this.plugin.settings.ridgeApiKey));
                    await this.plugin.saveSettings();
                    backendStatusEl.setText(backendStatusMessage);
                }));
        new Setting(containerEl)
            .setName('Results Count')
            .setDesc('The number of results to show in search and use for chat.')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.resultsCount)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.resultsCount = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Auto Sync')
            .setDesc('Automatically index your vault with Ridge.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoConfigure)
                .onChange(async (value) => {
                    this.plugin.settings.autoConfigure = value;
                    await this.plugin.saveSettings();
                }));
        let indexVaultSetting = new Setting(containerEl);
        indexVaultSetting
            .setName('Force Sync')
            .setDesc('Manually force Ridge to re-index your Obsidian Vault.')
            .addButton(button => button
                .setButtonText('Update')
                .setCta()
                .onClick(async () => {
                    // Disable button while updating index
                    button.setButtonText('Updating 🌑');
                    button.removeCta();
                    indexVaultSetting = indexVaultSetting.setDisabled(true);

                    // Show indicator for indexing in progress
                    const progress_indicator = window.setInterval(() => {
                        if (button.buttonEl.innerText === 'Updating 🌑') {
                            button.setButtonText('Updating 🌘');
                        } else if (button.buttonEl.innerText === 'Updating 🌘') {
                            button.setButtonText('Updating 🌗');
                        } else if (button.buttonEl.innerText === 'Updating 🌗') {
                            button.setButtonText('Updating 🌖');
                        } else if (button.buttonEl.innerText === 'Updating 🌖') {
                            button.setButtonText('Updating 🌕');
                        } else if (button.buttonEl.innerText === 'Updating 🌕') {
                            button.setButtonText('Updating 🌔');
                        } else if (button.buttonEl.innerText === 'Updating 🌔') {
                            button.setButtonText('Updating 🌓');
                        } else if (button.buttonEl.innerText === 'Updating 🌓') {
                            button.setButtonText('Updating 🌒');
                        } else if (button.buttonEl.innerText === 'Updating 🌒') {
                            button.setButtonText('Updating 🌑');
                        }
                    }, 300);
                    this.plugin.registerInterval(progress_indicator);

                    this.plugin.settings.lastSync = await updateContentIndex(
                        this.app.vault, this.plugin.settings, this.plugin.settings.lastSync, true
                    );
                    new Notice('✅ Updated Ridge index.');

                    // Reset button once index is updated
                    window.clearInterval(progress_indicator);
                    button.setButtonText('Update');
                    button.setCta();
                    indexVaultSetting = indexVaultSetting.setDisabled(false);
                })
            );
    }
}
