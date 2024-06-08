import {isEqual, isString} from "radash";
import type {ActiveServerInfo, ClientEndToEndConfig, SocketLogOptions} from "~types/socket-log.options";
import {ClientIdParamMode, CompatibleTabIdMode} from "~/enum/socket-log-options";
import {listenerServerCollectionChanged} from "~/stores/ServerCollectionStore";
import {restartClientConnection} from "~/entries/background/main";

interface OptionsReaderConstructorParams {
    options?: SocketLogOptions,
    enableListen?: boolean,
}

class SocketLogOptionsReader implements SocketLogOptions {

    #options!: SocketLogOptions
    #enableListen!: boolean;

    get activeServerInfo (): ActiveServerInfo {
        return this.#options.activeServerInfo;
    }
    get defaultE2EConfig (): ClientEndToEndConfig {
        return this.#options.defaultE2EConfig;
    }
    get defaultTabIdMode (): CompatibleTabIdMode {
        return this.#options.defaultTabIdMode;
    }
    get enableListen (): boolean {
        return this.#enableListen;
    }

    constructor(values: OptionsReaderConstructorParams) {
        this.#setProps(values)
    }

    #setProps (values: OptionsReaderConstructorParams) {
        if ('options' in values) {
            this.#options = values!.options as SocketLogOptions;
        }
        if ('enableListen' in values) {
            this.#enableListen = values!.enableListen as boolean;
        }
    }

    get isEnableListen (): boolean {
        return this.enableListen;
    }

    get isEnableClientHeartbeat (): boolean {
        return this.activeServerInfo!.socketHeartbeat;
    }

    get clientId (): string {
        return this.activeServerInfo!.clientId
    }

    get addressUrl (): string {
        const url = new URL(this.activeServerInfo!.url);

        switch (this.activeServerInfo?.clientIdParamMode) {
            case ClientIdParamMode.Path:
                if (url.pathname.endsWith('/')) {
                    url.pathname += this.activeServerInfo!.clientId
                } else {
                    url.pathname += '/' + this.activeServerInfo!.clientId
                }
                break;
            case ClientIdParamMode.Query:
                url.searchParams.append('clientId', this.activeServerInfo!.clientId)
                break;
            default:
                throw new Error('Unsupported clientId param mode')
        }

        return url.toString()
    }
}

let SocketLogOptionsReaderInstance: SocketLogOptionsReader|null = null

export async function getGlobalOptionsReader(
    { reinitialize } : { reinitialize: boolean } = { reinitialize: true }
) {
    if (!reinitialize && SocketLogOptionsReaderInstance instanceof SocketLogOptionsReader) {
        return SocketLogOptionsReaderInstance
    }

    const values = await chrome.storage.local.get(['enableListen', 'options'])

    return SocketLogOptionsReaderInstance = new SocketLogOptionsReader({
        options: values.options as SocketLogOptions,
        enableListen: values?.enableListen ?? false,
    })
}

export function clearGlobalOptionsReaderInstance(): void
{
    SocketLogOptionsReaderInstance = null
}

export function listenerGlobalOptionsChanged(fn: (options: SocketLogOptions) => void) {
    chrome.storage.local.onChanged.addListener(async ({ options }) => {
        if (options === undefined) {
            return
        }
        const { newValue, oldValue }= options

        console.debug('GlobalOptions.onChanged', newValue, oldValue)
        if (!isEqual(newValue, oldValue)) {
            fn(newValue)
        }
    })
}

export function installActiveServerInfoSync(): void {
    console.debug('installActiveServerInfoSync')

    listenerServerCollectionChanged(async (collection) => {
        if (collection.length === 0) {
            return;
        }

        const { options }: { options?: SocketLogOptions } = await chrome.storage.local.get(['options'])

        if (options === undefined) {
            return
        }

        const serverId = options?.activeServerInfo?.id

        if (!isString(serverId)) {
            return
        }
        const newServer = collection.find(v => v.id === serverId)
        if (newServer === undefined) {
            return
        }
        if (isEqual(newServer, options!.activeServerInfo)) {
            return
        } else {
            options!.activeServerInfo = newServer
        }
        console.debug('activeServerInfo:sync', serverId)
        await chrome.storage.local.set({
            options,
        })
        await restartClientConnection()
    })
}
