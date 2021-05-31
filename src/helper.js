const IMG_LOGO_X16 = require('src/assets/image/logo_16.png');
const IMG_LOGO_DISABLED_X16 = require('src/assets/image/logo_disabled_16.png');

// 下标两/灭
const BADGE_BRIGHT = ' ';
const BADGE_DESTROY = '';

export function enable_icon() {
    chrome.browserAction.setIcon({
        path: IMG_LOGO_X16,
    });
}

export function disable_icon() {
    chrome.browserAction.setIcon({
        path: IMG_LOGO_DISABLED_X16,
    });
}

// 正常 角标亮
export function badge_normal_bright() {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': '#4477BB'
    });
    chrome.browserAction.setBadgeText({
        'text': BADGE_BRIGHT,
    });
}

// 正常 角标灭
export function badge_normal_destroy() {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': '#4477BB'
    });
    chrome.browserAction.setBadgeText({
        'text': BADGE_DESTROY,
    });
}

// 错误 角标亮
export function badge_error_bright() {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': '#FF0000'
    });
    chrome.browserAction.setBadgeText({
        'text': BADGE_BRIGHT,
    });
}

// 错误 角标灭
export function badge_error_destroy() {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': '#FF0000'
    });
    chrome.browserAction.setBadgeText({
        'text': BADGE_DESTROY,
    });
}

export function restartConnection() {
    if (chrome.extension) {
        chrome.extension.getBackgroundPage().restart();
    }
}
