import {getAllowHostRules} from "~/utils/storage";
import {getGlobalOptionsReader} from "./StorageUtils";
import {notifications} from "~/utils/helper";
import {debounce, isEqual} from "radash";
import type {SocketLogOptions} from "~types/socket-log.options";
import {CompatibleTabIdMode} from "~/enum/socket-log-options";

// import browser from "webextension-polyfill";

export async function reinstallRequestHandleRules () {
    const globalOptionsReader = await getGlobalOptionsReader({
        reinitialize: true,
    });

    const clientId = globalOptionsReader.clientId

    if (!clientId) {
        console.info('InstallRequestHandleRules: client is empty, stop handle')
        await removeRequestHandleRules()
        return
    }
    if (!globalOptionsReader.isEnableListen) {
        console.info('InstallRequestHandleRules: enableListen is false, stop handle')
        await removeRequestHandleRules()
        return
    }


    const params = buildParams(globalOptionsReader)
    console.info(`InstallRequestHandleRules: args = (${params})`)

    const userAgent = `${navigator.userAgent} SocketLog(${params})`

    const filters = await getAllowHostRules()

    const newRules: chrome.declarativeNetRequest.Rule[] = [];

    const allResourceTypes = Object.values(chrome.declarativeNetRequest.ResourceType)

    if (filters.length > 0) {

        console.log(`InstallRequestHandleRules: filter count = ${filters.length}`)
        let i = 0
        for (const filter of filters) {
            newRules.push({
                "id": ++i,
                "priority": 1,
                "action": {
                    "type": chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                    "requestHeaders": [
                        {
                            "header": "User-Agent",
                            "operation": chrome.declarativeNetRequest.HeaderOperation.SET,
                            'value': userAgent,
                        }
                    ]
                },
                "condition": {
                    "isUrlFilterCaseSensitive": false,
                    // "requestDomains": [],
                    resourceTypes: allResourceTypes,
                    "urlFilter": filter
                }
            })
        }
    } else {
        console.log(`InstallRequestHandleRules: filter is empty, use all match`)
        newRules.push({
            "id": 1,
            "priority": 1,
            "action": {
                "type": chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                "requestHeaders": [
                    {
                        "header": "User-Agent",
                        "operation": chrome.declarativeNetRequest.HeaderOperation.SET,
                        'value': userAgent,
                    }
                ]
            },
            "condition": {
                "isUrlFilterCaseSensitive": false,
                resourceTypes: allResourceTypes,
                "urlFilter": "*://*/*"
            }
        })
    }

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: oldRuleIds,
            addRules: newRules
        })
    } catch (e) {
        const error = e as Error
        console.error(error)
        notifications("更新域名监听名单失败", `请检查输入是否有效：\n${error?.message || ''}`, 10000)
    }
}

function buildParams (options: SocketLogOptions): string|null {
    const clientId = options.activeServerInfo!.clientId

    const tabIdMode = options.defaultTabIdMode

    if (tabIdMode === CompatibleTabIdMode.Fake_9x6) {
        return `tabid=999999&client_id=${clientId}`
    } else if (tabIdMode === CompatibleTabIdMode.Off) {
        return `client_id=${clientId}`
    }

    return null
}

export async function removeRequestHandleRules ()
{
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: []
    })
}

export const triggerRebuildRequestHandleRules = debounce({
    delay: 100,
}, reinstallRequestHandleRules)

export function installLikeOptionsChangedListener()
{
    // listener GlobalOptions Changed
    chrome.storage.local.onChanged.addListener(async (values) => {
        let rebuild = false
        if ('options' in values) {
            const { newValue, oldValue } = values.options as { newValue: SocketLogOptions, oldValue: SocketLogOptions }

            if (newValue?.activeServerInfo?.clientId !== oldValue?.activeServerInfo?.clientId) {
                rebuild = true
                console.debug('[RH] clientId onChanged', newValue?.activeServerInfo?.clientId, oldValue?.activeServerInfo?.clientId)
            } else if (newValue?.defaultTabIdMode !== oldValue?.defaultTabIdMode) {
                rebuild = true
                console.debug('[RH] defaultTabIdMode onChanged', newValue?.defaultTabIdMode, oldValue?.defaultTabIdMode)
            }
        }
        if ('enableListen' in values) {
            const { newValue, oldValue } = values.enableListen as { newValue: boolean, oldValue: boolean }

            if (newValue !== oldValue) {
                rebuild = true
                console.debug('[RH] enableListen onChanged', newValue, oldValue)
            }
        }
        if (rebuild) {
            console.debug('[RH] trigger rebuild')
            triggerRebuildRequestHandleRules()
        }
    })

    // listener Rules Changed
    chrome.storage.sync.onChanged.addListener(async ({ currentRuleFlag }) => {
        if (currentRuleFlag === undefined) {
            return
        }
        const { newValue, oldValue } = currentRuleFlag
        console.debug('[RH] rules onChanged', newValue, oldValue)
        if (isEqual(newValue, oldValue)) {
            console.debug('[RH] trigger rebuild')
            triggerRebuildRequestHandleRules()
        }
    })
}
