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
      <div style="display: flex; justify-content: space-around">
        <div>
          <section>
            监听协议：
            <input type="radio" v-model="data.address.tls" :value="false" name="protocol">ws
            <input type="radio" v-model="data.address.tls" :value="true" name="protocol">wss
          </section>
          监听主机： <input v-model="data.address.host" title="监听主机"/> <br />
          监听端口： <input v-model.number="data.address.port" title="监听端口"/> <br />
          监听路径： <input v-model.trim="data.address.path" title="监听路径"/> <br />
          连接地址： <input :value="data.displayUrl" title="监听地址" readonly style="background-color: rgba(66,66,66,0.5)"/> <br/>
          ClientID： <input v-model="data.clientId" title="客户ID"/> <br/>
        </div>
        <div style="max-width: 100px">
          开启：<input type="checkbox" v-model="data.enable" title="服务开关"><br />
          <button type="button" @click="onSave">保 存 / 重 连</button>
        </div>
      </div>
    </form>
    <div style="width: 100%">
      <span style="display: block; width: 100%; border-bottom: #999999 2px dotted; height: 4px" />
      <label>允许监听域名：</label>
      <div style="display: flex; justify-content: space-around">
        <textarea
            v-model.trim="data.allowHosts"
            autocomplete="off"
            spellcheck="false"
            rows="10"
            cols="30"
            wrap="soft"
            placeholder="输入激活调试的域名，一行一个，可以用通配符
'*'：匹配任意数量的字符。
'|'：锚点，用于匹配字符串的开头或结尾。
'||'：域名锚点，用于匹配网址（子）域名的开头。
'^'：分隔符，匹配除字母、数字、下划线 _、连字符 -、点 . 或百分号 % 之外的任何内容。
示例
"
        ></textarea>
        <div class="help">
          <a href="/rule_help.html" title="帮助" target="_blank">
            <img src="@/assets/image/help_16.png" alt="help"/>
          </a>
        </div>
        <div style="max-width: 100px">
          <span style="display: block; padding-bottom: 4px">已激活规则：{{ enabledRuleCount }}</span>
          <button type="button" @click="onSaveAllowHosts">保 存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import { reactive, computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStore, mapState } from 'vuex'
import { isObject } from 'lodash'
import { restartConnection } from 'src/helper'
import { getAllowHostRules, setAllowHosts } from "../storage";

export default {
  name: 'App',
  components: {
  },
  setup() {
    const store = useStore()
    store.dispatch('loadStorageData')

    const allowHosts = ref([])
    const enabledRuleCount = ref(0)

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
        get: () => store.state.enableListen,
        set: val => store.commit('setEnable', val),
      }),
      protocol: computed(() => store.state.address.tls ? 'wss' : 'ws'),
      displayUrl: computed(() => `${data.protocol}://${data.address.host}:${data.address.port}${data.address.path}`),
      // 域名配置
      allowHosts: computed({
        get: () => allowHosts.value
            .join('\n'),
        set: val => {
          allowHosts.value = String(val)
              .split('\n')
              .map(line => line.trim())
              .filter(line => !!line)
        },
      }),
    })

    watch(allowHosts, (val) => {
      console.log('allowHosts', val)
    })

    const onSave = () => {
      store.dispatch('saveStorageData')
      restartConnection();
    }

    const onSaveAllowHosts = async () => {
      try {
        allowHosts.value = await setAllowHosts(allowHosts.value)
      } catch (e) {
        alert(`规则输入有误，请重新检查 \n${e}`)
      }
    }

    const onMessage = ({ status_message: statusMessage }) => {
      if (statusMessage === undefined) {
        return
      }
      const { newValue, oldValue } = statusMessage
      console.log('session.onChanged', newValue, oldValue)
      if (newValue !== oldValue) {
        store.commit('updateState', newValue)
      }
    }

    const refreshEnableRuleCount = async () => {
      enabledRuleCount.value = (await chrome.declarativeNetRequest.getDynamicRules()).length;
    }
    let _tidRefreshEnableRuleCount = null

    onMounted(async () => {
      chrome.storage.session.onChanged.addListener(onMessage);
      allowHosts.value = await getAllowHostRules();
      await refreshEnableRuleCount()

      _tidRefreshEnableRuleCount = setInterval(async () => await refreshEnableRuleCount(), 1000)
    })
    onUnmounted(() => {
      chrome.storage.session.onChanged.removeListener(onMessage)

      if (_tidRefreshEnableRuleCount) {
        _tidRefreshEnableRuleCount = null
        clearInterval(_tidRefreshEnableRuleCount)
      }
    })

    return {
      data,
      enabledRuleCount,
      onSave,
      onSaveAllowHosts,
    }
  }
}
</script>

<style>
#app {}
</style>
