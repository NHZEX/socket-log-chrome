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
        状态：{{ statusMessage }}
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
import { computed, onMounted, ref, watch, toRaw} from 'vue'
import { restartConnection } from '~/utils/helper'
import { useGlobalOptionsStore, initialize as globalOptionsInitialize } from "~/stores/GlobalOptionsStore";
import { useServerCollection, initialize as serverCollectionInitialize } from "~/stores/ServerCollectionStore";
import { SaveOutline, Close } from "@vicons/ionicons5";
import type {ActiveServerId, ActiveServerInfo} from "~types/socket-log.options";

Promise.any([
  globalOptionsInitialize(),
  serverCollectionInitialize(),
])

const serverCollectionStore = useServerCollection()
const globalOptionsStore = useGlobalOptionsStore()

const enableServerId = ref<ActiveServerId>(null)
const enableServerInfo = ref<ActiveServerInfo>(null)
const enableServerInfoIsChange = computed(() => {
  return enableServerId.value !== globalOptionsStore.options.activeServerInfo?.id
})
watch(enableServerId, (id) => {
  enableServerInfo.value = id === null
      ? null
      : serverCollectionStore.find(id as string)
})

const enableListenSwitch = ref(false)
const enableListenLoading = ref<boolean>(false)
const onSaveOrRestart = async () => {
  try {
    enableListenLoading.value = true
    await globalOptionsStore.saveOptions({
      enableListen: enableListenSwitch.value,
    })
    const result = await restartConnection();
    console.debug(result)
  } finally {
    enableListenLoading.value = false
  }
}

const statusMessage = ref('')
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
    await globalOptionsStore.saveOptions({
      options: {
        ...globalOptionsStore.options,
        activeServerInfo: toRaw(enableServerInfo.value),
      },
    })
    const result = await restartConnection();
    console.debug(result)
  } finally {

  }
}
const onCancelChangeEnableServer = () => {
  enableServerId.value = globalOptionsStore.options.activeServerInfo?.id ?? null
}

globalOptionsStore.onReady(() => {
  enableServerId.value = globalOptionsStore.options.activeServerInfo?.id ?? null
  enableListenSwitch.value = globalOptionsStore.enableListen
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
