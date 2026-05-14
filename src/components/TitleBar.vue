<script setup lang="ts">
import { useImageStore } from '@/stores/imageStore'
import { useHistoryStore } from '@/stores/historyStore'

const imageStore = useImageStore()
const historyStore = useHistoryStore()

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
    <div class="title-bar__title">图片压缩工具</div>
    <div class="title-bar__controls">
      <button
        class="title-bar__btn title-bar__btn--history"
        title="历史记录 (Ctrl+H)"
        @click="historyStore.toggleDrawer()"
      >
        📜
      </button>
      <button class="title-bar__btn btn-min" title="最小化" @click="handleMinimize"></button>
      <button class="title-bar__btn btn-max" title="最大化" @click="handleMaximize"></button>
      <button class="title-bar__btn btn-close" title="关闭" @click="handleClose"></button>
    </div>
  </div>
</template>