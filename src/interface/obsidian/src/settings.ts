import { App, Notice, PluginSettingTab, request, Setting } from 'obsidian';
import Ridge from 'src/main';

export interface RidgeSetting {
    resultsCount: number;
    ridgeUrl: string;
    connectedToBackend: boolean;
}

export const DEFAULT_SETTINGS: RidgeSetting = {
    resultsCount: 6,
    ridgeUrl: 'http://localhost:8000',
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

        // Add notice whether able to connect to ridge backend or not
        containerEl.createEl('small', { text: this.getBackendStatusMessage() });

        // Add ridge settings configurable from the plugin settings tab
        new Setting(containerEl)
            .setName('Ridge URL')
            .setDesc('The URL of the Ridge backend')
            .addText(text => text
                .setValue(`${this.plugin.settings.ridgeUrl}`)
                .onChange(async (value) => {
                    this.plugin.settings.ridgeUrl = value.trim();
                    await this.plugin.saveSettings();
                    containerEl.firstElementChild?.setText(this.getBackendStatusMessage());
                }));
         new Setting(containerEl)
            .setName('Results Count')
            .setDesc('The number of search results to show')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.resultsCount)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.resultsCount = value;
                    await this.plugin.saveSettings();
                }));
        let indexVaultSetting = new Setting(containerEl);
        indexVaultSetting
            .setName('Index Vault')
            .setDesc('Manually force Ridge to re-index your Obsidian Vault')
            .addButton(button => button
                .setButtonText('Update')
                .setCta()
                .onClick(async () => {
                    // Disable button while updating index
                    button.setButtonText('Updating...');
                    button.removeCta();
                    indexVaultSetting = indexVaultSetting.setDisabled(true);

                    await request(`${this.plugin.settings.ridgeUrl}/api/update?t=markdown&force=true`);
                    new Notice('✅ Updated Ridge index.');

                    // Re-enable button once index is updated
                    button.setButtonText('Update');
                    button.setCta();
                    indexVaultSetting = indexVaultSetting.setDisabled(false);
                })
            );
    }

    getBackendStatusMessage() {
        return !this.plugin.settings.connectedToBackend
        ? '❗Disconnected from Ridge backend. Ensure Ridge backend is running and Ridge URL is correctly set below.'
        : '✅ Connected to Ridge backend.';
    }
}
