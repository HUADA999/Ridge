import { App, Modal, request, Setting } from 'obsidian';
import { RidgeSetting } from 'src/settings';


export class RidgeChatModal extends Modal {
    result: string;
    setting: RidgeSetting;

    constructor(app: App, setting: RidgeSetting) {
        super(app);
        this.setting = setting;

        // Register Modal Keybindings to send user message
        this.scope.register([], 'Enter', async () => {
            // Get text in chat input elmenet
            let input_el = <HTMLInputElement>this.contentEl.getElementsByClassName("ridge-chat-input")[0];

            // Clear text after extracting message to send
            let user_message = input_el.value;
            input_el.value = "";

            // Get and render chat response to user message
            await this.getChatResponse(user_message);
        });
    }

    async onOpen() {
        let { contentEl } = this;
        contentEl.addClass("ridge-chat");

        // Add title to the Ridge Chat modal
        contentEl.createEl("h1", ({ attr: { id: "ridge-chat-title" }, text: "Ridge Chat" }));

        // Create area for chat logs
        contentEl.createDiv({ attr: { id: "ridge-chat-body", class: "ridge-chat-body" } });

        // Get conversation history from Ridge backend
        let chatUrl = `${this.setting.ridgeUrl}/api/chat?`;
        let response = await request(chatUrl);
        let chatLogs = JSON.parse(response).response;
        chatLogs.forEach((chatLog: any) => {
            this.renderMessageWithReferences(chatLog.message, chatLog.by, chatLog.context, new Date(chatLog.created));
        });

        // Add chat input field
        contentEl.createEl("input",
            {
                attr: {
                    type: "text",
                    id: "ridge-chat-input",
                    autofocus: "autofocus",
                    placeholder: "Chat with Ridge 🦅 [Hit Enter to send message]",
                    class: "ridge-chat-input option"
                }
            })
            .addEventListener('change', (event) => { this.result = (<HTMLInputElement>event.target).value });

        // Scroll to bottom of modal, till the send message input box
        this.modalEl.scrollTop = this.modalEl.scrollHeight;
    }

    generateReference(messageEl: any, reference: string, index: number) {
        // Generate HTML for Chat Reference
        // `<sup><abbr title="${escaped_ref}" tabindex="0">${index}</abbr></sup>`;
        let escaped_ref = reference.replace(/"/g, "&quot;")
        return messageEl.createEl("sup").createEl("abbr", {
            attr: {
                title: escaped_ref,
                tabindex: "0",
            },
            text: `[${index}] `,
        });
    }

    renderMessageWithReferences(message: string, sender: string, context?: [string], dt?: Date) {
        let messageEl = this.renderMessage(message, sender, dt);
        if (context && !!messageEl) {
            context.map((reference, index) => this.generateReference(messageEl, reference, index + 1));
        }
    }

    renderMessage(message: string, sender: string, dt?: Date): Element | null {
        let message_time = this.formatDate(dt ?? new Date());
        let emojified_sender = sender == "ridge" ? "🦅 Ridge" : "🤔 You";

        // Append message to conversation history HTML element.
        // The chat logs should display above the message input box to follow standard UI semantics
        let chat_body_el = this.contentEl.getElementsByClassName("ridge-chat-body")[0];
        let chat_message_el = chat_body_el.createDiv({
            attr: {
                "data-meta": `${emojified_sender} at ${message_time}`,
                class: `ridge-chat-message ${sender}`
            },
        }).createDiv({
            attr: {
                class: `ridge-chat-message-text ${sender}`
            },
            text: `${message}`
        })

        // Scroll to bottom after inserting chat messages
        this.modalEl.scrollTop = this.modalEl.scrollHeight;

        return chat_message_el
    }

    formatDate(date: Date): string {
        // Format date in HH:MM, DD MMM YYYY format
        let time_string = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        let date_string = date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }).replace(/-/g, ' ');
        return `${time_string}, ${date_string}`;
    }

    async getChatResponse(query: string | undefined | null): Promise<void> {
        // Exit if query is empty
        if (!query || query === "") return;

        // Render user query as chat message
        this.renderMessage(query, "you");

        // Get chat response from Ridge backend
        let encodedQuery = encodeURIComponent(query);
        let chatUrl = `${this.setting.ridgeUrl}/api/chat?q=${encodedQuery}`;
        let response = await request(chatUrl);
        let data = JSON.parse(response);

        // Render Ridge response as chat message
        this.renderMessage(data.response, "ridge");
    }
}
