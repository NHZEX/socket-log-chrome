import { get, has } from "lodash-es";
import { installRequestHandleRules } from "./background/RequestHandle";
import { IMG_LOGO } from "./helper";

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

export async function getAllowHostRules() {
    const data = await chrome.storage.sync.get(['allowRules'])

    return data?.allowRules ?? []
}

export async function setAllowHosts(allowHosts) {

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

export function listenerAllowHostRulesChanged(cb) {
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

export async function getRunningState() {
    const data = await chrome.storage.session.get(['status_message']);
    return data?.status_message ?? ''
}

let creating; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path, reasons, justification) {
    // Check all windows controlled by the service worker to see if one
    // of them is the offscreen document with the given path
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
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
            reasons: ['CLIPBOARD'],
            justification: 'reason for needing the document',
        });
        await creating;
        creating = null;
    }
}

export async function migrateSetting()
{
    console.log('执行配置迁移')

    const address = await getAddressData()
    console.log(address, address === null)
    if (address === null) {
        console.log('当前配置为空，尝试迁移设置')

        const readCallback = async (message) => {
            if (message.event === 'old_setting_sync') {
                try {
                    console.log('old_setting_sync', message)
                    const newSetting = {}
                    const address = get(message, 'data.address')
                    if (address) {
                        console.log('读取到老配置，开始迁移')
                        console.log(address)
                        try {
                            const _address = JSON.parse(address)
                            if (!(
                                has(_address, 'tls')
                                && has(_address, 'host')
                                && has(_address, 'port')
                            )) {
                                console.log('old_setting_sync failed', _address)
                                return
                            }
                            newSetting.address = {
                                path: '/',
                                ..._address,
                            }
                        } catch (e) {
                            console.log('old_setting_sync failed', e)
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
                    console.log('迁移的新设置', newSetting)
                    await chrome.storage.local.set(newSetting)
                } finally {
                    setTimeout(async () => {
                        chrome.runtime.onMessage.removeListener(readCallback)
                        await chrome.offscreen.closeDocument()
                    }, 3000)
                }
                const manifest = chrome.runtime.getManifest();
                chrome.notifications.create(null, {
                    type: "basic",
                    title: `重大版本更新通知 (${manifest.version})`,
                    message: '老版本配置已经成功迁移，请检查插件是否工作正常！',
                    iconUrl: IMG_LOGO
                });
            }
        }
        chrome.runtime.onMessage.addListener(readCallback)
        await setupOffscreenDocument(
            'off_screen_read_local_storage.html',
            ['LOCAL_STORAGE'],
            'migrate old setting',
        )
    }
}
