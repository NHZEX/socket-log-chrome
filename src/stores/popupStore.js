import { defineStore } from 'pinia'
import { ref } from "vue";
import { getAddressData, getClientId, getRunningState, isEnableClientHeartbeat, isEnableListen } from "../storage";
import { get } from "lodash-es";

export const usePopupStore = defineStore('popup', () => {

    const address = ref({
        host: 'localhost',
        port: 1229,
        path: '/',
        tls: false,
    })
    const clientId = ref('')
    const enableListen = ref(false);
    const enableClientHeartbeat = ref(true);
    const stateMsg = ref('正在连接...');

    const loadStorageData = async () => {
        clientId.value = await getClientId()
        enableListen.value = await isEnableListen()
        enableClientHeartbeat.value = await isEnableClientHeartbeat()
        await readStorageAddress()
        await syncStatusMessage()

        console.log('加载存储数据完成', {
            address: address.value,
            clientId: clientId.value,
            enableListen: enableListen.value,
        })
    }
    const syncStatusMessage = async () => {
        stateMsg.value = await getRunningState() || '无状态'
    }
    const readStorageAddress = async () => {
        const data = await getAddressData()
        address.value.host = get(data, 'host', '127.0.0.1')
        address.value.port = get(data, 'port', 1229)
        address.value.tls = get(data, 'tls', false)
        address.value.path = get(data, 'path', '/')
    }
    const saveStorageData = async () => {
        await chrome.storage.local.set({
            address: address.value,
            clientId: clientId.value,
            enableListen: enableListen.value,
            enableClientHeartbeat: enableClientHeartbeat.value ? 'on' : 'off',
        })
    }

    return {
        address,
        clientId,
        enableListen,
        enableClientHeartbeat,
        stateMsg,
        loadStorageData,
        syncStatusMessage,
        readStorageAddress,
        saveStorageData,
    }
})
