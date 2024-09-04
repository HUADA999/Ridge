import { App, Notice, PluginSettingTab, Setting, TFile } from 'obsidian';
import Ridge from 'src/main';
import { canConnectToBackend, getBackendStatusMessage, updateContentIndex } from './utils';

export interface UserInfo {
    username?: string;
    photo?: string;
    is_active?: boolean;
    has_documents?: boolean;
    email?: string;
}

interface SyncFileTypes {
    markdown: boolean;
    images: boolean;
    pdf: boolean;
}
export interface RidgeSetting {
    resultsCount: number;
    ridgeUrl: string;
    ridgeApiKey: string;
    connectedToBackend: boolean;
    autoConfigure: boolean;
    lastSync: Map<TFile, number>;
    syncFileType: SyncFileTypes;
    userInfo: UserInfo | null;
}

export const DEFAULT_SETTINGS: RidgeSetting = {
    resultsCount: 6,
    ridgeUrl: 'https://app.ridge.dev',
    ridgeApiKey: '',
    connectedToBackend: false,
    autoConfigure: true,
    lastSync: new Map(),
    syncFileType: {
        markdown: true,
        images: true,
        pdf: true,
    },
    userInfo: null,
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
                this.plugin.settings.userInfo?.email,
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
                        userInfo: this.plugin.settings.userInfo,
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
                        userInfo: this.plugin.settings.userInfo,
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

        // Add new "Sync" heading
        containerEl.createEl('h3', {text: 'Sync'});

        // Add setting to sync markdown notes
        new Setting(containerEl)
            .setName('Sync Notes')
            .setDesc('Index Markdown files in your vault with Ridge.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.syncFileType.markdown)
                .onChange(async (value) => {
                    this.plugin.settings.syncFileType.markdown = value;
                    await this.plugin.saveSettings();
                }));

        // Add setting to sync images
        new Setting(containerEl)
            .setName('Sync Images')
            .setDesc('Index images in your vault with Ridge.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.syncFileType.images)
                .onChange(async (value) => {
                    this.plugin.settings.syncFileType.images = value;
                    await this.plugin.saveSettings();
                }));

        // Add setting to sync PDFs
        new Setting(containerEl)
            .setName('Sync PDFs')
            .setDesc('Index PDF files in your vault with Ridge.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.syncFileType.pdf)
                .onChange(async (value) => {
                    this.plugin.settings.syncFileType.pdf = value;
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
