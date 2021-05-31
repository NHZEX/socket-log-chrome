<template>
  <div class="wrapper clearfix">
    <div class="title">
      SocketLog 设置 （状态：<span>{{ data.stateMsg }}</span>）
      <div class="help">
        <a href="https://github.com/NHZEX/socket-log-chrome" title="帮助" target="_blank">
          <img src="@/assets/image/help_16.png" alt="help"/>
        </a>
      </div>
    </div>
    <form action="">
      <div style="float: left">
        <section>
          监听协议：
          <input type="radio" v-model="data.address.tls" :value="false" name="protocol">ws
          <input type="radio" v-model="data.address.tls" :value="true" name="protocol">wss
        </section>
        监听主机： <input v-model="data.address.host" title="监听主机"/> <br />
        监听端口： <input v-model.number="data.address.port" title="监听端口"/> <br />
        连接地址： <input :value="data.displayUrl" title="监听地址" readonly style="background-color: rgba(66,66,66,0.5)"/> <br/>
        ClientID： <input v-model="data.clientId" title="客户ID"/> <br/>
      </div>
      <div>
        开启：<input type="checkbox" v-model="data.enable" title="服务开关"><br />
        <button type="button" @click="onSave">保 存</button>
      </div>
    </form>
    <div>
    </div>
  </div>
</template>

<script>

import { reactive, computed, onMounted } from 'vue'
import { useStore, mapState } from 'vuex'
import { isObject } from 'lodash'

export default {
  name: 'App',
  components: {
  },
  setup() {
    const isChrome = chrome.runtime && chrome.extension;

    const store = useStore()
    store.dispatch('loadStorageData')

    const data = reactive({
      stateMsg: computed(() => store.state.stateMsg),
      address: computed({
        get: () => store.state.address,
        set: val => store.commit('updateAddress', val),
      }),
      clientId: computed({
        get: () => store.state.clientId,
        set: val => store.commit('updateClient', val),
      }),
      enable: computed({
        get: () => store.state.enable,
        set: val => store.commit('setEnable', val),
      }),
      protocol: computed(() => store.state.address.tls ? 'wss' : 'ws'),
      displayUrl: computed(() => `${data.protocol}://${data.address.host}:${data.address.port}`),
    })

    const onMessage = (message) => {
      if (!isObject(message)) {
        return false;
      }
      if ('update_status' === message.event) {
        store.commit('updateState', message.data.message)
        //store.dispatch('syncStatusMessage')
      }
    }

    const onSave = () => {
      store.dispatch('saveStorageData')
      if (isChrome) {
        chrome.extension.getBackgroundPage().restart();
      }
    }

    onMounted(() => {
      if (isChrome) {
        chrome.runtime.onMessage.addListener(onMessage);
      }
    })

    return {
      data,
      onSave,
    }
  }
}
</script>

<style>
#app {}
</style>
