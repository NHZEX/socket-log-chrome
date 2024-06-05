<script setup lang="ts">
import GlobalOptionsManage from "~/components/global-options/GlobalOptionsManage.vue";
</script>

<template>
  <div class="common-layout">
    <n-layout>
      <n-layout-header>
        <h1>SocketLog++ Options</h1>
      </n-layout-header>
      <n-layout-content>
        <div style="margin: 0 16px 16px">
          <n-tabs
              type="card"
              default-value="server-collection-manage"
              size="large"
              animated
          >
            <n-tab-pane name="server-collection-manage" tab="服务器列表">
              <server-collection-manage style="max-width: 800px"></server-collection-manage>
            </n-tab-pane>
            <n-tab-pane name="global-options" tab="全局选项">
              <global-options-manage></global-options-manage>
            </n-tab-pane>
          </n-tabs>
        </div>
      </n-layout-content>
    </n-layout>
  </div>
</template>

<style scoped>

.common-layout .n-layout-header, .n-layout-footer {
  background-color: #D9ECFFFF;
  color: #303133FF;
  text-align: center
}

.common-layout .n-layout-sider {
  background-color: #D9ECFFFF;
  color: #303133FF;
}

.common-layout .n-layout-content {
}
</style>
