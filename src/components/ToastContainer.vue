<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

// Module-level singleton — shared across all ToastContainer instances
const globalToasts = ref<Toast[]>([])
let globalToastId = 0

const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const id = ++globalToastId
  globalToasts.value.push({ id, message, type })

  setTimeout(() => {
    removeToast(id)
  }, 3000)
}

const removeToast = (id: number) => {
  const index = globalToasts.value.findIndex((t) => t.id === id)
  if (index !== -1) {
    globalToasts.value.splice(index, 1)
  }
}

// 暴露给全局使用（使用 Symbol 避免键名冲突）
onMounted(() => {
  ;(window as any).__showToast = addToast
})

onUnmounted(() => {
  delete (window as any).__showToast
})
</script>

<template>
  <Teleport to="body">
    <div id="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in globalToasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.type}`"
        >
          <span>
            {{ toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️' }}
          </span>
          <span>{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>