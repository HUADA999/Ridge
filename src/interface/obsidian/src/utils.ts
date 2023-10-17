import { FileSystemAdapter, Notice, RequestUrlParam, request, Vault, Modal, TFile } from 'obsidian';
import { RidgeSetting } from 'src/settings'

export function getVaultAbsolutePath(vault: Vault): string {
    let adaptor = vault.adapter;
    if (adaptor instanceof FileSystemAdapter) {
        return adaptor.getBasePath();
    }
    return '';
}

type OpenAIType = null | {
    "chat-model": string;
    "api-key": string;
};

interface ProcessorData {
    conversation: {
      "conversation-logfile": string;
      openai: OpenAIType;
      "enable-offline-chat": boolean;
    };
}

function fileExtensionToMimeType (extension: string): string {
    switch (extension) {
        case 'pdf':
            return 'application/pdf';
        case 'png':
            return 'image/png';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'md':
        case 'markdown':
            return 'text/markdown';
        case 'org':
            return 'text/org';
        default:
            return 'text/plain';
    }
}

export async function updateContentIndex(vault: Vault, setting: RidgeSetting, lastSyncedFiles: TFile[], regenerate: boolean = false): Promise<TFile[]> {
    // Get all markdown, pdf files in the vault
    console.log(`Ridge: Updating Ridge content index...`)
    const files = vault.getFiles().filter(file => file.extension === 'md' || file.extension === 'pdf');
    const binaryFileTypes = ['pdf', 'png', 'jpg', 'jpeg']
    let countOfFilesToIndex = 0;
    let countOfFilesToDelete = 0;

    // Add all files to index as multipart form data
    const formData = new FormData();
    for (const file of files) {
        countOfFilesToIndex++;
        const encoding = binaryFileTypes.includes(file.extension) ? "binary" : "utf8";
        const mimeType = fileExtensionToMimeType(file.extension) + (encoding === "utf8" ? "; charset=UTF-8" : "");
        const fileContent = await vault.read(file);
        formData.append('files', new Blob([fileContent], { type: mimeType }), file.path);
    }

    // Add any previously synced files to be deleted to multipart form data
    for (const lastSyncedFile of lastSyncedFiles) {
        if (!files.includes(lastSyncedFile)) {
            countOfFilesToDelete++;
            formData.append('files', new Blob([]), lastSyncedFile.path);
        }
    }

    // Call Ridge backend to update index with all markdown, pdf files
    const response = await fetch(`${setting.ridgeUrl}/api/v1/index/update?force=${regenerate}&client=obsidian`, {
        method: 'POST',
        headers: {
            'x-api-key': 'secret',
        },
        body: formData,
    });

    if (!response.ok) {
        new Notice(`❗️Failed to update Ridge content index. Ensure Ridge server connected or raise issue on Ridge Discord/Github\nError: ${response.statusText}`);
    } else {
        console.log(`✅ Refreshed Ridge content index. Updated: ${countOfFilesToIndex} files, Deleted: ${countOfFilesToDelete} files.`);
    }

    return files;
}

