import {defineStore} from "pinia";
import {ref, toRaw} from "vue";
import type {SocketServerItem} from "~types/socket-log.options";
import store from "~/stores/index";
import {isEqual} from "radash";

let isInitialize = false

export const useServerCollection = defineStore('socket-server-collection', () => {

    const collection = ref<SocketServerItem[]>([])

    const create = async (newItem: SocketServerItem) => {
        if (!isInitialize) {
            throw new Error('No initial serverCollection')
        }

        if (!newItem.id) {
            throw new Error('id is missing')
        }

        if (collection.value.findIndex(item => item.id === newItem.id) !== -1) {
            throw new Error('寻找到重复的数据ID，请尝试重新保存')
        }

        collection.value.push(newItem)
        await flushStorage()
    }

    const update = async (newItem: SocketServerItem) => {
        if (!isInitialize) {
            throw new Error('No initial serverCollection')
        }

        if (!newItem.id) {
            throw new Error('id is missing')
        }

        const pos = collection.value.findIndex(item => item.id === newItem.id)
        if (pos === -1) {
            throw new Error('找不到关联数据，无法保存')
        }

        collection.value[pos] = newItem
        await flushStorage()
    }

    const find = (id: string): SocketServerItem|null => {
        return collection.value.find(item => item.id === id) ?? null
    }

    const remove = async (id: string) => {
        if (!isInitialize) {
            throw new Error('No initial serverCollection')
        }

        const pos = collection.value.findIndex(item => item.id === id)
        if (pos === -1) {
            throw new Error('找不到关联数据，无法删除')
        }

        collection.value.splice(pos, 1)
        await flushStorage()
    }

    const flushStorage = async () => {
        if (!isInitialize) {
            throw new Error('No initial serverCollection')
        }
        await chrome.storage.local.set({
            serverCollection: toRaw(collection.value),
        })
    }

    return {
        collection,
        find,
        create,
        update,
        remove,
    }
})

export function useServerCollectionStoreHook() {
    return useServerCollection(store)
}

export async function initialize() {
    if (isInitialize) {
        return
    }

    const { serverCollection } = await chrome.storage.local.get(['serverCollection'])

    const store = useServerCollectionStoreHook()

    store.collection = serverCollection ?? []

    listenerStorageChanged()

    isInitialize = true
}

function listenerStorageChanged() {
    const store = useServerCollectionStoreHook()

    chrome.storage.local.onChanged.addListener(({ serverCollection }) => {
        if (serverCollection === undefined) {
            return
        }
        if (isEqual(store.collection, serverCollection.newValue)) {
            return;
        }
        store.collection = serverCollection.newValue
    })
}
