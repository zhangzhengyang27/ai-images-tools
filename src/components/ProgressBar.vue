<script setup lang="ts">
import { computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()

const progressText = computed(() => {
  return `${imageStore.compressedCount} / ${imageStore.compressingCount} 张`
})

const progressPercent = computed(() => {
  return imageStore.batchProgress
})

const handleCancel = async () => {
  await window.electronAPI.cancelCompress()
}
</script>

<template>
  <div class="px-5 py-2.5 bg-white border-t border-surface-200 flex-shrink-0">
    <div class="flex items-center justify-between mb-1.5">
      <div class="flex items-center gap-2">
        <div class="spinner"></div>
        <span class="text-xs font-semibold text-primary-600">正在压缩…</span>
      </div>
      <span class="text-xs text-surface-600">{{ progressText }}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
    </div>
    <div class="flex justify-between mt-1">
      <span class="text-[10px] text-surface-400">压缩中...</span>
      <button
        class="text-xs text-surface-600 hover:text-primary-500 px-2 py-0.5 rounded border border-surface-200 hover:border-primary-500 transition-colors"
        @click="handleCancel"
      >
        取消
      </button>
    </div>
  </div>
</template>
