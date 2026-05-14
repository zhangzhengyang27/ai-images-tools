<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import ImageCompare from './ImageCompare.vue'
import ImagePreview from './ImagePreview.vue'
import ProgressBar from './ProgressBar.vue'
import type { ImageItem } from '@/types'

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
        <div class="empty-state__icon">📸</div>
        <div class="empty-state__title">请上传图片</div>
        <div class="empty-state__hint">支持 JPG、PNG、WebP、BMP、GIF 格式</div>
      </div>
    </div>

    <!-- Batch Progress Bar -->
    <ProgressBar v-if="imageStore.isCompressing" />
  </div>
</template>