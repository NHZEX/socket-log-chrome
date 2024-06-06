import {defineStore} from "pinia";
import store from "~/stores/index";
import {ref} from "vue";
import {isEqual} from "radash";
import EventEmitter from "eventemitter3";

let isInitialize = false
const eventDispatch = new EventEmitter()

export const useListenerRule = defineStore('listener-rule', () => {

    const allowRules = ref<string[]>([])

    const onReady = (fn: Function): void => {
        if (isInitialize) {
            fn()
        } else {
            eventDispatch.once('init', () => fn())
        }
    }

    async function saveRules(allowRules: string[]): Promise<string[]> {

        const hosts = [];
        for (let host of allowRules) {
            host = host.trim()
            if (!host) {
                continue
            }
            if (!/^[\x21-\x7E]+$/.test(host)) {
                throw new Error(`主机匹配规则不合法: ${host}`)
            }
            hosts.push(host);
        }

        await chrome.storage.sync.set({
            allowRules: hosts,
            currentRuleFlag: (new Date()).getTime(),
        })

        return hosts
    }

    return {
        allowRules,
        onReady,
        saveRules,
    }
})

export function useListenerRuleHook() {
    return useListenerRule(store)
}

export async function initialize() {
    if (isInitialize) {
        return
    }

    const { allowRules } = await chrome.storage.sync.get(['allowRules'])

    const store = useListenerRuleHook()

    store.allowRules = allowRules ?? []

    listenerStorageChanged()

    isInitialize = true
    eventDispatch.emit('init')
}

function listenerStorageChanged () {
    const store = useListenerRuleHook()

    chrome.storage.sync.onChanged.addListener(({ allowRules }) => {
        if (allowRules === undefined) {
            return
        }
        if (isEqual(store.allowRules, allowRules.newValue)) {
            return;
        }
        store.allowRules = allowRules.newValue
    })
}
