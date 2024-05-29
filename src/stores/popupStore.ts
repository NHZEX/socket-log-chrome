import { defineStore } from 'pinia'
import { computed, ref } from "vue";
import {
    getAddressData,
    getClientId,
    getE2EConfig,
    saveE2EConfig,
    getRunningState,
    isEnableClientHeartbeat,
    isEnableListen,
    getE2EState,
} from "~/utils/storage";
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
    const e2eStateMessage = ref('');

    const e2eConfig = ref({
        key: '',
    })
    const save_e2eKey = ref('')
    const e2eKeyIsChange = computed(() => e2eConfig.value.key !== save_e2eKey.value)

    const loadStorageData = async () => {
        clientId.value = await getClientId()
        enableListen.value = await isEnableListen()
        enableClientHeartbeat.value = await isEnableClientHeartbeat()
        await readStorageAddress()
        await syncStatusMessage()

        e2eConfig.value = await getE2EConfig()
        save_e2eKey.value = e2eConfig.value.key

        console.log('加载存储数据完成', {
            address: address.value,
            clientId: clientId.value,
            enableListen: enableListen.value,
        })
    }
    const syncStatusMessage = async () => {
        stateMsg.value = await getRunningState() || '无状态'
        e2eStateMessage.value = await getE2EState() || ''
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

    const saveE2EConfigData = async () => {
        await saveE2EConfig(e2eConfig.value)
        save_e2eKey.value = e2eConfig.value.key
    }

    return {
        address,
        clientId,
        enableListen,
        enableClientHeartbeat,
        stateMsg,
        e2eStateMessage,
        e2eConfig,
        e2eKeyIsChange,
        loadStorageData,
        syncStatusMessage,
        readStorageAddress,
        saveStorageData,
        saveE2EConfigData,
    }
})
