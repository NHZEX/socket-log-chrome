import { isEnableListen, getAddressData, getClientId } from "../storage";
import {
    IMG_LOGO,
    disable_icon,
    enable_icon,
    badge_error_bright,
    badge_error_destroy,
    badge_normal_bright,
    badge_normal_destroy
} from "../helper";

async function set_running_state(message) {
    await chrome.storage.session.set({
        status_message: message
    });
}

function notifications (title, message, timeout, id) {
    let opt = {
        type: "basic",
        title: title,
        message: message,
        iconUrl: IMG_LOGO
    };
    chrome.notifications.create(id, opt, (id) => {
        setTimeout(function () {
            chrome.notifications.clear(id, () => {});
        }, timeout);
    });
}

export class Client {
    address = {
        tls: false,
        host: 'localhost',
        port: 1229,
        path: '/',
    };

    ws = null
    #reconnectionTimer = 0

    constructor () {}

    async init () {
        if (await isEnableListen() === false) {
            console.log('当前监听状态：禁用')
            if (this.ws && (WebSocket.CLOSED !== this.ws.readyState || WebSocket.CLOSING !== this.ws.readyState)) {
                this.ws.close();
            }
            this.ws = null
            disable_icon();
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
            this.ws.onclose = () => {}; //onclose 函数置空，防止重复链接
            // 如果 websocket 未关闭则关闭链接
            if (WebSocket.CLOSED !== this.ws.readyState) {
                this.ws.close();
            }
        }

        this.ws = new WebSocket(address);

        this.ws.onerror = (msg) => {
            console.warn('websocket: ', msg)
            this.#onClone('服务连接失败')
        };

        this.ws.onclose = () => {
            this.#onClone('服务已经关闭')
        };

        this.ws.onopen = async () => {
            await set_running_state('服务链接成功');
            enable_icon();
        };

        this.ws.onmessage = async e => {
            await this.#onMessage(e)
        };
    }

    async #onMessage (event) {
        let client_id = await getClientId();

        let result = {
            client_id: null,
            force_client_id: null,
            logs: null,
            // tabid: null,
        };
        try {
            let data = JSON.parse(event.data);
            result.client_id = data['client_id'];
            result.force_client_id = data['force_client_id'];
            result.logs = data['logs'];
            // result.tabid = data['tabid'];
        } catch (e) {
            badge_error_bright();
            let opt = {
                type: "basic",
                title: "日志格式无法解析(no json)",
                message: event.data,
                iconUrl: IMG_LOGO
            };
            chrome.notifications.create(null, opt, function (id) {
                setTimeout(function () {
                    chrome.notifications.clear(id, function () {
                    });
                }, 5000);
            });
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
                let tab = tabs[0];
                await chrome.tabs.sendMessage(tab.id, result.logs);
            }
        } finally {
            badge_normal_destroy();
        }
    }

    #onClone (stateMessage) {
        clearTimeout(this.#reconnectionTimer);
        this.#reconnectionTimer = setTimeout(() => {
            this.init()
        }, 2000);
        set_running_state(stateMessage);
        disable_icon();
    }
}
