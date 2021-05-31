const IMG_LOGO = require('src/assets/image/logo_320.png');
const IMG_LOGO_X16 = require('src/assets/image/logo_16.png');
const IMG_LOGO_DISABLED_X16 = require('src/assets/image/logo_disabled_16.png');

// 下标两/灭
const BADGE_BRIGHT = ' ';
const BADGE_DESTROY = '';

function set_running_state(message) {
    localStorage.setItem('status_message', message);
    try {
        chrome.runtime.sendMessage({
            'event': 'update_status',
        });
    } catch (e) {
        console.info('sendMessage update_status fail')
    }
}

class Client {
    address = {
        tls: false,
        host: 'localhost',
        port: '1229',
    };

    ws = null
    #ws_timeout = 0

    constructor () {}

    getAddress() {
        try {
            let tmp_value = localStorage.getItem('address');
            if (tmp_value) {
                return JSON.parse(tmp_value);
            }
        } catch (e) {
            throw 'listen_address 无法反序列化';
        }
    }

    init () {
        let open = localStorage.getItem('enable');
        if (open === 'false' || open == null) {
            if (this.ws && (WebSocket.CLOSED !== this.ws.readyState || WebSocket.CLOSING !== this.ws.readyState)) {
                this.ws.close();
            }
            this.ws = null
            disable_icon();
            return false;
        }

        // 载入监听地址
        this.address = this.getAddress();
        let clientId = localStorage.getItem('client_id');

        const address = `${this.address.tls ? 'wss' : 'ws'}://${this.address.host}:${this.address.port}/${clientId}`;

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
            console.warn('websocket: ' + msg)
            this.#onError()
        };

        this.ws.onclose = () => {
            this.#onClone()
        };

        this.ws.onopen = () => {
            set_running_state('服务链接成功');
            enable_icon();
        };

        this.ws.onmessage = e => {
            this.#onMessage(e)
        };
    }

    #onMessage (event) {
        let client_id = localStorage.getItem('client_id');

        let result = {
            client_id: null,
            force_client_id: null,
            logs: null,
            tabid: null,
        };
        try {
            let data = JSON.parse(event.data);
            result.client_id = data['client_id'];
            result.force_client_id = data['force_client_id'];
            result.logs = data['logs'];
            result.tabid = data['tabid'];
        } catch (e) {
            badge_error_bright();
            if (0 === event.data.indexOf('close:')) {
                // onclose 函数置空，防止重复链接
                this.ws.onclose = () => {};

                let opt = {
                    type: "basic",
                    title: "警告",
                    message: `当前client_id：${client_id} 不允许连接服务`,
                    iconUrl: IMG_LOGO
                };
                chrome.notifications.create('', opt, function (id) {
                    setTimeout(function () {
                        chrome.notifications.clear(id, function () {
                        });
                    }, 5000);
                });
            } else {
                let opt = {
                    type: "basic",
                    title: "日志格式无法解析(no json)",
                    message: event.data,
                    iconUrl: IMG_LOGO
                };
                chrome.notifications.create('', opt, function (id) {
                    setTimeout(function () {
                        chrome.notifications.clear(id, function () {
                        });
                    }, 5000);
                });
            }
            badge_error_destroy();
            return;
        }

        // 判断是否有强制日志
        if (client_id && result.force_client_id === client_id) {
            badge_normal_bright();
            //将强制日志输出到当前的tab页
            chrome.tabs.query({
                    active: true,   // 标签页在窗口中为活动标签页
                    currentWindow: true,    // 标签页在当前窗口中
                },
                (tabArray) => {
                    if (tabArray.length > 0) {
                        let tab = tabArray.shift();
                        this.#checkMessage(event);
                        chrome.tabs.sendMessage(tab.id, result.logs, (results) => {
                            badge_normal_destroy();
                        });
                    }
                }
            );
            return;
        }

        if ((client_id && result.client_id !== client_id) || !result.tabid) {
            //不是当前用户的日志不显示。
            return;
        }

        // 延迟保证日志每次都能记录
        if (result.tabid) {
            this.#checkMessage(event);
            chrome.tabs.sendMessage(parseInt(result.tabid), result.logs, (results) => {
                badge_normal_destroy();
            });
        }
    }

    #onClone () {
        clearTimeout(this.#ws_timeout);
        this.#ws_timeout = setTimeout(this.init, 2000);
        set_running_state('服务已经关闭');
        disable_icon();
    }

    #onError () {
        clearTimeout(this.#ws_timeout);
        this.#ws_timeout = setTimeout(this.init, 2000);
        set_running_state('服务连接失败');
        disable_icon();
    }

    #checkMessage (event) {
        if (event.data.indexOf('SocketLog error handler') !== -1) {
            let opt = {
                type: "basic",
                title: "注意",
                message: "有异常报错，请注意查看console 控制台中的日志",
                iconUrl: IMG_LOGO
            };
            chrome.notifications.create('notify-socketLog-error-handler', opt, (id) => {
                setTimeout(function () {
                    chrome.notifications.clear(id, function () {
                    });
                }, 3000);
            });

        }

        if (event.data.indexOf('[NO WHERE]') !== -1) {
            let opt = {
                type: "basic",
                title: "注意",
                message: "存在没有WHERE语句的操作sql语句",
                iconUrl: IMG_LOGO
            };
            chrome.notifications.create('', opt, function (id) {
                setTimeout(function () {
                    chrome.notifications.clear(id, function () {
                    });
                }, 3000);
            });
        }

    };
}

