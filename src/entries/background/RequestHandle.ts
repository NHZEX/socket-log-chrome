import {getAllowHostRules} from "~/utils/storage";
import {getGlobalOptionsReader} from "./StorageUtils";
import {notifications} from "~/utils/helper";
import {debounce, isEqual} from "radash";
import {SocketLogOptions} from "~types/socket-log.options";

// import browser from "webextension-polyfill";

export async function reinstallRequestHandleRules () {
    const globalOptionsReader = await getGlobalOptionsReader({
        reinitialize: true,
    });

    const clientId = globalOptionsReader.clientId

    if (!clientId) {
        console.log('InstallRequestHandleRules: client is empty, stop handle')
        await removeRequestHandleRules()
        return
    }
    if (!globalOptionsReader.isEnableListen) {
        console.log('InstallRequestHandleRules: enableListen is false, stop handle')
        await removeRequestHandleRules()
        return
    }

    console.log(`InstallRequestHandleRules: client = ${clientId}`)

    // todo 兼容性解决方案 tabId 填充假值，接受端需要调整 tabId 处理逻辑
    const userAgent = `${navigator.userAgent} SocketLog(tabid=999999&client_id=${clientId})`

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
