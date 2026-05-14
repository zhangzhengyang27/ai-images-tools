import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ImageItem, CompressOptions, HistoryRecord, OutputFormat } from '@/types'

export const useImageStore = defineStore('image', () => {
  // 图片列表
  const images = ref<ImageItem[]>([])

  // 当前选中的图片 ID
  const selectedId = ref<string | null>(null)

  // 压缩选项
  const compressOptions = ref<CompressOptions>({
    quality: 78,
    outputFormat: 'origin',
    scaleEnabled: false,
    scalePercent: 100
  })

  // 是否正在压缩
  const isCompressing = ref(false)

  // 批量压缩进度
  const batchProgress = ref(0)

  // 当前压缩的图片数量
  const compressingCount = ref(0)

  // 已压缩完成的数量
  const compressedCount = ref(0)

  // 当前正在压缩的图片
  const currentCompressId = ref<string | null>(null)
  const currentCompressName = ref('')

  // 列表多选
  const selectedIds = ref<string[]>([])

  // 排序方式
  const sortBy = ref<'added' | 'name' | 'size' | 'status'>('added')

  // 上传/导入进度
  const isImporting = ref(false)
  const importedCount = ref(0)
  const importTotal = ref(0)
  const currentImportName = ref('')

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

  const sortedImages = computed(() => {
    const indexed = images.value.map((image, index) => ({ image, index }))

    switch (sortBy.value) {
      case 'name':
        indexed.sort((a, b) => a.image.name.localeCompare(b.image.name))
        break
      case 'size':
        indexed.sort((a, b) => b.image.originalSize - a.image.originalSize)
        break
      case 'status':
        indexed.sort((a, b) => a.image.status.localeCompare(b.image.status))
        break
      default:
        indexed.sort((a, b) => a.index - b.index)
    }

    return indexed.map((entry) => entry.image)
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

  function isSelected(id: string) {
    return selectedIds.value.includes(id)
  }

  function toggleImageSelection(id: string) {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((selectedId) => selectedId !== id)
      return
    }

    selectedIds.value = [...selectedIds.value, id]
  }

  function selectAllImages() {
    selectedIds.value = images.value.map((image) => image.id)
  }

  function invertImageSelection() {
    const current = new Set(selectedIds.value)
    selectedIds.value = images.value.filter((image) => !current.has(image.id)).map((image) => image.id)
  }

  function clearImageSelection() {
    selectedIds.value = []
  }

  function removeSelectedImages() {
    const ids = new Set(selectedIds.value)
    if (ids.size === 0) return 0

    images.value = images.value.filter((image) => !ids.has(image.id) || image.status === 'compressing')
    const removedCount = ids.size - images.value.filter((image) => ids.has(image.id)).length
    selectedIds.value = selectedIds.value.filter((id) => images.value.some((image) => image.id === id))

    if (selectedId.value && !images.value.some((image) => image.id === selectedId.value)) {
      selectedId.value = images.value.length > 0 ? images.value[0].id : null
    }

    return removedCount
  }

  function setSortBy(value: 'added' | 'name' | 'size' | 'status') {
    sortBy.value = value
  }

  // 从历史记录恢复到当前工作区，若原图已存在则直接复用
  function upsertImageFromHistory(record: HistoryRecord) {
    const existingImage = images.value.find((img) => img.originalPath === record.originalPath)

    if (existingImage) {
      updateImage(existingImage.id, {
        name: record.originalName,
        originalSize: record.originalSize,
        originalWidth: record.originalWidth,
        originalHeight: record.originalHeight,
        format: record.originalFormat,
        status: 'pending',
        compressedPath: undefined,
        compressedSize: undefined,
        compressedWidth: undefined,
        compressedHeight: undefined,
        compressedFormat: undefined,
        progress: 0,
        error: undefined,
        savedPercent: undefined,
        compressOptions: {
          quality: record.quality,
          outputFormat: record.outputFormat,
          scaleEnabled: record.scaleEnabled,
          scalePercent: record.scalePercent,
          maxWidth: record.maxWidth,
          maxHeight: record.maxHeight
        }
      })
      selectedId.value = existingImage.id
      return { imageId: existingImage.id, reused: true }
    }

    const image: ImageItem = {
      id: `history-${record.id}-${Date.now().toString(36)}`,
      name: record.originalName,
      originalPath: record.originalPath,
      originalSize: record.originalSize,
      originalWidth: record.originalWidth,
      originalHeight: record.originalHeight,
      format: record.originalFormat,
      status: 'pending',
      compressOptions: {
        quality: record.quality,
        outputFormat: record.outputFormat,
        scaleEnabled: record.scaleEnabled,
        scalePercent: record.scalePercent,
        maxWidth: record.maxWidth,
        maxHeight: record.maxHeight
      }
    }

    addImage(image)
    selectedId.value = image.id
    return { imageId: image.id, reused: false }
  }

  // 更新图片
  function updateImage(id: string, updates: Partial<ImageItem>) {
    const index = images.value.findIndex((img) => img.id === id)
    if (index !== -1) {
      images.value[index] = { ...images.value[index], ...updates }
    }
  }

  function updateSelectedImageCompressOptions(options: Partial<CompressOptions>) {
    if (!selectedId.value) return
    const image = images.value.find((img) => img.id === selectedId.value)
    if (!image) return

    updateImage(selectedId.value, {
      compressOptions: {
        ...compressOptions.value,
        ...image.compressOptions,
        ...options
      }
    })
  }

  function clearSelectedImageCompressOptions() {
    if (!selectedId.value) return
    updateImage(selectedId.value, { compressOptions: undefined })
  }

  // 删除图片
  function removeImage(id: string) {
    const index = images.value.findIndex((img) => img.id === id)
    if (index !== -1) {
      images.value.splice(index, 1)
      if (selectedId.value === id) {
        selectedId.value = images.value.length > 0 ? images.value[0].id : null
      }
      selectedIds.value = selectedIds.value.filter((selectedImageId) => selectedImageId !== id)
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
    currentCompressId.value = null
    currentCompressName.value = ''
    selectedIds.value = []
  }

  function startImport(total: number) {
    isImporting.value = total > 0
    importedCount.value = 0
    importTotal.value = total
    currentImportName.value = ''
  }

  function updateImportProgress(count: number, name: string) {
    importedCount.value = Math.min(count, importTotal.value)
    currentImportName.value = name
  }

  function finishImport() {
    isImporting.value = false
    importedCount.value = 0
    importTotal.value = 0
    currentImportName.value = ''
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
    currentCompressId.value = null
    currentCompressName.value = ''
  }

  function setCurrentCompressImage(id: string | null) {
    currentCompressId.value = id
    currentCompressName.value = id ? images.value.find((image) => image.id === id)?.name || '' : ''
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
      currentCompressId.value = null
      currentCompressName.value = ''
    }
  }

  // 结束压缩状态
  function stopCompressing() {
    isCompressing.value = false
    compressingCount.value = 0
    compressedCount.value = 0
    batchProgress.value = 0
    currentCompressId.value = null
    currentCompressName.value = ''
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
    currentCompressId,
    currentCompressName,
    selectedIds,
    sortBy,
    isImporting,
    importedCount,
    importTotal,
    currentImportName,
    // Computed
    selectedImage,
    pendingCount,
    doneCount,
    sortedImages,
    // Actions
    addImage,
    addImages,
    isSelected,
    toggleImageSelection,
    selectAllImages,
    invertImageSelection,
    clearImageSelection,
    removeSelectedImages,
    setSortBy,
    upsertImageFromHistory,
    updateImage,
    updateSelectedImageCompressOptions,
    clearSelectedImageCompressOptions,
    removeImage,
    clearImages,
    startImport,
    updateImportProgress,
    finishImport,
    selectImage,
    updateCompressOptions,
    setQuality,
    setOutputFormat,
    startCompressing,
    setCurrentCompressImage,
    updateBatchProgress,
    finishOneCompress,
    stopCompressing
  }
})
