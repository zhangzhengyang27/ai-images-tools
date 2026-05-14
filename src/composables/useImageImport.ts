import { useImageStore } from '@/stores/imageStore'
import { useToast } from '@/composables/useToast'
import type { ImageItem } from '@/types'

const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif']
const MAX_FILE_SIZE = 100 * 1024 * 1024

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2)

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const getFileName = (filePath: string) => filePath.split(/[\\/]/).pop() || filePath

const validatePath = async (filePath: string): Promise<{ valid: boolean; error?: string }> => {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return { valid: false, error: `不支持的格式: ${ext || getFileName(filePath)}` }
  }

  const result = await window.electronAPI.getImageInfo(filePath)
  if (!result.success || !result.data) {
    return { valid: false, error: `读取 ${getFileName(filePath)} 失败: ${result.error || '图片信息不可用'}` }
  }

  if (result.data.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件过大: ${formatFileSize(result.data.size)}，最大支持 100MB`
    }
  }

  return { valid: true }
}

export function useImageImport() {
  const imageStore = useImageStore()
  const { showToast } = useToast()

  async function addImagePaths(paths: string[]) {
    if (paths.length === 0) return

    const uniquePaths = Array.from(new Set(paths))
    const existingPaths = new Set(imageStore.images.map((image) => image.originalPath))
    const images: ImageItem[] = []
    const errors: string[] = []
    let skippedCount = 0

    for (const filePath of uniquePaths) {
      if (existingPaths.has(filePath)) {
        skippedCount += 1
        continue
      }

      const validation = await validatePath(filePath)
      if (!validation.valid) {
        errors.push(validation.error || `${getFileName(filePath)} 验证失败`)
        continue
      }

      const result = await window.electronAPI.getImageInfo(filePath)
      if (!result.success || !result.data) {
        errors.push(`读取 ${getFileName(filePath)} 失败: ${result.error || '图片信息不可用'}`)
        continue
      }

      images.push({
        id: generateId(),
        name: result.data.name,
        originalPath: result.data.path,
        originalSize: result.data.size,
        originalWidth: result.data.width,
        originalHeight: result.data.height,
        format: result.data.format,
        status: 'pending'
      })
    }

    if (images.length > 0) {
      imageStore.addImages(images)
      showToast(`已添加 ${images.length} 张图片`, 'success')
    }

    if (skippedCount > 0 && images.length === 0) {
      showToast(`已跳过 ${skippedCount} 张重复图片`, 'info')
    }

    if (errors.length > 0) {
      showToast(errors[0], 'error')
    }
  }

  async function openImages() {
    const paths = await window.electronAPI.openFileDialog()
    await addImagePaths(paths)
  }

  async function openImageFolder() {
    const paths = await window.electronAPI.openImageFolderDialog()
    await addImagePaths(paths)
  }

  async function addDroppedItems(items: DataTransferItemList | undefined, fallbackFiles: FileList | undefined) {
    const paths: string[] = []

    if (items) {
      for (const item of Array.from(items)) {
        const entry = item.webkitGetAsEntry?.()
        const file = item.getAsFile()
        const path = file?.path

        if (entry && path) {
          paths.push(path)
        } else if (path) {
          paths.push(path)
        }
      }
    }

    if (paths.length === 0 && fallbackFiles) {
      for (const file of Array.from(fallbackFiles)) {
        if (file.path) paths.push(file.path)
      }
    }

    const resolved = await window.electronAPI.resolveImagePaths(paths)
    await addImagePaths(resolved)
  }

  return {
    addImagePaths,
    openImages,
    openImageFolder,
    addDroppedItems
  }
}
