import {get} from "radash";
import {getExtensionsVersion, notifications} from "~/utils/helper";
import {getGlobalOptionsReader} from "~/entries/background/StorageUtils";
import {SocketLogOptions, SocketServerItem} from "~types/socket-log.options";
import {ClientIdParamMode, CompatibleTabIdMode} from "~/enum/socket-log-options";
import {restartClientConnection} from "~/entries/background/main";

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

export async function migrateSetting(previousVersion: string)
{
    console.info('尝试执行配置迁移', previousVersion)

    if (previousVersion.startsWith('2.')) {
        await migrate2to4()
    } else if (previousVersion.startsWith('3.')) {
        await migrate3to4()
    }
}

async function appendServerCollection(item: SocketServerItem)
{
    const values = await chrome.storage.local.get(['serverCollection'])
    const serverCollection: SocketServerItem[]  = values.serverCollection ?? []

    const pos = serverCollection.findIndex(v => v.id === item.id)
    if (pos === -1) {
        serverCollection.unshift(item)
    } else {
        serverCollection[pos] = item
    }

    await chrome.storage.local.set({
        serverCollection,
    })
}

async function migrate2to4()
{
    const globalOptions = await getGlobalOptionsReader({ reinitialize: true })
    const address = globalOptions.options?.activeServerInfo

    if (address !== undefined && address !== null) {
        console.debug('[MS] active server', address)
        return
    }
    console.debug('[MS] 当前配置为空，尝试迁移设置')

    const readCallback = async (message: {
        event: string,
        data: object
    }) => {
        if (message.event === 'old_setting_sync') {
            try {
                console.info('[MS] old_setting_sync', message)
                const newOptions: SocketLogOptions = {
                    activeServerInfo: {
                        id: '00000000000000000000000000',
                        name: '[自动迁移]',
                        url: '',
                        clientId: '',
                        socketHeartbeat: false,
                        clientIdParamMode: ClientIdParamMode.Path,
                    },
                    defaultTabIdMode: CompatibleTabIdMode.Fake_9x6,
                    defaultE2EConfig: {
                        key: '',
                    }
                }
                const newSetting: {
                    options?: SocketLogOptions
                    enableListen?: boolean
                } = {}
                const address = get(message, 'data.address', '{}')
                if (address) {
                    console.debug('[MS] 读取到老配置，开始迁移', address)
                    try {
                        const _address = JSON.parse(address)
                        if (!(
                            'tls' in _address
                            && 'host' in _address
                            && 'port' in _address
                        )) {
                            console.warn('[MS] old_setting_sync failed', _address)
                            return
                        }

                        const url = new URL(`${_address.tls ? 'wss' : 'ws'}://${_address.host}:${_address.port}`)
                        if ('path' in _address) {
                            url.pathname = _address.path
                        }
                        newOptions.activeServerInfo!.url = url.toString()
                    } catch (e) {
                        console.warn('[MS] old_setting_sync failed', e)
                        return
                    }
                }
                const clientId = get(message, 'data.client_id')
                if (clientId) {
                    newOptions.activeServerInfo!.clientId = String(clientId).trim()
                }
                const enable = get(message, 'data.enable')
                if (enable) {
                    newSetting.enableListen = enable === 'true'
                }
                newSetting.options = newOptions
                console.info('[MS] 迁移的新设置', newSetting)
                await chrome.storage.local.set(newSetting)
                await appendServerCollection(newOptions.activeServerInfo!)
            } catch (e) {
                console.error('[MS] 设置迁移发生故障', e)
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
            setTimeout(() => {
                restartClientConnection()
            }, 1000)
        }
    }
    chrome.runtime.onMessage.addListener(readCallback)
    await setupOffscreenDocument(
        'src/entries/off_screen/off_screen_read_local_storage.html',
        [chrome.offscreen.Reason.CLIPBOARD],
        'migrate old setting',
    )
}

async function migrate3to4()
{
    const globalOptions = await getGlobalOptionsReader({ reinitialize: true })
    const address = globalOptions.options?.activeServerInfo

    if (address !== undefined && address !== null) {
        console.debug('[MS] active server', address)
        return
    }

    console.debug('[MS] 当前配置为空，尝试迁移设置')

    try {
        const values = await chrome.storage.local.get([
            'address',
            'clientId',
            'e2eConfig',
            'enableClientHeartbeat',
            'enableListen',
        ])

        const newOptions: SocketLogOptions = {
            activeServerInfo: {
                id: '00000000000000000000000000',
                name: '[自动迁移]',
                url: '',
                clientId: '',
                socketHeartbeat: false,
                clientIdParamMode: ClientIdParamMode.Path,
            },
            defaultTabIdMode: CompatibleTabIdMode.Fake_9x6,
            defaultE2EConfig: {
                key: '',
            }
        }
        const newSetting: {
            options?: SocketLogOptions
            enableListen?: boolean
        } = {}

        console.debug('[MS] read values', values)

        if (values.address) {
            console.debug('[MS] 读取 address，开始迁移', address)
            try {
                const _address = values.address
                const url = new URL(`${_address.tls ? 'wss' : 'ws'}://${_address.host}:${_address.port}`)
                if ('path' in _address) {
                    url.pathname = _address.path
                }
                newOptions.activeServerInfo!.url = url.toString()
            } catch (e) {
                console.warn('old_setting_sync failed', e)
                return
            }
        }
        newSetting.enableListen = values?.enableListen ?? false
        newOptions.activeServerInfo!.clientId = (values?.clientId ?? '').trim()
        newOptions.activeServerInfo!.socketHeartbeat = values?.enableClientHeartbeat ?? false

        if (values.e2eConfig && values.e2eConfig?.key) {
            newOptions.defaultE2EConfig = values.e2eConfig
        }

        newSetting.options = newOptions
        console.info('[MS] 迁移的新设置', newSetting)
        await chrome.storage.local.set(newSetting)
        await appendServerCollection(newOptions.activeServerInfo!)
    } catch (e) {
        console.error('[MS] 设置迁移发生故障', e)
    }
    notifications(
        `重大版本更新通知 (${getExtensionsVersion()})`,
        '大版本更新配置已经迁移，请检查插件设置是否正确！'
    )
    setTimeout(() => {
        restartClientConnection()
    }, 1000)
}
