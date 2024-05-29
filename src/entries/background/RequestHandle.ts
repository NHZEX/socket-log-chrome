import { getAllowHostRules, getClientId, isEnableListen } from "~/utils/storage";
import { IMG_LOGO } from "~/utils/helper";
// import browser from "webextension-polyfill";

export async function installRequestHandleRules () {
    const clientId = await getClientId()
    const enableListen = await isEnableListen()

    if (!clientId) {
        console.log('InstallRequestHandleRules: client is empty, stop handle')
        await removeRequestHandleRules()
        return
    }
    if (enableListen === false) {
        console.log('InstallRequestHandleRules: enableListen is false, stop handle')
        await removeRequestHandleRules()
        return
    }

    console.log(`InstallRequestHandleRules: client = ${clientId}`)

    // todo 兼容性解决方案 tabId 填充假值，接受端需要调整 tabId 处理逻辑
    const userAgent = `${navigator.userAgent} SocketLog(tabid=999999&client_id=${clientId})`

    const filters = await getAllowHostRules()

    const newRules: chrome.declarativeNetRequest.Rule[] = [];

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
        chrome.notifications.create({
            type: "basic",
            title: "更新域名监听名单失败",
            message: `请检查输入是否有效：\n${error?.message || ''}`,
            iconUrl: IMG_LOGO
        }, function (id) {
            setTimeout(function () {
                chrome.notifications.clear(id);
            }, 10000);
        });
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
