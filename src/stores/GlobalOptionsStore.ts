import {defineStore} from 'pinia'
import {ref} from "vue";
import store from "./index"
import {
    ClientEndToEndConfig,
    SocketAddress,
    SocketClientId,
    SocketEnableClientHeartbeat,
    SocketEnableListen,
    SocketLogOptions
} from "~types/socket-log.options";
import {CompatibleTabIdMode} from "~/enum/socket-log-options";
import EventEmitter from "eventemitter3";

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
    defaultE2EConfig: DEFAULT_E2E_CONFIG_VALUE,
    activeServerInfo: null,
}

let isInitialize = false
const eventDispatch = new EventEmitter()

export const useGlobalOptionsStore = defineStore('global-options', () => {

    const address = ref<SocketAddress>(DEFAULT_ADDRESS_VALUE)

    const clientId = ref<SocketClientId>('')
    const enableListen = ref<SocketEnableListen>(false)
    const enableClientHeartbeat = ref<SocketEnableClientHeartbeat>(false)
    const e2eConfig = ref<ClientEndToEndConfig>(DEFAULT_E2E_CONFIG_VALUE)

    const options = ref<SocketLogOptions>(DEFAULT_SOCKET_LOG_OPTIONS_VALUE)

    const onReady = (fn: () => void): void => {
        if (isInitialize) {
            fn()
        } else {
            eventDispatch.once('init', () => fn())
        }
    }

    const saveOption = async (name: LOCAL_KEY, value: unknown) => {
        await saveLocalOptions({
            [name]: value,
        })
    }
    const saveOptions = async (values: { [key in LOCAL_KEY]?: unknown }) => {
        await saveLocalOptions(values)
    }

    return {
        address,
        clientId,
        enableListen,
        enableClientHeartbeat,
        e2eConfig,
        options,
        onReady,
        saveOption,
        saveOptions,
    }
})

const LOCAL_KEYS = [
    'enableListen',
    'options'
] as const

type LOCAL_KEY = typeof LOCAL_KEYS[number];

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
    eventDispatch.emit('init')
}

export async function saveLocalOptions(values: { [key in LOCAL_KEY]?: unknown }) {
    const updateData: { [key: string]: unknown } = {}
    for (const [key, value] of Object.entries(values)) {
        if (value === undefined || !LOCAL_KEYS.includes(key as LOCAL_KEY)) {
            continue
        }
        // 考虑实现对象值的合并能力
        updateData[key] = value
    }
    await chrome.storage.local.set(updateData)
}

function putStorageValues(values: { [key: string]: unknown }) {
    const options = useGlobalOptionsStoreHook()
    if ('enableListen' in values) {
        options.enableListen = (values.enableListen ?? false) as boolean
    }
    if ('options' in values) {
        options.options = {
            ...DEFAULT_SOCKET_LOG_OPTIONS_VALUE,
            ...(values.options ?? {})
        }
    }
}

function listenerStorageChanged(keys: ReadonlyArray<LOCAL_KEY>) {
    chrome.storage.local.onChanged.addListener(async (values) => {

        const updateData: { [key: string]: unknown } = {}

        for (const [key, value] of Object.entries(values)) {
            if (!keys.includes(key as LOCAL_KEY)) {
                continue
            }
            updateData[key] = value.newValue
        }

        putStorageValues(updateData)
    })
}
