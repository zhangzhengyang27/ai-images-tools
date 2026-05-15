import { contextBridge, ipcRenderer } from 'electron/renderer'

// 暴露给渲染进程的 API
const electronAPI = {
  // 窗口控制
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // 文件对话框
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  openImageFolderDialog: () => ipcRenderer.invoke('file:open-image-folder-dialog'),
  resolveImagePaths: (paths: string[]) => ipcRenderer.invoke('file:resolve-image-paths', paths),
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
    scaleEnabled?: boolean
    scalePercent?: number
    maxWidth?: number
    maxHeight?: number
  }) => ipcRenderer.invoke('compress:start', options),

  compressBatch: (options: {
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
  }) => ipcRenderer.invoke('compress:batch', options),

  cancelCompress: () => ipcRenderer.invoke('compress:cancel'),

  // 保存文件
  saveToPath: (compressedPath: string, targetPath: string, options?: { avoidConflict?: boolean }) =>
    ipcRenderer.invoke('file:save-to-path', compressedPath, targetPath, options),
  fileExists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
  openPath: (filePath: string) => ipcRenderer.invoke('file:open-path', filePath),

  // 进度监听
  onCompressProgress: (callback: (data: { id: string; progress: number }) => void) => {
    const handler = (_: unknown, data: { id: string; progress: number }) => callback(data)
    ipcRenderer.on('compress:progress', handler)
    return () => ipcRenderer.removeListener('compress:progress', handler)
  },

  onCompressMemory: (
    callback: (data: {
      id?: string
      phase: string
      rss: number
      heapUsed: number
      external: number
      arrayBuffers: number
      warning: boolean
    }) => void
  ) => {
    const handler = (
      _: unknown,
      data: {
        id?: string
        phase: string
        rss: number
        heapUsed: number
        external: number
        arrayBuffers: number
        warning: boolean
      }
    ) => callback(data)
    ipcRenderer.on('compress:memory', handler)
    return () => ipcRenderer.removeListener('compress:memory', handler)
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
  },

  // 历史记录
  loadHistory: () => ipcRenderer.invoke('history:load'),
  addHistory: (record: unknown) => ipcRenderer.invoke('history:add', record),
  deleteHistory: (id: string) => ipcRenderer.invoke('history:delete', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  exportHistory: () => ipcRenderer.invoke('history:export'),
  importHistory: () => ipcRenderer.invoke('history:import'),

  // 自动更新
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string; releaseName?: string }) => void) => {
    const handler = (_: unknown, info: { version: string; releaseNotes?: string; releaseName?: string }) => callback(info)
    ipcRenderer.on('updater:available', handler)
    return () => ipcRenderer.removeListener('updater:available', handler)
  },
  onUpdateNotAvailable: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('updater:not-available', handler)
    return () => ipcRenderer.removeListener('updater:not-available', handler)
  },
  onUpdateProgress: (callback: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
    const handler = (_: unknown, data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => callback(data)
    ipcRenderer.on('updater:progress', handler)
    return () => ipcRenderer.removeListener('updater:progress', handler)
  },
  onUpdateDownloaded: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('updater:downloaded', handler)
    return () => ipcRenderer.removeListener('updater:downloaded', handler)
  },
  onUpdateError: (callback: (data: { message: string }) => void) => {
    const handler = (_: unknown, data: { message: string }) => callback(data)
    ipcRenderer.on('updater:error', handler)
    return () => ipcRenderer.removeListener('updater:error', handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
