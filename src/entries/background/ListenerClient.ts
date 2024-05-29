import {
    isEnableListen,
    getAddressData,
    getClientId,
    isEnableClientHeartbeat,
    getE2EConfig,
} from "~/utils/storage";
import {
    disable_icon,
    enable_icon,
    badge_error_bright,
    badge_error_destroy,
    badge_normal_bright,
    badge_normal_destroy,
    set_running_state,
    notifications,
    getChromeMajorVersion,
} from "~/utils/helper";
import { MessageProcessor } from "./MessageProcessor";

export const LinkHoldAlarmName = 'listener-link-hold'

export class Client {

    address = {
        tls: false,
        host: 'localhost',
        port: 1229,
        path: '/',
    };

    ws: WebSocket | null = null
    #reconnectionTimer: number = 0
    #heartbeatTimer: number = 0

    #messageProcessor: MessageProcessor

    constructor () {
        this.#messageProcessor = new MessageProcessor()
    }

    static LinkHoldAlarmName () {
        return LinkHoldAlarmName
    }

    isActive () {
        return !(
            (this.ws ?? null) === null
            || this.ws?.readyState === WebSocket.CLOSED
            || this.ws?.readyState === WebSocket.CLOSING
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
                this.#onClone('服务已经关闭', false)
                await this.init()
            }
        }
    }

    async init (options: {
        isAutoReconnection?: boolean
    } = {}) {
        if (await isEnableListen() === false) {
            console.info('当前监听状态：禁用')
            if (this.ws) {
                try {
                    this.ws.close();
                } catch (e) {
                    console.warn('ws close', e)
                }
            }
            this.ws = null
            disable_icon();
            await this.uninstallLinkHoldAlarm()
            return false;
        }

        // 载入监听地址
        this.address = await getAddressData();
        const clientId = await getClientId();

        let path = this.address.path.trim()
        if (!path.startsWith('/')) {
            path = '/' + path
        }
        if (!path.endsWith('/')) {
            path = path + '/'
        }
        const address = `${this.address.tls ? 'wss' : 'ws'}://${this.address.host}:${this.address.port}${path}${clientId}`;

        console.info('connection to ' + address);

        if (this.ws) {
            //避免重复监听
            this.ws.onclose = () => {}; //onclose 函数置空，防止重复连接
            // 如果 websocket 未关闭则关闭连接
            if (WebSocket.CLOSED !== this.ws.readyState) {
                this.ws.close();
            }
        }

        await set_running_state('服务连接中');
        if (!(options?.isAutoReconnection ?? false)) {
            await this.e2eReload()
        }
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
            if (await isEnableClientHeartbeat()) {
                this.#heartbeatBoot();
            }
            await set_running_state('服务连接成功');
            enable_icon();
        };

        socket.onmessage = async e => {
            await this.#onMessage(e)
        };

        await this.installLinkHoldAlarm()
        this.ws = socket;
    }

    async e2eReload () {
        console.info('[e2e] reload')
        await this.#messageProcessor.loadE2EConfig(
            await getClientId(),
            await getE2EConfig(),
        )
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
        }
    }

    #sendPing () {
        const binaryData = new Uint8Array([0x05, 0x22, 0x09]);
        this.ws!.send(binaryData.buffer);
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

        let client_id = await getClientId();

        let result = {
            client_id: null,
            force_client_id: null,
            logs: null,
            // tabid: null,
        };
        try {
            let data = JSON.parse(content);
            result.client_id = data['client_id'];
            result.force_client_id = data['force_client_id'];
            result.logs = data['logs'];
            // result.tabid = data['tabid'];
        } catch (e) {
            badge_error_bright();
            notifications('日志内容无法解析', '解码 json 异常: ' + e)
            badge_error_destroy();
            return;
        }

        // 分发用户一致则继续分发日志
        if (!(result.client_id === client_id || result.force_client_id === client_id)) {
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
            console.log(tabs)
            if (tabs.length > 0) {
                console.log('即将推送 tabs: ', tabs)
                let tab: chrome.tabs.Tab = tabs[0];
                await chrome.tabs.sendMessage(tab.id as number, result.logs);
            }
        } finally {
            badge_normal_destroy();
        }
    }

    #onClone (stateMessage: string, reconnection = true) {
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
        set_running_state(stateMessage);
        disable_icon();
    }
}
