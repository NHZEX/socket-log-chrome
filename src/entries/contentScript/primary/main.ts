import { getExtensionsVersion } from "~/utils/helper";

const onMessage = (message: PrintMessageLines, sender: any, sendResponse: Function) => {
    if ('object' !== typeof (message)) {
        console.warn('socketlog', 'invalid content', message);
        sendResponse('not object');
        return;
    }
    message.forEach(function (log) {
        if (Object.hasOwn(console, log.type)) {
            if (log.css) {
                // @ts-expect-error
                console[log.type]('%c' + log.msg, log.css);
            } else {
                // @ts-expect-error
                console[log.type](log.msg);
            }
        } else if ('alert' === log.type as string) {
            alert(log.msg);
        } else {
            alert('SocketLog print type error, ' + log.type);
        }
    });
    sendResponse('done');
}
chrome.runtime.onMessage.addListener(onMessage);
// 开启接收器守护
let maxNotify = 3
const _t = setInterval(() => {
    if (!chrome.runtime.onMessage.hasListeners()) {
        console.warn('[socket-log] 当前页面监听已经失效，请刷新页面重新激活插件')
        maxNotify--
        if (0 > maxNotify) {
            clearInterval(_t)
        }
    }
}, 2000)

console.log(`[socket-log] 已经注入日志接收器, v${getExtensionsVersion()}`)
