<template>
  <div class="wrapper clearfix">
    <div class="title">
      SocketLog 设置 （状态：<span>{{ conn.status }}</span>）
      <div class="help">
        <a href="https://github.com/NHZEX/socket-log-chrome" title="帮助" target="_blank">
          <img src="@/assets/image/help_16.png" alt="help"/>
        </a>
      </div>
    </div>
    <form action="">
      <div style="float: left">
        监听协议： <input v-model="conn.protocol" title="监听协议"/> <br />
        监听主机： <input v-model="conn.host" title="监听主机"/> <br />
        监听端口： <input v-model="conn.port" title="监听端口"/> <br />
        监听地址： <input :value="showUrl" title="监听地址" readonly style="background-color: rgba(66,66,66,0.5)"/> <br/>
        ClientID： <input v-model="conn.clientId" title="客户ID"/> <br/>
      </div>
      <div>
        开启：<input type="checkbox" v-model="conn.enable" title="服务开关"><br />
        <button type="button" @click="onSave">保 存</button>
      </div>
    </form>
    <div>
    </div>
  </div>
</template>

<script>

import { reactive, computed, onMounted } from 'vue'
import { isObject } from 'lodash'

export default {
  name: 'App',
  components: {
  },
  setup() {
    const conn = reactive({
      protocol: 'ws',
      host: 'localhost',
      port: '1229',
      clientId: '',
      enable: false,
      status: '正在连接...',
    })

    const showUrl = computed(() => `${conn.protocol}://${conn.host}:${conn.port}`)

    const readStatus = () => {
      conn.status = localStorage.getItem('running_message') || '无状态';
    }

    const onMessage = (request) => {
      if (!isObject(request)) {
        return false;
      }
      if ('update_running_message' === request.event) {
        readStatus();
      }
    }

    const onSave = () => {
      localStorage.setItem('listen_address', JSON.stringify({
        protocol: conn.protocol,
        host: conn.host,
        port: conn.port,
      }));
      localStorage.setItem('client_id', conn.clientId);
      localStorage.setItem('open', conn.enable);
      chrome.extension.getBackgroundPage().ws_restart();
    }

    onMounted(() => {
      let tmp_value = localStorage.getItem('listen_address');
      if (tmp_value) {
        try {
          const listen = JSON.parse(tmp_value);
          conn.protocol = listen.protocol;
          conn.host = listen.host;
          conn.port = listen.port;
        } catch (e) {
          console.warn('listen_address 无法反序列化');
        }
      }
      if (localStorage.getItem('client_id')) {
        conn.clientId = localStorage.getItem('client_id');
      }
      if (localStorage.getItem('open')) {
        conn.enable = ('false' !== localStorage.getItem('open'));
      }

      chrome.runtime.onMessage.addListener(onMessage);

      readStatus()
    })

    return {
      conn: conn,
      showUrl: showUrl,
      onSave,
    }
  }
}
</script>

<style>
#app {}
</style>
