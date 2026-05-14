import { onMounted, onUnmounted } from 'vue'

type ToastType = 'success' | 'error' | 'info'

export function useToast() {
  const showToast = (message: string, type: ToastType = 'info') => {
    if ((window as any).__showToast) {
      ;(window as any).__showToast(message, type)
    }
  }

  return {
    showToast
  }
}