<script setup lang="ts">
import { computed } from 'vue'
import type { ImageItem } from '@/types'

const props = defineProps<{
  image: ImageItem
}>()

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const originalSize = computed(() => formatFileSize(props.image.originalSize))
const compressedSize = computed(() =>
  props.image.compressedSize ? formatFileSize(props.image.compressedSize) : '-'
)
const savedPercent = computed(() =>
  props.image.savedPercent ? `-${props.image.savedPercent}%` : '-'
)

const formatText = computed(() => {
  const format = props.image.format.toUpperCase()
  return format === 'JPEG' ? 'JPEG' : format
})

const outputFormatText = computed(() => {
  if (!props.image.compressedFormat) return '-'
  const format = props.image.compressedFormat.toUpperCase()
  return format === 'JPEG' ? 'JPEG' : format
})
</script>

<template>
  <div class="mb-5">
    <div class="section-title">当前图片信息</div>

    <div>
      <div class="info-row">
        <span class="info-row__label">文件名</span>
        <span class="info-row__value max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
          {{ image.name }}
        </span>
      </div>
      <div class="info-row">
        <span class="info-row__label">原始格式</span>
        <span class="info-row__value">{{ formatText }}</span>
      </div>
      <div class="info-row">
        <span class="info-row__label">尺寸</span>
        <span class="info-row__value">{{ image.originalWidth }} × {{ image.originalHeight }} px</span>
      </div>
      <div class="info-row">
        <span class="info-row__label">原始大小</span>
        <span class="info-row__value">{{ originalSize }}</span>
      </div>
      <div class="info-row">
        <span class="info-row__label">压缩后</span>
        <span class="info-row__value" :class="{ highlight: image.status === 'done' }">
          {{ compressedSize }}
        </span>
      </div>
      <div class="info-row">
        <span class="info-row__label">节省空间</span>
        <span class="info-row__value" :class="{ saved: image.status === 'done' }">
          {{ savedPercent }}
        </span>
      </div>
    </div>
  </div>
</template>