<script setup lang="ts">

import {computed, onMounted, ref, toRaw} from "vue";
import {initialize, saveLocalOptions, useGlobalOptionsStore} from "~/stores/GlobalOptionsStore";
import {useMessage} from 'naive-ui'
import type {SocketLogOptions} from "~types/socket-log.options";
import {CompatibleTabIdMode} from "~/enum/socket-log-options";
import {createRandomString} from "~/utils/helper";
import {isEqual} from "radash";

initialize()

const DEFAULT_SOCKET_LOG_OPTIONS_VALUE: SocketLogOptions = {
  activeServerInfo: null,
  defaultTabIdMode: CompatibleTabIdMode.Fake_9x6,
  defaultE2EConfig: {
    key: '',
  }
}

const globalOptionsStore = useGlobalOptionsStore()
const nMessage = useMessage()

const formData = ref<SocketLogOptions>(DEFAULT_SOCKET_LOG_OPTIONS_VALUE)
const formDataIsChange = computed(() => {
  return !isEqual(formData.value, globalOptionsStore.options)
})

const reload = () => {
  formData.value = structuredClone(toRaw(globalOptionsStore.options))
}

const onSubmit = async () => {
  await saveLocalOptions({
    options: toRaw(formData.value),
  })
  nMessage.success('保存成功', {keepAliveOnHover: true})
}

const onNew_e2eKey = () => {
  formData.value.defaultE2EConfig.key = createRandomString(16)
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
  await navigator.clipboard.writeText(formData.value.defaultE2EConfig.key)
  if (onCopy_e2eKey_hit.value.timer) {
    clearTimeout(onCopy_e2eKey_hit.value.timer)
  }
  onCopy_e2eKey_hit.value.timer = setTimeout(() => {
    onCopy_e2eKey_hit.value.timer = null
  }, 1000)
}

onMounted(async () => {
  globalOptionsStore.onReady(() => {
    reload()
  })
})

defineExpose({
  reload,
})
</script>

<template>
  <n-form
      :model="formData"
      label-placement="top"
      label-width="auto"
      style="max-width: 600px"
  >
    <n-form-item label="TabId 默认传参模式">
      <n-radio-group v-model:value="formData.defaultTabIdMode">
        <n-radio value="off">不传递（新版接收端推荐）</n-radio>
        <n-radio value="fake-9x6">虚拟（999999）</n-radio>
      </n-radio-group>
    </n-form-item>
    <n-form-item label="[E2E] 默认加密密钥">
      <n-input-group>
        <n-input
            type="password"
            v-model:value.trim="formData.defaultE2EConfig.key"
            placeholder="端到端密钥"
            show-password-on="mousedown"
        />
        <n-button
            @click="onCopy_e2eKey"
            :disabled="!formData.defaultE2EConfig.key"
        >{{ onCopy_e2eKey_hit.timer ? onCopy_e2eKey_hit.content : '拷贝' }}</n-button>
        <n-button @click="onNew_e2eKey">生成</n-button>
      </n-input-group>
    </n-form-item>
    <n-form-item>
      <n-button type="primary" @click="onSubmit" :disabled="!formDataIsChange">保存设置</n-button>
    </n-form-item>
  </n-form>
</template>

<style scoped>

</style>
