<script setup lang="ts">
import { ref, computed } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import UploadZone from './UploadZone.vue'
import ImageList from './ImageList.vue'
import type { ImageItem } from '@/types'

const imageStore = useImageStore()

const handleImagesAdded = (images: ImageItem[]) => {
  imageStore.addImages(images)
}
</script>

<template>
  <div
    class="w-[280px] flex-shrink-0 flex flex-col overflow-hidden border-r border-surface-200 bg-white"
  >
    <!-- Upload Zone -->
    <div class="p-4 flex-shrink-0">
      <UploadZone @images-added="handleImagesAdded" />
    </div>

    <!-- Image List -->
    <ImageList />
  </div>
</template>