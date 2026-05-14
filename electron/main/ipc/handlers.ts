import { ipcMain, dialog, BrowserWindow } from 'electron/main'
import * as fs from 'fs/promises'
import * as path from 'path'
import { compressImage, getImageMetadata, cleanupTempFiles } from '../services/imageCompress'

// 取消标志
let cancelRequested = false

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
  ipcMain.handle('file:save-to-path', async (_event, sourcePath: string, targetPath: string) => {
    try {
      await fs.copyFile(sourcePath, targetPath)
      return { success: true, path: targetPath }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存文件失败'
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
        maxWidth?: number
        maxHeight?: number
      }
    ) => {
      try {
        cancelRequested = false

        // 获取原始文件大小
        const originalStats = await fs.stat(options.filePath)
        const originalSize = originalStats.size

        // 执行压缩
        const result = await compressImage(
          options.filePath,
          {
            quality: options.quality,
            outputFormat: options.outputFormat,
            maxWidth: options.maxWidth,
            maxHeight: options.maxHeight
          },
          (progress) => {
            if (!cancelRequested) {
              event.sender.send('compress:progress', { id: options.id, progress })
            }
          }
        )

        if (cancelRequested) {
          return { success: false, error: '已取消' }
        }

        // 计算节省比例
        const savedPercent = Math.round(((originalSize - result.size) / originalSize) * 100)

        // 发送结果
        event.sender.send('compress:result', {
          id: options.id,
          compressedPath: result.outputPath,
          compressedSize: result.size,
          compressedWidth: result.width,
          compressedHeight: result.height,
          compressedFormat: result.format,
          savedPercent
        })

        return { success: true }
      } catch (error) {
        event.sender.send('compress:error', {
          id: options.id,
          error: error instanceof Error ? error.message : '压缩失败'
        })
        return {
          success: false,
          error: error instanceof Error ? error.message : '压缩失败'
        }
      }
    }
  )

  // 批量压缩
  ipcMain.handle(
    'compress:batch',
    async (
      event,
      options: {
        images: Array<{ id: string; filePath: string }>
        quality: number
        outputFormat: 'origin' | 'jpg' | 'png' | 'webp'
        maxWidth?: number
        maxHeight?: number
      }
    ) => {
      cancelRequested = false
      const results: Array<{ id: string; success: boolean; error?: string }> = []

      for (let i = 0; i < options.images.length; i++) {
        if (cancelRequested) {
          break
        }

        const image = options.images[i]

        try {
          // 获取原始文件大小
          const originalStats = await fs.stat(image.filePath)
          const originalSize = originalStats.size

          // 执行压缩
          const result = await compressImage(
            image.filePath,
            {
              quality: options.quality,
              outputFormat: options.outputFormat,
              maxWidth: options.maxWidth,
              maxHeight: options.maxHeight
            },
            (progress) => {
              if (!cancelRequested) {
                const totalProgress = Math.round(((i + progress / 100) / options.images.length) * 100)
                event.sender.send('compress:progress', { id: 'batch', progress: totalProgress })
              }
            }
          )

          if (cancelRequested) {
            results.push({ id: image.id, success: false, error: '已取消' })
            break
          }

          // 计算节省比例
          const savedPercent = Math.round(((originalSize - result.size) / originalSize) * 100)

          // 发送单张结果
          event.sender.send('compress:result', {
            id: image.id,
            compressedPath: result.outputPath,
            compressedSize: result.size,
            compressedWidth: result.width,
            compressedHeight: result.height,
            compressedFormat: result.format,
            savedPercent
          })

          results.push({ id: image.id, success: true })
        } catch (error) {
          event.sender.send('compress:error', {
            id: image.id,
            error: error instanceof Error ? error.message : '压缩失败'
          })
          results.push({
            id: image.id,
            success: false,
            error: error instanceof Error ? error.message : '压缩失败'
          })
        }
      }

      return { success: true, results }
    }
  )

  // 取消压缩
  ipcMain.handle('compress:cancel', () => {
    cancelRequested = true
    return { success: true }
  })
}

// 应用退出时清理临时文件
export async function cleanup(): Promise<void> {
  await cleanupTempFiles()
}
