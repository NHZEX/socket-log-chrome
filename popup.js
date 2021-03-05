/**
 * github: https://github.com/luofei614/SocketLog
 * @author luofei614<weibo.com/luofei614>
 */
document.addEventListener('DOMContentLoaded', init, false);

chrome.runtime.onMessage.addListener(function (request) {
    if('object' !== typeof request) {
        return false;
    }
    if('update_running_message' === request.event) {
        update_status();
    }
});

function update_status() {
    document.getElementById('status').innerText = localStorage.getItem('running_message') || '无状态';
}

function init() {
    let listen = {
        protocol: 'ws',
        host: 'localhost',
        port: '1229',
    };
    let d_protocol = document.getElementById('protocol');
    let d_host = document.getElementById('host');
    let d_port = document.getElementById('port');
    let d_address = document.getElementById('address');

    try {
        let tmp_value = localStorage.getItem('listen_address');
        if (tmp_value) {
            listen = JSON.parse(tmp_value);
        }
    } catch (e) {
        console.warn('listen_address 无法反序列化');
    }

    d_protocol.value = listen.protocol;
    d_host.value = listen.host;
    d_port.value = listen.port;

    d_address.value = `${listen.protocol}://${listen.host}:${listen.port}`;

    if (localStorage.getItem('client_id')) {
        document.getElementById('client_id').value = localStorage.getItem('client_id');
    }
    if (localStorage.getItem('open')) {
        document.getElementById('open').checked = ('false' !== localStorage.getItem('open'));
    }
    update_status();

    document.getElementById('save').addEventListener('click', save, false);
}

function save() {
    let d_protocol = document.getElementById('protocol');
    let d_host = document.getElementById('host');
    let d_port = document.getElementById('port');
    let d_address = document.getElementById('address');
    let listen = {
        protocol: d_protocol.value,
        host: d_host.value,
        port: d_port.value,
    };
    d_address.value = `${listen.protocol}://${listen.host}:${listen.port}`;
    localStorage.setItem('listen_address', JSON.stringify(listen));
    localStorage.setItem('client_id', document.getElementById('client_id').value);
    localStorage.setItem('open', document.getElementById('open').checked);
    chrome.extension.getBackgroundPage().ws_restart();
}
