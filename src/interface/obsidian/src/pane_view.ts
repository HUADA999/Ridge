import { ItemView, WorkspaceLeaf } from 'obsidian';
import { RidgeSetting } from 'src/settings';
import { RidgeSearchModal } from 'src/search_modal';
import { RidgeView, populateHeaderPane } from './utils';

export abstract class RidgePaneView extends ItemView {
    setting: RidgeSetting;

    constructor(leaf: WorkspaceLeaf, setting: RidgeSetting) {
        super(leaf);

        this.setting = setting;

        // Register Modal Keybindings to send user message
        // this.scope.register([], 'Enter', async () => { await this.chat() });
    }

    async onOpen() {
        let { contentEl } = this;

        // Add title to the Ridge Chat modal
        let headerEl = contentEl.createDiv(({ attr: { id: "ridge-header", class: "ridge-header" } }));
        // Setup the header pane
        await populateHeaderPane(headerEl, this.setting);
        // Set the active nav pane
        headerEl.getElementsByClassName("chat-nav")[0]?.classList.add("ridge-nav-selected");
        headerEl.getElementsByClassName("chat-nav")[0]?.addEventListener("click", (_) => { this.activateView(RidgeView.CHAT); });
        headerEl.getElementsByClassName("search-nav")[0]?.addEventListener("click", (_) => { new RidgeSearchModal(this.app, this.setting).open(); });
        headerEl.getElementsByClassName("similar-nav")[0]?.addEventListener("click", (_) => { new RidgeSearchModal(this.app, this.setting, true).open(); });
        let similarNavSvgEl = headerEl.getElementsByClassName("ridge-nav-icon-similar")[0]?.firstElementChild;
        if (!!similarNavSvgEl) similarNavSvgEl.id = "similar-nav-icon-svg";
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
            await leaf?.setViewState({ type: viewType, active: true });
        }

        if (leaf) {
            if (viewType === RidgeView.CHAT) {
                // focus on the chat input when the chat view is opened
                let chatInput = <HTMLTextAreaElement>this.contentEl.getElementsByClassName("ridge-chat-input")[0];
                if (chatInput) chatInput.focus();
            }

            // "Reveal" the leaf in case it is in a collapsed sidebar
            workspace.revealLeaf(leaf);
        }
    }
}
