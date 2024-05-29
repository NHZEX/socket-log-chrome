import { get, has, isEqual } from "lodash-es";
import { getExtensionsVersion, IMG_LOGO } from "./helper";

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


let creating: Promise<any>|null; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path: string, reasons: string[], justification: string) {
    // Check all windows controlled by the service worker to see if one
    // of them is the offscreen document with the given path
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    // create offscreen document
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: [
                chrome.offscreen.Reason.CLIPBOARD,
            ],
            justification: 'reason for needing the document',
        });
        await creating;
        creating = null;
    }
}

export async function migrateSetting()
{
    console.info('执行配置迁移')

    const address = await getAddressData()
    console.log(address, address === null)
    if (address === null) {
        console.debug('当前配置为空，尝试迁移设置')

        const readCallback = async (message: {
            event: string,
            data: object
        }) => {
            if (message.event === 'old_setting_sync') {
                try {
                    console.info('old_setting_sync', message)
                    const newSetting: {
                        address: object
                        clientId: string
                        enableListen: boolean
                    } = {} as any
                    const address = get(message, 'data.address')
                    if (address) {
                        console.debug('读取到老配置，开始迁移')
                        console.debug(address)
                        try {
                            const _address = JSON.parse(address)
                            if (!(
                                has(_address, 'tls')
                                && has(_address, 'host')
                                && has(_address, 'port')
                            )) {
                                console.warn('old_setting_sync failed', _address)
                                return
                            }
                            newSetting.address = {
                                path: '/',
                                ..._address,
                            }
                        } catch (e) {
                            console.warn('old_setting_sync failed', e)
                            return
                        }
                    }
                    const clientId = get(message, 'data.client_id')
                    if (clientId) {
                        newSetting.clientId = String(clientId).trim()
                    }
                    const enable = get(message, 'data.enable')
                    if (enable) {
                        newSetting.enableListen = enable === 'true'
                    }
                    console.info('迁移的新设置', newSetting)
                    await chrome.storage.local.set(newSetting)
                } finally {
                    setTimeout(async () => {
                        chrome.runtime.onMessage.removeListener(readCallback)
                        await chrome.offscreen.closeDocument()
                    }, 3000)
                }
                chrome.notifications.create({
                    type: "basic",
                    title: `重大版本更新通知 (${getExtensionsVersion()})`,
                    message: '老版本配置已经成功迁移，请检查插件是否工作正常！',
                    iconUrl: IMG_LOGO
                });
            }
        }
        chrome.runtime.onMessage.addListener(readCallback)
        await setupOffscreenDocument(
            'src/entries/off_screen/off_screen_read_local_storage.html',
            ['LOCAL_STORAGE'],
            'migrate old setting',
        )
    }
}
