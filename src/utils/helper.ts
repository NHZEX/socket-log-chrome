import _imgLogoDisabledX32 from '~/assets/icons/off_32.png'

const _imgLogoX32 = 'icons/32.png'
const _imgLogoX128 = 'icons/128.png'
const IMG_LOGO_X16 = chrome.runtime.getURL(_imgLogoX32);
const IMG_LOGO_DISABLED_X16 = chrome.runtime.getURL(_imgLogoDisabledX32);
export const IMG_LOGO = chrome.runtime.getURL(_imgLogoX128);

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
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(
                {
                    event: 'restart_connection',
                },
                {},
                (response) => {
                    resolve(response)
                }
            )
        } catch (e) {
            reject(e)
        }
    });
}

export function notifications (title: string, message: string, timeout = 5000) {
    chrome.notifications.create({
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

export function createRandomString(length: number) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);
    randomArray.forEach((number) => {
        result += chars[number % chars.length];
    });
    return result;
}

export function getExtensionsVersion () {
    const manifest = chrome.runtime.getManifest();
    return manifest.version
}

export function getChromeMajorVersion () {
    const result = /Chrome\/([0-9]+)\./.exec(navigator.userAgent)
    if (!result) {
        return 0
    }
    return parseInt(result[1] ?? '0');
}

export async function clipboardWriteText (value: string) {
  if (!await chrome.permissions.contains({
    permissions: ['clipboardWrite']
  })) {
    await chrome.permissions.request({
      permissions: ['clipboardWrite'],
      origins: []
    });
  }
  await navigator.clipboard.writeText(value)
}
