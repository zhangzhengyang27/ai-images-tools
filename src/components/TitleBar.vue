<script setup lang="ts">
import { useHistoryStore } from '@/stores/historyStore'
import UpdateChecker from '@/components/UpdateChecker.vue'

const historyStore = useHistoryStore()
const isMac = navigator.platform.toUpperCase().includes('MAC')

const handleMinimize = () => {
  window.electronAPI.minimize()
}

const handleMaximize = () => {
  window.electronAPI.maximize()
}

const handleClose = () => {
  window.electronAPI.close()
}
</script>

<template>
  <div class="title-bar">
    <div class="title-bar__traffic-spacer"></div>
    <div class="title-bar__title">图片压缩工具</div>
    <div class="title-bar__actions">
      <UpdateChecker />
      <button
        class="title-bar__action-btn"
        title="历史记录 (Ctrl+H)"
        @click="historyStore.toggleDrawer()"
      >
        📜
      </button>
      <template v-if="!isMac">
        <button class="title-bar__action-btn" title="最小化" @click="handleMinimize">−</button>
        <button class="title-bar__action-btn" title="最大化" @click="handleMaximize">□</button>
        <button class="title-bar__action-btn" title="关闭" @click="handleClose">×</button>
      </template>
    </div>
  </div>
</template>