export async function configureRidgeBackend(vault: Vault, setting: RidgeSetting, notify: boolean = true) {
    let ridgeConfigUrl = `${setting.ridgeUrl}/api/config/data`;

    // Check if ridge backend is configured, note if cannot connect to backend
    let ridge_already_configured = await request(ridgeConfigUrl)
        .then(response => {
            setting.connectedToBackend = true;
            return response !== "null"
        })
        .catch(error => {
            setting.connectedToBackend = false;
            if (notify)
                new Notice(`❗️Ensure Ridge backend is running and Ridge URL is pointing to it in the plugin settings.\n\n${error}`);
        })
    // Short-circuit configuring ridge if unable to connect to ridge backend
    if (!setting.connectedToBackend) return;

    // Set index name from the path of the current vault
    // Get default config fields from ridge backend
    let defaultConfig = await request(`${ridgeConfigUrl}/default`).then(response => JSON.parse(response));
    let ridgeDefaultChatDirectory = getIndexDirectoryFromBackendConfig(defaultConfig["processor"]["conversation"]["conversation-logfile"]);
    let ridgeDefaultChatModelName = defaultConfig["processor"]["conversation"]["openai"]["chat-model"];

    // Get current config if ridge backend configured, else get default config from ridge backend
    await request(ridge_already_configured ? ridgeConfigUrl : `${ridgeConfigUrl}/default`)
        .then(response => JSON.parse(response))
        .then(data => {
            let conversationLogFile = data?.["processor"]?.["conversation"]?.["conversation-logfile"] ?? `${ridgeDefaultChatDirectory}/conversation.json`;
            let processorData: ProcessorData = {
                "conversation": {
                    "conversation-logfile": conversationLogFile,
                    "openai": null,
                    "enable-offline-chat": setting.enableOfflineChat,
                }
            }

            // If the Open AI API Key was configured in the plugin settings
            if (!!setting.openaiApiKey) {
                let openAIChatModel = data?.["processor"]?.["conversation"]?.["openai"]?.["chat-model"] ?? ridgeDefaultChatModelName;
                processorData = {
                    "conversation": {
                        "conversation-logfile": conversationLogFile,
                        "openai": {
                            "chat-model": openAIChatModel,
                            "api-key": setting.openaiApiKey,
                        },
                        "enable-offline-chat": setting.enableOfflineChat,
                    },
                }
            }

            // Set ridge processor config to conversation processor config
            data["processor"] = processorData;

            // Save updated config and refresh index on ridge backend
            updateRidgeBackend(setting.ridgeUrl, data);
            if (!ridge_already_configured)
                console.log(`Ridge: Created ridge backend config:\n${JSON.stringify(data)}`)
            else
                console.log(`Ridge: Updated ridge backend config:\n${JSON.stringify(data)}`)
        })
        .catch(error => {
            if (notify)
                new Notice(`❗️Failed to configure Ridge backend. Contact developer on Github.\n\nError: ${error}`);
        })
}

export async function updateRidgeBackend(ridgeUrl: string, ridgeConfig: Object) {
    // POST ridgeConfig to ridgeConfigUrl
    let requestContent: RequestUrlParam = {
        url: `${ridgeUrl}/api/config/data`,
        body: JSON.stringify(ridgeConfig),
        method: 'POST',
        contentType: 'application/json',
    };

    // Save ridgeConfig on ridge backend at ridgeConfigUrl
    await request(requestContent)
        // Refresh ridge search index after updating config
        .then(_ => request(`${ridgeUrl}/api/update?t=markdown`))
        .then(_ => request(`${ridgeUrl}/api/update?t=pdf`));
}

function getIndexDirectoryFromBackendConfig(filepath: string) {
    return filepath.split("/").slice(0, -1).join("/");
}

export async function createNote(name: string, newLeaf = false): Promise<void> {
    try {
      let pathPrefix: string
      // @ts-ignore
      switch (app.vault.getConfig('newFileLocation')) {
        case 'current':
          pathPrefix = (app.workspace.getActiveFile()?.parent.path ?? '') + '/'
          break
        case 'folder':
          pathPrefix = this.app.vault.getConfig('newFileFolderPath') + '/'
          break
        default: // 'root'
          pathPrefix = ''
          break
      }
      await app.workspace.openLinkText(`${pathPrefix}${name}.md`, '', newLeaf)
    } catch (e) {
      console.error('Ridge: Could not create note.\n' + (e as any).message);
      throw e
    }
  }

export async function createNoteAndCloseModal(query: string, modal: Modal, opt?: { newLeaf: boolean }): Promise<void> {
    try {
        await createNote(query, opt?.newLeaf);
    }
    catch (e) {
        new Notice((e as Error).message)
        return
    }
    modal.close();
}
