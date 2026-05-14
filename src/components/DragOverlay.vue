<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useImageImport } from '@/composables/useImageImport'

const isDragOver = ref(false)
const { addDroppedItems } = useImageImport()
let dragDepth = 0

const hasFiles = (event: DragEvent) => {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

const handleDragEnter = (event: DragEvent) => {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth += 1
  isDragOver.value = true
}

const handleDragOver = (event: DragEvent) => {
  if (!hasFiles(event)) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

const handleDragLeave = (event: DragEvent) => {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) {
    isDragOver.value = false
  }
}

const handleDrop = async (event: DragEvent) => {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth = 0
  isDragOver.value = false
  await addDroppedItems(event.dataTransfer?.items, event.dataTransfer?.files)
}

onMounted(() => {
  window.addEventListener('dragenter', handleDragEnter)
  window.addEventListener('dragover', handleDragOver)
  window.addEventListener('dragleave', handleDragLeave)
  window.addEventListener('drop', handleDrop)
})

onUnmounted(() => {
  window.removeEventListener('dragenter', handleDragEnter)
  window.removeEventListener('dragover', handleDragOver)
  window.removeEventListener('dragleave', handleDragLeave)
  window.removeEventListener('drop', handleDrop)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isDragOver"
      class="drag-overlay"
    >
      <div class="drag-overlay__box">
        <div class="drag-overlay__icon">📸</div>
        <div class="drag-overlay__title">松开以添加图片</div>
        <div class="drag-overlay__hint">
          支持 JPG、PNG、WebP、BMP、GIF，单个文件最大 100 MB
        </div>
      </div>
    </div>
  </Teleport>
</template>
