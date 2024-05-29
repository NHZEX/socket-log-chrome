function getAllLocalStorageItems() {
    const items: { [key: string]: string } = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === null) {
            continue
        }
        const value = localStorage.getItem(key);
        if (value === null) {
            continue
        }
        items[key] = value
    }
    return items;
}

window.addEventListener('load', async () => {
    await chrome.runtime.sendMessage({
        event: 'old_setting_sync',
        data: getAllLocalStorageItems()
    })
})
