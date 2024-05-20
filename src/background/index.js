import { initRequestListener } from './RequestHandle'
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
    migrateSetting
} from "../storage";
import { Client } from "./ListenerClient";

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    console.log('onInstalled', reason)

    if (reason !== 'install') {
        return;
    }

    // Create an alarm so we have something to look at in the demo
    await chrome.alarms.create('listener-heartbeat', {
        delayInMinutes: 0.5,
        periodInMinutes: 0.5
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('alarm trigger', alarm.name)
});

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

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log('tabsOnUpdated', tabId, changeInfo, tab)
})

await migrateSetting()
await initRequestListener()
const wsc = new Client()
await wsc.init()
