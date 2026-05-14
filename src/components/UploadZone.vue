<script setup lang="ts">
import { ref } from 'vue'
import { useImageImport } from '@/composables/useImageImport'
import { useImageStore } from '@/stores/imageStore'

const isDragOver = ref(false)
const { openImages, openImageFolder, addDroppedItems } = useImageImport()
const imageStore = useImageStore()

// 点击上传
const handleClick = async () => {
  await openImages()
}

const handleFolderClick = async (e: MouseEvent) => {
  e.stopPropagation()
  await openImageFolder()
}

// 拖拽事件
const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const handleDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  await addDroppedItems(e.dataTransfer?.items, e.dataTransfer?.files)
}
</script>

<template>
  <div
    class="upload-zone"
    :class="{ 'drag-over': isDragOver }"
    @click="handleClick"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div class="upload-zone__icon">📁</div>
    <div class="upload-zone__title">点击上传图片</div>
    <div class="upload-zone__hint">或拖拽文件到此处</div>
    <div class="upload-zone__hint mt-1 text-[11px] text-surface-400">
      支持 JPG · PNG · WebP · BMP · GIF
    </div>
    <div v-if="imageStore.isImporting" class="upload-zone__import">
      <div class="upload-zone__import-row">
        <span>{{ imageStore.importedCount }}/{{ imageStore.importTotal }}</span>
        <span class="upload-zone__import-name">{{ imageStore.currentImportName }}</span>
      </div>
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: `${Math.round((imageStore.importedCount / imageStore.importTotal) * 100)}%` }"
        ></div>
      </div>
    </div>
    <button class="upload-zone__folder-btn" type="button" @click="handleFolderClick">
      选择文件夹
    </button>
  </div>
</template>
