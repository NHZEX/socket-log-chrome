import { isObject } from "lodash-es";
import {
    listenerAllowHostRulesChanged,
    listenerE2EConfigChanged,
} from "~/utils/storage";
import { migrateSetting } from "~/utils/migrate-setting";
import { installRequestHandleRules } from './RequestHandle'
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
    if (reason === 'install' || reason === 'update' || reason === 'chrome_update') {
        await installRequestHandleRules()

        console.debug('active-alarms', (await chrome.alarms.getAll()).map(v => `${v.name}: ${v.periodInMinutes} minutes`))
    }
    if (reason === 'install' || reason === 'update') {
        await chrome.alarms.clearAll()
    }
});

chrome.runtime.onMessage.addListener(async (message : { event: string }, sender, sendResponse) => {
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

listenerE2EConfigChanged(async () => {
    await wsc.e2eReload()
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
    console.debug('alarm trigger', alarm.name, alarm)
    await wsc?.alarmTriggerHandle(alarm)
});

(async () => {
    // auto start
    await wsc.init()
    await migrateSetting()
})();
