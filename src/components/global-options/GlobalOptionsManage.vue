<script setup lang="ts">

import {onMounted, ref, toRaw} from "vue";
import {useGlobalOptionsStore, initialize, saveLocalOptions} from "~/stores/GlobalOptionsStore";
import {storeToRefs} from "pinia";
import {useMessage} from 'naive-ui'
import type {SocketLogOptions} from "~types/socket-log.options";
import {CompatibleTabIdMode} from "~/enum/socket-log-options";

const DEFAULT_SOCKET_LOG_OPTIONS_VALUE: SocketLogOptions = {
  defaultTabIdMode: CompatibleTabIdMode.Fake_9x6,
  defaultE2EConfig: {
    key: '',
  }
}

const globalOptionsStore = useGlobalOptionsStore()
const globalOptions = storeToRefs(globalOptionsStore)
const nMessage = useMessage()

const formData = ref<SocketLogOptions>(DEFAULT_SOCKET_LOG_OPTIONS_VALUE)

const reload = () => {
  formData.value = toRaw(globalOptions.options.value)
}

const onSubmit = async () => {
  await saveLocalOptions({
    options: toRaw(formData.value),
  })
  nMessage.success('保存成功', {keepAliveOnHover: true})
}

onMounted(async () => {
  await initialize()
  reload()
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
    <n-form-item label="默认 TabId 传参模式">
      <n-radio-group v-model:value="formData.defaultTabIdMode">
        <n-radio value="off">不传递（新版接收端推荐）</n-radio>
        <n-radio value="fake-9x6">虚拟（999999）</n-radio>
      </n-radio-group>
    </n-form-item>
    <n-form-item label="[E2E] 默认加密密钥">
      <n-input
          type="password"
          v-model:value.trim="formData.defaultE2EConfig.key"
          placeholder="端到端密钥"
          show-password-on="mousedown"
      />
    </n-form-item>
    <n-form-item>
      <n-button type="primary" @click="onSubmit">保存设置</n-button>
    </n-form-item>
  </n-form>
</template>

<style scoped>

</style>