function enable_icon() {
    chrome.browserAction.setIcon({
        path: IMG_LOGO_X16,
    });
}

function disable_icon() {
    chrome.browserAction.setIcon({
        path: IMG_LOGO_DISABLED_X16,
    });
}

// 正常 角标亮
function badge_normal_bright() {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': '#4477BB'
    });
    chrome.browserAction.setBadgeText({
        'text': BADGE_BRIGHT,
    });
}

// 正常 角标灭
function badge_normal_destroy() {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': '#4477BB'
    });
    chrome.browserAction.setBadgeText({
        'text': BADGE_DESTROY,
    });
}

// 错误 角标亮
function badge_error_bright() {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': '#FF0000'
    });
    chrome.browserAction.setBadgeText({
        'text': BADGE_BRIGHT,
    });
}

// 错误 角标灭
function badge_error_destroy() {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': '#FF0000'
    });
    chrome.browserAction.setBadgeText({
        'text': BADGE_DESTROY,
    });
}

function url_exp(url) {
    let splatParam = /\*/g;
    let escapeRegExp = /[-[\]{}()+?.,\\^$#\s]/g;
    url = url.replace(escapeRegExp, '\\$&')
        .replace(splatParam, '(.*?)');
    return new RegExp(url, 'i');
}

const wsc = new Client()
wsc.init()

window.ws_restart = () => {
    wsc.init()
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    function (details) {
        let open = localStorage.getItem('open')

        if (open === 'false' || open === null) {
            return {
                requestHeaders: details.requestHeaders
            };
        }

        let client_id = localStorage.getItem('client_id');
        if (!client_id) {
            client_id = '';
        }

        let header = `tabid=${details.tabId}&client_id=${client_id}`;

        //将Header隐藏在User-Agent中， 不能使用自定义Header了， 不让HTTPS情况下会报不安全
        for (let i = 0; i < details.requestHeaders.length; ++i) {
            if (details.requestHeaders[i].name === 'User-Agent') {
                details.requestHeaders[i].value += " SocketLog(" + header + ")";
                break;
            }
        }

        return {
            requestHeaders: details.requestHeaders
        };
    }, {
        urls: ["<all_urls>"]
    },
    ["blocking", "requestHeaders"]
);
