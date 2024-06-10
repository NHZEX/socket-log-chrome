<script setup lang="ts">
import {computed, ref, toRaw, watch} from "vue";
import type {SocketServerItem} from "~types/socket-log.options";
import {ClientIdParamMode, ClientIdParamModeLabel} from "~/enum/socket-log-options";
import type {FormInst, FormItemRule} from "naive-ui";
import {ulid} from "ulidx";
import {initialize, useServerCollection} from "~/stores/ServerCollectionStore";

initialize()

interface EditOptions {
  clone: boolean,
}

const DEFAULT_EDIT_OPTIONS: EditOptions = {
  clone: false,
}

const DEFAULT_FORM_DATA: IFormData = {
  id: null,
  name: '',
  url: '',
  clientId: '',
  socketHeartbeat: false,
  clientIdParamMode: ClientIdParamMode.Path,
}

interface IFormData extends Omit<SocketServerItem, 'id'> {
  id: string | null
}

interface IUrlData {
  scheme: "wss" | 'ws',
  url: string,
}

const nMessage = useMessage()
const serverCollection = useServerCollection()

const editOptions = ref<EditOptions>(DEFAULT_EDIT_OPTIONS)
const show = ref(false)
const title = computed(() => {
  return editOptions.value.clone
      ? '克隆配置'
      : (isEdit.value ? '编辑服务器' : '新增服务器')
})
const isEdit = computed(() => formData.value.id !== null)

const formRef = ref<FormInst | null>(null)
const formData = ref<IFormData>(DEFAULT_FORM_DATA)

const urlForm = ref<IUrlData>({
  scheme: 'wss',
  url: '',
})
const newUrl = computed(() => {
  return urlForm.value.scheme + '://' + urlForm.value.url
})

const formRules: { [key in keyof IFormData]?: FormItemRule | FormItemRule[] } = {
  name: {
    required: true,
  },
  clientId: {
    required: true,
  },
  clientIdParamMode: {
    required: true,
  },
}

const urlValidation = computed<{
  status: "success" | "error" | "warning" | undefined,
  feedback: string | undefined,
  valid: boolean,
}>(() => {
  if (!urlForm.value.scheme) {
    return {
      status: 'error',
      feedback: '请选择 scheme',
      valid: false,
    };
  }
  if (urlForm.value.url === '') {
    return {
      status: 'warning',
      feedback: '请输入连接地址',
      valid: false,
    };
  }
  if (urlForm.value.url.startsWith('/')) {
    return {
      status: 'error',
      feedback: '地址前缀不能包含 /',
      valid: false,
    }
  }
  try {
    new URL(newUrl.value)
  } catch (e) {
    return {
      status: 'error',
      feedback: '输入地址格式无效',
      valid: false,
    }
  }
  return {
    status: 'success',
    feedback: undefined,
    valid: true,
  }
})

const onSave = () => {
  formRef.value?.validate(async errors => {
    if (errors || !urlValidation.value.valid) {
      console.log(errors)
      nMessage.warning('表单存在错误，请修正后再提交')
      return
    }

    const data: SocketServerItem = {
      ...structuredClone(toRaw(formData.value)),
      url: newUrl.value,
      id: formData.value.id ?? ulid(),
    }

    console.debug('saveSocketServer', data)

    try {
      if (isEdit.value) {
        await serverCollection.update(data)
      } else {
        await serverCollection.create(data)
      }
    } catch (e) {
      console.error(e)

      nMessage.error(`保存失败：${e}`)
      return
    }

    nMessage.success('保存成功')
    show.value = false
  })
}

watch(show, (value: boolean) => {
  if (!value) {
    formData.value = structuredClone(DEFAULT_FORM_DATA)
    urlForm.value = {
      scheme: 'wss',
      url: '',
    }
    formRef.value?.restoreValidation()
    editOptions.value = structuredClone(DEFAULT_EDIT_OPTIONS)
  }
})

const parseUrl = (url: string): IUrlData => {

  const scheme = url.slice(0, url.indexOf('://')) as "wss" | 'ws'
  const _url = url.slice(url.indexOf('://') + 3)

  return {
    scheme,
    url: _url,
  }
}

const open = (id: string|null = null, options: EditOptions = structuredClone(DEFAULT_EDIT_OPTIONS)) => {
  if (id !== null) {
    const item = serverCollection.find(id)
    if (item === null) {
      throw new Error(`id ${id} not found`)
    }
    formData.value = structuredClone(toRaw(item))
    if (options.clone) {
      formData.value.id = null
      formData.value.name += " [副本]"
    }
    urlForm.value = parseUrl(formData.value.url)
  }
  editOptions.value = {
    ...structuredClone(DEFAULT_EDIT_OPTIONS),
    ...options,
  }
  show.value = true
}

defineExpose({
  open,
})
</script>

<template>
<n-modal
    v-model:show="show"
    :mask-closable="false"
    preset="dialog"
    transform-origin="center"
    :title="title"
    :show-icon="false"
    style="min-width: 500px"
>
  <n-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="auto"
  >
    <n-form-item label="名称" path="name">
      <n-input v-model:value.trim="formData.name" maxlength="64"></n-input>
    </n-form-item>
    <n-form-item
        label="URL"
        :rule="{ required: true }"
        :feedback="urlValidation.feedback"
        :validation-status="urlValidation.status"
    >
      <n-input-group>
        <n-select
            v-model:value="urlForm.scheme"
            :options="[
                { label: 'ws://', value: 'ws' },
                { label: 'wss://', value: 'wss' },
            ]"
            style="width: 10em"
            placeholder="scheme"
        ></n-select>
        <n-input-group-label v-if="false">://</n-input-group-label>
        <n-input v-model:value.trim="urlForm.url"></n-input>
      </n-input-group>
    </n-form-item>
    <n-form-item label="ClientId" path="clientId">
      <n-input v-model:value.trim="formData.clientId" maxlength="96"></n-input>
    </n-form-item>
    <n-form-item label="传参模式" path="clientIdParamMode">
      <n-radio-group v-model:value="formData.clientIdParamMode">
        <n-radio v-for="[key, value] in ClientIdParamModeLabel" :key="key" :value="key">{{ value }}</n-radio>
      </n-radio-group>
    </n-form-item>
    <n-form-item label="链路心跳">
      <n-switch v-model:value="formData.socketHeartbeat"></n-switch>
    </n-form-item>
    <div style="display: flex; justify-content: flex-end">
      <n-button round type="primary" @click="onSave">保存</n-button>
    </div>
  </n-form>
</n-modal>
</template>

<style scoped>

</style>
