/**
 * @file Audio file compression helper (optional, ffmpeg-backed).
 *
 * Wraps `electronAPI.convertAudio()` to compress an imported audio file to
 * a lower bitrate (default 128 kbps MP3/AAC). The new file is written
 * next to the original (`<name>_compressed.<ext>`), and the original is
 * deleted if `deleteOriginal` is `true`.
 *
 * The function is **fail-open**: any error (ffmpeg missing, unsupported
 * format, …) returns `{ success: true, path: originalPath, compressed: false }`
 * — the caller can always use the original file.
 *
 * User-facing warnings (via `onWarning`) are translated.
 *
 * @see electron/modules/fileHandlers.js (`convertAudio`)
 * @see @shared/utils/translator.js
 */

import { logWarn } from './logger'
import { translate } from './translator'

/**
 * Compresses an audio file if compression is enabled.
 *
 * @param {string} filePath - Absolute path to the source file.
 * @param {Object} [options]
 * @param {boolean} [options.enabled=false] - Skip compression when `false`.
 * @param {number} [options.bitrate=128] - Target bitrate in kbps.
 * @param {boolean} [options.deleteOriginal=true] - Delete the source on success.
 * @param {((msg: string) => void)|null} [options.onWarning] - Called when the
 *   compression falls back to the original file.
 * @returns {Promise<{
 *   success: boolean,
 *   path: string,
 *   compressed: boolean,
 *   originalSize?: number,
 *   compressedSize?: number,
 *   compressionRatio?: number,
 * }>}
 */
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
    onWarning?.(translate('fileCompressionConvertUnavailable'))
    return { success: true, path: filePath, compressed: false }
  }

  try {
    const originalPath = filePath
    const ext = (originalPath.split('.').pop() || 'mp3').toLowerCase()
    const compressedPath = originalPath.replace(
      `.${ext}`,
      `_compressed.${ext}`
    )
    const format = ext === 'mp3' ? 'mp3' : 'aac'

    const result = await window.electronAPI.convertAudio(
      originalPath,
      compressedPath,
      format,
      bitrate
    )

    if (!result?.success) {
      // Technical ffmpeg error → keep raw (English), but the caller can
      // still choose to display it.
      onWarning?.(result?.error || 'Compression failed')
      return { success: true, path: originalPath, compressed: false }
    }

    if (deleteOriginal) {
      try {
        await window.electronAPI.deleteSoundFile(originalPath)
      } catch {
        // ignore
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
    logWarn('fileCompression', 'Error', e)
    onWarning?.(e.message)
    return { success: true, path: filePath, compressed: false }
  }
}

export default { compressFileIfNeeded }