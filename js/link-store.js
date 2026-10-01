import { validateState } from "./model.js";


export async function createLinkStore({ seedState, onData, onStatus, onError }) {
    const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open("data-corrupted-homepage", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("state");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Cannot open database because it is blocked by another tab."));
    });
    database.onversionchange = () => database.close();
    const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("homepage-updates") : null;
    let disposed = false;
    let refreshGeneration = 0;

    function transaction(change, initialize = false) {
        return new Promise((resolve, reject) => {
            const tx = database.transaction("state", change || initialize ? "readwrite" : "readonly");
            const store = tx.objectStore("state");
            const request = store.get("homepage");
            let result;
            let failure;
            request.onsuccess = () => {
                try {
                    if (request.result === undefined) {
                        if (!initialize) throw new Error("Local data not found. Please reload the page.");
                        result = validateState(structuredClone(seedState));
                        store.put(result, "homepage");
                    } else {
                        result = validateState(request.result);
                    }
                    if (change) {
                        change(result);
                        validateState(result);
                        store.put(result, "homepage");
                    }
                } catch (error) { failure = error; tx.abort(); }
            };
            tx.oncomplete = () => resolve(result);
            tx.onabort = () => reject(failure || tx.error || new Error("Failed to save to the browser."));
            tx.onerror = () => { /* onabort reports errors, including quota errors. */ };
        });
    }

    async function refresh() {
        const generation = ++refreshGeneration;
        const data = await transaction();
        if (disposed || generation !== refreshGeneration) return;
        onData(data);
        onStatus("NET: SYNC");
    }
    const refreshSafely = () => refresh().catch((error) => { onStatus("NET: ERROR"); onError(error); });
    await transaction(null, true);
    await refresh();
    if (channel) channel.onmessage = refreshSafely;
    window.addEventListener("focus", refreshSafely);
    window.addEventListener("pagehide", (event) => {
        if (event.persisted) return;
        disposed = true;
        channel?.close();
        database.close();
    });
    return {
        async mutate(change) {
            // IndexedDB serializes read/write transactions across tabs.
            await transaction(change);
            channel?.postMessage("changed");
            await refresh();
        },
        read: () => transaction(),
        async replace(data) {
            const checked = validateState(structuredClone(data));
            await this.mutate((state) => {
                state.links = checked.links;
                state.sectors = checked.sectors;
                state.aliases = checked.aliases;
            });
        }
    };
}
