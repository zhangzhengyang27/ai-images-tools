<script setup lang="ts">
import { computed } from 'vue'
import type { ImageItem } from '@/types'

const props = defineProps<{
  image: ImageItem
  mode: 'original' | 'compressed'
}>()

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const imageSrc = computed(() => {
  if (props.mode === 'compressed' && props.image.compressedPath) {
    return `file://${props.image.compressedPath}`
  }
  return `file://${props.image.originalPath}`
})

const label = computed(() => {
  return props.mode === 'original' ? '📄 原图' : '⚡ 压缩图'
})

const size = computed(() => {
  if (props.mode === 'compressed' && props.image.compressedSize) {
    return formatFileSize(props.image.compressedSize)
  }
  return formatFileSize(props.image.originalSize)
})
</script>

<template>
  <div class="compare-container h-full">
    <div class="compare-panel">
      <div class="compare-label">
        <span>{{ label }}</span>
        <span class="size-tag">{{ size }}</span>
      </div>
      <div class="compare-img-wrap">
        <img :src="imageSrc" :alt="image.name" draggable="false" />
      </div>
    </div>
  </div>
</template>