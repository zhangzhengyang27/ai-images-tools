import { ipcMain, dialog, BrowserWindow, shell } from 'electron/main'
import type { WebContents } from 'electron/main'
import * as fs from 'fs/promises'
import * as path from 'path'
import { compressImage, getImageMetadata, cleanupTempFiles, cancelCompression } from '../services/imageCompress'
import {
  loadHistory,
  addHistoryRecord,
  deleteHistoryRecord,
  clearHistory,
  exportHistory,
  importHistory,
  type HistoryRecord
} from '../services/historyService'

// 取消标志
let cancelRequested = false
let activeCompressTaskId: string | null = null

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'])
const MEMORY_WARNING_BYTES = 500 * 1024 * 1024

interface CompressResultPayload {
  id: string
  compressedPath: string
  compressedSize: number
  compressedWidth: number
  compressedHeight: number
  compressedFormat: string
  savedPercent: number
}

function getMemorySnapshot() {
  const usage = process.memoryUsage()
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
    warning: usage.rss >= MEMORY_WARNING_BYTES
  }
}

function sendMemoryUsage(sender: WebContents, phase: string, id?: string) {
  const snapshot = getMemorySnapshot()
  sender.send('compress:memory', { id, phase, ...snapshot })
}

async function collectImagePaths(inputPaths: string[]): Promise<string[]> {
  const result: string[] = []

  async function visit(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath)
      if (stats.isDirectory()) {
        const entries = await fs.readdir(filePath)
        await Promise.all(entries.map((entry) => visit(path.join(filePath, entry))))
        return
      }

      if (stats.isFile() && IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
        result.push(filePath)
      }
    } catch {
      // 忽略无法访问的拖拽路径或目录项
    }
  }

  await Promise.all(inputPaths.map((filePath) => visit(filePath)))
  return Array.from(new Set(result)).sort((a, b) => a.localeCompare(b))
}

async function getAvailablePath(targetPath: string): Promise<string> {
  const parsed = path.parse(targetPath)
  let candidate = targetPath
  let index = 1

  while (true) {
    try {
      await fs.access(candidate)
      candidate = path.join(parsed.dir, `${parsed.name}_${index}${parsed.ext}`)
      index += 1
    } catch {
      return candidate
    }
  }
}

