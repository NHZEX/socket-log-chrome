
/**
 * @deprecated
 */
export async function getAllowHostRules() {
    const data = await chrome.storage.sync.get(['allowRules'])

    return data?.allowRules ?? []
}
