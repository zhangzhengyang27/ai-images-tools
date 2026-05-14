<script setup lang="ts">
import { useImageStore } from '@/stores/imageStore'
import QualitySlider from './QualitySlider.vue'
import FormatSelector from './FormatSelector.vue'
import ScaleAdjuster from './ScaleAdjuster.vue'
import ImageInfo from './ImageInfo.vue'
import ActionButtons from './ActionButtons.vue'
import CurrentCompressStatus from './CurrentCompressStatus.vue'

const imageStore = useImageStore()
</script>

<template>
  <div
    class="w-[300px] flex-shrink-0 flex flex-col overflow-y-auto border-l border-surface-200 bg-white"
  >
    <!-- Panel Header -->
    <div class="px-[18px] py-4 border-b border-surface-100 flex-shrink-0">
      <div class="text-[13px] font-bold text-surface-900">压缩设置</div>
      <div class="text-[11px] text-surface-600 mt-0.5">配置参数后点击开始压缩</div>
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto px-[18px] py-4">
      <CurrentCompressStatus />

      <!-- Quality Section -->
      <QualitySlider />

      <div class="sep"></div>

      <!-- Output Format Section -->
      <FormatSelector />

      <div class="sep"></div>

      <!-- Scale Adjuster Section -->
      <ScaleAdjuster />

      <div class="sep"></div>

      <!-- Current Image Info -->
      <ImageInfo v-if="imageStore.selectedImage" :image="imageStore.selectedImage" />
    </div>

    <!-- Panel Footer -->
    <ActionButtons />
  </div>
</template>
