<template>
  <div class="wrapper clearfix">
    <div class="title">
      SocketLog 设置 （状态：<span>{{ stateMessage }}{{ e2eStateMessage ? `; ${e2eStateMessage}` : '' }}</span>）
      <div class="help">
        <a href="https://github.com/NHZEX/socket-log-chrome" title="帮助" target="_blank">
          <img :src="helpLogoUrl" alt="help"/>
        </a>
      </div>
    </div>
    <form action="">
      <div style="display: flex; justify-content: space-around">
        <div>
          <section>
            监听协议：
            <input type="radio" v-model="address.tls" :value="false" name="protocol">ws
            <input type="radio" v-model="address.tls" :value="true" name="protocol">wss
          </section>
          监听主机： <input v-model="address.host" title="监听主机"/> <br />
          监听端口： <input v-model.number="address.port" title="监听端口"/> <br />
          监听路径： <input v-model.trim="address.path" title="监听路径"/> <br />
          连接地址： <input :value="displayUrl" title="监听地址" readonly style="background-color: rgba(66,66,66,0.5)"/> <br/>
          ClientID： <input v-model="clientId" title="客户ID"/> <br/>
        </div>
        <div style="max-width: 100px">
          开启：<input type="checkbox" v-model="enableListen" title="服务开关"><br />
          监听心跳：<input type="checkbox" v-model="enableClientHeartbeat" title="监听心跳"><br />
          <button type="button" @click="onSave">保 存 / 重 连</button>
        </div>
      </div>
    </form>
    <div style="width: 100%">
      <span style="display: block; width: 100%; border-bottom: #999999 2px dotted; height: 4px" />
      <label>端到端加密密钥：</label>
      <div>
        <input
            type="password"
            v-model.trim="e2eConfig.key"
            title="密钥长度最少 8 位"
            autocomplete="off"
            style="margin-right: 8px"
        >
        <div style="display: inline-block">
          <button type="button" @click="onSave_e2eKey" :disabled="!e2eKeyIsChange">保存密钥</button>
          <button
              type="button"
              @click="onCopy_e2eKey"
              :disabled="!e2eConfig.key"
          >{{ onCopy_e2eKey_hit.timer ? onCopy_e2eKey_hit.content : '拷贝' }}</button>
          <button type="button" @click="onGenerate_e2eKey" style="float: right">生成</button>
        </div>
      </div>
    </div>
    <div style="width: 100%">
      <span style="display: block; width: 100%; border-bottom: #999999 2px dotted; height: 4px" />
      <label>允许监听域名：</label>
      <div style="display: flex; justify-content: space-around">
        <textarea
            v-model.trim="allowRulesEdit"
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
          <a :href="ruleHelpHtmlUrl" title="帮助" target="_blank">
            <img :src="helpLogoUrl" alt="help"/>
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

<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted, ref, watch, toRef } from 'vue'
import { usePopupStore } from '~/stores/popupStore'
import { createRandomString, restartConnection } from '~/utils/helper'
import { getAllowHostRules, setAllowHosts } from "~/utils/storage";
import { storeToRefs } from "pinia";
import HelpLogo from "~/assets/image/help.png";
import RuleHelpHtml from '~/entries/popup/rule_help.html?url'

const helpLogoUrl = new URL(HelpLogo, import.meta.url).href;
const ruleHelpHtmlUrl = new URL(RuleHelpHtml, import.meta.url).href;

const popupStore = usePopupStore()
const popupStoreRefs = storeToRefs(popupStore)

popupStore.loadStorageData()

const allowHosts = ref<string[]>([])
const enabledRuleCount = ref(0)

const e2eConfig = popupStoreRefs.e2eConfig
const e2eKeyIsChange = popupStoreRefs.e2eKeyIsChange

const address = popupStoreRefs.address
const clientId = popupStoreRefs.clientId
const enableListen = popupStoreRefs.enableListen
const enableClientHeartbeat = popupStoreRefs.enableClientHeartbeat

const protocol = computed(() => popupStore.address.tls ? 'wss' : 'ws')
const displayUrl = computed(() => `${protocol.value}://${address.value.host}:${address.value.port}${address.value.path}`)

const stateMessage = computed(() => popupStore.stateMsg)
const e2eStateMessage = computed(() => popupStore.e2eStateMessage)

// 域名配置
const allowRulesEdit = computed<string>({
  get: () => allowHosts.value
      .join('\n'),
  set: val => {
    allowHosts.value = String(val)
        .split('\n')
        .map(line => line.trim())
        .filter(line => !!line)
  },
})

watch(allowHosts, (val) => {
  console.log('allowRules', val)
})

const onSave = () => {
  popupStore.saveStorageData()
  restartConnection();
}

const onGenerate_e2eKey = async () => {
  e2eConfig.value.key = createRandomString(16)
}

const onSave_e2eKey = async () => {
  await popupStore.saveE2EConfigData()
}

const onCopy_e2eKey_hit = ref<{
  content: string,
  timer: number|null,
}>({
  content: 'OK!',
  timer: null,
})
const onCopy_e2eKey = async () => {
  if (!await chrome.permissions.contains({
    permissions: ['clipboardWrite']
  })) {
    await chrome.permissions.request({
      permissions: ['clipboardWrite'],
      origins: []
    });
  }
  await navigator.clipboard.writeText(e2eConfig.value.key)
  if (onCopy_e2eKey_hit.value.timer) {
    clearTimeout(onCopy_e2eKey_hit.value.timer)
  }
  onCopy_e2eKey_hit.value.timer = setTimeout(() => {
    onCopy_e2eKey_hit.value.timer = null
  }, 1000)
}

const onSaveAllowHosts = async () => {
  try {
    allowHosts.value = await setAllowHosts(allowHosts.value)
  } catch (e) {
    alert(`规则输入有误，请重新检查 \n${e}`)
  }
}

const onMessage = (
    {
      status_message: statusMessage,
      e2e_status: e2eStateMessage
    }: {
      status_message?: {
        newValue: string, oldValue: string
      },
      e2e_status?: {
        newValue: string, oldValue: string
      }
    }
) => {
  if (statusMessage !== undefined) {
    const { newValue, oldValue } = statusMessage
    console.log('statusMessage.onChanged', newValue, oldValue)
    if (newValue !== oldValue) {
      popupStore.stateMsg = newValue
    }
  }
  if (e2eStateMessage !== undefined) {
    const { newValue, oldValue } = e2eStateMessage
    console.log('e2eStateMessage.onChanged', newValue, oldValue)
    if (newValue !== oldValue) {
      popupStore.e2eStateMessage = newValue
    }
  }
}

const refreshEnableRuleCount = async () => {
  enabledRuleCount.value = (await chrome.declarativeNetRequest.getDynamicRules()).length;
}
let _tidRefreshEnableRuleCount: number | null = null

onMounted(async () => {
  chrome.storage.session.onChanged.addListener(onMessage);
  allowHosts.value = await getAllowHostRules();
  await refreshEnableRuleCount()

  _tidRefreshEnableRuleCount = setInterval(async () => await refreshEnableRuleCount(), 1000)
})
onUnmounted(() => {
  chrome.storage.session.onChanged.removeListener(onMessage)

  if (_tidRefreshEnableRuleCount) {
    clearInterval(_tidRefreshEnableRuleCount)
    _tidRefreshEnableRuleCount = null
  }
})
</script>

<style>
@import "PopupOptions.css";
</style>
