import { installRequestHandleRules } from './RequestHandle'
import { isObject } from "lodash-es";
import {
    migrateSetting,
    listenerAllowHostRulesChanged,
    listenerE2EConfigChanged,
} from "../storage";
import { Client } from "./ListenerClient";
import { getChromeMajorVersion } from "../helper";

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

        await installAlarms()
    }
});

async function installAlarms()
{
    const alarmDelayInMinutes = getChromeMajorVersion() >= 120 ? 0.5 : 1.0
    await chrome.alarms.clearAll()
    await chrome.alarms.create('listener-link-hold', {
        delayInMinutes: alarmDelayInMinutes,
        periodInMinutes: alarmDelayInMinutes
    });
    console.debug('install-alarms', (await chrome.alarms.getAll()).map(v => `${v.name}: ${v.periodInMinutes} minutes`))
}

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

listenerE2EConfigChanged(async () => {
    await wsc.e2eReload()
})

;(async () => {
    // await wsc.init()
})();

chrome.alarms.onAlarm.addListener(async (alarm) => {
    console.debug('alarm trigger', alarm.name, alarm)
    if (alarm.name === 'listener-link-hold') {
        if (!wsc.isActive()) {
            console.debug('监听非活跃状态，尝试激活')
            await wsc.init()
        }
    }
});
