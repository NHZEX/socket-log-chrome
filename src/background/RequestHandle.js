export function initRequestListener () {
    chrome.webRequest.onBeforeSendHeaders.addListener(
        (details) => {
            let open = localStorage.getItem('enable')

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
}
