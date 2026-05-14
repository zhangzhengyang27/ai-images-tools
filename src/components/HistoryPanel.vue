<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'
import { useHistory } from '@/composables/useHistory'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import HistoryItem from './HistoryItem.vue'
import type { HistoryRecord, HistoryFilter } from '@/types'

const historyStore = useHistoryStore()
const imageStore = useImageStore()
const { showToast } = useToast()
const { deleteRecord, clearAll, exportHistory, importHistory, openCompressedResult, replayRecord } = useHistory()

const confirmClearAll = ref(false)

const filterOptions: { label: string; value: HistoryFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '近7天', value: 'week' },
  { label: '近30天', value: 'month' }
]

const recordCount = computed(() => historyStore.filteredRecords.length)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const handleDelete = async (id: string) => {
  await deleteRecord(id)
  showToast('已删除历史记录', 'info')
}

const handleApplyParams = (record: HistoryRecord) => {
  imageStore.updateCompressOptions({
    quality: record.quality,
    outputFormat: record.outputFormat,
    scaleEnabled: record.scaleEnabled,
    scalePercent: record.scalePercent,
    maxWidth: record.maxWidth,
    maxHeight: record.maxHeight
  })
  historyStore.closeDrawer()
  showToast('已应用历史参数', 'success')
}

const handleOpenResult = async (record: HistoryRecord) => {
  const result = await openCompressedResult(record)
  if (result.success) {
    showToast('已打开压缩结果', 'success')
    return
  }

  showToast(result.error || '打开压缩结果失败', 'error')
}

const handleRecompress = async (record: HistoryRecord) => {
  const result = await replayRecord(record)
  if (!result.success) {
    showToast(result.error || '重新压缩准备失败', 'error')
    return
  }

  showToast(result.reused ? '已载入原图并应用历史参数，可直接重新压缩' : '已重新载入原图并应用历史参数', 'success')
}

const handleClearAll = async () => {
  if (!confirmClearAll.value) {
    confirmClearAll.value = true
    return
  }
  await clearAll()
  confirmClearAll.value = false
  showToast('已清空所有历史记录', 'info')
}

const handleExport = async () => {
  const result = await exportHistory()
  if (result.success && result.exportedPath) {
    showToast(`已导出至 ${result.exportedPath}`, 'success')
  } else if (result.error && result.error !== '已取消') {
    showToast(result.error, 'error')
  }
}

const handleImport = async () => {
  const result = await importHistory()
  if (result.success && result.count !== undefined) {
    showToast(`成功导入 ${result.count} 条记录`, 'success')
  } else if (result.error && result.error !== '已取消') {
    showToast(result.error, 'error')
  }
}

const cancelClear = () => {
  confirmClearAll.value = false
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="historyStore.isDrawerOpen"
        class="history-backdrop"
        @click="historyStore.closeDrawer()"
      />
    </Transition>

    <!-- Drawer -->
    <Transition name="slide">
      <div
        v-if="historyStore.isDrawerOpen"
        class="history-drawer"
        role="dialog"
        aria-label="历史记录"
      >
        <!-- Header -->
        <div class="drawer-header">
          <div class="drawer-title">
            <span>📜</span>
            <span>压缩历史</span>
          </div>
          <button
            class="close-btn"
            aria-label="关闭"
            @click="historyStore.closeDrawer()"
          >
            ✕
          </button>
        </div>

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ historyStore.stats.total }}</span>
            <span class="stat-label">总记录</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-value">{{ formatBytes(historyStore.stats.totalSavedBytes) }}</span>
            <span class="stat-label">共节省</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-value">{{ historyStore.stats.avgSavedPercent }}%</span>
            <span class="stat-label">平均节省</span>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="drawer-toolbar">
          <!-- Filter Tabs -->
          <div class="filter-tabs">
            <button
              v-for="opt in filterOptions"
              :key="opt.value"
              class="filter-tab"
              :class="{ active: historyStore.filter === opt.value }"
              @click="historyStore.filter = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <!-- Search -->
          <div class="search-wrap">
            <input
              v-model="historyStore.searchKeyword"
              type="text"
              class="search-input"
              placeholder="搜索文件名..."
            />
            <span v-if="historyStore.searchKeyword" class="search-clear" @click="historyStore.searchKeyword = ''">✕</span>
          </div>
        </div>

        <!-- History List -->
        <div class="drawer-content">
          <template v-if="historyStore.filteredRecords.length > 0">
            <div class="record-count">
              共 {{ recordCount }} 条记录
            </div>
            <div class="record-list">
              <HistoryItem
                v-for="record in historyStore.filteredRecords"
                :key="record.id"
                :record="record"
                @delete="handleDelete"
                @apply="handleApplyParams"
                @open-result="handleOpenResult"
                @recompress="handleRecompress"
              />
            </div>
          </template>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-title">暂无历史记录</div>
            <div class="empty-hint">压缩图片后将自动记录到这里</div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="drawer-footer">
          <button class="footer-btn" @click="handleImport">📥 导入</button>
          <button class="footer-btn" @click="handleExport">📤 导出</button>
          <div class="flex-1" />
          <template v-if="confirmClearAll">
            <button class="footer-btn footer-btn--danger" @click="handleClearAll">确认清空</button>
            <button class="footer-btn" @click="cancelClear">取消</button>
          </template>
          <button
            v-else
            class="footer-btn footer-btn--clear"
            :disabled="historyStore.records.length === 0"
            @click="handleClearAll"
          >
            清空全部
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.history-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 999;
}

.history-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 380px;
  background: #f8f9fa;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

/* Header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.close-btn:hover {
  border-color: #f87171;
  background: #fef2f2;
  color: #dc2626;
}

/* Stats Bar */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 18px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  gap: 0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 10px;
  color: #9ca3af;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: #f0f0f0;
}

/* Toolbar */
.drawer-toolbar {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tab {
  flex: 1;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-tab.active {
  border-color: #6366f1;
  background: #eef2ff;
  color: #4f46e5;
}

.filter-tab:hover:not(.active) {
  border-color: #d1d5db;
  color: #374151;
}

.search-wrap {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 7px 30px 7px 10px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  font-size: 12px;
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: #6366f1;
}

.search-input::placeholder {
  color: #d1d5db;
}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 10px;
  cursor: pointer;
}

/* Content */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
}

.record-count {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 8px;
  padding-left: 2px;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 8px;
}

.empty-icon {
  font-size: 32px;
  line-height: 1;
  margin-bottom: 4px;
}

.empty-title {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.empty-hint {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

/* Footer */
.drawer-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 14px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.footer-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  font-size: 11px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.footer-btn:hover {
  border-color: #6366f1;
  color: #4f46e5;
  background: #eef2ff;
}

.footer-btn--danger {
  border-color: #fca5a5;
  color: #dc2626;
  background: #fef2f2;
}

.footer-btn--danger:hover {
  border-color: #dc2626;
  background: #fef2f2;
}

.footer-btn--clear:disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

.flex-1 {
  flex: 1;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
