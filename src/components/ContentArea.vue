<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import ImageCompare from './ImageCompare.vue'
import ImagePreview from './ImagePreview.vue'
import ProgressBar from './ProgressBar.vue'

const imageStore = useImageStore()

const viewMode = ref<'compare' | 'original' | 'compressed'>('compare')

const setViewMode = (mode: 'compare' | 'original' | 'compressed') => {
  viewMode.value = mode
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-surface-50">
    <!-- Toolbar -->
    <div
      class="px-5 py-2.5 bg-white border-b border-surface-200 flex items-center gap-2.5 flex-shrink-0"
    >
      <!-- View Mode Tabs -->
      <div class="flex gap-0.5 p-1 bg-surface-100 rounded-lg ml-auto">
        <button
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
          :class="
            viewMode === 'compare'
              ? 'bg-white text-primary-500 shadow-sm'
              : 'text-surface-600 hover:text-primary-500'
          "
          @click="setViewMode('compare')"
        >
          对比视图
        </button>
        <button
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
          :class="
            viewMode === 'original'
              ? 'bg-white text-primary-500 shadow-sm'
              : 'text-surface-600 hover:text-primary-500'
          "
          @click="setViewMode('original')"
        >
          原图
        </button>
        <button
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
          :class="
            viewMode === 'compressed'
              ? 'bg-white text-primary-500 shadow-sm'
              : 'text-surface-600 hover:text-primary-500'
          "
          @click="setViewMode('compressed')"
        >
          压缩图
        </button>
      </div>
    </div>

    <!-- Preview / Compare Area -->
    <div class="flex-1 overflow-auto p-5">
      <template v-if="imageStore.selectedImage">
        <ImageCompare
          v-if="viewMode === 'compare' && imageStore.selectedImage.status === 'done'"
          :image="imageStore.selectedImage"
        />
        <ImagePreview
          v-else
          :image="imageStore.selectedImage"
          :mode="viewMode === 'compare' ? 'original' : viewMode"
        />
      </template>

      <!-- Empty State -->
      <div v-else class="empty-state h-full">
        <div class="empty-state__visual">
          <div class="empty-state__icon">📸</div>
          <div class="empty-state__ring" />
        </div>
        <div class="empty-state__title">还没有上传图片</div>
        <div class="empty-state__hint">拖拽图片到窗口，或点击左侧「上传图片」按钮</div>
        <div class="empty-state__formats">
          <span class="format-badge">JPG</span>
          <span class="format-badge">PNG</span>
          <span class="format-badge">WebP</span>
          <span class="format-badge">BMP</span>
          <span class="format-badge">GIF</span>
        </div>
      </div>
    </div>

    <!-- Batch Progress Bar -->
    <ProgressBar v-if="imageStore.isCompressing" />
  </div>
</template>

<style scoped>
/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
}

.empty-state__visual {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.empty-state__icon {
  font-size: 40px;
  line-height: 1;
  position: relative;
  z-index: 1;
  animation: float 3s ease-in-out infinite;
}

.empty-state__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px dashed #bfdbfe;
  animation: spin 12s linear infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state__title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.empty-state__hint {
  font-size: 13px;
  color: #6b7280;
  text-align: center;
  max-width: 280px;
  line-height: 1.5;
}

.empty-state__formats {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}

.format-badge {
  padding: 2px 10px;
  border-radius: 20px;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #bfdbfe;
}
</style>