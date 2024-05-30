import { isEqual } from "lodash-es";

export async function getAddressData() {
    const data = await chrome.storage.local.get(['address'])

    return data?.address ?? null
}

export async function getClientId() {
    const data = await chrome.storage.local.get(['clientId'])

    return data?.clientId ?? null
}

export async function isEnableListen() {
    const data = await chrome.storage.local.get(['enableListen'])

    return data?.enableListen ?? false
}

export async function isEnableClientHeartbeat() {
    const data = await chrome.storage.local.get(['enableClientHeartbeat'])

    return (data?.enableClientHeartbeat ?? 'on') === 'on'
}

export async function getE2EConfig() {
    const data = await chrome.storage.local.get(['e2eConfig'])

    return {
        key: '',
        ...(data?.e2eConfig ?? {})
    }
}

export async function saveE2EConfig(config: {
    key: string,
}) {
    await chrome.storage.local.set({
        e2eConfig: config,
    })
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

export function listenerAllowHostRulesChanged(cb: Function) {
    chrome.storage.sync.onChanged.addListener(async ({ currentRuleFlag }) => {
        if (currentRuleFlag === undefined) {
            return
        }
        const { newValue, oldValue } = currentRuleFlag
        console.log('allowHostRules.onChanged', newValue, oldValue)
        if (newValue !== oldValue) {
            cb()
        }
    })
}

export function listenerE2EConfigChanged(cb: Function) {
    chrome.storage.local.onChanged.addListener(async ({ e2eConfig }) => {
        if (e2eConfig === undefined) {
            return
        }
        const { newValue, oldValue } = e2eConfig
        console.log('e2eConfig.onChanged', newValue, oldValue)
        if (!isEqual(newValue, oldValue)) {
            cb()
        }
    })
}

export async function getRunningState() {
    const data = await chrome.storage.session.get(['status_message']);
    return data?.status_message ?? ''
}

export async function getE2EState() {
    const data = await chrome.storage.session.get(['e2e_status']);
    return data?.e2e_status ?? ''
}
