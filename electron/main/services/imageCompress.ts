import sharp from 'sharp'
import { app } from 'electron/main'
import { join } from 'path'
import { ensureDirSync } from 'fs-extra'
import { readdir, unlink } from 'fs/promises'

// 支持的图片格式
const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif']

// 临时目录
const getTempDir = () => {
  const tempDir = join(app.getPath('temp'), 'ai-images-tools')
  ensureDirSync(tempDir)
  return tempDir
}

// 清理临时文件
export async function cleanupTempFiles(): Promise<void> {
  const tempDir = getTempDir()
  try {
    const files = await readdir(tempDir)
    await Promise.all(files.map((file) => unlink(join(tempDir, file))))
  } catch {
    // 忽略错误
  }
}

// 获取图片元数据
export async function getImageMetadata(filePath: string): Promise<{
  width: number
  height: number
  size: number
  format: string
  hasAlpha: boolean
}> {
  const metadata = await sharp(filePath).metadata()
  const stats = await sharp(filePath).stats()

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    size: metadata.size || 0,
    format: metadata.format || 'unknown',
    hasAlpha: stats.isOpaque ? false : true
  }
}

// 压缩图片
export async function compressImage(
  inputPath: string,
  options: {
    quality: number
    outputFormat: 'origin' | 'jpg' | 'png' | 'webp'
    scaleEnabled?: boolean
    scalePercent?: number
    maxWidth?: number
    maxHeight?: number
  },
  onProgress?: (progress: number) => void
): Promise<{
  outputPath: string
  width: number
  height: number
  size: number
  format: string
}> {
  const tempDir = getTempDir()
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)

  // 获取原始元数据
  const metadata = await sharp(inputPath).metadata()
  const originalFormat = metadata.format || 'jpeg'

  // 确定输出格式
  let outputFormat = options.outputFormat
  if (outputFormat === 'origin') {
    outputFormat = originalFormat === 'gif' ? 'webp' : (originalFormat as 'jpg' | 'png' | 'webp')
  }

  // 确定输出扩展名
  const extMap: Record<string, string> = {
    jpg: 'jpg',
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp'
  }
  const ext = extMap[outputFormat] || 'jpg'

  // 构建输出路径
  const outputPath = join(tempDir, `compressed_${timestamp}_${randomId}.${ext}`)

  // 报告进度
  onProgress?.(10)

  // 创建 sharp pipeline
  let pipeline = sharp(inputPath)

  // 处理 GIF（取第一帧）
  if (originalFormat === 'gif') {
    pipeline = sharp(inputPath, { pages: 1 })
  }

  // 尺寸调整（按比例缩放）
  if (options.scaleEnabled && options.scalePercent !== undefined && options.scalePercent < 100) {
    // 先按比例缩放
    const targetWidth = Math.round((metadata.width || 0) * (options.scalePercent / 100))
    const targetHeight = Math.round((metadata.height || 0) * (options.scalePercent / 100))
    pipeline = pipeline.resize(targetWidth, targetHeight)
    onProgress?.(30)
  }

  // 尺寸调整（最大宽高限制）
  if (options.maxWidth || options.maxHeight) {
    pipeline = pipeline.resize(options.maxWidth, options.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    })
    onProgress?.(30)
  }

  // 格式和质量压缩
  const quality = Math.max(1, Math.min(100, options.quality))

  switch (outputFormat) {
    case 'jpg':
    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality,
        mozjpeg: true,
        chromaSubsampling: quality >= 80 ? '4:4:4' : '4:2:0'
      })
      break
    case 'png':
      pipeline = pipeline.png({
        quality,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      break
    case 'webp':
      pipeline = pipeline.webp({
        quality,
        lossless: quality >= 100
      })
      break
  }

  onProgress?.(50)

  // 执行压缩
  await pipeline.toFile(outputPath)

  onProgress?.(90)

  // 获取压缩后的元数据
  const resultMetadata = await sharp(outputPath).metadata()

  onProgress?.(100)

  return {
    outputPath,
    width: resultMetadata.width || 0,
    height: resultMetadata.height || 0,
    size: resultMetadata.size || 0,
    format: outputFormat
  }
}

// 检查是否支持该格式
export function isSupportedFormat(format: string): boolean {
  return SUPPORTED_FORMATS.includes(format.toLowerCase())
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
