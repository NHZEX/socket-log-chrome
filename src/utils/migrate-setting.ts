import { get, has } from "lodash-es";
import { getExtensionsVersion, notifications } from "~/utils/helper";
import { getAddressData } from "~/utils/storage";

let creating: Promise<void>|null; // A global promise to avoid concurrency issues
async function setupOffscreenDocument(path: string, reasons: chrome.offscreen.Reason[], justification: string) {
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
            reasons,
            justification,
        });
        await creating;
        creating = null;
    }
}

export async function migrateSetting()
{
    console.info('尝试执行配置迁移')

    const address = await getAddressData()
    console.debug('current-address', address)
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
                notifications(
                    `重大版本更新通知 (${getExtensionsVersion()})`,
                    '老版本配置已经成功迁移，请检查插件是否工作正常！'
                )
            }
        }
        chrome.runtime.onMessage.addListener(readCallback)
        await setupOffscreenDocument(
            'src/entries/off_screen/off_screen_read_local_storage.html',
            [chrome.offscreen.Reason.CLIPBOARD],
            'migrate old setting',
        )
    }
}
