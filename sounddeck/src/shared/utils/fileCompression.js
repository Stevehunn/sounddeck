// src/shared/utils/fileCompression.js
import { logWarn } from './logger'

export async function compressFileIfNeeded(filePath, options = {}) {
  const {
    enabled = false,
    bitrate = 128,
    deleteOriginal = true,
    onWarning = null,
  } = options

  if (!enabled || !filePath) {
    return { success: true, path: filePath, compressed: false }
  }

  if (typeof window.electronAPI?.convertAudio !== 'function') {
    onWarning?.('convertAudio non disponible')
    return { success: true, path: filePath, compressed: false }
  }

  try {
    const originalPath = filePath
    const ext = (originalPath.split('.').pop() || 'mp3').toLowerCase()
    const compressedPath = originalPath.replace(`.${ext}`, `_compressed.${ext}`)
    const format = ext === 'mp3' ? 'mp3' : 'aac'

    const result = await window.electronAPI.convertAudio(
      originalPath,
      compressedPath,
      format,
      bitrate
    )

    if (!result?.success) {
      onWarning?.(result?.error || 'Compression échouée')
      return { success: true, path: originalPath, compressed: false }
    }

    if (deleteOriginal) {
      try {
        await window.electronAPI.deleteSoundFile(originalPath)
      } catch (e) {
        // silencieux
      }
    }

    const originalSize = result.originalSize || 0
    const compressedSize = result.size || 0
    const compressionRatio =
      originalSize > 0 ? compressedSize / originalSize : 1

    return {
      success: true,
      path: compressedPath,
      compressed: true,
      originalSize,
      compressedSize,
      compressionRatio,
    }
  } catch (e) {
    logWarn('fileCompression', 'Erreur', e)
    onWarning?.(e.message)
    return { success: true, path: filePath, compressed: false }
  }
}

export default { compressFileIfNeeded }