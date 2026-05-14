import { contextBridge, ipcRenderer } from 'electron/renderer'

// 暴露给渲染进程的 API
const electronAPI = {
  // 窗口控制
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // 文件对话框
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  saveFileDialog: (options: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
    ipcRenderer.invoke('file:save-dialog', options),
  selectFolderDialog: () => ipcRenderer.invoke('file:select-folder'),

  // 图片信息
  getImageInfo: (filePath: string) => ipcRenderer.invoke('file:read-image-info', filePath),

  // 压缩操作
  compressImage: (options: {
    id: string
    filePath: string
    quality: number
    outputFormat: 'origin' | 'jpg' | 'png' | 'webp'
    maxWidth?: number
    maxHeight?: number
  }) => ipcRenderer.invoke('compress:start', options),

  compressBatch: (options: {
    images: Array<{ id: string; filePath: string }>
    quality: number
    outputFormat: 'origin' | 'jpg' | 'png' | 'webp'
    maxWidth?: number
    maxHeight?: number
  }) => ipcRenderer.invoke('compress:batch', options),

  cancelCompress: () => ipcRenderer.invoke('compress:cancel'),

  // 保存文件
  saveToPath: (compressedPath: string, targetPath: string) =>
    ipcRenderer.invoke('file:save-to-path', compressedPath, targetPath),

  // 进度监听
  onCompressProgress: (callback: (data: { id: string; progress: number }) => void) => {
    const handler = (_: unknown, data: { id: string; progress: number }) => callback(data)
    ipcRenderer.on('compress:progress', handler)
    return () => ipcRenderer.removeListener('compress:progress', handler)
  },

  // 结果监听
  onCompressResult: (
    callback: (data: {
      id: string
      compressedPath: string
      compressedSize: number
      compressedWidth: number
      compressedHeight: number
      compressedFormat: string
      savedPercent: number
    }) => void
  ) => {
    const handler = (
      _: unknown,
      data: {
        id: string
        compressedPath: string
        compressedSize: number
        compressedWidth: number
        compressedHeight: number
        compressedFormat: string
        savedPercent: number
      }
    ) => callback(data)
    ipcRenderer.on('compress:result', handler)
    return () => ipcRenderer.removeListener('compress:result', handler)
  },

  // 错误监听
  onCompressError: (callback: (data: { id: string; error: string }) => void) => {
    const handler = (_: unknown, data: { id: string; error: string }) => callback(data)
    ipcRenderer.on('compress:error', handler)
    return () => ipcRenderer.removeListener('compress:error', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
