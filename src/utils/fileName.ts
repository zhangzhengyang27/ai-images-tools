export function buildCompressedName(name: string, format = 'jpg') {
  if (/\.[^.]+$/.test(name)) {
    return name.replace(/\.[^.]+$/, `_compressed.${format}`)
  }
  return `${name}_compressed.${format}`
}
