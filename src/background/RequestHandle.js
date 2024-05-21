import { getAllowHostRules, getClientId } from "../storage";
import { IMG_LOGO } from "../helper";

export async function installRequestHandleRules () {
    const clientId = await getClientId()

    if (!clientId) {
        console.log('InstallRequestHandleRules: client is empty, stop handle')
        await removeRequestHandleRules()
        return
    }
    console.log(`InstallRequestHandleRules: client = ${clientId}`)

    const userAgent = `${navigator.userAgent} SocketLog(tabid=0&client_id=${clientId})`

    const filters = await getAllowHostRules()
    /**
     * @type Rule[]
     */
    const newRules = [];

    if (filters.length > 0) {
        console.log(`InstallRequestHandleRules: filter count = ${filters.length}`)
        let i = 0
        for (const filter of filters) {
            newRules.push({
                "id": ++i,
                "priority": 1,
                "action": {
                    "type": "modifyHeaders",
                    "requestHeaders": [
                        { "header": "User-Agent", "operation": "set" , 'value': userAgent }
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
                "type": "modifyHeaders",
                "requestHeaders": [
                    { "header": "User-Agent", "operation": "set" , 'value': userAgent }
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
        console.error(e)
        chrome.notifications.create(null, {
            type: "basic",
            title: "更新域名监听名单失败",
            message: `请检查输入是否有效：\n${e.message}`,
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
