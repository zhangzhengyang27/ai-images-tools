<script setup lang="ts">
import { computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import type { ImageItem } from '@/types'
import { toLocalResourceUrl } from '@/utils/localResource'

const imageStore = useImageStore()

const sortOptions = [
  { label: '添加', value: 'added' },
  { label: '名称', value: 'name' },
  { label: '大小', value: 'size' },
  { label: '状态', value: 'status' }
] as const

const hasImages = computed(() => imageStore.images.length > 0)
const hasSelection = computed(() => imageStore.selectedIds.length > 0)

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

const handleToggleSelection = (id: string, e: Event) => {
  e.stopPropagation()
  imageStore.toggleImageSelection(id)
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

const handleRemoveSelected = () => {
  imageStore.removeSelectedImages()
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
        v-if="hasImages"
        class="text-[11px] text-surface-500 hover:text-primary-500 px-2 py-1 rounded hover:bg-surface-100 transition-colors"
        @click="handleClearAll"
      >
        清空全部
      </button>
    </div>

    <div v-if="hasImages" class="list-tools">
      <div class="list-tools__row">
        <button class="list-tool-btn" @click="imageStore.selectAllImages()">全选</button>
        <button class="list-tool-btn" @click="imageStore.invertImageSelection()">反选</button>
        <button
          class="list-tool-btn list-tool-btn--danger"
          :disabled="!hasSelection"
          @click="handleRemoveSelected"
        >
          删除选中
        </button>
      </div>
      <div class="list-tools__row">
        <span class="list-tools__label">排序</span>
        <button
          v-for="option in sortOptions"
          :key="option.value"
          class="list-sort-btn"
          :class="{ active: imageStore.sortBy === option.value }"
          @click="imageStore.setSortBy(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div v-if="hasSelection" class="list-tools__hint">
        已选 {{ imageStore.selectedIds.length }} 张
        <button @click="imageStore.clearImageSelection()">取消选择</button>
      </div>
    </div>

    <!-- Image Items -->
    <div class="space-y-1">
      <div
        v-for="image in imageStore.sortedImages"
        :key="image.id"
        class="img-item group"
        :class="{ selected: imageStore.selectedId === image.id, checked: imageStore.isSelected(image.id) }"
        @click="handleSelect(image.id)"
      >
        <input
          type="checkbox"
          class="img-item__check"
          :checked="imageStore.isSelected(image.id)"
          @click="handleToggleSelection(image.id, $event)"
        />

        <!-- Thumbnail -->
        <img
          :src="toLocalResourceUrl(image.originalPath)"
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
              <span v-if="image.compressOptions" class="text-primary-600"> · 独立参数</span>
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
    <div v-if="imageStore.images.length === 0" class="empty-list-state">
      <div class="empty-icon">📭</div>
      <div class="empty-title">暂无图片</div>
      <div class="empty-hint">上传图片后将显示在这里</div>
    </div>
  </div>
</template>

<style scoped>
.empty-list-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 6px;
}

.list-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
}

.list-tools__row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.list-tools__label,
.list-tools__hint {
  font-size: 10px;
  color: #78797b;
}

.list-tools__hint button {
  margin-left: 6px;
  color: #0ea5e9;
  font-size: 10px;
}

.list-tool-btn,
.list-sort-btn {
  padding: 3px 7px;
  border-radius: 5px;
  border: 1px solid #eaeaec;
  background: #fff;
  color: #5c5d5e;
  font-size: 10px;
  font-weight: 600;
}

.list-tool-btn:hover,
.list-sort-btn:hover,
.list-sort-btn.active {
  border-color: #0ea5e9;
  color: #0284c7;
  background: #f0f9ff;
}

.list-tool-btn:disabled {
  color: #b5b5b6;
  background: #f5f5f5;
  cursor: not-allowed;
}

.list-tool-btn--danger:hover:not(:disabled) {
  border-color: #f87171;
  color: #dc2626;
  background: #fef2f2;
}

.img-item.checked {
  border-color: #bae6fd;
}

.img-item__check {
  flex-shrink: 0;
}

.empty-icon {
  font-size: 28px;
  line-height: 1;
  margin-bottom: 4px;
}

.empty-title {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.empty-hint {
  font-size: 11px;
  color: #9ca3af;
}
</style>
