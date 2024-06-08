import {defineStore} from 'pinia'
import {computed, ref} from "vue";
import store from "./index"
import EventEmitter from "eventemitter3";

let isInitialize = false
const eventDispatch = new EventEmitter()

export const useStatusStore = defineStore('status', () => {

    const statusMessage = ref({
        e2eStatusMessage: '',
        clientStatusMessage: '',
    })
    const e2eStatusMessage = computed(() => statusMessage.value.e2eStatusMessage || '无')
    const clientStatusMessage = computed(() => statusMessage.value.clientStatusMessage || '无')

    const onReady = (fn: () => void): void => {
        if (isInitialize) {
            fn()
        } else {
            eventDispatch.once('init', () => fn())
        }
    }

    const saveOption = async (name: LOCAL_KEY, value: unknown) => {
        await saveStatusValues({
            [name]: value,
        })
    }
    const saveOptions = async (values: { [key in LOCAL_KEY]?: unknown }) => {
        await saveStatusValues(values)
    }

    return {
        statusMessage,
        e2eStatusMessage,
        clientStatusMessage,
        onReady,
        saveOption,
        saveOptions,
    }
})

const LOCAL_KEYS = [
    'e2eStatusMessage',
    'clientStatusMessage',
] as const

type LOCAL_KEY = typeof LOCAL_KEYS[number];

export function useStatusStoreHook() {
    return useStatusStore(store)
}

export async function initialize() {
    if (isInitialize) {
        return
    }

    const values = await chrome.storage.session.get(LOCAL_KEYS)

    putStorageValues(values)

    listenerStorageChanged(LOCAL_KEYS)

    isInitialize = true
    eventDispatch.emit('init')
}

export async function saveStatusValues(values: { [key in LOCAL_KEY]?: unknown }) {
    const updateData: { [key: string]: unknown } = {}
    for (const [key, value] of Object.entries(values)) {
        if (!LOCAL_KEYS.includes(key as LOCAL_KEY)) {
            continue
        }
        // 考虑实现对象值的合并能力
        updateData[key] = value
    }
    await chrome.storage.session.set(updateData)
}

function putStorageValues(values: { [key: string]: unknown }) {
    const options = useStatusStore()
    if ('e2eStatusMessage' in values) {
        options.statusMessage.e2eStatusMessage = (values.e2eStatusMessage ?? '') as string
    }
    if ('clientStatusMessage' in values) {
        options.statusMessage.clientStatusMessage = (values.clientStatusMessage ?? '') as string
    }
}

function listenerStorageChanged(keys: ReadonlyArray<LOCAL_KEY>) {
    chrome.storage.session.onChanged.addListener(async (values) => {

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
