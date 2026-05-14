<script setup lang="ts">
import { computed } from 'vue'
import type { HistoryRecord } from '@/types'

const props = defineProps<{
  record: HistoryRecord
}>()

const emit = defineEmits<{
  (e: 'delete', id: string): void
  (e: 'apply', record: HistoryRecord): void
  (e: 'open-result', record: HistoryRecord): void
  (e: 'recompress', record: HistoryRecord): void
}>()

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// 相对时间
const relativeTime = computed(() => {
  const now = Date.now()
  const diff = now - props.record.timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  return `${Math.floor(days / 30)} 个月前`
})

// 节省比例颜色
const savedColorClass = computed(() => {
  const pct = props.record.savedPercent
  if (pct >= 50) return 'saved-high'
  if (pct >= 20) return 'saved-medium'
  return 'saved-low'
})

// 原图缩略图
const thumbnailSrc = computed(() => `file://${props.record.originalPath}`)

// 格式化日期
const formattedDate = computed(() => {
  const d = new Date(props.record.timestamp)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})
</script>

<template>
  <div class="history-item">
    <!-- Thumbnail -->
    <div class="history-item__thumb">
      <img :src="thumbnailSrc" :alt="record.originalName" @error="$event.target.style.display='none'" />
    </div>

    <!-- Info -->
    <div class="history-item__info">
      <div class="history-item__name" :title="record.originalName">{{ record.originalName }}</div>
      <div class="history-item__meta">
        <span class="meta-time">{{ relativeTime }}</span>
        <span class="meta-dot">·</span>
        <span class="meta-size">{{ formatFileSize(record.originalSize) }} → {{ formatFileSize(record.compressedSize) }}</span>
      </div>
      <div class="history-item__date" :title="formattedDate">{{ formattedDate }}</div>
      <div class="history-item__params">
        <span class="param-tag">质量 {{ record.quality }}</span>
        <span class="param-tag">{{ record.outputFormat === 'origin' ? record.originalFormat.toUpperCase() : record.outputFormat.toUpperCase() }}</span>
        <span v-if="record.scaleEnabled && record.scalePercent && record.scalePercent < 100" class="param-tag">
          缩放 {{ record.scalePercent }}%
        </span>
      </div>
    </div>

    <!-- Saved Badge -->
    <div class="history-item__saved">
      <span class="saved-badge" :class="savedColorClass">
        -{{ record.savedPercent }}%
      </span>
    </div>

    <!-- Actions -->
    <div class="history-item__actions">
      <button
        class="action-btn action-btn--open"
        title="打开压缩结果"
        @click="emit('open-result', record)"
      >
        ↗
      </button>
      <button
        class="action-btn action-btn--recompress"
        title="重新压缩"
        @click="emit('recompress', record)"
      >
        ↻
      </button>
      <button
        class="action-btn action-btn--apply"
        title="应用参数"
        @click="emit('apply', record)"
      >
        📋
      </button>
      <button
        class="action-btn action-btn--delete"
        title="删除"
        @click="emit('delete', record.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #f0f0f0;
  transition: all 0.15s;
}

.history-item:hover {
  border-color: #e0e7ff;
  box-shadow: 0 1px 4px rgba(99, 102, 241, 0.08);
}

.history-item__thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  background: #f9fafb;
  flex-shrink: 0;
  border: 1px solid #f0f0f0;
}

.history-item__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-item__info {
  flex: 1;
  min-width: 0;
}

.history-item__name {
  font-size: 12px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.history-item__meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.meta-dot {
  color: #d1d5db;
}

.history-item__params {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.history-item__date {
  font-size: 10px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.param-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 10px;
  font-weight: 500;
}

.history-item__saved {
  flex-shrink: 0;
}

.saved-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

.saved-high {
  background: #dcfce7;
  color: #16a34a;
}

.saved-medium {
  background: #fef9c3;
  color: #ca8a04;
}

.saved-low {
  background: #fee2e2;
  color: #dc2626;
}

.history-item__actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.history-item:hover .history-item__actions {
  opacity: 1;
}

.action-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.action-btn--apply:hover {
  border-color: #6366f1;
  background: #eef2ff;
}

.action-btn--open:hover,
.action-btn--recompress:hover {
  border-color: #0ea5e9;
  background: #f0f9ff;
  color: #0369a1;
}

.action-btn--delete:hover {
  border-color: #f87171;
  background: #fef2f2;
  color: #dc2626;
}
</style>
