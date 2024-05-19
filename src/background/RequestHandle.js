export async function initRequestListener () {
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    const userAgent = navigator.userAgent + ` SocketLog(tabid=0&client_id=debug1)`
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
