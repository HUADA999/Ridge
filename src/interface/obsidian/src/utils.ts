import { FileSystemAdapter, Notice, RequestUrlParam, request, Vault } from 'obsidian';
import { RidgeSetting } from 'src/settings'

export function getVaultAbsolutePath(vault: Vault): string {
    let adaptor = vault.adapter;
    if (adaptor instanceof FileSystemAdapter) {
        return adaptor.getBasePath();
    }
    return '';
}

export async function configureRidgeBackend(vault: Vault, setting: RidgeSetting, notify: boolean = true) {
    let mdInVault = `${getVaultAbsolutePath(vault)}/**/*.md`;
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
    let indexName = getVaultAbsolutePath(vault).replace(/\//g, '_').replace(/ /g, '_');
    // Get default index directory from ridge backend
    let ridgeDefaultIndexDirectory = await request(`${ridgeConfigUrl}/default`)
        .then(response => JSON.parse(response))
        .then(data => { return getIndexDirectoryFromBackendConfig(data); });

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
                        "embeddings-file": `${ridgeDefaultIndexDirectory}/${indexName}.pt`,
                        "compressed-jsonl": `${ridgeDefaultIndexDirectory}/${indexName}.jsonl.gz`,
                    }
                }
                // Disable ridge processors, as not required
                delete data["processor"];

                // Save new config and refresh index on ridge backend
                updateRidgeBackend(setting.ridgeUrl, data);
                console.log(`Ridge: Created ridge backend config:\n${JSON.stringify(data)}`)
            }

            // Else if ridge config has no markdown content config
            else if (!data["content-type"]["markdown"]) {
                // Add markdown config to ridge content-type config
                // Set markdown config to index markdown files in configured obsidian vault
                data["content-type"]["markdown"] = {
                    "input-filter": [mdInVault],
                    "input-files": null,
                    "embeddings-file": `${ridgeDefaultIndexDirectory}/${indexName}.pt`,
                    "compressed-jsonl": `${ridgeDefaultIndexDirectory}/${indexName}.jsonl.gz`,
                }

                // Save updated config and refresh index on ridge backend
                updateRidgeBackend(setting.ridgeUrl, data);
                console.log(`Ridge: Added markdown config to ridge backend config:\n${JSON.stringify(data["content-type"])}`)
            }

            // Else if ridge is not configured to index markdown files in configured obsidian vault
            else if (data["content-type"]["markdown"]["input-filter"].length != 1 ||
                data["content-type"]["markdown"]["input-filter"][0] !== mdInVault) {
                // Update markdown config in ridge content-type config
                // Set markdown config to only index markdown files in configured obsidian vault
                let ridgeIndexDirectory = getIndexDirectoryFromBackendConfig(data);
                data["content-type"]["markdown"] = {
                    "input-filter": [mdInVault],
                    "input-files": null,
                    "embeddings-file": `${ridgeIndexDirectory}/${indexName}.pt`,
                    "compressed-jsonl": `${ridgeIndexDirectory}/${indexName}.jsonl.gz`,
                }
                // Save updated config and refresh index on ridge backend
                updateRidgeBackend(setting.ridgeUrl, data);
                console.log(`Ridge: Updated markdown config in ridge backend config:\n${JSON.stringify(data["content-type"]["markdown"])}`)
            }
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
        .then(_ => request(`${ridgeUrl}/api/update?t=markdown`));
}

function getIndexDirectoryFromBackendConfig(ridgeConfig: any) {
    return ridgeConfig["content-type"]["markdown"]["embeddings-file"].split("/").slice(0, -1).join("/");
}