import type { ComputedRef, Ref } from 'vue'

// 图片状态
export type ImageStatus = 'pending' | 'compressing' | 'done' | 'error'

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
}

// 压缩选项
export interface CompressOptions {
  quality: number
  outputFormat: OutputFormat
  maxWidth?: number
  maxHeight?: number
}

// Electron API 类型
export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  openFileDialog: () => Promise<string[]>
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
    maxWidth?: number
    maxHeight?: number
  }) => Promise<{ success: boolean; error?: string }>
  compressBatch: (options: {
    images: Array<{ id: string; filePath: string }>
    quality: number
    outputFormat: OutputFormat
    maxWidth?: number
    maxHeight?: number
  }) => Promise<{ success: boolean; results: Array<{ id: string; success: boolean; error?: string }> }>
  cancelCompress: () => Promise<{ success: boolean }>
  saveToPath: (
    compressedPath: string,
    targetPath: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>
  onCompressProgress: (callback: (data: { id: string; progress: number }) => void) => () => void
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
  ) => () => void
  onCompressError: (callback: (data: { id: string; error: string }) => void) => () => void
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
