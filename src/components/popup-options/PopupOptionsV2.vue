<template>
  <div class="wrapper">
    <n-card
        :title="`SocketLog 设置`"
        size="small"
        :segmented="{
          content: true,
          footer: 'soft'
        }"
    >
      <template #header-extra>
        状态：{{ clientStatusMessage }}, {{ e2eStatusMessage }}
      </template>
      <n-input-group class="buttons-warp">
        <n-input-group-label>服务器</n-input-group-label>
        <n-select
            v-model:value="enableServerId"
            :options="serverOptions"
        ></n-select>
        <n-button-group>
          <n-button
              type="success"
              quaternary strong
              style="font-size: 24px"
              :loading="enableListenLoading"
              :disabled="!enableServerInfoIsChange"
              @click="onSaveEnableServer"
          >
            <n-icon :component="SaveOutline" />
          </n-button>
          <n-button
              type="error"
              quaternary strong
              style="font-size: 24px"
              :disabled="!enableServerInfoIsChange"
              @click="onCancelChangeEnableServer"
          >
            <n-icon :component="Close" />
          </n-button>
        </n-button-group>
      </n-input-group>
      <n-descriptions
          label-placement="left"
          bordered
          :columns="6"
          size="small"
          style="padding-top: 8px"
      >
        <n-descriptions-item :span="6">
          <template #label>ID</template>
          {{ enableServerInfo?.id }}
        </n-descriptions-item>
        <n-descriptions-item :span="6">
          <template #label>入口</template>
          {{ enableServerInfo?.url }}
        </n-descriptions-item>
        <n-descriptions-item :span="3">
          <template #label>客户</template>
          {{ enableServerInfo?.clientId }} ({{ enableServerInfo?.clientIdParamMode }})
        </n-descriptions-item>
        <n-descriptions-item :span="3">
          <template #label>心跳</template>
          {{ enableServerInfo?.socketHeartbeat ? '✅' : '⛔️' }}
        </n-descriptions-item>
      </n-descriptions>
      <n-divider title-placement="left">控制</n-divider>
      <n-form
          label-placement="left"
          label-width="auto"
      >
        <n-form-item label="主开关">
          <n-switch
              size="medium"
              v-model:value="enableListenSwitch"
          ></n-switch>
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="onSaveOrRestart" :loading="enableListenLoading">保存 / 重连</n-button>
        </n-form-item>
      </n-form>
      <n-flex justify="center" vertical>
      </n-flex>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, toRaw, watch} from 'vue'
import {restartConnection} from '~/utils/helper'
import {initialize as globalOptionsInitialize, useGlobalOptionsStore} from "~/stores/GlobalOptionsStore";
import {initialize as serverCollectionInitialize, useServerCollection} from "~/stores/ServerCollectionStore";
import {initialize as statusInitialize, useStatusStore} from "~/stores/StatusStore";
import {Close, SaveOutline} from "@vicons/ionicons5";
import type {ActiveServerId, ActiveServerInfo} from "~types/socket-log.options";

Promise.any([
  globalOptionsInitialize(),
  serverCollectionInitialize(),
  statusInitialize(),
])

const serverCollectionStore = useServerCollection()
const globalOptionsStore = useGlobalOptionsStore()
const statusStore = useStatusStore()

const enableServerId = ref<ActiveServerId>(null)
const enableServerInfo = ref<ActiveServerInfo>(null)
const enableServerInfoIsChange = computed(() => {
  return enableServerId.value !== globalOptionsStore.options.activeServerInfo?.id
})
const e2eStatusMessage = computed(() => statusStore.e2eStatusMessage);
const clientStatusMessage = computed(() => statusStore.clientStatusMessage);

const enableListenSwitch = ref(false)
const enableListenLoading = ref<boolean>(false)
const onSaveOrRestart = async () => {
  try {
    enableListenLoading.value = true
    const values: { [key: string]: unknown } = {
      enableListen: enableListenSwitch.value,
    }
    if (enableServerInfoIsChange.value) {
      const _options = structuredClone(toRaw(globalOptionsStore.options))
      _options.activeServerInfo = toRaw(enableServerInfo.value)
      values['options'] = _options
    }
    await globalOptionsStore.saveOptions(values)
    const result = await restartConnection();
    console.debug(result)
  } finally {
    enableListenLoading.value = false
  }
}

const serverOptions = computed(() => {
  return serverCollectionStore.collection.map(item => {
    return {
      label: item.name,
      value: item.id,
    }
  })
})

const onSaveEnableServer = async () => {
  try {
    enableListenLoading.value = true
    const _options = structuredClone(toRaw(globalOptionsStore.options))
    _options.activeServerInfo = toRaw(enableServerInfo.value)
    await globalOptionsStore.saveOptions({
      options: _options,
    })
    const result = await restartConnection();
    console.debug(result)
  } finally {
    enableListenLoading.value = false
  }
}
const onCancelChangeEnableServer = () => {
  enableServerInfo.value = globalOptionsStore.options.activeServerInfo ?? null
  enableServerId.value = globalOptionsStore.options.activeServerInfo?.id ?? null
}

globalOptionsStore.onReady(() => {
  enableServerInfo.value = toRaw(globalOptionsStore.options.activeServerInfo)
  enableServerId.value = globalOptionsStore.options.activeServerInfo?.id ?? null
  console.dir(toRaw(globalOptionsStore.options))
  enableListenSwitch.value = globalOptionsStore.enableListen

  watch(enableServerId, (id) => {
    enableServerInfo.value = id === null
        ? null
        : serverCollectionStore.find(id as string)
  })
})
onMounted(() => {
})
</script>

<style scoped>
.wrapper {
  background: #fff;
  padding: 0;
}
.buttons-warp :deep(.n-button) {
  padding: 0 10px;
}
</style>
