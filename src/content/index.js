/**
 * github: https://github.com/luofei614/SocketLog
 * @author luofei614<weibo.com/luofei614>
 * console print log
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if ('object' !== typeof (message)) {
        console.warn('socketlog', 'invalid content', message);
        sendResponse('not object');
        return;
    }
    message.forEach(function (log) {
        if (console[log.type]) {
            if (log.css) {
                console[log.type]('%c' + log.msg, log.css);
            } else {
                console[log.type](log.msg);
            }
            return;
        }

        if ('alert' === log.type) {
            alert(log.msg);
        } else {
            alert('SocketLog type error, ' + log.type);
        }
    });
    sendResponse('done');
});


