import {debounce, isEqual, isString} from "radash";
import {
  ActiveServerInfo,
  ClientEndToEndConfig,
  ClientEndToEndConfigEntity,
  SocketLogOptions
} from "~types/socket-log.options";
import {ClientIdParamMode, CompatibleTabIdMode} from "~/enum/socket-log-options";
import {listenerServerCollectionChanged} from "~/stores/ServerCollectionStore";
import {restartClientConnection} from "~/entries/background/main";
import EventEmitter from "eventemitter3";
import {buildAdditionalData} from "~/entries/background/MessageProcessor";

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

  private static textDecoder = new TextDecoder("utf-8", {fatal: true})
  private e2eConfigCollection!: E2EConfigEntityCollection
  private defaultE2EConfigEntity?: ClientEndToEndConfigEntity
  private eventDispatch = new EventEmitter()

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

  public async setDefault (clientId?: string, config?: ClientEndToEndConfig) {
    if (clientId === undefined || config === undefined || config!.key === '') {
      this.defaultE2EConfigEntity = undefined
      return
    }

    this.defaultE2EConfigEntity = {
      id: clientId,
      key: await this.buildDecryptKey(config!.key),
      additional: await buildAdditionalData(clientId)
    }
    this.triggerChanged()
  }

  public async setCollection (items: ClientEndToEndConfig[]) {
    const collection: E2EConfigEntityCollection = new Map()
    for (const item of items) {
      if (!item.id || item.disable === true) {
        continue
      }
      collection.set(item!.id, {
        id: item.id,
        key: await this.buildDecryptKey(item!.key),
        additional: await buildAdditionalData(item.id)
      })
    }
    this.e2eConfigCollection = collection
    this.triggerChanged()
  }

  public findConfig (id: string|ArrayBuffer): ClientEndToEndConfigEntity|undefined {
    if (this.e2eConfigCollection === undefined) {
      return undefined
    }
    if (id instanceof ArrayBuffer) {
      id = EndToEndRepository.textDecoder.decode(id)
    }
    return this.e2eConfigCollection.get(id)
  }

  public getDefaultConfig () {
    return this.defaultE2EConfigEntity
  }

  private _triggerChanged () {
    const enable = this.defaultE2EConfigEntity !== undefined || this.e2eConfigCollection.size > 0
    console.debug('_triggerChanged', {
      defaultE2EConfigEntity: this.defaultE2EConfigEntity !== undefined,
      e2eConfigCollection: this.e2eConfigCollection.size,
    })

    this.eventDispatch.emit('changed', {
      enable,
    })
  }

  private triggerChanged = debounce({
    delay: 100,
  }, () => this._triggerChanged())

  public onChanged (fn: (event: { enable: boolean }) => void) {
    this.eventDispatch.addListener('changed', fn)

    if (EndToEndRepositoryInstance !== undefined) {
      this.triggerChanged()
    }
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
    'options',
  ])

  EndToEndRepositoryInstance = new EndToEndRepository()
  await EndToEndRepositoryInstance.setCollection(values?.endToEndCollection ?? [])

  const options = values.options as SocketLogOptions;
  await EndToEndRepositoryInstance.setDefault(
    options?.activeServerInfo?.clientId,
    options?.defaultE2EConfig,
  )

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
  chrome.storage.local.onChanged.addListener(async ({ endToEndCollection, options }) => {
    if (EndToEndRepositoryInstance === undefined) {
      return
    }
    if (endToEndCollection !== undefined) {
      const { newValue, oldValue }= endToEndCollection

      console.debug('EndToEndCollection.onChanged', newValue, oldValue)
      await EndToEndRepositoryInstance.setCollection(newValue)
    }
    if (options !== undefined) {
      const { newValue, oldValue }: {
        newValue?: SocketLogOptions,
        oldValue?: SocketLogOptions
      } = options

      if (
        (newValue?.defaultE2EConfig?.key !== oldValue?.defaultE2EConfig?.key)
        || (newValue?.activeServerInfo?.clientId !== oldValue?.activeServerInfo?.clientId)
      ) {
        console.debug('GlobalOptions.onChanged', newValue, oldValue)
        await EndToEndRepositoryInstance.setDefault(
          newValue?.activeServerInfo?.clientId,
          newValue?.defaultE2EConfig,
        )
      }
    }
  })
}

installStorageSync()
