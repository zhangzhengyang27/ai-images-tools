<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'

const imageStore = useImageStore()
const { showToast } = useToast()

const isCompressing = ref(false)

// 检查是否有待压缩的图片
const hasPendingImages = computed(() => imageStore.pendingCount > 0)
const hasDoneImages = computed(() => imageStore.doneCount > 0)
const selectedImage = computed(() => imageStore.selectedImage)

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

  // 注册进度监听
  const removeProgressListener = window.electronAPI.onCompressProgress((data) => {
    if (data.id === 'batch') {
      imageStore.updateBatchProgress(data.progress)
    } else {
      imageStore.updateImage(data.id, { progress: data.progress, status: 'compressing' })
    }
  })

  // 注册结果监听
  const removeResultListener = window.electronAPI.onCompressResult((data) => {
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
    imageStore.finishOneCompress()
  })

  // 注册错误监听
  const removeErrorListener = window.electronAPI.onCompressError((data) => {
    imageStore.updateImage(data.id, {
      status: 'error',
      error: data.error,
      progress: 0
    })
    imageStore.finishOneCompress()
    showToast(data.error, 'error')
  })

  try {
    if (pendingImages.length === 1) {
      // 单张压缩
      await window.electronAPI.compressImage({
        id: pendingImages[0].id,
        filePath: pendingImages[0].originalPath,
        quality: imageStore.compressOptions.quality,
        outputFormat: imageStore.compressOptions.outputFormat,
        maxWidth: imageStore.compressOptions.maxWidth,
        maxHeight: imageStore.compressOptions.maxHeight
      })
    } else {
      // 批量压缩
      await window.electronAPI.compressBatch({
        images: pendingImages.map((img) => ({
          id: img.id,
          filePath: img.originalPath
        })),
        quality: imageStore.compressOptions.quality,
        outputFormat: imageStore.compressOptions.outputFormat,
        maxWidth: imageStore.compressOptions.maxWidth,
        maxHeight: imageStore.compressOptions.maxHeight
      })
    }

    showToast('压缩完成', 'success')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '压缩失败', 'error')
  } finally {
    removeProgressListener()
    removeResultListener()
    removeErrorListener()
    imageStore.stopCompressing()
  }
}

// 保存单张图片
const saveImage = async () => {
  if (!selectedImage.value || selectedImage.value.status !== 'done') {
    showToast('请先压缩图片', 'error')
    return
  }

  const defaultName = selectedImage.value.name.replace(/\.[^.]+$/, '_compressed')
  const filePath = await window.electronAPI.saveFileDialog({
    defaultPath: defaultName,
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
  const doneImages = imageStore.images.filter((img) => img.status === 'done')

  if (doneImages.length === 0) {
    showToast('没有已压缩的图片', 'error')
    return
  }

  const folderPath = await window.electronAPI.selectFolderDialog()

  if (!folderPath) return

  let successCount = 0
  let failCount = 0

  for (const image of doneImages) {
    if (!image.compressedPath) continue

    const targetPath = `${folderPath}/${image.name.replace(/\.[^.]+$/, `_compressed.${image.compressedFormat || 'jpg'}`)}`
    const result = await window.electronAPI.saveToPath(image.compressedPath, targetPath)

    if (result.success) {
      successCount++
    } else {
      failCount++
    }
  }

  if (failCount === 0) {
    showToast(`已导出 ${successCount} 张图片`, 'success')
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
        :disabled="!selectedImage || selectedImage.status !== 'done'"
        @click="saveImage"
      >
        <span>📥</span>
        <span>保存</span>
      </button>
      <button
        class="btn btn-secondary flex-1 text-xs"
        :disabled="!hasDoneImages"
        @click="batchExport"
      >
        <span>📦</span>
        <span>导出全部</span>
      </button>
    </div>

    <!-- Hint -->
    <div class="text-[10px] text-surface-400 text-center">
      压缩过程完全本地执行，不上传任何数据
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