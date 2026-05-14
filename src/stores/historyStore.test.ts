import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHistoryStore } from './historyStore'
import type { HistoryRecord } from '@/types'

const baseTime = new Date('2026-05-14T12:00:00+08:00').getTime()

const makeRecord = (id: string, originalName: string, timestamp: number): HistoryRecord => ({
  id,
  timestamp,
  originalPath: `/tmp/${originalName}`,
  originalName,
  originalSize: 1000,
  originalWidth: 100,
  originalHeight: 80,
  originalFormat: 'jpeg',
  compressedPath: `/tmp/${id}.webp`,
  compressedName: `${id}.webp`,
  compressedSize: 500,
  compressedFormat: 'webp',
  quality: 78,
  outputFormat: 'webp',
  savedBytes: 500,
  savedPercent: 50
})

describe('historyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(baseTime)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('按今日筛选自然日记录', () => {
    const store = useHistoryStore()
    store.setRecords([
      makeRecord('today', 'today.jpg', new Date('2026-05-14T08:00:00+08:00').getTime()),
      makeRecord('old', 'old.jpg', new Date('2026-05-13T23:59:59+08:00').getTime())
    ])

    store.filter = 'today'
    expect(store.filteredRecords.map((record) => record.id)).toEqual(['today'])
  })

  it('按关键词搜索文件名', () => {
    const store = useHistoryStore()
    store.setRecords([
      makeRecord('a', 'banner-home.jpg', baseTime),
      makeRecord('b', 'avatar.png', baseTime)
    ])

    store.searchKeyword = 'banner'
    expect(store.filteredRecords.map((record) => record.id)).toEqual(['a'])
  })

  it('统计历史节省空间和平均节省比例', () => {
    const store = useHistoryStore()
    store.setRecords([
      makeRecord('a', 'a.jpg', baseTime),
      { ...makeRecord('b', 'b.jpg', baseTime), savedBytes: 250, savedPercent: 25 }
    ])

    expect(store.stats).toEqual({ total: 2, totalSavedBytes: 750, avgSavedPercent: 38 })
  })
})
