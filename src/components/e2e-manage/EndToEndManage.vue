<script setup lang="ts">
import {computed, ref} from "vue";
import type {ClientEndToEndConfig} from "~types/socket-log.options";
import {
  initialize as endToEndCollectionInitialize,
  useEndToEndConfigCollectionStore
} from "~/stores/EndToEndConfigCollectionStore";
import EndToEndEditor from "~/components/e2e-manage/EndToEndEditor.vue";

endToEndCollectionInitialize()

const endToEndConfigCollection = useEndToEndConfigCollectionStore()

const editor = ref<InstanceType<typeof EndToEndEditor>>()

const listView = computed<ClientEndToEndConfig[]>(() => endToEndConfigCollection.collection)

const create = () => {
  editor.value!.open()
}

const edit = (item: ClientEndToEndConfig) => {
  editor.value!.open(item.id)
}

const clone = (item: ClientEndToEndConfig) => {
  editor.value!.open(item.id, {clone: true})
}

const remove = async (item: ClientEndToEndConfig) => {
  await endToEndConfigCollection.remove(item.id as string)
}

</script>

<template>
  <div>
    <end-to-end-editor ref="editor"></end-to-end-editor>
    <n-list hoverable>
      <template #header>
        端到端配置
        <n-button @click="create">新增</n-button>
      </template>
      <n-list-item v-for="(item, index) of listView" :key="item.id">
        <n-thing>
          <template #header>
            <h4 style="margin: 0.25em 0">
              #{{ index }} {{ item.name }}
            </h4>
          </template>
          <n-descriptions
            label-placement="left"
            bordered
            :columns="6"
          >
            <n-descriptions-item :span="6">
              <template #label>E2E ID</template>
              <span class="monospace">{{ item.id }}</span>
            </n-descriptions-item>
            <n-descriptions-item :span="6">
              <template #label>E2E Key</template>
              <span class="monospace">{{ item.key }}</span>
            </n-descriptions-item>
          </n-descriptions>
        </n-thing>
        <template #suffix>
          <n-button-group vertical style="min-width: 70px">
            <n-button type="info" @click="edit(item)">编辑</n-button>
            <n-button type="info" @click="clone(item)">克隆</n-button>
            <n-popconfirm
              positive-text="确认"
              negative-text="取消"
              @positive-click="remove(item)"
            >
              <template #trigger>
                <n-button type="error">{{ '删除' }}</n-button>
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
.monospace {
  font-family: Consolas, Monaco, monospace;
}
</style>
