<script setup lang="ts">
import { ref, computed } from 'vue'
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

const originalSrc = computed(() => `file://${props.image.originalPath}`)
const compressedSrc = computed(
  () => `file://${props.image.compressedPath || props.image.originalPath}`
)

const originalSize = computed(() => formatFileSize(props.image.originalSize))
const compressedSize = computed(() =>
  props.image.compressedSize ? formatFileSize(props.image.compressedSize) : ''
)

const savedPercent = computed(() => props.image.savedPercent || 0)
</script>

<template>
  <div class="compare-container h-full">
    <!-- Original Panel -->
    <div class="compare-panel">
      <div class="compare-label">
        <span>📄 原图</span>
        <span class="size-tag">{{ originalSize }}</span>
      </div>
      <div class="compare-img-wrap">
        <img :src="originalSrc" alt="原图" draggable="false" />
      </div>
    </div>

    <!-- Compressed Panel -->
    <div class="compare-panel">
      <div class="compare-label">
        <span>⚡ 压缩图</span>
        <span>
          <span v-if="savedPercent > 0" class="text-green-600 font-bold mr-2">
            节省 {{ savedPercent }}%
          </span>
          <span class="size-tag">{{ compressedSize }}</span>
        </span>
      </div>
      <div class="compare-img-wrap">
        <img :src="compressedSrc" alt="压缩图" draggable="false" />
      </div>
    </div>
  </div>
</template>