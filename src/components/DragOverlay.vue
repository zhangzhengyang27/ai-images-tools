<script setup lang="ts">
import { ref } from 'vue'

const isDragOver = ref(false)

const handleDragEnter = () => {
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isDragOver"
      class="drag-overlay"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
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