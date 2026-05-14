export function toLocalResourceUrl(filePath: string) {
  return `local-resource://image?path=${encodeURIComponent(filePath)}`
}
