<script setup lang="ts">
import { computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'

const imageStore = useImageStore()

const usePerImageOptions = computed(() => !!imageStore.selectedImage?.compressOptions)
const activeOptions = computed(() => imageStore.selectedImage?.compressOptions || imageStore.compressOptions)
const quality = computed(() => activeOptions.value.quality)

const presets = [
  { label: '低', value: 30 },
  { label: '中', value: 50 },
  { label: '高', value: 78 },
  { label: '极高', value: 95 }
]

const setQuality = (value: number) => {
  if (usePerImageOptions.value) {
    imageStore.updateSelectedImageCompressOptions({ quality: Math.max(1, Math.min(100, value)) })
  } else {
    imageStore.setQuality(value)
  }
}

const onSliderChange = (e: Event) => {
  const value = parseInt((e.target as HTMLInputElement).value)
  setQuality(value)
}

// 预估压缩大小（简单估算）
const estimatedSize = computed(() => {
  if (!imageStore.selectedImage) return ''
  const originalSize = imageStore.selectedImage.originalSize
  const estimatedBytes = originalSize * (quality.value / 100)
  return formatFileSize(estimatedBytes)
})

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const originalSizeText = computed(() => {
  if (!imageStore.selectedImage) return ''
  return formatFileSize(imageStore.selectedImage.originalSize)
})
</script>

<template>
  <div class="mb-5">
    <div class="section-title">质量设置</div>

    <div v-if="imageStore.selectedImage" class="mb-3 flex items-center justify-between gap-2">
      <span class="text-[11px] text-surface-600">
        {{ usePerImageOptions ? '当前图片独立参数' : '使用全局参数' }}
      </span>
      <button
        class="text-[11px] text-primary-600 hover:text-primary-700 font-semibold"
        @click="
          usePerImageOptions
            ? imageStore.clearSelectedImageCompressOptions()
            : imageStore.updateSelectedImageCompressOptions({})
        "
      >
        {{ usePerImageOptions ? '改用全局' : '单独设置' }}
      </button>
    </div>

    <!-- Preset Buttons -->
    <div class="flex gap-1.5 mb-3">
      <button
        v-for="preset in presets"
        :key="preset.value"
        class="flex-1 py-1.5 rounded-md border-1.5 text-[11px] font-semibold transition-all"
        :class="
          quality === preset.value
            ? 'border-primary-500 bg-primary-100 text-primary-600'
            : 'border-surface-200 text-surface-600 hover:border-primary-500 hover:text-primary-500'
        "
        @click="setQuality(preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- Quality Slider -->
    <div class="relative py-2">
      <input
        type="range"
        class="w-full h-1 rounded-sm bg-surface-200 appearance-none cursor-pointer"
        :value="quality"
        min="1"
        max="100"
        @input="onSliderChange"
      />
      <div class="flex justify-between mt-1 text-[10px] text-surface-600">
        <span>小体积</span>
        <span>高画质</span>
      </div>
    </div>

    <!-- Current Quality -->
    <div class="flex items-center justify-between mt-2">
      <span class="text-xs text-surface-600">当前质量</span>
      <div class="flex items-center gap-1.5">
        <span class="text-xl font-bold text-primary-500">{{ quality }}</span>
        <span class="text-[13px] text-surface-600">%</span>
      </div>
    </div>

    <!-- Estimated Size -->
    <div v-if="imageStore.selectedImage" class="mt-2.5 p-2.5 bg-surface-100 rounded-lg">
      <div class="text-[11px] text-surface-600 mb-1.5">预估压缩后大小</div>
      <div class="flex items-baseline gap-1">
        <span class="text-lg font-bold text-primary-600">{{ estimatedSize }}</span>
        <span class="text-[11px] text-surface-400">（原 {{ originalSizeText }}）</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #0ea5e9;
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
</style>
