import { installRequestHandleRules } from './RequestHandle'
import {
    enable_icon,
    disable_icon,
    badge_normal_bright,
    badge_normal_destroy,
    badge_error_bright,
    badge_error_destroy
} from 'src/helper'
import { isObject } from "lodash";
import {
    getAddressData,
    getClientId,
    isEnableListen,
    migrateSetting, listenerAllowHostRulesChanged
} from "../storage";
import { Client } from "./ListenerClient";

self.addEventListener('install', event => {
    console.log('[ServiceWorker] 工作进程被安装', event)
});
self.addEventListener('activate', event => {
    console.log('[ServiceWorker] 工作进程被激活', event)
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    console.log('onInstalled', reason)

    if (reason === 'install') {
        // await chrome.alarms.create('listener-heartbeat', {
        //     delayInMinutes: 0.5,
        //     periodInMinutes: 0.5
        // });
    } else if (reason === 'update') {
        // 执行配置迁移
        setTimeout(async () => {
            await migrateSetting()
        }, 0)
    }
    if (reason === 'install' || reason === 'chrome_update') {
        await installRequestHandleRules()
    }
});

// chrome.alarms.onAlarm.addListener((alarm) => {
//     console.log('alarm trigger', alarm.name)
// });

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('onMessage sender', sender)
    if (!isObject(message)) {
        return false;
    }
    if ('restart_connection' === message.event) {
        console.debug('restart_connection listen server')
        await wsc.init()
        sendResponse('restart_connection done')
    }
});

// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
//     console.log('tabsOnUpdated', tabId, changeInfo, tab)
// });

chrome.storage.local.onChanged.addListener(async ({ clientId, enableListen }) => {
    if (clientId !== undefined) {
        const { newValue, oldValue } = clientId
        if (newValue !== oldValue) {
            console.log('clientId.onChanged', newValue, oldValue)
            await installRequestHandleRules()
            return
        }
    }
    if (enableListen !== undefined) {
        const { newValue, oldValue } = enableListen
        if (newValue !== oldValue) {
            console.log('enableListen.onChanged', newValue, oldValue)
            await installRequestHandleRules()
            return
        }
    }
})

listenerAllowHostRulesChanged(async () => {
    await installRequestHandleRules()
})

const wsc = new Client()

;(async () => {
    await wsc.init()
})();
