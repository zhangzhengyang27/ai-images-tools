<script setup lang="ts">
import { ref } from 'vue'
import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'

const emit = defineEmits<{
  (e: 'images-added', images: any[]): void
}>()

const imageStore = useImageStore()
const { showToast } = useToast()

const isDragOver = ref(false)

// 支持的格式
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// 生成唯一 ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// 验证文件
const validateFile = (file: File): { valid: boolean; error?: string } => {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return { valid: false, error: `不支持的格式: ${ext}` }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `文件过大: ${formatFileSize(file.size)}，最大支持 100MB` }
  }
  return { valid: true }
}

// 处理文件
const handleFiles = async (files: FileList | File[]) => {
  const validFiles: File[] = []
  const errors: string[] = []

  for (const file of files) {
    const validation = validateFile(file)
    if (validation.valid) {
      validFiles.push(file)
    } else {
      errors.push(validation.error || `${file.name} 验证失败`)
    }
  }

  if (errors.length > 0) {
    showToast(errors[0], 'error')
  }

  if (validFiles.length === 0) return

  // 获取图片信息
  const images = await Promise.all(
    validFiles.map(async (file) => {
      const id = generateId()
      const result = await window.electronAPI.getImageInfo(file.path)

      if (!result.success) {
        showToast(`读取 ${file.name} 失败: ${result.error}`, 'error')
        return null
      }

      return {
        id,
        name: result.data!.name,
        originalPath: result.data!.path,
        originalSize: result.data!.size,
        originalWidth: result.data!.width,
        originalHeight: result.data!.height,
        format: result.data!.format,
        status: 'pending' as const
      }
    })
  )

  const validImages = images.filter((img) => img !== null)
  if (validImages.length > 0) {
    emit('images-added', validImages)
    showToast(`已添加 ${validImages.length} 张图片`, 'success')
  }
}

// 点击上传
const handleClick = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = 'image/*'
  input.onchange = (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files) {
      handleFiles(files)
    }
  }
  input.click()
}

// 拖拽事件
const handleDragEnter = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFiles(files)
  }
}
</script>

<template>
  <div
    class="upload-zone"
    :class="{ 'drag-over': isDragOver }"
    @click="handleClick"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div class="upload-zone__icon">📁</div>
    <div class="upload-zone__title">点击上传图片</div>
    <div class="upload-zone__hint">或拖拽文件到此处</div>
    <div class="upload-zone__hint mt-1 text-[11px] text-surface-400">
      支持 JPG · PNG · WebP · BMP · GIF
    </div>
  </div>
</template>