// src/core/store/utils/normalizePath.js

export function normalizePath(p) {
  return p ? p.replace(/\\/g, '/') : p
}

export function getFileNameFromPath(filePath) {
  if (!filePath) return ''
  const parts = filePath.split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

export function getFileExtension(filePath) {
  if (!filePath) return ''
  const fileName = getFileNameFromPath(filePath)
  const parts = fileName.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}