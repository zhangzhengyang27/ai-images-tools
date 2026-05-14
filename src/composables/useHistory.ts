import { ref } from 'vue'
import { useHistoryStore } from '@/stores/historyStore'
import { useImageStore } from '@/stores/imageStore'
import type { HistoryRecord, HistoryReplayResult, OutputFormat } from '@/types'

export function useHistory() {
  const historyStore = useHistoryStore()
  const imageStore = useImageStore()
  const isInitialized = ref(false)

  // 应用启动时加载历史记录
  async function loadHistory() {
    historyStore.isLoading = true
    try {
      const result = await window.electronAPI.loadHistory()
      if (result.success && result.records) {
        historyStore.setRecords(result.records)
      }
    } catch (error) {
      console.error('[useHistory] Failed to load history:', error)
    } finally {
      historyStore.isLoading = false
    }
    isInitialized.value = true
  }

  // 压缩完成后自动追加记录
  async function addRecordFromCompress(params: {
    image: {
      id: string
      name: string
      originalPath: string
      originalSize: number
      originalWidth: number
      originalHeight: number
      format: string
    }
    compressed: {
      path: string
      name: string
      size: number
      width?: number
      height?: number
      format?: string
    }
    options: {
      quality: number
      outputFormat: OutputFormat
      scaleEnabled?: boolean
      scalePercent?: number
      maxWidth?: number
      maxHeight?: number
    }
  }) {
    const { image, compressed, options } = params
    const savedBytes = Math.max(0, image.originalSize - compressed.size)
    const savedPercent = image.originalSize > 0
      ? Math.round((savedBytes / image.originalSize) * 100)
      : 0

    const record: HistoryRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      originalPath: image.originalPath,
      originalName: image.name,
      originalSize: image.originalSize,
      originalWidth: image.originalWidth,
      originalHeight: image.originalHeight,
      originalFormat: image.format,
      compressedPath: compressed.path,
      compressedName: compressed.name,
      compressedSize: compressed.size,
      compressedWidth: compressed.width,
      compressedHeight: compressed.height,
      compressedFormat: compressed.format,
      quality: options.quality,
      outputFormat: options.outputFormat,
      scaleEnabled: options.scaleEnabled,
      scalePercent: options.scalePercent,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      savedBytes,
      savedPercent
    }

    // 乐观更新前端 Store
    historyStore.addRecord(record)

    // 持久化到主进程，失败时回滚
    try {
      const result = await window.electronAPI.addHistory(record)
      if (!result.success) {
        // 持久化失败，回滚前端记录
        historyStore.removeRecord(record.id)
        console.warn('[useHistory] Persist failed, rolled back:', result.error)
      }
    } catch (error) {
      // 持久化失败，回滚前端记录
      historyStore.removeRecord(record.id)
      console.error('[useHistory] Failed to persist history record:', error)
    }
  }

  // 删除单条
  async function deleteRecord(id: string) {
    historyStore.removeRecord(id)
    try {
      await window.electronAPI.deleteHistory(id)
    } catch (error) {
      console.error('[useHistory] Failed to delete history record:', error)
    }
  }

  // 清空全部
  async function clearAll() {
    historyStore.clearAll()
    try {
      await window.electronAPI.clearHistory()
    } catch (error) {
      console.error('[useHistory] Failed to clear history:', error)
    }
  }

  // 导出
  async function exportHistory() {
    const result = await window.electronAPI.exportHistory()
    return result
  }

  // 导入
  async function importHistory() {
    const result = await window.electronAPI.importHistory()
    if (result.success && result.count !== undefined) {
      // 重新加载以获取合并后的完整列表
      await loadHistory()
    }
    return result
  }

  async function ensureFileAvailable(filePath: string, typeLabel: string) {
    if (!window.electronAPI.fileExists) {
      return { success: false, error: `缺少 ${typeLabel}校验 API` }
    }

    const result = await window.electronAPI.fileExists(filePath)
    if (!result.success) {
      return { success: false, error: result.error || `${typeLabel}校验失败` }
    }

    if (!result.exists) {
      return { success: false, error: `${typeLabel}不存在或已被移除` }
    }

    return { success: true }
  }

  async function openCompressedResult(record: HistoryRecord) {
    if (!window.electronAPI.openPath) {
      return { success: false, error: '缺少 openPath API' }
    }

    const existsResult = await ensureFileAvailable(record.compressedPath, '压缩结果文件')
    if (!existsResult.success) {
      return existsResult
    }

    return window.electronAPI.openPath(record.compressedPath)
  }

  async function replayRecord(record: HistoryRecord): Promise<HistoryReplayResult> {
    const existsResult = await ensureFileAvailable(record.originalPath, '原图文件')
    if (!existsResult.success) {
      return { success: false, reused: false, error: existsResult.error }
    }

    imageStore.updateCompressOptions({
      quality: record.quality,
      outputFormat: record.outputFormat,
      scaleEnabled: record.scaleEnabled,
      scalePercent: record.scalePercent,
      maxWidth: record.maxWidth,
      maxHeight: record.maxHeight
    })

    const upsertResult = imageStore.upsertImageFromHistory(record)
    historyStore.closeDrawer()

    return {
      success: true,
      reused: upsertResult.reused
    }
  }

  return {
    isInitialized,
    loadHistory,
    addRecordFromCompress,
    deleteRecord,
    clearAll,
    exportHistory,
    importHistory,
    openCompressedResult,
    replayRecord
  }
}
