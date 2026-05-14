<script setup lang="ts">
import { computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import type { ImageItem } from '@/types'

const imageStore = useImageStore()

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// 获取状态徽章样式
const getStatusClass = (status: ImageItem['status']) => {
  return {
    'badge-pending': status === 'pending',
    'badge-compress': status === 'compressing',
    'badge-done': status === 'done',
    'badge-error': status === 'error'
  }
}

// 获取状态文本
const getStatusText = (image: ImageItem) => {
  switch (image.status) {
    case 'pending':
      return '待处理'
    case 'compressing':
      return `${image.progress || 0}%`
    case 'done':
      return '已压缩'
    case 'error':
      return '失败'
    default:
      return ''
  }
}

// 选择图片
const handleSelect = (id: string) => {
  imageStore.selectImage(id)
}

// 删除图片
const handleRemove = (id: string, e: Event) => {
  e.stopPropagation()
  imageStore.removeImage(id)
}

// 清空所有
const handleClearAll = () => {
  imageStore.clearImages()
}
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4">
    <!-- List Header -->
    <div class="flex items-center justify-between mb-2">
      <div class="text-[11px] font-bold uppercase tracking-wider text-surface-600">
        图片列表
        <span
          class="bg-surface-100 text-surface-500 px-1.5 py-0.5 rounded-[10px] text-[10px] ml-1"
        >
          {{ imageStore.images.length }}
        </span>
      </div>
      <button
        v-if="imageStore.images.length > 0"
        class="text-[11px] text-surface-500 hover:text-primary-500 px-2 py-1 rounded hover:bg-surface-100 transition-colors"
        @click="handleClearAll"
      >
        清空全部
      </button>
    </div>

    <!-- Image Items -->
    <div class="space-y-1">
      <div
        v-for="image in imageStore.images"
        :key="image.id"
        class="img-item"
        :class="{ selected: imageStore.selectedId === image.id }"
        @click="handleSelect(image.id)"
      >
        <!-- Thumbnail -->
        <img
          :src="`file://${image.originalPath}`"
          :alt="image.name"
          class="img-item__thumb"
        />

        <!-- Info -->
        <div class="img-item__info">
          <div class="img-item__name">{{ image.name }}</div>
          <div class="img-item__meta">
            <template v-if="image.status === 'error'">
              <span class="text-red-500">{{ image.error || '压缩失败' }}</span>
            </template>
            <template v-else>
              {{ image.originalWidth }}×{{ image.originalHeight }} ·
              {{ formatFileSize(image.originalSize) }}
            </template>
          </div>
        </div>

        <!-- Badge -->
        <div class="img-item__badge">
          <template v-if="image.status === 'compressing'">
            <div class="flex items-center gap-1.5">
              <div class="spinner"></div>
              <span class="badge badge-compress text-[9px] px-1.5 py-0.5">
                {{ image.progress }}%
              </span>
            </div>
          </template>
          <template v-else>
            <span class="badge" :class="getStatusClass(image.status)">
              {{ getStatusText(image) }}
            </span>
          </template>
        </div>

        <!-- Delete Button -->
        <button
          v-if="image.status !== 'compressing'"
          class="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-red-500 p-1 rounded transition-all"
          @click="handleRemove(image.id, $event)"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="imageStore.images.length === 0" class="text-center py-8 text-surface-400">
      <div class="text-3xl mb-2">📭</div>
      <div class="text-xs">暂无图片</div>
    </div>
  </div>
</template>