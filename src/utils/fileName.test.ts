import { describe, expect, it } from 'vitest'
import { buildCompressedName } from './fileName'

describe('buildCompressedName', () => {
  it('替换已有扩展名', () => {
    expect(buildCompressedName('photo.jpeg', 'webp')).toBe('photo_compressed.webp')
  })

  it('没有扩展名时追加压缩后缀', () => {
    expect(buildCompressedName('photo', 'png')).toBe('photo_compressed.png')
  })

  it('默认使用 jpg 扩展名', () => {
    expect(buildCompressedName('photo.png')).toBe('photo_compressed.jpg')
  })
})
