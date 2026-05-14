<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ImageItem } from '@/types'

const props = defineProps<{
  image: ImageItem
}>()

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const originalSrc = computed(() => `file://${props.image.originalPath}`)
const compressedSrc = computed(
  () => `file://${props.image.compressedPath || props.image.originalPath}`
)

const originalSize = computed(() => formatFileSize(props.image.originalSize))
const compressedSize = computed(() =>
  props.image.compressedSize ? formatFileSize(props.image.compressedSize) : ''
)

const savedPercent = computed(() => props.image.savedPercent || 0)

// ─── 同步缩放状态 ───
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)

// 拖拽状态
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const lastTranslateX = ref(0)
const lastTranslateY = ref(0)

// 平滑过渡
const transitionDuration = ref(0)
let transitionTimer: ReturnType<typeof setTimeout> | null = null

const zoomPercent = computed(() => Math.round(scale.value * 100))

const transformStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transitionDuration: `${transitionDuration.value}ms`
}))

// ─── 缩放处理 ───
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY || e.detail
  const zoomFactor = delta > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(5, scale.value * zoomFactor))

  if (newScale !== scale.value) {
    // 以鼠标位置为中心缩放
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2

    const scaleChange = newScale / scale.value
    translateX.value += mouseX * (1 - scaleChange)
    translateY.value += mouseY * (1 - scaleChange)

    scale.value = newScale
  }
}

// ─── 拖拽处理 ───
const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  lastTranslateX.value = translateX.value
  lastTranslateY.value = translateY.value
  transitionDuration.value = 0
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  const dx = e.clientX - dragStartX.value
  const dy = e.clientY - dragStartY.value
  translateX.value = lastTranslateX.value + dx
  translateY.value = lastTranslateY.value + dy
}

const handleMouseUp = () => {
  isDragging.value = false
}

// ─── 重置 ───
const resetView = () => {
  transitionDuration.value = 200
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// ─── 快捷键 ───
const handleKeyDown = (e: KeyboardEvent) => {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
    return
  }

  if (e.key === 'Escape') {
    resetView()
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    applyZoom(scale.value * 1.2)
  } else if (e.key === '-') {
    e.preventDefault()
    applyZoom(scale.value / 1.2)
  }
}

const applyZoom = (newScale: number) => {
  transitionDuration.value = 200
  scale.value = Math.max(0.1, Math.min(5, newScale))
  if (Math.abs(scale.value - 1) < 0.05) {
    translateX.value = 0
    translateY.value = 0
  }
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('keydown', handleKeyDown)
  if (transitionTimer) clearTimeout(transitionTimer)
})
</script>

<template>
  <div class="compare-container h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 mb-3 flex-shrink-0">
      <div class="flex items-center gap-1.5 ml-auto">
        <button
          class="zoom-btn"
          title="缩小 (-)"
          @click="applyZoom(scale / 1.2)"
        >−</button>
        <span class="zoom-label">{{ zoomPercent }}%</span>
        <button
          class="zoom-btn"
          title="放大 (+)"
          @click="applyZoom(scale * 1.2)"
        >+</button>
        <button
          class="zoom-btn zoom-btn--reset"
          title="重置视图 (Esc)"
          @click="resetView"
        >⟲</button>
      </div>
    </div>

    <!-- Compare Panels -->
    <div class="flex-1 flex gap-4 overflow-hidden">
      <!-- Original Panel -->
      <div class="compare-panel flex-1 flex flex-col overflow-hidden">
        <div class="compare-label">
          <span>📄 原图</span>
          <span class="size-tag">{{ originalSize }}</span>
        </div>
        <div
          class="compare-img-wrap flex-1 overflow-hidden"
          :class="{ 'cursor-grab': !isDragging, 'cursor-grabbing': isDragging }"
          @wheel.prevent="handleWheel"
          @mousedown="handleMouseDown"
        >
          <img
            :src="originalSrc"
            alt="原图"
            draggable="false"
            :style="transformStyle"
          />
        </div>
      </div>

      <!-- Compressed Panel -->
      <div class="compare-panel flex-1 flex flex-col overflow-hidden">
        <div class="compare-label">
          <span>⚡ 压缩图</span>
          <span>
            <span v-if="savedPercent > 0" class="text-green-600 font-bold mr-2">
              节省 {{ savedPercent }}%
            </span>
            <span class="size-tag">{{ compressedSize }}</span>
          </span>
        </div>
        <div
          class="compare-img-wrap flex-1 overflow-hidden"
          :class="{ 'cursor-grab': !isDragging, 'cursor-grabbing': isDragging }"
          @wheel.prevent="handleWheel"
          @mousedown="handleMouseDown"
        >
          <img
            :src="compressedSrc"
            alt="压缩图"
            draggable="false"
            :style="transformStyle"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare-container {
  height: 100%;
}

.compare-panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.compare-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  color: #374151;
  flex-shrink: 0;
}

.size-tag {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 11px;
  font-weight: 500;
}

.compare-img-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overflow: hidden;
  user-select: none;
}

.compare-img-wrap img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform-origin: center center;
  will-change: transform;
}

/* Zoom Controls */
.zoom-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  color: #374151;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-weight: 400;
}

.zoom-btn:hover {
  border-color: #0ea5e9;
  color: #0ea5e9;
  background: #eff6ff;
}

.zoom-btn:active {
  transform: scale(0.92);
}

.zoom-btn--reset {
  font-size: 14px;
}

.zoom-label {
  min-width: 44px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
</style>