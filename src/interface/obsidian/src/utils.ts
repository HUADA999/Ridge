import { FileSystemAdapter, Notice, RequestUrlParam, request, Vault, Modal } from 'obsidian';
import { RidgeSetting } from 'src/settings'

export function getVaultAbsolutePath(vault: Vault): string {
    let adaptor = vault.adapter;
    if (adaptor instanceof FileSystemAdapter) {
        return adaptor.getBasePath();
    }
    return '';
}

export async function configureRidgeBackend(vault: Vault, setting: RidgeSetting, notify: boolean = true) {
    let vaultPath = getVaultAbsolutePath(vault);
    let mdInVault = `${vaultPath}/**/*.md`;
    let pdfInVault = `${vaultPath}/**/*.pdf`;
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
    let indexName = vaultPath.replace(/\//g, '_').replace(/\\/g, '_').replace(/ /g, '_').replace(/:/g, '_');
    // Get default config fields from ridge backend
    let defaultConfig = await request(`${ridgeConfigUrl}/default`).then(response => JSON.parse(response));
    let ridgeDefaultMdIndexDirectory = getIndexDirectoryFromBackendConfig(defaultConfig["content-type"]["markdown"]["embeddings-file"]);
    let ridgeDefaultPdfIndexDirectory = getIndexDirectoryFromBackendConfig(defaultConfig["content-type"]["pdf"]["embeddings-file"]);
    let ridgeDefaultChatDirectory = getIndexDirectoryFromBackendConfig(defaultConfig["processor"]["conversation"]["conversation-logfile"]);
    let ridgeDefaultChatModelName = defaultConfig["processor"]["conversation"]["openai"]["chat-model"];

    // Get current config if ridge backend configured, else get default config from ridge backend
    await request(ridge_already_configured ? ridgeConfigUrl : `${ridgeConfigUrl}/default`)
        .then(response => JSON.parse(response))
        .then(data => {
            // If ridge backend not configured yet
            if (!ridge_already_configured) {
                // Create ridge content-type config with only markdown configured
                data["content-type"] = {
                    "markdown": {
                        "input-filter": [mdInVault],
                        "input-files": null,
                        "embeddings-file": `${ridgeDefaultMdIndexDirectory}/${indexName}.pt`,
                        "compressed-jsonl": `${ridgeDefaultMdIndexDirectory}/${indexName}.jsonl.gz`,
                    }
                }

                const hasPdfFiles = app.vault.getFiles().some(file => file.extension === 'pdf');

                if (hasPdfFiles) {
                    data["content-type"]["pdf"] = {
                        "input-filter": [pdfInVault],
                        "input-files": null,
                        "embeddings-file": `${ridgeDefaultPdfIndexDirectory}/${indexName}.pt`,
                        "compressed-jsonl": `${ridgeDefaultPdfIndexDirectory}/${indexName}.jsonl.gz`,
                    }
                }
            }
            // Else if ridge config has no markdown content config
            else if (!data["content-type"]["markdown"]) {
                // Add markdown config to ridge content-type config
                // Set markdown config to index markdown files in configured obsidian vault
                data["content-type"]["markdown"] = {
                    "input-filter": [mdInVault],
                    "input-files": null,
                    "embeddings-file": `${ridgeDefaultMdIndexDirectory}/${indexName}.pt`,
                    "compressed-jsonl": `${ridgeDefaultMdIndexDirectory}/${indexName}.jsonl.gz`,
                }
            }
            // Else if ridge is not configured to index markdown files in configured obsidian vault
            else if (
                data["content-type"]["markdown"]["input-files"] != null ||
                data["content-type"]["markdown"]["input-filter"] == null ||
                data["content-type"]["markdown"]["input-filter"].length != 1 ||
                data["content-type"]["markdown"]["input-filter"][0] !== mdInVault) {
                    // Update markdown config in ridge content-type config
                    // Set markdown config to only index markdown files in configured obsidian vault
                    let ridgeMdIndexDirectory = getIndexDirectoryFromBackendConfig(data["content-type"]["markdown"]["embeddings-file"]);
                    data["content-type"]["markdown"] = {
                        "input-filter": [mdInVault],
                        "input-files": null,
                        "embeddings-file": `${ridgeMdIndexDirectory}/${indexName}.pt`,
                        "compressed-jsonl": `${ridgeMdIndexDirectory}/${indexName}.jsonl.gz`,
                    }
            }

            if (ridge_already_configured && !data["content-type"]["pdf"]) {
                const hasPdfFiles = app.vault.getFiles().some(file => file.extension === 'pdf');

                if (hasPdfFiles) {
                    data["content-type"]["pdf"] = {
                        "input-filter": [pdfInVault],
                        "input-files": null,
                        "embeddings-file": `${ridgeDefaultPdfIndexDirectory}/${indexName}.pt`,
                        "compressed-jsonl": `${ridgeDefaultPdfIndexDirectory}/${indexName}.jsonl.gz`,
                    }
                } else {
                    data["content-type"]["pdf"] = null;
                }
            }
            // Else if ridge is not configured to index pdf files in configured obsidian vault
            else if (ridge_already_configured &&
                (
                    data["content-type"]["pdf"]["input-files"] != null ||
                    data["content-type"]["pdf"]["input-filter"] == null ||
                    data["content-type"]["pdf"]["input-filter"].length != 1 ||
                    data["content-type"]["pdf"]["input-filter"][0] !== pdfInVault)) {

                let hasPdfFiles = app.vault.getFiles().some(file => file.extension === 'pdf');

                if (hasPdfFiles) {
                    // Update pdf config in ridge content-type config
                    // Set pdf config to only index pdf files in configured obsidian vault
                    let ridgePdfIndexDirectory = getIndexDirectoryFromBackendConfig(data["content-type"]["pdf"]["embeddings-file"]);
                    data["content-type"]["pdf"] = {
                        "input-filter": [pdfInVault],
                        "input-files": null,
                        "embeddings-file": `${ridgePdfIndexDirectory}/${indexName}.pt`,
                        "compressed-jsonl": `${ridgePdfIndexDirectory}/${indexName}.jsonl.gz`,
                    }
                } else {
                    data["content-type"]["pdf"] = null;
                }
            }

            // If OpenAI API key not set in Ridge plugin settings
            if (!setting.openaiApiKey) {
                // Disable ridge processors, as not required
                delete data["processor"];
            }
            // Else if ridge backend not configured yet
            else if (!ridge_already_configured || !data["processor"]) {
                data["processor"] = {
                    "conversation": {
                        "conversation-logfile": `${ridgeDefaultChatDirectory}/conversation.json`,
                        "openai": {
                            "chat-model": ridgeDefaultChatModelName,
                            "api-key": setting.openaiApiKey,
                        }
                    },
                }
            }
            // Else if ridge config has no conversation processor config
            else if (!data["processor"]["conversation"] || !data["processor"]["conversation"]["openai"]) {
                data["processor"] = {
                    "conversation": {
                        "conversation-logfile": `${ridgeDefaultChatDirectory}/conversation.json`,
                        "openai": {
                            "chat-model": ridgeDefaultChatModelName,
                            "api-key": setting.openaiApiKey,
                        }
                    },
                }
            }
            // Else if ridge is not configured with OpenAI API key from ridge plugin settings
            else if (data["processor"]["conversation"]["openai"]["api-key"] !== setting.openaiApiKey) {
                data["processor"] = {
                    "conversation": {
                        "conversation-logfile": data["processor"]["conversation"]["conversation-logfile"],
                        "openai": {
                            "chat-model": data["processor"]["conversation"]["openai"]["chat-model"],
                            "api-key": setting.openaiApiKey,
                        }
                    },
                }
            }

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
