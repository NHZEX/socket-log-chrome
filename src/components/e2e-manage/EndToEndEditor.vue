<script setup lang="ts">
import {computed, ref, toRaw, watch} from "vue";
import type {ClientEndToEndConfig} from "~types/socket-log.options";
import type {FormInst, FormItemRule} from "naive-ui";
import {
  initialize as endToEndCollectionInitialize,
  useEndToEndConfigCollectionStore
} from "~/stores/EndToEndConfigCollectionStore";
import {clipboardWriteText, createRandomString} from "~/utils/helper";

endToEndCollectionInitialize()

interface EditOptions {
  clone: boolean,
  edit?: boolean,
}

const DEFAULT_EDIT_OPTIONS: EditOptions = {
  clone: false,
  edit: false,
}

const DEFAULT_FORM_DATA: IFormData = {
  id: '',
  name: '',
  key: '',
  disable: false,
}

interface IFormData extends ClientEndToEndConfig {
  id: string
  name: string
  disable: boolean
}

const nMessage = useMessage()
const endToEndConfigCollection = useEndToEndConfigCollectionStore()

const editOptions = ref<EditOptions>(DEFAULT_EDIT_OPTIONS)
const show = ref(false)
const title = computed(() => {
  return editOptions.value.clone
    ? '克隆配置'
    : (editOptions.value.edit ? '编辑配置' : '新增配置')
})
const isEdit = computed(() => editOptions.value?.edit === true)

const formRef = ref<FormInst | null>(null)
const formData = ref<IFormData>(structuredClone(DEFAULT_FORM_DATA))

const formRules: { [key in keyof IFormData]?: FormItemRule | FormItemRule[] } = {
  id: {
    required: true,
    max: 127,
    validator (rule: FormItemRule, value: string) {
      if (value.length === 0) {
        return new Error(`不能为空`)
      }
      if (!isEdit.value && endToEndConfigCollection.find(value) !== null) {
        return new Error(`已经存在这样的ID: ${value}，必须是唯一的`)
      }
      return true
    }
  },
  name: {
    required: true,
    max: 64,
  },
  key: {
    required: true,
    max: 127,
  },
}

const onSave = () => {
  formRef.value?.validate(async errors => {
    if (errors) {
      console.log(errors)
      nMessage.warning('表单存在错误，请修正后再提交')
      return
    }

    const data: ClientEndToEndConfig = structuredClone(toRaw(formData.value))

    console.debug('saveEndToEndConfig', data)

    try {
      if (isEdit.value) {
        await endToEndConfigCollection.update(data)
      } else {
        await endToEndConfigCollection.create(data)
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
    formRef.value?.restoreValidation()
    editOptions.value = structuredClone(DEFAULT_EDIT_OPTIONS)
  }
})

const open = (id: string | null = null, options: EditOptions = structuredClone(DEFAULT_EDIT_OPTIONS)) => {
  if (id !== null) {
    const item = endToEndConfigCollection.find(id)
    if (item === null) {
      throw new Error(`id ${id} not found`)
    }
    formData.value = structuredClone(toRaw(item)) as IFormData
  }
  editOptions.value = {
    ...structuredClone(DEFAULT_EDIT_OPTIONS),
    ...options,
  }
  if (editOptions.value.clone) {
    editOptions.value.edit = false
  } else if (id !== null) {
    editOptions.value.edit = true
  }
  console.log(editOptions.value, id)
  show.value = true
}

const onNewId = () => {
  formData.value.id = crypto.randomUUID()
}
const onCopyId = async () => {
  await clipboardWriteText(formData.value.id)
  nMessage.success('拷贝成功')
}

const onNewKey = () => {
  formData.value.key = createRandomString(32)
}
const onCopyKey = async () => {
  await clipboardWriteText(formData.value.key)
  nMessage.success('拷贝成功')
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
    style="min-width: 550px"
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="auto"
    >
      <n-form-item label="配置名称" path="name">
        <n-input v-model:value.trim="formData.name" maxlength="64"></n-input>
      </n-form-item>
      <n-form-item label="E2E ID" path="id">
        <n-input-group>
          <n-input v-model:value.trim="formData.id" maxlength="127" :disabled="isEdit" class="monospace"></n-input>
          <n-button @click="onNewId" :disabled="isEdit">生成</n-button>
          <n-button @click="onCopyId" :disabled="!formData.id">复制</n-button>
        </n-input-group>
      </n-form-item>
      <n-form-item label="E2E Key" path="key">
        <n-input-group>
          <n-input type="password" v-model:value.trim="formData.key" show-password-on="mousedown" maxlength="127" class="monospace"></n-input>
          <n-button @click="onNewKey">生成</n-button>
          <n-button @click="onCopyKey" :disabled="!formData.key">复制</n-button>
        </n-input-group>
      </n-form-item>
      <n-form-item label="禁用配置" path="disable">
        <n-switch v-model:value="formData.disable"></n-switch>
      </n-form-item>
      <div style="display: flex; justify-content: flex-end">
        <n-button round type="primary" @click="onSave">保存</n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style scoped>
.monospace {
  font-family: Consolas, Monaco, monospace;
}
</style>
