import type { ComputedRef, Ref } from 'vue'

// 图片状态
export type ImageStatus = 'pending' | 'compressing' | 'done' | 'error'

// 历史记录筛选
export type HistoryFilter = 'all' | 'today' | 'week' | 'month'

// 历史记录
export interface HistoryRecord {
  id: string
  timestamp: number
  // 原图信息
  originalPath: string
  originalName: string
  originalSize: number
  originalWidth: number
  originalHeight: number
  originalFormat: string
  // 压缩结果
  compressedPath: string
  compressedName: string
  compressedSize: number
  compressedWidth?: number
  compressedHeight?: number
  compressedFormat?: string
  // 使用的参数
  quality: number
  outputFormat: OutputFormat
  scaleEnabled?: boolean
  scalePercent?: number
  maxWidth?: number
  maxHeight?: number
  // 统计
  savedBytes: number
  savedPercent: number
}

// 输出格式
export type OutputFormat = 'origin' | 'jpg' | 'png' | 'webp'

// 图片项
export interface ImageItem {
  id: string
  name: string
  originalPath: string
  originalSize: number
  originalWidth: number
  originalHeight: number
  format: string
  status: ImageStatus
  compressedPath?: string
  compressedSize?: number
  compressedWidth?: number
  compressedHeight?: number
  compressedFormat?: string
  progress?: number
  error?: string
  savedPercent?: number
  compressOptions?: CompressOptions
}

// 压缩选项
export interface CompressOptions {
  quality: number
  outputFormat: OutputFormat
  scaleEnabled?: boolean
  scalePercent?: number
  maxWidth?: number
  maxHeight?: number
}

export interface CompressResultPayload {
  id: string
  compressedPath: string
  compressedSize: number
  compressedWidth: number
  compressedHeight: number
  compressedFormat: string
  savedPercent: number
}

// Electron API 类型
export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  openFileDialog: () => Promise<string[]>
  openImageFolderDialog: () => Promise<string[]>
  resolveImagePaths: (paths: string[]) => Promise<string[]>
  saveFileDialog: (options?: {
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
  }) => Promise<string | undefined>
  selectFolderDialog: () => Promise<string | null>
  getImageInfo: (
    filePath: string
  ) => Promise<{
    success: boolean
    data?: {
      width: number
      height: number
      size: number
      format: string
      hasAlpha: boolean
      path: string
      name: string
    }
    error?: string
  }>
  compressImage: (options: {
    id: string
    filePath: string
    quality: number
    outputFormat: OutputFormat
    scaleEnabled?: boolean
    scalePercent?: number
    maxWidth?: number
    maxHeight?: number
  }) => Promise<{ success: boolean; result?: CompressResultPayload; error?: string }>
  compressBatch: (options: {
    images: Array<{
      id: string
      filePath: string
      quality?: number
      outputFormat?: OutputFormat
      scaleEnabled?: boolean
      scalePercent?: number
      maxWidth?: number
      maxHeight?: number
    }>
    quality: number
    outputFormat: OutputFormat
    scaleEnabled?: boolean
    scalePercent?: number
    maxWidth?: number
    maxHeight?: number
  }) => Promise<{
    success: boolean
    canceled?: boolean
    results: Array<{ id: string; success: boolean; error?: string; result?: CompressResultPayload }>
  }>
  cancelCompress: () => Promise<{ success: boolean }>
  saveToPath: (
    compressedPath: string,
    targetPath: string,
    options?: { avoidConflict?: boolean }
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  openPath: (targetPath: string) => Promise<{ success: boolean; error?: string }>
  fileExists: (targetPath: string) => Promise<{ success: boolean; exists: boolean; error?: string }>
  onCompressProgress: (callback: (data: { id: string; progress: number }) => void) => () => void
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
  ) => () => void
  onCompressResult: (callback: (data: CompressResultPayload) => void) => () => void
  onCompressError: (callback: (data: { id: string; error: string }) => void) => () => void
  // 历史记录
  loadHistory: () => Promise<{ success: boolean; records: HistoryRecord[]; error?: string }>
  addHistory: (record: HistoryRecord) => Promise<{ success: boolean; error?: string }>
  deleteHistory: (id: string) => Promise<{ success: boolean; error?: string }>
  clearHistory: () => Promise<{ success: boolean; error?: string }>
  exportHistory: () => Promise<{ success: boolean; exportedPath?: string; error?: string }>
  importHistory: () => Promise<{ success: boolean; count?: number; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// Composable 返回类型
export interface UseCompressReturn {
  isCompressing: Ref<boolean>
  progress: Ref<number>
  error: Ref<string | null>
  compressSingle: (image: ImageItem, options: CompressOptions) => Promise<void>
  compressBatch: (images: ImageItem[], options: CompressOptions) => Promise<void>
  cancel: () => Promise<void>
}

export interface UseFileDialogReturn {
  openImages: () => Promise<string[]>
  saveImage: (defaultName?: string) => Promise<string | undefined>
  selectFolder: () => Promise<string | null>
}

// 工具函数类型
export type FormatFileSize = (bytes: number) => string
export type GenerateId = () => string

export interface HistoryReplayResult {
  success: boolean
  reused: boolean
  error?: string
}
