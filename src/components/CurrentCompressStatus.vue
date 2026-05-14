<script setup lang="ts">
import { computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()

const progressText = computed(() => {
  if (imageStore.compressingCount <= 0) return ''
  return `${imageStore.compressedCount} / ${imageStore.compressingCount} 张`
})
</script>

<template>
  <div
    v-if="imageStore.isCompressing"
    class="mb-4 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-[11px] font-semibold text-primary-700">正在处理</span>
      <span class="text-[10px] text-primary-600">{{ progressText }}</span>
    </div>
    <div class="mt-1 truncate text-xs font-semibold text-surface-900">
      {{ imageStore.currentCompressName || '准备压缩...' }}
    </div>
  </div>
</template>
