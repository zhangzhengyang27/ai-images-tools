<script setup lang="ts">
import UploadZone from './UploadZone.vue'
import ImageList from './ImageList.vue'
</script>

<template>
  <div
    class="w-[280px] flex-shrink-0 flex flex-col overflow-hidden border-r border-surface-200 bg-white"
  >
    <!-- Upload Zone -->
    <div class="p-4 flex-shrink-0">
      <UploadZone />
    </div>

    <!-- Image List -->
    <ImageList />
  </div>
</template>
