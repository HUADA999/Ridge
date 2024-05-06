import { Plugin, WorkspaceLeaf } from 'obsidian';
import { RidgeSetting, RidgeSettingTab, DEFAULT_SETTINGS } from 'src/settings'
import { RidgeSearchModal } from 'src/search_modal'
import { RidgeChatView, RIDGE_CHAT_VIEW } from 'src/chat_view'
import { updateContentIndex, canConnectToBackend } from './utils';


export default class Ridge extends Plugin {
    settings: RidgeSetting;
    indexingTimer: NodeJS.Timeout;

    async onload() {
        await this.loadSettings();

        // Add search command. It can be triggered from anywhere
        this.addCommand({
            id: 'search',
            name: 'Search',
            callback: () => { new RidgeSearchModal(this.app, this.settings).open(); }
        });

        // Add similar notes command. It can only be triggered from the editor
        this.addCommand({
            id: 'similar',
            name: 'Find similar notes',
            editorCallback: () => { new RidgeSearchModal(this.app, this.settings, true).open(); }
        });

        // Add chat command. It can be triggered from anywhere
        this.addCommand({
            id: 'chat',
            name: 'Chat',
            callback: () => { this.activateView(RIDGE_CHAT_VIEW); }
        });

        this.registerView(RIDGE_CHAT_VIEW, (leaf) => new RidgeChatView(leaf, this.settings));

        // Create an icon in the left ribbon.
        this.addRibbonIcon('message-circle', 'Ridge', (_: MouseEvent) => {
            this.activateView(RIDGE_CHAT_VIEW);
        });

        // Add a settings tab so the user can configure ridge
        this.addSettingTab(new RidgeSettingTab(this.app, this));

        // Add scheduled job to update index every 60 minutes
        this.indexingTimer = setInterval(async () => {
            if (this.settings.autoConfigure) {
                this.settings.lastSync = await updateContentIndex(this.app.vault, this.settings, this.settings.lastSync);
            }
        }, 60 * 60 * 1000);
    }

    async loadSettings() {
        // Load ridge obsidian plugin settings
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Check if can connect to ridge server
        ({ connectedToBackend: this.settings.connectedToBackend } =
            await canConnectToBackend(this.settings.ridgeUrl, this.settings.ridgeApiKey, true));
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

    async activateView(viewType: string) {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(viewType);

        if (leaves.length > 0) {
          // A leaf with our view already exists, use that
          leaf = leaves[0];
        } else {
          // Our view could not be found in the workspace, create a new leaf
          // in the right sidebar for it
          leaf = workspace.getRightLeaf(false);
          await leaf.setViewState({ type: viewType, active: true });
        }

        // "Reveal" the leaf in case it is in a collapsed sidebar
        workspace.revealLeaf(leaf);
      }
}
