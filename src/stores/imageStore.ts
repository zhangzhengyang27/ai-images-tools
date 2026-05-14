import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ImageItem, CompressOptions, OutputFormat } from '@/types'

export const useImageStore = defineStore('image', () => {
  // 图片列表
  const images = ref<ImageItem[]>([])

  // 当前选中的图片 ID
  const selectedId = ref<string | null>(null)

  // 压缩选项
  const compressOptions = ref<CompressOptions>({
    quality: 78,
    outputFormat: 'origin'
  })

  // 是否正在压缩
  const isCompressing = ref(false)

  // 批量压缩进度
  const batchProgress = ref(0)

  // 当前压缩的图片数量
  const compressingCount = ref(0)

  // 已压缩完成的数量
  const compressedCount = ref(0)

  // 当前选中的图片
  const selectedImage = computed(() => {
    if (!selectedId.value) return null
    return images.value.find((img) => img.id === selectedId.value)
  })

  // 待压缩的图片数量
  const pendingCount = computed(() => {
    return images.value.filter((img) => img.status === 'pending').length
  })

  // 已压缩完成的图片数量
  const doneCount = computed(() => {
    return images.value.filter((img) => img.status === 'done').length
  })

  // 添加图片
  function addImage(image: ImageItem) {
    images.value.push(image)
    if (!selectedId.value) {
      selectedId.value = image.id
    }
  }

  // 批量添加图片
  function addImages(newImages: ImageItem[]) {
    images.value.push(...newImages)
    if (!selectedId.value && newImages.length > 0) {
      selectedId.value = newImages[0].id
    }
  }

  // 更新图片
  function updateImage(id: string, updates: Partial<ImageItem>) {
    const index = images.value.findIndex((img) => img.id === id)
    if (index !== -1) {
      images.value[index] = { ...images.value[index], ...updates }
    }
  }

  // 删除图片
  function removeImage(id: string) {
    const index = images.value.findIndex((img) => img.id === id)
    if (index !== -1) {
      images.value.splice(index, 1)
      if (selectedId.value === id) {
        selectedId.value = images.value.length > 0 ? images.value[0].id : null
      }
    }
  }

  // 清空所有图片
  function clearImages() {
    images.value = []
    selectedId.value = null
    isCompressing.value = false
    batchProgress.value = 0
    compressingCount.value = 0
    compressedCount.value = 0
  }

  // 选择图片
  function selectImage(id: string) {
    selectedId.value = id
  }

  // 更新压缩选项
  function updateCompressOptions(options: Partial<CompressOptions>) {
    compressOptions.value = { ...compressOptions.value, ...options }
  }

  // 设置质量
  function setQuality(quality: number) {
    compressOptions.value.quality = Math.max(1, Math.min(100, quality))
  }

  // 设置输出格式
  function setOutputFormat(format: OutputFormat) {
    compressOptions.value.outputFormat = format
  }

  // 开始压缩状态
  function startCompressing(count: number) {
    isCompressing.value = true
    compressingCount.value = count
    compressedCount.value = 0
    batchProgress.value = 0
  }

  // 更新批量进度
  function updateBatchProgress(progress: number) {
    batchProgress.value = progress
  }

  // 完成一张压缩
  function finishOneCompress() {
    compressedCount.value++
    if (compressedCount.value >= compressingCount.value) {
      isCompressing.value = false
    }
  }

  // 结束压缩状态
  function stopCompressing() {
    isCompressing.value = false
    compressingCount.value = 0
    compressedCount.value = 0
    batchProgress.value = 0
  }

  return {
    // State
    images,
    selectedId,
    compressOptions,
    isCompressing,
    batchProgress,
    compressingCount,
    compressedCount,
    // Computed
    selectedImage,
    pendingCount,
    doneCount,
    // Actions
    addImage,
    addImages,
    updateImage,
    removeImage,
    clearImages,
    selectImage,
    updateCompressOptions,
    setQuality,
    setOutputFormat,
    startCompressing,
    updateBatchProgress,
    finishOneCompress,
    stopCompressing
  }
})