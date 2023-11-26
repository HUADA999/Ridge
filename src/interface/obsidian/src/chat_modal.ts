import { App, Modal, RequestUrlParam, request, requestUrl, setIcon } from 'obsidian';
import { RidgeSetting } from 'src/settings';
import fetch from "node-fetch";

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

        // Get chat history from Ridge backend
        await this.getChatHistory();

        // Add chat input field
        let inputRow = contentEl.createDiv("ridge-input-row");
        const chatInput = inputRow.createEl("input",
            {
                attr: {
                    type: "text",
                    id: "ridge-chat-input",
                    autofocus: "autofocus",
                    placeholder: "Chat with Ridge [Hit Enter to send message]",
                    class: "ridge-chat-input option"
                }
            })
        chatInput.addEventListener('change', (event) => { this.result = (<HTMLInputElement>event.target).value });

        let transcribe = inputRow.createEl("button", {
            text: "Transcribe",
            attr: {
                id: "ridge-transcribe",
                class: "ridge-transcribe ridge-input-row-button",
            },
        })
        transcribe.addEventListener('click', async (_) => { await this.speechToText() });
        setIcon(transcribe, "mic");

        let clearChat = inputRow.createEl("button", {
            text: "Clear History",
            attr: {
                class: "ridge-input-row-button",
            },
        })
        clearChat.addEventListener('click', async (_) => { await this.clearConversationHistory() });
        setIcon(clearChat, "trash");

        // Scroll to bottom of modal, till the send message input box
        this.modalEl.scrollTop = this.modalEl.scrollHeight;
        chatInput.focus();
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
        let emojified_sender = sender == "ridge" ? "🏮 Ridge" : "🤔 You";

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

        // Remove user-select: none property to make text selectable
        chat_message_el.style.userSelect = "text";

        // Scroll to bottom after inserting chat messages
        this.modalEl.scrollTop = this.modalEl.scrollHeight;

        return chat_message_el
    }

    createRidgeResponseDiv(dt?: Date): HTMLDivElement {
        let message_time = this.formatDate(dt ?? new Date());

        // Append message to conversation history HTML element.
        // The chat logs should display above the message input box to follow standard UI semantics
        let chat_body_el = this.contentEl.getElementsByClassName("ridge-chat-body")[0];
        let chat_message_el = chat_body_el.createDiv({
            attr: {
                "data-meta": `🏮 Ridge at ${message_time}`,
                class: `ridge-chat-message ridge`
            },
        }).createDiv({
            attr: {
                class: `ridge-chat-message-text ridge`
            },
        })

        // Scroll to bottom after inserting chat messages
        this.modalEl.scrollTop = this.modalEl.scrollHeight;

        return chat_message_el
    }

    renderIncrementalMessage(htmlElement: HTMLDivElement, additionalMessage: string) {
        htmlElement.innerHTML += additionalMessage;
        // Scroll to bottom of modal, till the send message input box
        this.modalEl.scrollTop = this.modalEl.scrollHeight;
    }

    formatDate(date: Date): string {
        // Format date in HH:MM, DD MMM YYYY format
        let time_string = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        let date_string = date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }).replace(/-/g, ' ');
        return `${time_string}, ${date_string}`;
    }

    async getChatHistory(): Promise<void> {
        // Get chat history from Ridge backend
        let chatUrl = `${this.setting.ridgeUrl}/api/chat/history?client=obsidian`;
        let headers = { "Authorization": `Bearer ${this.setting.ridgeApiKey}` };
        let response = await request({ url: chatUrl, headers: headers });
        let chatLogs = JSON.parse(response).response;
        chatLogs.forEach((chatLog: any) => {
            this.renderMessageWithReferences(chatLog.message, chatLog.by, chatLog.context, new Date(chatLog.created));
        });
    }

    async getChatResponse(query: string | undefined | null): Promise<void> {
        // Exit if query is empty
        if (!query || query === "") return;

        // Render user query as chat message
        this.renderMessage(query, "you");

        // Get chat response from Ridge backend
        let encodedQuery = encodeURIComponent(query);
        let chatUrl = `${this.setting.ridgeUrl}/api/chat?q=${encodedQuery}&n=${this.setting.resultsCount}&client=obsidian&stream=true`;
        let responseElement = this.createRidgeResponseDiv();

        // Temporary status message to indicate that Ridge is thinking
        this.renderIncrementalMessage(responseElement, "🤔");

        let response = await fetch(chatUrl, {
            method: "GET",
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "text/event-stream",
                "Authorization": `Bearer ${this.setting.ridgeApiKey}`,
            },
        })

        try {
            if (response.body == null) {
                throw new Error("Response body is null");
            }
            // Clear thinking status message
            if (responseElement.innerHTML === "🤔") {
                responseElement.innerHTML = "";
            }

            for await (const chunk of response.body) {
                const responseText = chunk.toString();
                if (responseText.startsWith("### compiled references:")) {
                    return;
                }
                this.renderIncrementalMessage(responseElement, responseText);
            }
        } catch (err) {
            this.renderIncrementalMessage(responseElement, "Sorry, unable to get response from Ridge backend ❤️‍🩹. Contact developer for help at team@ridge.dev or <a href='https://discord.gg/BDgyabRM6e'>in Discord</a>")
        }
    }

    flashStatusInChatInput(message: string) {
        // Get chat input element and original placeholder
        let chatInput = <HTMLInputElement>this.contentEl.getElementsByClassName("ridge-chat-input")[0];
        let originalPlaceholder = chatInput.placeholder;
        // Set placeholder to message
        chatInput.placeholder = message;
        // Reset placeholder after 2 seconds
        setTimeout(() => {
            chatInput.placeholder = originalPlaceholder;
        }, 2000);
    }

    async clearConversationHistory() {
        let chatBody = this.contentEl.getElementsByClassName("ridge-chat-body")[0];

        let response = await request({
            url: `${this.setting.ridgeUrl}/api/chat/history?client=web`,
            method: "DELETE",
            headers: { "Authorization": `Bearer ${this.setting.ridgeApiKey}` },
        })
        try {
            let result = JSON.parse(response);
            if (result.status !== "ok") {
                // Throw error if conversation history isn't cleared
                throw new Error("Failed to clear conversation history");
            } else {
                // If conversation history is cleared successfully, clear chat logs from modal
                chatBody.innerHTML = "";
                await this.getChatHistory();
                this.flashStatusInChatInput(result.message);
            }
        } catch (err) {
            this.flashStatusInChatInput("Failed to clear conversation history");
        }
    }

    mediaRecorder: MediaRecorder | undefined;
    async speechToText() {
        const transcribeButton = <HTMLButtonElement>this.contentEl.getElementsByClassName("ridge-transcribe")[0];
        const chatInput = <HTMLInputElement>this.contentEl.getElementsByClassName("ridge-chat-input")[0];

        const generateRequestBody = async (audioBlob: Blob, boundary_string: string) => {
            const boundary = `------${boundary_string}`;
            const chunks: ArrayBuffer[] = [];

            chunks.push(new TextEncoder().encode(`${boundary}\r\n`));
            chunks.push(new TextEncoder().encode(`Content-Disposition: form-data; name="file"; filename="blob"\r\nContent-Type: "application/octet-stream"\r\n\r\n`));
            chunks.push(await audioBlob.arrayBuffer());
            chunks.push(new TextEncoder().encode('\r\n'));

            await Promise.all(chunks);
            chunks.push(new TextEncoder().encode(`${boundary}--\r\n`));
            return await new Blob(chunks).arrayBuffer();
        };

        const sendToServer = async (audioBlob: Blob) => {
            const boundary_string = `Boundary${Math.random().toString(36).slice(2)}`;
            const requestBody = await generateRequestBody(audioBlob, boundary_string);

            const response = await requestUrl({
                url: `${this.setting.ridgeUrl}/api/speak?client=obsidian`,
                method: 'POST',
                headers: { "Authorization": `Bearer ${this.setting.ridgeApiKey}` },
                contentType: `multipart/form-data; boundary=----${boundary_string}`,
                body: requestBody,
            });

            // Parse response from Ridge backend
            if (response.status === 200) {
                console.log(response);
                chatInput.value += response.json.text;
            } else if (response.status === 422) {
                throw new Error("⛔️ Failed to transcribe audio");
            } else {
                throw new Error("⛔️ Configure speech-to-text model on server.");
            }
        };

        const handleRecording = (stream: MediaStream) => {
            const audioChunks: Blob[] = [];
            const recordingConfig = { mimeType: 'audio/webm' };
            this.mediaRecorder = new MediaRecorder(stream, recordingConfig);

            this.mediaRecorder.addEventListener("dataavailable", function(event) {
                if (event.data.size > 0) audioChunks.push(event.data);
            });

            this.mediaRecorder.addEventListener("stop", async function() {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await sendToServer(audioBlob);
            });

            this.mediaRecorder.start();
            setIcon(transcribeButton, "mic-off");
        };

        // Toggle recording
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            navigator.mediaDevices
                .getUserMedia({ audio: true })
                .then(handleRecording)
                .catch((e) => {
                    this.flashStatusInChatInput("⛔️ Failed to access microphone");
                });
        } else if (this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            setIcon(transcribeButton, "mic");
        }
    }
}
