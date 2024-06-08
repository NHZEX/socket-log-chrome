import {isEqual} from "radash";
import type {ActiveServerInfo, ClientEndToEndConfig, SocketLogOptions} from "~types/socket-log.options";
import {ClientIdParamMode, CompatibleTabIdMode} from "~/enum/socket-log-options";

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

console.debug('SU', import.meta)
