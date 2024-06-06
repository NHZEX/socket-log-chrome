import {defineStore} from 'pinia'
import {ref} from "vue";
import store from "./index"
import type {
    SocketAddress,
    ClientEndToEndConfig,
    SocketLogOptions,
    SocketClientId,
    SocketEnableListen,
    SocketEnableClientHeartbeat
} from "~types/socket-log.options";
import {CompatibleTabIdMode} from "~/enum/socket-log-options";

const DEFAULT_ADDRESS_VALUE: SocketAddress = {
    tls: false,
    host: 'localhost',
    port: 1229,
    path: '/',
}

const DEFAULT_E2E_CONFIG_VALUE: ClientEndToEndConfig = {
    key: '',
}

const DEFAULT_SOCKET_LOG_OPTIONS_VALUE: SocketLogOptions = {
    defaultTabIdMode: CompatibleTabIdMode.Fake_9x6,
    defaultE2EConfig: DEFAULT_E2E_CONFIG_VALUE
}

export const useGlobalOptionsStore = defineStore('global-options', () => {

    const address = ref<SocketAddress>(DEFAULT_ADDRESS_VALUE)

    const clientId = ref<SocketClientId>('')
    const enableListen = ref<SocketEnableListen>(false)
    const enableClientHeartbeat = ref<SocketEnableClientHeartbeat>(false)
    const e2eConfig = ref<ClientEndToEndConfig>(DEFAULT_E2E_CONFIG_VALUE)
    const options = ref<SocketLogOptions>(DEFAULT_SOCKET_LOG_OPTIONS_VALUE)

    return {
        address,
        clientId,
        enableListen,
        enableClientHeartbeat,
        e2eConfig,
        options,
    }
})
let isInitialize = false

const LOCAL_KEYS = [
    'address',
    'clientId',
    'enableListen',
    'enableClientHeartbeat',
    'e2eConfig',
    'options'
]

export function useGlobalOptionsStoreHook() {
    return useGlobalOptionsStore(store)
}

export async function initialize() {
    if (isInitialize) {
        return
    }

    const values = await chrome.storage.local.get(LOCAL_KEYS)

    putStorageValues(values)

    listenerStorageChanged(LOCAL_KEYS)

    isInitialize = true
}

export async function saveLocalOptions(values: { [key: string]: unknown }) {
    const updateData: { [key: string]: unknown } = {}
    for (const [key, value] of Object.entries(values)) {
        if (!LOCAL_KEYS.includes(key)) {
            continue
        }
        // 考虑实现对象值的合并能力
        updateData[key] = value
    }
    await chrome.storage.local.set(updateData)
}

function putStorageValues(values: { [key: string]: unknown }) {
    const options = useGlobalOptionsStoreHook()
    if ('address' in values) {
        options.address = {
            ...DEFAULT_ADDRESS_VALUE,
            ...(values.address ?? {})
        }
    }
    if ('clientId' in values) {
        options.clientId = (values.clientId ?? '') as string
    }
    if ('enableListen' in values) {
        options.enableListen = (values.enableListen ?? false) as boolean
    }
    if ('enableClientHeartbeat' in values) {
        options.enableClientHeartbeat = (values.enableClientHeartbeat ?? 'off') === 'on'
    }
    if ('e2eConfig' in values) {
        options.e2eConfig = {
            ...DEFAULT_E2E_CONFIG_VALUE,
            ...(values.e2eConfig ?? {})
        }
    }
    if ('options' in values) {
        options.options = {
            ...DEFAULT_SOCKET_LOG_OPTIONS_VALUE,
            ...(values.options ?? {})
        }
    }
}

function listenerStorageChanged(keys: string[]) {
    chrome.storage.local.onChanged.addListener(async (values) => {

        const updateData: { [key: string]: unknown } = {}

        for (const [key, value] of Object.entries(values)) {
            if (!keys.includes(key)) {
                continue
            }
            updateData[key] = value.newValue
        }

        putStorageValues(updateData)
    })
}
