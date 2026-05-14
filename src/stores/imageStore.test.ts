import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useImageStore } from './imageStore'
import type { ImageItem } from '@/types'

const makeImage = (id: string, name: string, size: number, status: ImageItem['status'] = 'pending'): ImageItem => ({
  id,
  name,
  originalPath: `/tmp/${name}`,
  originalSize: size,
  originalWidth: 100,
  originalHeight: 80,
  format: 'jpeg',
  status
})

describe('imageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('支持全选、反选和清空多选', () => {
    const store = useImageStore()
    store.addImages([
      makeImage('a', 'a.jpg', 100),
      makeImage('b', 'b.jpg', 200),
      makeImage('c', 'c.jpg', 300)
    ])

    store.selectAllImages()
    expect(store.selectedIds).toEqual(['a', 'b', 'c'])

    store.toggleImageSelection('b')
    store.invertImageSelection()
    expect(store.selectedIds).toEqual(['b'])

    store.clearImageSelection()
    expect(store.selectedIds).toEqual([])
  })

  it('按大小排序时保持从大到小', () => {
    const store = useImageStore()
    store.addImages([
      makeImage('small', 'small.jpg', 100),
      makeImage('large', 'large.jpg', 900),
      makeImage('mid', 'mid.jpg', 300)
    ])

    store.setSortBy('size')
    expect(store.sortedImages.map((image) => image.id)).toEqual(['large', 'mid', 'small'])
  })

  it('独立压缩参数只覆盖当前选中图片', () => {
    const store = useImageStore()
    store.addImages([makeImage('a', 'a.jpg', 100), makeImage('b', 'b.jpg', 200)])

    store.selectImage('b')
    store.updateSelectedImageCompressOptions({ quality: 55, outputFormat: 'webp' })

    expect(store.images.find((image) => image.id === 'a')?.compressOptions).toBeUndefined()
    expect(store.images.find((image) => image.id === 'b')?.compressOptions).toMatchObject({
      quality: 55,
      outputFormat: 'webp'
    })
  })

  it('记录并复位导入进度', () => {
    const store = useImageStore()

    store.startImport(50)
    store.updateImportProgress(12, 'photo-12.jpg')

    expect(store.isImporting).toBe(true)
    expect(store.importedCount).toBe(12)
    expect(store.importTotal).toBe(50)
    expect(store.currentImportName).toBe('photo-12.jpg')

    store.finishImport()
    expect(store.isImporting).toBe(false)
    expect(store.importedCount).toBe(0)
  })

  it('记录并复位当前压缩图片', () => {
    const store = useImageStore()
    store.addImages([makeImage('a', 'a.jpg', 100), makeImage('b', 'b.jpg', 200)])

    store.startCompressing(2)
    store.setCurrentCompressImage('b')

    expect(store.isCompressing).toBe(true)
    expect(store.currentCompressId).toBe('b')
    expect(store.currentCompressName).toBe('b.jpg')

    store.finishOneCompress()
    expect(store.currentCompressName).toBe('b.jpg')

    store.finishOneCompress()
    expect(store.isCompressing).toBe(false)
    expect(store.currentCompressId).toBeNull()
    expect(store.currentCompressName).toBe('')
  })
})
