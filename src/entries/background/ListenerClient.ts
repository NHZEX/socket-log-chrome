import {
  badge_error_bright,
  badge_error_destroy,
  badge_normal_bright,
  badge_normal_destroy,
  disable_icon,
  enable_icon,
  getChromeMajorVersion,
  notifications,
} from "~/utils/helper";
import {MessageProcessor} from "./MessageProcessor";
import {getGlobalOptionsReader} from "~/entries/background/StorageUtils";
import {saveStatusValues} from "~/stores/StatusStore";

export const LinkHoldAlarmName = 'listener-link-hold'

export class Client {

    #ws: WebSocket | null = null
    #reconnectionTimer: number = 0
    #heartbeatTimer: number = 0

    #messageProcessor: MessageProcessor

    #clientId!: string

    constructor () {
        this.#messageProcessor = new MessageProcessor()
    }

    static LinkHoldAlarmName () {
        return LinkHoldAlarmName
    }

    isActive () {
        return !(
            (this.#ws ?? null) === null
            || this.#ws?.readyState === WebSocket.CLOSED
            || this.#ws?.readyState === WebSocket.CLOSING
        );

    }

    async installLinkHoldAlarm()
    {
        const alarmDelayInMinutes = getChromeMajorVersion() >= 120 ? 0.5 : 1.0
        await chrome.alarms.clearAll()
        await chrome.alarms.create(LinkHoldAlarmName, {
            delayInMinutes: alarmDelayInMinutes,
            periodInMinutes: alarmDelayInMinutes
        });
        console.debug('install-link-hold-alarm')
    }

    async uninstallLinkHoldAlarm()
    {
        await chrome.alarms.clear(LinkHoldAlarmName)
        console.debug('uninstall-link-hold-alarm')
    }

    async alarmTriggerHandle(alarm: chrome.alarms.Alarm)
    {
        if (alarm.name === LinkHoldAlarmName) {
            if (!this.isActive()) {
                console.debug('监听非活跃状态，尝试激活')
                await this.#onClone('服务已经关闭', false)
                await this.init()
            }
        }
    }

    async init (options: {
        isAutoReconnection?: boolean
    } = {}) {
        const globalOptionsReader = await getGlobalOptionsReader({
            reinitialize: true
        });

        disable_icon();
        if (!globalOptionsReader.isEnableListen) {
            console.info('当前监听状态：禁用')
            if (this.#ws) {
                try {
                    this.#ws.close();
                } catch (e) {
                    console.warn('ws close', e)
                }
            }
            this.#ws = null
            await this.uninstallLinkHoldAlarm()
            return false;
        }

        // 载入监听地址
        const address = globalOptionsReader.addressUrl;
        this.#clientId = globalOptionsReader.clientId

        console.info('connection to ' + address);

        if (this.#ws) {
            // 确保心跳停止
            this.#heartbeatStop()
            //避免重复监听
            this.#ws.onclose = () => {}; //onclose 函数置空，防止重复连接
            // 如果 websocket 未关闭则关闭连接
            if (WebSocket.CLOSED !== this.#ws.readyState) {
                this.#ws.close();
            }
        }

        await saveStatusValues({
            clientStatusMessage: '服务连接中',
        })

        const socket = new WebSocket(address);
        socket.binaryType = 'arraybuffer'

        socket.onerror = (msg) => {
            console.warn('websocket: ', msg)
            this.#onClone('服务连接失败')
        };

        socket.onclose = () => {
            this.#heartbeatStop()
            this.#onClone('服务已经关闭')
        };

        socket.onopen = async () => {
            if (globalOptionsReader.isEnableClientHeartbeat) {
                this.#heartbeatBoot();
            }
            await saveStatusValues({
                clientStatusMessage: '服务连接成功',
            })
            enable_icon();
        };

        socket.onmessage = async e => {
            await this.#onMessage(e)
        };

        await this.installLinkHoldAlarm()
        this.#ws = socket;
    }

    #heartbeatBoot () {
        console.debug('启动监听心跳')
        this.#heartbeatStop()
        this.#heartbeatTimer = setInterval(() => {
            this.#sendPing()
        }, 1000_0)
    }

    #heartbeatStop () {
        if (this.#heartbeatTimer) {
            clearInterval(this.#heartbeatTimer);
            this.#heartbeatTimer = 0
        }
    }

    #sendPing () {
        const binaryData = new Uint8Array([0x05, 0x22, 0x09]);
        this.#ws!.send(binaryData.buffer);
    }

    async #onMessage (event: MessageEvent) {
        if (event.data instanceof Blob) {
            // 暂未使用的二进制数据
            return
        }
        let content
        if (event.data instanceof ArrayBuffer) {
            content = await this.#messageProcessor.parseBinaryMessage(event.data)
            if (content === false) {
                return
            }
        } else {
            content = event.data
        }

        let result: {
            tabId?: number | null,
            clientId: string | null,
            forceClientId: string | null,
            logs: object[],
        };
        try {
            const data = JSON.parse(content);
            result = {
                tabId: data?.tabid ?? -1,
                clientId: data.client_id,
                forceClientId: data.force_client_id,
                logs: data.logs,
            }
        } catch (e) {
            badge_error_bright();
            notifications('日志内容无法解析', '解码 json 异常: ' + e)
            badge_error_destroy();
            return;
        }

        // 分发用户一致则继续分发日志
        if (!(result.clientId === this.#clientId || result.forceClientId === this.#clientId)) {
            return
        }

        try {
            badge_normal_bright();
            // 获取最后活动的标签页
            const tabs = await chrome.tabs.query({
                active: true,
                lastFocusedWindow: true,
                currentWindow: true,
            })
            if (tabs.length > 0) {
                console.debug('即将推送 tabs: ', tabs, result)
                const tab: chrome.tabs.Tab = tabs[0];
                await this.#sendLogMessage(tab, result.logs)
            }
        } finally {
            badge_normal_destroy();
        }
    }

    async #sendLogMessage (tab: chrome.tabs.Tab, message: object[], isRetry: boolean = false)
    {
        try {
            await chrome.tabs.sendMessage(tab.id as number, message);
        } catch (e) {
            console.warn('推送失败' + (isRetry ? '[retry]' : ''), {
                e,
                tab,
                log: message,
            })
            if (!isRetry) {
                setTimeout(async () => {
                    await this.#sendLogMessage(tab, message, true)
                }, 1000)
            }
        }
    }

    async #onClone (stateMessage: string, reconnection = true) {
        if (this.#reconnectionTimer) {
            clearTimeout(this.#reconnectionTimer);
        }
        if (reconnection) {
            this.#reconnectionTimer = setTimeout(() => {
                this.init({
                    isAutoReconnection: true,
                })
            }, 2000);
        }
        await saveStatusValues({
            clientStatusMessage: stateMessage,
        })
        disable_icon();
    }
}
