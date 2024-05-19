const IMG_LOGO_X16 = chrome.runtime.getURL(require('src/assets/image/logo_16.png'));
const IMG_LOGO_DISABLED_X16 = chrome.runtime.getURL(require('src/assets/image/logo_disabled_16.png'));

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

export async function restartConnection() {
    // todo 通过事件实现
    await chrome.runtime.sendMessage(
        null,
        {
            event: 'restart_connection',
        },

    )
}
