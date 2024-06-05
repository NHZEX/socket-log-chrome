<script setup lang="ts">
import {computed, ref} from "vue";
import type {SocketServerItem} from "~types/socket-log.options";
import {useServerCollection, initialize} from "~/stores/ServerCollectionStore";
import SocketServerEditor from "~/components/server-manage/SocketServerEditor.vue";
import {decodeTime} from "ulidx";

initialize()

const serverCollection = useServerCollection()
const editor = ref<InstanceType<typeof SocketServerEditor>>()

interface SocketServerViewItem extends SocketServerItem {
  createdAt: Date,
}

const listView = computed<SocketServerViewItem[]>(() => {
  return serverCollection.collection.map(value => {
    const timestamp = decodeTime(value.id);
    return {
      ...value,
      createdAt: new Date(timestamp),
    }
  }).sort((a, b) => b.id.localeCompare(a.id))
})

const create = () => {
  editor.value!.open()
}

const edit = (item: SocketServerViewItem) => {
  editor.value!.open(item.id)
}

const clone = (item: SocketServerViewItem) => {
  editor.value!.open(item.id, {clone: true})
}

const remove = async (item: SocketServerViewItem) => {
  await serverCollection.remove(item.id)
}

</script>

<template>
  <div>
    <socket-server-editor ref="editor"></socket-server-editor>
    <n-list hoverable>
      <template #header>
        服务器地址
        <n-button @click="create">新增</n-button>
      </template>
      <n-list-item v-for="(item, index) of listView" :key="item.id">
        <n-thing>
          <template #header><h4 style="margin: 0.25em 0">#{{ index }} {{ item.name }}</h4></template>
          <template #description>ID: {{ item.id }}</template>
          <template #footer>创建时间: {{ item.createdAt.toISOString() }}</template>
          <n-descriptions
              label-placement="left"
              bordered
              :columns="6"
          >
            <n-descriptions-item :span="6">
              <template #label>入口</template>
              {{ item.url }}
            </n-descriptions-item>
            <n-descriptions-item :span="3">
              <template #label>客户</template>
              {{ item.clientId }} ({{ item.clientIdParamMode }})
            </n-descriptions-item>
            <n-descriptions-item :span="3">
              <template #label>心跳</template>
              {{ item.socketHeartbeat ? '✅' : '⛔️' }}
            </n-descriptions-item>
          </n-descriptions>
        </n-thing>
        <template #suffix>
          <n-button-group vertical>
            <n-button type="info" @click="edit(item)">编辑</n-button>
            <n-button type="info" @click="clone(item)">克隆</n-button>
            <n-popconfirm
                positive-text="确认"
                negative-text="取消"
                @positive-click="remove(item)"
            >
              <template #trigger>
                <n-button type="error">删除</n-button>
              </template>
              确认删除该项目（{{ item.name }}）吗？
              <br>ID: {{ item.id }}
            </n-popconfirm>
          </n-button-group>
        </template>
      </n-list-item>
    </n-list>
  </div>
</template>

<style scoped>

</style>
