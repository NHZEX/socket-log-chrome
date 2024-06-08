import { migrateSetting } from "~/utils/migrate-setting"
import {installLikeOptionsChangedListener, reinstallRequestHandleRules} from './RequestHandle'
import { Client } from "./ListenerClient"
import {clearGlobalOptionsReaderInstance, listenerGlobalOptionsChanged} from "./StorageUtils"
import DebugHelper from './DebugHelper'

self.addEventListener('install', event => {
    console.log('[ServiceWorker] 工作进程被安装', event)
});
self.addEventListener('activate', event => {
    console.log('[ServiceWorker] 工作进程被激活', event)
});

chrome.runtime.onInstalled.addListener(async (details) => {
    const { reason } = details || {}
    console.log('onInstalled', reason)

    if (reason === 'install') {
        // 未使用
    } else if (reason === 'update') {
        // 执行配置迁移
        setTimeout(async () => {
            await migrateSetting(details!.previousVersion)
        }, 0)
    }
    if (reason === 'install' || reason === 'update' || reason === 'chrome_update') {
        await reinstallRequestHandleRules()

        console.debug('active-alarms', (await chrome.alarms.getAll()).map(v => `${v.name}: ${v.periodInMinutes} minutes`))
    }
    if (reason === 'install' || reason === 'update') {
        await chrome.alarms.clearAll()
    }
});

chrome.runtime.onMessage.addListener((message : { event: string }, sender, sendResponse) => {
    console.debug('[SW] onMessage sender', sender)
    let syncResponse = false

    if ('restart_connection' === message?.event) {
        console.debug('[SW] restart connection listen server')
        clearGlobalOptionsReaderInstance()
        wsc.init().finally(() => {
            sendResponse('restart connection done')
        })
        syncResponse = true
    }

    return syncResponse
});

// chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
//     console.log('tabsOnUpdated', tabId, changeInfo, tab)
// });

installLikeOptionsChangedListener()

const wsc = new Client()

listenerGlobalOptionsChanged(async (options) => {
    await wsc.e2eReload(options.defaultE2EConfig)
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
    console.debug('alarm trigger', alarm.name, alarm)
    await wsc?.alarmTriggerHandle(alarm)
});

(async () => {
    // auto start
    await wsc.init()
    // await migrateSetting()
})();
