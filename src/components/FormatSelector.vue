<script setup lang="ts">
import { computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import type { OutputFormat } from '@/types'

const imageStore = useImageStore()

const formats: Array<{ label: string; value: OutputFormat }> = [
  { label: '保持原格式', value: 'origin' },
  { label: 'JPG', value: 'jpg' },
  { label: 'PNG', value: 'png' },
  { label: 'WebP', value: 'webp' }
]

const currentFormat = computed(() => imageStore.compressOptions.outputFormat)

const setFormat = (format: OutputFormat) => {
  imageStore.setOutputFormat(format)
}

const originalFormatText = computed(() => {
  if (!imageStore.selectedImage) return ''
  const format = imageStore.selectedImage.format.toUpperCase()
  return format === 'JPEG' ? 'JPEG' : format
})
</script>

<template>
  <div class="mb-5">
    <div class="section-title">输出格式</div>

    <!-- Format Chips -->
    <div class="flex gap-1.5 flex-wrap">
      <button
        v-for="fmt in formats"
        :key="fmt.value"
        class="px-3 py-1.5 rounded-md border-1.5 text-xs font-medium transition-all"
        :class="
          currentFormat === fmt.value
            ? 'border-primary-500 bg-primary-100 text-primary-600 font-semibold'
            : 'border-surface-200 text-surface-600 hover:border-primary-500 hover:text-primary-500'
        "
        @click="setFormat(fmt.value)"
      >
        {{ fmt.label }}
      </button>
    </div>

    <!-- Original Format Hint -->
    <div v-if="imageStore.selectedImage" class="mt-2 text-[11px] text-surface-400">
      当前原图格式：<span class="text-primary-600 font-semibold">{{ originalFormatText }}</span>
    </div>
  </div>
</template>