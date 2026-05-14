<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import TitleBar from '@/components/TitleBar.vue'
import SidePanel from '@/components/SidePanel.vue'
import ContentArea from '@/components/ContentArea.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import DragOverlay from '@/components/DragOverlay.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import { useImageStore } from '@/stores/imageStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useToast } from '@/composables/useToast'
import { useHistory } from '@/composables/useHistory'
import { useImageImport } from '@/composables/useImageImport'

const imageStore = useImageStore()
const historyStore = useHistoryStore()
const { showToast } = useToast()
const { loadHistory } = useHistory()
const { openImages } = useImageImport()

// 全局键盘快捷键
const handleKeyDown = async (e: KeyboardEvent) => {
  // 忽略在输入框中的按键
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
    return
  }

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modKey = isMac ? e.metaKey : e.ctrlKey

  // Ctrl/Cmd + O: 打开文件对话框
  if (modKey && e.key === 'o') {
    e.preventDefault()
    await openImages()
  }

  // Delete/Backspace: 删除选中的图片
  if ((e.key === 'Delete' || e.key === 'Backspace') && imageStore.selectedId) {
    e.preventDefault()
    imageStore.removeImage(imageStore.selectedId)
    showToast('已删除图片', 'info')
  }

  // Escape: 清空所有图片
  if (e.key === 'Escape' && imageStore.images.length > 0) {
    e.preventDefault()
    imageStore.clearImages()
    showToast('已清空所有图片', 'info')
  }

  // Ctrl/Cmd + H: 打开历史面板
  if (modKey && e.key === 'h') {
    e.preventDefault()
    historyStore.toggleDrawer()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  // 加载历史记录
  await loadHistory()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Title Bar -->
    <TitleBar />

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar -->
      <SidePanel />

      <!-- Center Main Area -->
      <ContentArea />

      <!-- Right Control Panel -->
      <ControlPanel />
    </div>

    <!-- Drag Overlay -->
    <DragOverlay />

    <!-- Toast Container -->
    <ToastContainer />

    <!-- History Panel Drawer -->
    <HistoryPanel />
  </div>
</template>
