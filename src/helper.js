import _imgLogoX16 from 'src/assets/image/logo_16.png'
import _imgLogoDisabledX16 from 'src/assets/image/logo_disabled_16.png'
import _imgLogoX320 from 'src/assets/image/logo_320.png'

const IMG_LOGO_X16 = chrome.runtime.getURL(_imgLogoX16);
const IMG_LOGO_DISABLED_X16 = chrome.runtime.getURL(_imgLogoDisabledX16);
export const IMG_LOGO = chrome.runtime.getURL(_imgLogoX320);

// 下标两/灭
const BADGE_BRIGHT = ' ';
const BADGE_DESTROY = '';

export function enable_icon() {
    chrome.action.setIcon({
        path: IMG_LOGO_X16,
    });
}

export function disable_icon() {
    chrome.action.setIcon({
        path: IMG_LOGO_DISABLED_X16,
    });
}

// 正常 角标亮
export function badge_normal_bright() {
    Promise.all([
        chrome.action.setBadgeBackgroundColor({
            'color': '#4477BB'
        }),
        chrome.action.setBadgeText({
            'text': BADGE_BRIGHT,
        }),
    ])
}

// 正常 角标灭
export function badge_normal_destroy() {
    Promise.all([
        chrome.action.setBadgeBackgroundColor({
            'color': '#4477BB'
        }),
        chrome.action.setBadgeText({
            'text': BADGE_DESTROY,
        }),
    ])
}

// 错误 角标亮
export function badge_error_bright() {
    Promise.all([
        chrome.action.setBadgeBackgroundColor({
            'color': '#FF0000'
        }),
        chrome.action.setBadgeText({
            'text': BADGE_BRIGHT,
        }),
    ])
}

// 错误 角标灭
export function badge_error_destroy() {
    Promise.all([
        chrome.action.setBadgeBackgroundColor({
            'color': '#FF0000'
        }),
        chrome.action.setBadgeText({
            'text': BADGE_DESTROY,
        })
    ])
}

export async function set_running_state(message) {
    await chrome.storage.session.set({
        status_message: message
    });
}

export async function set_e2e_state(message) {
    await chrome.storage.session.set({
        e2e_status: message
    });
}

export async function restartConnection() {
    // todo 通过事件实现
    await chrome.runtime.sendMessage(
        null,
        {
            event: 'restart_connection',
        },

    )
}

export function notifications (title, message, timeout = 5000) {
    chrome.notifications.create(null,  {
        type: "basic",
        title: title,
        message: message,
        iconUrl: IMG_LOGO,
    }, (id) => {
        setTimeout(function () {
            chrome.notifications.clear(id);
        }, timeout);
    });
}

export function createRandomString(length) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);
    randomArray.forEach((number) => {
        result += chars[number % chars.length];
    });
    return result;
}

