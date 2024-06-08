
/**
 * @deprecated
 */
export async function getAddressData() {
    const data = await chrome.storage.local.get(['address'])

    return data?.address ?? null
}

export async function getAllowHostRules() {
    const data = await chrome.storage.sync.get(['allowRules'])

    return data?.allowRules ?? []
}

export async function setAllowHosts(allowHosts: string[]) {

    const hosts = [];
    for (const host of allowHosts) {
        if (!/^[\x21-\x7E]+$/.test(host)) {
            throw new Error(`主机匹配规则不合法: ${host}`)
        }
        hosts.push(host);
    }

    await chrome.storage.sync.set({
        allowRules: hosts,
        currentRuleFlag: (new Date()).getTime(),
    })

    return hosts
}

export async function getRunningState() {
    const data = await chrome.storage.session.get(['status_message']);
    return data?.status_message ?? ''
}

export async function getE2EState() {
    const data = await chrome.storage.session.get(['e2e_status']);
    return data?.e2e_status ?? ''
}
