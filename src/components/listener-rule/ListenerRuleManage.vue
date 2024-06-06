<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref, nextTick} from "vue";
import {useListenerRule, initialize} from "~/stores/ListenerRuleStore";
import {isEqual} from "radash";

initialize()

const listenerRuleStore = useListenerRule()

const loading = ref(false)
const allowRules = ref<string[]>([])
const initialRules = computed(() => listenerRuleStore.allowRules)
const isChange = computed<boolean>(() => {
  return !isEqual(allowRules.value.filter(line => !!line), initialRules.value)
})
let _tidRefreshEnableRuleCount: number | null = null
const enabledRuleCount = ref(0)

const ruleContent = computed<string>({
  get: () => allowRules.value
      .join('\n'),
  set: val => {
    allowRules.value = String(val)
        .split('\n')
        .map(line => line.trim())
  },
})

const refreshEnableRuleCount = async () => {
  enabledRuleCount.value = (await chrome.declarativeNetRequest.getDynamicRules()).length;
}

const onSubmit = async () => {
  loading.value = true
  try {
    const newRules = await listenerRuleStore.saveRules(allowRules.value)

    await nextTick()
    allowRules.value = newRules
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  listenerRuleStore.onReady(() => {
    allowRules.value = listenerRuleStore.allowRules
  })

  await refreshEnableRuleCount()
  _tidRefreshEnableRuleCount = setInterval(
      async () => await refreshEnableRuleCount(),
      1000
  )
})
onUnmounted(() => {
  if (_tidRefreshEnableRuleCount) {
    clearInterval(_tidRefreshEnableRuleCount)
    _tidRefreshEnableRuleCount = null
  }
})
</script>

<template>
  <div>
    <n-form
        label-placement="left"
        label-width="auto"
        style="max-width: 600px"
        :disabled="loading"
    >
      <n-form-item label="当前激活规则">
        {{ enabledRuleCount }}
      </n-form-item>
      <n-form-item label="允许监听域名">
        <n-input
            type="textarea"
            size="small"
            :autosize="{
            minRows: 15,
            maxRows: 40,
          }"
            :input-props="{ autocomplete: 'off' }"
            v-model:value="ruleContent"
            style="{ max-width: 600px; }"
            placeholder="输入激活调试的域名，一行一个，可以用通配符
'*'：匹配任意数量的字符。
'|'：锚点，用于匹配字符串的开头或结尾。
'||'：域名锚点，用于匹配网址（子）域名的开头。
'^'：分隔符，匹配除字母、数字、下划线 _、连字符 -、点 . 或百分号 % 之外的任何内容。
- 不允许使用以 ||* 开头的模式。请改用 *。
- 注意：必须仅由 ASCII 字符组成。匹配网址，其中主机采用 Punycode 格式编码（如果是国际化域名），任何其他非 ASCII 字符采用 UTF-8 网址编码。例如，如果请求网址为 http://abc.р敏?q=升级，urlFilter 将与网址 http://abc.xn--p1ai/?q=%D1%84 匹配。
"
        />
      </n-form-item>
      <div style="display: flex; justify-content: flex-end">
        <n-button
            type="primary"
            @click="onSubmit"
            :loading="loading"
            :disabled="!isChange"
        >保存</n-button>
      </div>
    </n-form>
  </div>
</template>

<style scoped>

</style>
