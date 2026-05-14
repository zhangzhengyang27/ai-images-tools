<script setup lang="ts">
import { computed, ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import { useHistory } from '@/composables/useHistory'
import { buildCompressedName } from '@/utils/fileName'
import type { CompressResultPayload } from '@/types'

const imageStore = useImageStore()
const { showToast } = useToast()
const { addRecordFromCompress } = useHistory()

// 检查是否有待压缩的图片
const hasPendingImages = computed(() => imageStore.pendingCount > 0)
const hasDoneImages = computed(() => imageStore.doneCount > 0)
const selectedImage = computed(() => imageStore.selectedImage)
const isExporting = ref(false)
const canSaveSelectedImage = computed(
  () => !!selectedImage.value && selectedImage.value.status === 'done' && !imageStore.isCompressing
)
const canExportDoneImages = computed(
  () => hasDoneImages.value && !imageStore.isCompressing && !isExporting.value
)
const exportProgress = ref({ done: 0, total: 0, retry: 0 })
const memoryPeak = ref(0)
const memoryWarningShown = ref(false)

type StoreImage = (typeof imageStore.images)[number]

const getOptionsForImage = (image: StoreImage) => {
  return image.compressOptions || imageStore.compressOptions
}

const getDirectoryName = (filePath: string) => {
  const index = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return index >= 0 ? filePath.slice(0, index) : ''
}

const formatMemory = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(0)} MB`

const applyCompressResult = async (data: CompressResultPayload) => {
  // 找到对应的原始图片数据
  const originalImage = imageStore.images.find((img) => img.id === data.id)

  imageStore.updateImage(data.id, {
    status: 'done',
    compressedPath: data.compressedPath,
    compressedSize: data.compressedSize,
    compressedWidth: data.compressedWidth,
    compressedHeight: data.compressedHeight,
    compressedFormat: data.compressedFormat,
    savedPercent: data.savedPercent,
    progress: 100
  })

  // 自动写入历史记录
  if (originalImage) {
    await addRecordFromCompress({
      image: {
        id: originalImage.id,
        name: originalImage.name,
        originalPath: originalImage.originalPath,
        originalSize: originalImage.originalSize,
        originalWidth: originalImage.originalWidth,
        originalHeight: originalImage.originalHeight,
        format: originalImage.format
      },
      compressed: {
        path: data.compressedPath,
        name: originalImage.name.replace(/\.[^.]+$/, `_compressed.${data.compressedFormat}`),
        size: data.compressedSize,
        width: data.compressedWidth,
        height: data.compressedHeight,
        format: data.compressedFormat
      },
      options: getOptionsForImage(originalImage)
    })
  }
}

// 开始压缩
const startCompress = async () => {
  if (imageStore.isCompressing) {
    showToast('正在压缩中，请等待', 'info')
    return
  }

  // 获取待压缩的图片
  const pendingImages = imageStore.images.filter((img) => img.status === 'pending')

  if (pendingImages.length === 0) {
    if (imageStore.images.length === 0) {
      showToast('请先上传图片', 'error')
    } else {
      showToast('所有图片已压缩完成', 'info')
    }
    return
  }

  // 开始压缩
  imageStore.startCompressing(pendingImages.length)
  memoryPeak.value = 0
  memoryWarningShown.value = false

  // 注册进度监听
  const removeProgressListener = window.electronAPI.onCompressProgress((data) => {
    if (data.id === 'batch') {
      imageStore.updateBatchProgress(data.progress)
    } else {
      imageStore.setCurrentCompressImage(data.id)
      imageStore.updateImage(data.id, { progress: data.progress, status: 'compressing' })
    }
  })

  const removeMemoryListener = window.electronAPI.onCompressMemory((data) => {
    memoryPeak.value = Math.max(memoryPeak.value, data.rss)
    if (data.warning && !memoryWarningShown.value) {
      memoryWarningShown.value = true
      showToast(`内存占用较高：${formatMemory(data.rss)}，建议分批处理大图`, 'info')
    }
  })

  // 注册结果监听
  const removeResultListener = window.electronAPI.onCompressResult(async (data) => {
    await applyCompressResult(data)
    imageStore.finishOneCompress()
  })

  // 注册错误监听
  const removeErrorListener = window.electronAPI.onCompressError((data) => {
    if (data.error === '已取消' || data.error === '压缩已取消') {
      imageStore.updateImage(data.id, {
        status: 'pending',
        error: undefined,
        progress: 0
      })
      return
    }

    imageStore.updateImage(data.id, {
      status: 'error',
      error: data.error,
      progress: 0
    })
    imageStore.finishOneCompress()
    showToast(data.error, 'error')
  })

  try {
    let succeeded = false

    if (pendingImages.length === 1) {
      const options = getOptionsForImage(pendingImages[0])
      // 单张压缩
      const response = await window.electronAPI.compressImage({
        id: pendingImages[0].id,
        filePath: pendingImages[0].originalPath,
        quality: options.quality,
        outputFormat: options.outputFormat,
        scaleEnabled: options.scaleEnabled,
        scalePercent: options.scalePercent,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight
      })
      if (response.success && response.result) {
        const image = imageStore.images.find((img) => img.id === response.result?.id)
        if (image?.status !== 'done') {
          await applyCompressResult(response.result)
          imageStore.finishOneCompress()
        }
      }
      succeeded = response.success
    } else {
      // 批量压缩
      const response = await window.electronAPI.compressBatch({
        images: pendingImages.map((img) => ({
          id: img.id,
          filePath: img.originalPath,
          ...getOptionsForImage(img)
        })),
        quality: imageStore.compressOptions.quality,
        outputFormat: imageStore.compressOptions.outputFormat,
        scaleEnabled: imageStore.compressOptions.scaleEnabled,
        scalePercent: imageStore.compressOptions.scalePercent,
        maxWidth: imageStore.compressOptions.maxWidth,
        maxHeight: imageStore.compressOptions.maxHeight
      })
      for (const item of response.results) {
        if (!item.success || !item.result) continue
        const image = imageStore.images.find((img) => img.id === item.id)
        if (image?.status !== 'done') {
          await applyCompressResult(item.result)
          imageStore.finishOneCompress()
        }
      }
      succeeded = response.success && !response.canceled && response.results.every((result) => result.success)
    }

    if (succeeded) {
      showToast('压缩完成', 'success')
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : '压缩失败', 'error')
  } finally {
    removeProgressListener()
    removeMemoryListener()
    removeResultListener()
    removeErrorListener()
    if (imageStore.isCompressing) {
      imageStore.stopCompressing()
    }
  }
}

// 保存单张图片
const saveImage = async () => {
  if (imageStore.isCompressing) {
    showToast('压缩进行中，完成后再保存', 'info')
    return
  }

  if (!selectedImage.value || selectedImage.value.status !== 'done') {
    showToast('请先压缩图片', 'error')
    return
  }

  const defaultName = buildCompressedName(selectedImage.value.name, selectedImage.value.compressedFormat)
  const originalDir = getDirectoryName(selectedImage.value.originalPath)
  const filePath = await window.electronAPI.saveFileDialog({
    defaultPath: originalDir ? `${originalDir}/${defaultName}` : defaultName,
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'webp'] }
    ]
  })

  if (!filePath) return

  const result = await window.electronAPI.saveToPath(
    selectedImage.value.compressedPath!,
    filePath
  )

  if (result.success) {
    showToast(`已保存至 ${filePath}`, 'success')
  } else {
    showToast(result.error || '保存失败', 'error')
  }
}

// 批量导出
const batchExport = async () => {
  if (imageStore.isCompressing) {
    showToast('压缩进行中，完成后再导出', 'info')
    return
  }

  const doneImages = imageStore.images.filter((img) => img.status === 'done')

  if (doneImages.length === 0) {
    showToast('没有已压缩的图片', 'error')
    return
  }

  const folderPath = await window.electronAPI.selectFolderDialog()

  if (!folderPath) return

  let successCount = 0
  let failCount = 0
  isExporting.value = true
  exportProgress.value = { done: 0, total: doneImages.length, retry: 0 }

  for (const image of doneImages) {
    if (!image.compressedPath) continue

    const targetPath = `${folderPath}/${buildCompressedName(image.name, image.compressedFormat)}`
    let result = await window.electronAPI.saveToPath(image.compressedPath, targetPath, {
      avoidConflict: true
    })

    if (!result.success) {
      exportProgress.value.retry++
      result = await window.electronAPI.saveToPath(image.compressedPath, targetPath, {
        avoidConflict: true
      })
    }

    if (result.success) {
      successCount++
    } else {
      failCount++
    }

    exportProgress.value.done++
  }

  isExporting.value = false

  if (failCount === 0) {
    showToast(`已导出 ${successCount} 张图片`, 'success')
  } else if (successCount === 0) {
    showToast(`导出失败：全部 ${failCount} 张图片导出失败`, 'error')
  } else {
    showToast(`导出完成：成功 ${successCount} 张，失败 ${failCount} 张`, 'info')
  }
}
</script>

<template>
  <div class="px-[18px] py-3.5 border-t border-surface-100 flex-shrink-0 flex flex-col gap-2">
    <!-- Primary Action -->
    <button
      class="btn btn-primary w-full flex items-center justify-center gap-2"
      :disabled="imageStore.isCompressing || !hasPendingImages"
      @click="startCompress"
    >
      <template v-if="imageStore.isCompressing">
        <div class="spinner"></div>
        <span>压缩中...</span>
      </template>
      <template v-else>
        <span>⚡</span>
        <span>开始压缩</span>
      </template>
    </button>

    <!-- Secondary Actions -->
    <div class="flex gap-2">
      <button
        class="btn btn-secondary flex-1 text-xs"
        :disabled="!canSaveSelectedImage"
        @click="saveImage"
      >
        <span>📥</span>
        <span>保存</span>
      </button>
      <button
        class="btn btn-secondary flex-1 text-xs"
        :disabled="!canExportDoneImages"
        @click="batchExport"
      >
        <template v-if="isExporting">
          <div class="spinner"></div>
          <span>{{ exportProgress.done }}/{{ exportProgress.total }}</span>
        </template>
        <template v-else>
          <span>📦</span>
          <span>导出全部</span>
        </template>
      </button>
    </div>

    <!-- Hint -->
    <div class="text-[10px] text-surface-400 text-center">
      <span v-if="isExporting">
        正在导出，已重试 {{ exportProgress.retry }} 次
      </span>
      <span v-else-if="memoryPeak > 0">
        本轮内存高水位 {{ formatMemory(memoryPeak) }}
      </span>
      <span v-else>压缩过程完全本地执行，不上传任何数据</span>
    </div>
  </div>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  outline: none;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-primary {
  background: #0ea5e9;
  color: #fff;
  box-shadow: 0 1px 3px rgba(14, 165, 233, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: #0284c7;
  box-shadow: 0 3px 8px rgba(14, 165, 233, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.97);
}

.btn-primary:disabled {
  background: #bae6fd;
  color: #7dd3fc;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-secondary {
  background: #fff;
  color: #1c1c1e;
  border: 1.5px solid #eaeaec;
}

.btn-secondary:hover:not(:disabled) {
  border-color: #0ea5e9;
  color: #0ea5e9;
}

.btn-secondary:disabled {
  color: #b5b5b6;
  border-color: #eaeaec;
  cursor: not-allowed;
}
</style>
