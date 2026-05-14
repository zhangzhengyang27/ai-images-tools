<script setup lang="ts">
import TitleBar from '@/components/TitleBar.vue'
import SidePanel from '@/components/SidePanel.vue'
import ContentArea from '@/components/ContentArea.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import DragOverlay from '@/components/DragOverlay.vue'
import ToastContainer from '@/components/ToastContainer.vue'
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Title Bar -->
    <TitleBar />

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar -->
      <SidePanel />

      <!-- Center Main Area -->
      <ContentArea />

      <!-- Right Control Panel -->
      <ControlPanel />
    </div>

    <!-- Drag Overlay -->
    <DragOverlay />

    <!-- Toast Container -->
    <ToastContainer />
  </div>
</template>