export function registerIpcHandlers(): void {
  // 窗口控制
  ipcMain.on('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  // 打开文件对话框
  ipcMain.handle('file:open-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif']
        }
      ]
    })
    return result.filePaths
  })

  // 选择图片文件夹
  ipcMain.handle('file:open-image-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择图片文件夹'
    })
    if (result.canceled || result.filePaths.length === 0) {
      return []
    }
    return collectImagePaths(result.filePaths)
  })

  // 解析拖拽路径，目录会展开为图片文件
  ipcMain.handle('file:resolve-image-paths', async (_event, paths: string[]) => {
    return collectImagePaths(paths)
  })

  // 保存文件对话框
  ipcMain.handle(
    'file:save-dialog',
    async (_event, options: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) => {
      const result = await dialog.showSaveDialog({
        defaultPath: options.defaultPath,
        filters: options.filters || [{ name: 'Images', extensions: ['jpg', 'png', 'webp'] }]
      })
      return result.filePath
    }
  )

  // 选择文件夹对话框
  ipcMain.handle('file:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.filePaths[0] || null
  })

  // 读取图片信息
  ipcMain.handle('file:read-image-info', async (_event, filePath: string) => {
    try {
      const metadata = await getImageMetadata(filePath)
      const stats = await fs.stat(filePath)
      return {
        success: true,
        data: {
          ...metadata,
          size: stats.size,
          path: filePath,
          name: path.basename(filePath)
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '读取图片信息失败'
      }
    }
  })

  // 保存文件到指定路径
  ipcMain.handle(
    'file:save-to-path',
    async (_event, sourcePath: string, targetPath: string, options?: { avoidConflict?: boolean }) => {
      try {
        const finalPath = options?.avoidConflict ? await getAvailablePath(targetPath) : targetPath
        await fs.copyFile(sourcePath, finalPath)
        return { success: true, path: finalPath }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '保存文件失败'
        }
      }
    }
  )

  // 判断文件是否存在
  ipcMain.handle('file:exists', async (_event, filePath: string) => {
    try {
      await fs.access(filePath)
      return { success: true, exists: true }
    } catch {
      return { success: true, exists: false }
    }
  })

  // 使用系统默认应用打开文件或在 Finder/Explorer 中定位
  ipcMain.handle('file:open-path', async (_event, filePath: string) => {
    try {
      const error = await shell.openPath(filePath)
      if (error) {
        return { success: false, error }
      }
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '打开文件失败'
      }
    }
  })

  // 单张图片压缩
  ipcMain.handle(
    'compress:start',
    async (
      event,
      options: {
        id: string
        filePath: string
        quality: number
        outputFormat: 'origin' | 'jpg' | 'png' | 'webp'
        scaleEnabled?: boolean
        scalePercent?: number
        maxWidth?: number
        maxHeight?: number
      }
    ) => {
      try {
        cancelRequested = false
        activeCompressTaskId = options.id

        // 获取原始文件大小
        const originalStats = await fs.stat(options.filePath)
        const originalSize = originalStats.size
        sendMemoryUsage(event.sender, 'before', options.id)

        // 执行压缩
        const result = await compressImage(
          options.filePath,
          {
            quality: options.quality,
            outputFormat: options.outputFormat,
            scaleEnabled: options.scaleEnabled,
            scalePercent: options.scalePercent,
            maxWidth: options.maxWidth,
            maxHeight: options.maxHeight
          },
          (progress) => {
            if (!cancelRequested) {
              event.sender.send('compress:progress', { id: options.id, progress })
            }
          },
          options.id
        )
        sendMemoryUsage(event.sender, 'after', options.id)

        if (cancelRequested) {
          return { success: false, error: '已取消' }
        }

        // 计算节省比例
        const savedPercent = originalSize > 0
          ? Math.round(((originalSize - result.size) / originalSize) * 100)
          : 0

        const payload: CompressResultPayload = {
          id: options.id,
          compressedPath: result.outputPath,
          compressedSize: result.size,
          compressedWidth: result.width,
          compressedHeight: result.height,
          compressedFormat: result.format,
          savedPercent
        }

        event.sender.send('compress:result', payload)
        return { success: true, result: payload }
      } catch (error) {
        event.sender.send('compress:error', {
          id: options.id,
          error: error instanceof Error ? error.message : '压缩失败'
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : '压缩失败'
        }
      } finally {
        activeCompressTaskId = null
      }
    }
  )

  // 批量压缩
  ipcMain.handle(
    'compress:batch',
    async (
      event,
      options: {
        images: Array<{
          id: string
          filePath: string
          quality?: number
          outputFormat?: 'origin' | 'jpg' | 'png' | 'webp'
          scaleEnabled?: boolean
          scalePercent?: number
          maxWidth?: number
          maxHeight?: number
        }>
        quality: number
        outputFormat: 'origin' | 'jpg' | 'png' | 'webp'
        scaleEnabled?: boolean
        scalePercent?: number
        maxWidth?: number
        maxHeight?: number
      }
    ) => {
      cancelRequested = false
      activeCompressTaskId = null
      const results: Array<{ id: string; success: boolean; error?: string; result?: CompressResultPayload }> = []

      for (let i = 0; i < options.images.length; i++) {
        if (cancelRequested) {
          break
        }

        const image = options.images[i]
        const compressOptions = {
          quality: image.quality ?? options.quality,
          outputFormat: image.outputFormat ?? options.outputFormat,
          scaleEnabled: image.scaleEnabled ?? options.scaleEnabled,
          scalePercent: image.scalePercent ?? options.scalePercent,
          maxWidth: image.maxWidth ?? options.maxWidth,
          maxHeight: image.maxHeight ?? options.maxHeight
        }

        try {
          // 获取原始文件大小
          const originalStats = await fs.stat(image.filePath)
          const originalSize = originalStats.size
          activeCompressTaskId = image.id
          sendMemoryUsage(event.sender, 'before', image.id)
          event.sender.send('compress:progress', { id: image.id, progress: 0 })

          // 执行压缩
          const result = await compressImage(
            image.filePath,
            compressOptions,
            (progress) => {
              if (!cancelRequested) {
                const totalProgress = Math.round(((i + progress / 100) / options.images.length) * 100)
                event.sender.send('compress:progress', { id: 'batch', progress: totalProgress })
              }
            },
            image.id
          )
          sendMemoryUsage(event.sender, 'after', image.id)
          if (cancelRequested) {
            results.push({ id: image.id, success: false, error: '已取消' })
            activeCompressTaskId = null
            break
          }

          // 计算节省比例
          const savedPercent = originalSize > 0
            ? Math.round(((originalSize - result.size) / originalSize) * 100)
            : 0

          const payload: CompressResultPayload = {
            id: image.id,
            compressedPath: result.outputPath,
            compressedSize: result.size,
            compressedWidth: result.width,
            compressedHeight: result.height,
            compressedFormat: result.format,
            savedPercent
          }

          event.sender.send('compress:result', payload)
          results.push({ id: image.id, success: true, result: payload })
          activeCompressTaskId = null
        } catch (error) {
          const errorMessage = cancelRequested ? '已取消' : error instanceof Error ? error.message : '压缩失败'
          activeCompressTaskId = null
          event.sender.send('compress:error', {
            id: image.id,
            error: errorMessage
          })
          results.push({
            id: image.id,
            success: false,
            error: errorMessage
          })
          if (cancelRequested) {
            break
          }
        }
      }

      return { success: !cancelRequested, canceled: cancelRequested, results }
    }
  )

  // 取消压缩
  ipcMain.handle('compress:cancel', () => {
    cancelRequested = true
    cancelCompression(activeCompressTaskId || undefined)
    return { success: true }
  })

  // ─── 历史记录 IPC ───

  // 加载历史记录
  ipcMain.handle('history:load', async () => {
    try {
      const records = await loadHistory()
      return { success: true, records }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '加载历史失败',
        records: []
      }
    }
  })

  // 添加历史记录
  ipcMain.handle('history:add', async (_event, record: HistoryRecord) => {
    try {
      await addHistoryRecord(record)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加历史失败'
      }
    }
  })

  // 删除单条历史记录
  ipcMain.handle('history:delete', async (_event, id: string) => {
    try {
      await deleteHistoryRecord(id)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除历史失败'
      }
    }
  })

  // 清空全部历史记录
  ipcMain.handle('history:clear', async () => {
    try {
      await clearHistory()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '清空历史失败'
      }
    }
  })

  // 导出历史记录
  ipcMain.handle('history:export', async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出历史记录',
        defaultPath: `compress-history-${Date.now()}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (result.canceled || !result.filePath) {
        return { success: false, error: '已取消' }
      }
      await exportHistory(result.filePath)
      return { success: true, exportedPath: result.filePath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败'
      }
    }
  })

  // 导入历史记录
  ipcMain.handle('history:import', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '导入历史记录',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '已取消' }
      }
      const { count } = await importHistory(result.filePaths[0])
      return { success: true, count }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导入失败'
      }
    }
  })
}

// 应用退出时清理临时文件
export async function cleanup(): Promise<void> {
  await cleanupTempFiles()
}
