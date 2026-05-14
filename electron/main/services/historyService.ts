import { app } from 'electron/main'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

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
  outputFormat: 'origin' | 'jpg' | 'png' | 'webp'
  scaleEnabled?: boolean
  scalePercent?: number
  maxWidth?: number
  maxHeight?: number
  // 统计
  savedBytes: number
  savedPercent: number
}

const MAX_RECORDS = 100

const getHistoryFilePath = (): string => {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'history.json')
}

const ensureDataDir = async (): Promise<void> => {
  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    await mkdir(userDataPath, { recursive: true })
  }
}

export async function loadHistory(): Promise<HistoryRecord[]> {
  try {
    const filePath = getHistoryFilePath()
    if (!existsSync(filePath)) {
      return []
    }
    const data = await readFile(filePath, 'utf-8')
    const records = JSON.parse(data) as HistoryRecord[]
    // 确保是数组
    if (!Array.isArray(records)) {
      return []
    }
    return records
  } catch (error) {
    console.error('[HistoryService] Failed to load history:', error)
    return []
  }
}

export async function saveHistory(records: HistoryRecord[]): Promise<void> {
  try {
    await ensureDataDir()
    const filePath = getHistoryFilePath()
    await writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8')
  } catch (error) {
    console.error('[HistoryService] Failed to save history:', error)
  }
}

export async function addHistoryRecord(record: HistoryRecord): Promise<HistoryRecord[]> {
  const records = await loadHistory()

  // 防重：同名文件 + 相同参数不重复记录
  const duplicate = records.find(
    (r) =>
      r.originalPath === record.originalPath &&
      r.quality === record.quality &&
      r.outputFormat === record.outputFormat &&
      r.scalePercent === record.scalePercent &&
      r.maxWidth === record.maxWidth &&
      r.maxHeight === record.maxHeight
  )
  if (duplicate) {
    return records
  }

  // 追加到开头
  records.unshift(record)

  // 超出上限时清除最早的记录
  if (records.length > MAX_RECORDS) {
    records.splice(MAX_RECORDS)
  }

  await saveHistory(records)
  return records
}

export async function deleteHistoryRecord(id: string): Promise<HistoryRecord[]> {
  const records = await loadHistory()
  const filtered = records.filter((r) => r.id !== id)
  await saveHistory(filtered)
  return filtered
}

export async function clearHistory(): Promise<void> {
  await saveHistory([])
}

export async function exportHistory(filePath: string): Promise<void> {
  const records = await loadHistory()
  await writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8')
}

export async function importHistory(filePath: string): Promise<{ count: number; records: HistoryRecord[] }> {
  const data = await readFile(filePath, 'utf-8')
  const imported = JSON.parse(data) as HistoryRecord[]

  if (!Array.isArray(imported)) {
    throw new Error('Invalid history file format')
  }

  const existing = await loadHistory()
  const existingIds = new Set(existing.map((r) => r.id))

  // 合并，导入的记录去重
  const newRecords = imported.filter((r) => !existingIds.has(r.id))
  const merged = [...newRecords, ...existing].slice(0, MAX_RECORDS)

  await saveHistory(merged)
  return { count: newRecords.length, records: merged }
}
