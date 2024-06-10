import {isEqual, isString} from "radash";
import {
  ActiveServerInfo,
  ClientEndToEndConfig,
  ClientEndToEndConfigEntity,
  SocketLogOptions
} from "~types/socket-log.options";
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

    get options (): SocketLogOptions {
        return this.#options
    }

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

type E2EConfigEntityCollection = Map<string, ClientEndToEndConfigEntity>

export interface IEndToEndRepository {
  findConfig (id: string|ArrayBuffer): ClientEndToEndConfigEntity|undefined;
}

class EndToEndRepository implements IEndToEndRepository {

  private e2eConfigCollection!: E2EConfigEntityCollection
  private textDecoder = new TextDecoder("utf-8", {fatal: true})

  private async buildDecryptKey (key: string) {
    const keyBinary = new TextEncoder().encode(key)
    const keyHash = await self.crypto.subtle.digest(
      'SHA-256',
      keyBinary.buffer
    )
    return await self.crypto.subtle.importKey(
      'raw',
      keyHash,
      {
        name: 'AES-GCM',
      },
      true,
      ['decrypt']
    )
  }

  public async setCollection (items: ClientEndToEndConfig[]) {
    const collection: E2EConfigEntityCollection = new Map()
    for (const item of items) {
      if (!item.id || item.disable === true) {
        continue
      }
      collection.set(item!.id, {
        key: await this.buildDecryptKey(item!.key),
      })
    }
    this.e2eConfigCollection = collection
  }

  public findConfig (id: string|ArrayBuffer): ClientEndToEndConfigEntity|undefined {
    if (this.e2eConfigCollection === undefined) {
      return undefined
    }
    if (id instanceof ArrayBuffer) {
      id = this.textDecoder.decode(id)
    }
    return this.e2eConfigCollection.get(id)
  }
}

let SocketLogOptionsReaderInstance: SocketLogOptionsReader|null = null

export async function getGlobalOptionsReader(
    { reinitialize } : { reinitialize: boolean } = { reinitialize: true }
) {
    if (!reinitialize && SocketLogOptionsReaderInstance instanceof SocketLogOptionsReader) {
        return SocketLogOptionsReaderInstance
    }

    const values = await chrome.storage.local.get([
      'enableListen',
      'options',
    ])

    return SocketLogOptionsReaderInstance = new SocketLogOptionsReader({
        options: values.options as SocketLogOptions,
        enableListen: values?.enableListen ?? false,
    })
}

let EndToEndRepositoryInstance: EndToEndRepository|undefined

export async function getEndToEndRepository() {
  if (EndToEndRepositoryInstance instanceof EndToEndRepository) {
    return EndToEndRepositoryInstance
  }

  const values = await chrome.storage.local.get([
    'endToEndCollection',
  ])

  EndToEndRepositoryInstance = new EndToEndRepository()
  await EndToEndRepositoryInstance.setCollection(values?.endToEndCollection ?? [])

  return EndToEndRepositoryInstance
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



export function installStorageSync() {
  chrome.storage.local.onChanged.addListener(async ({ endToEndCollection }) => {
    if (endToEndCollection !== undefined) {
      const { newValue, oldValue }= endToEndCollection

      console.debug('endToEndCollection.onChanged', newValue, oldValue)
      if (EndToEndRepositoryInstance instanceof EndToEndRepository) {
        await EndToEndRepositoryInstance.setCollection(newValue)
      }
    }
  })
}

installStorageSync()
