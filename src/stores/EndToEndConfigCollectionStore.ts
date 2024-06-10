import {defineStore} from "pinia";
import {ref, toRaw} from "vue";
import type {ClientEndToEndConfig} from "~types/socket-log.options";
import store from "~/stores/index";
import {isEqual} from "radash";

let isInitialize = false

export const useEndToEndConfigCollectionStore = defineStore('end-to-end-config-collection', () => {

  const collection = ref<ClientEndToEndConfig[]>([])

  const create = async (newItem: ClientEndToEndConfig) => {
    if (!isInitialize) {
      throw new Error('No initial endToEndCollection')
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

  const update = async (newItem: ClientEndToEndConfig) => {
    if (!isInitialize) {
      throw new Error('No initial endToEndCollection')
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

  const find = (id: string): ClientEndToEndConfig | null => {
    return collection.value.find(item => item.id === id) ?? null
  }

  const remove = async (id: string) => {
    if (!isInitialize) {
      throw new Error('No initial endToEndCollection')
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
      throw new Error('No initial endToEndCollection')
    }
    await chrome.storage.local.set({
      endToEndCollection: toRaw(collection.value),
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

export function useEndToEndConfigCollectionStoreHook() {
  return useEndToEndConfigCollectionStore(store)
}

export async function initialize() {
  if (isInitialize) {
    return
  }

  const {endToEndCollection} = await chrome.storage.local.get(['endToEndCollection'])

  const store = useEndToEndConfigCollectionStoreHook()

  store.collection = endToEndCollection ?? []

  listenerStorageChanged()

  isInitialize = true
}

function listenerStorageChanged() {
  const store = useEndToEndConfigCollectionStoreHook()

  chrome.storage.local.onChanged.addListener(({endToEndCollection}) => {
    if (endToEndCollection === undefined) {
      return
    }
    if (isEqual(store.collection, endToEndCollection.newValue)) {
      return;
    }
    store.collection = endToEndCollection.newValue
  })
}

export function listenerEndToEndConfigCollectionChanged(fn: (collection: ClientEndToEndConfig[]) => void) {
  const store = useEndToEndConfigCollectionStoreHook()

  chrome.storage.local.onChanged.addListener(({endToEndCollection}) => {
    if (endToEndCollection === undefined) {
      return
    }
    if (isEqual(store.collection, endToEndCollection.newValue)) {
      return;
    }
    fn(endToEndCollection.newValue)
  })
}
