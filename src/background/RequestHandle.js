import { getClientId } from "../storage";

export async function installRequestHandleRules () {
    const clientId = await getClientId()

    if (!clientId) {
        console.log('InstallRequestHandleRules: client is empty, stop handle')
        await removeRequestHandleRules()
        return
    }
    console.log(`InstallRequestHandleRules: client = ${clientId}`)

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    const userAgent = `${navigator.userAgent} SocketLog(tabid=0&client_id=${clientId})`
    /**
     * @type Rule[]
     */
    const newRules = [
        {
            "id": 1,
            "priority": 1,
            "action": {
                "type": "modifyHeaders",
                "requestHeaders": [
                    { "header": "User-Agent", "operation": "set" , 'value': userAgent }
                ]
            },
            "condition": {
                "urlFilter": "*://*/*"
            }
        }
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: newRules
    })
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
