import {isEqual} from "radash";
import type {ActiveServerInfo, ClientEndToEndConfig, SocketLogOptions} from "~types/socket-log.options";
import {ClientIdParamMode, CompatibleTabIdMode} from "~/enum/socket-log-options";

interface OptionsReaderConstructorParams {
    options?: SocketLogOptions,
    enableListen?: boolean,
}

class SocketLogOptionsReader implements SocketLogOptions {
    activeServerInfo!: ActiveServerInfo;
    defaultE2EConfig!: ClientEndToEndConfig;
    defaultTabIdMode!: CompatibleTabIdMode;
    enableListen!: boolean;

    constructor(values: OptionsReaderConstructorParams) {
        this.#setProps(values)

        // this.#listenerChanged()
    }

    #setProps (values: OptionsReaderConstructorParams) {
        if ('options' in values) {
            const options = values!.options as SocketLogOptions
            for (const [key, value] of Object.entries(options)) {
                if (key in this) {
                    this[key as keyof SocketLogOptions] = value;
                }
            }
        }
        if ('enableListen' in values) {
            this.enableListen = values!.enableListen as boolean;
        }
    }

    isEnableListen (): boolean {
        return this.enableListen;
    }

    isEnableClientHeartbeat (): boolean {
        return this.activeServerInfo!.socketHeartbeat;
    }

    getClientId (): string {
        return this.activeServerInfo!.clientId
    }

    getAddressUrl (): string {
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

    #listenerChanged () {
        chrome.storage.local.onChanged.addListener(async (values) => {
            const newValues: OptionsReaderConstructorParams = {}
            if ('options' in values) {
                newValues.options = values!.options.newValue
            }
            if ('enableListen' in values) {
                newValues.enableListen = values!.enableListen.newValue;
            }
            if (Object.keys(newValues).length > 0) {
                console.debug('SocketLogOptions.onChanged', Object.keys(newValues))
                this.#setProps(newValues)
                console.dir(this)
            }
        })
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
