/**
 * @file Audio buffer export with multi-strategy fallback.
 *
 * `saveAudioBuffer(data, outputPath)` tries 4 methods in order, falling
 * back on the next one whenever the previous one fails:
 *
 * 1. **`electronAPI.writeSoundFile`** — direct write via Node fs (fastest).
 * 2. **`electronAPI.saveFileDialog`** — user-chosen save location.
 * 3. **`electronAPI.exportAudioFile`** — WAV-specific export dialog.
 * 4. **Browser `<a download>`** — last-resort HTML5 download.
 *
 * Each step returns `{ success, path }` on success, so the caller can
 * always tell how the file ended up being written (and its final path).
 *
 * @see @shared/utils/wavEncoder.js (produces the `Uint8Array` input)
 * @see @shared/utils/mixdown.js (consumer)
 * @see @shared/utils/normalizeUtils.js (consumer)
 */

import { logWarn, logError } from './logger'

/**
 * Saves an audio buffer (WAV `ArrayBuffer` / `Uint8Array`) to disk.
 *
 * @param {ArrayBuffer|Uint8Array} data - Raw audio data.
 * @param {string} outputPath - Preferred output path (may be overridden
 *   by a native dialog in strategies 2 and 3).
 * @returns {Promise<{
 *   success: boolean,
 *   path?: string,
 *   downloaded?: boolean,
 *   error?: string,
 * }>}
 */
export async function saveAudioBuffer(data, outputPath) {
  if (!outputPath) {
    return { success: false, error: 'Missing outputPath' }
  }

  const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data)

  // ── Strategy 1: direct write via Node (electronAPI) ───────────────────
  try {
    const result = await window.electronAPI?.writeSoundFile?.(
      outputPath,
      Array.from(uint8Array)
    )
    if (result?.success) {
      return { success: true, path: outputPath }
    }
  } catch (e) {
    logWarn('fileExport', 'writeSoundFile exception', e)
  }

  // ── Strategy 2: native save dialog ────────────────────────────────────
  try {
    const fileName =
      outputPath.split('/').pop() ||
      outputPath.split('\\').pop() ||
      'exported.wav'
    const result = await window.electronAPI?.saveFileDialog?.(fileName, data)
    if (result?.success && result?.path) {
      return { success: true, path: result.path }
    }
  } catch (e) {
    logWarn('fileExport', 'saveFileDialog exception', e)
  }

  // ── Strategy 3: WAV-specific export dialog ────────────────────────────
  try {
    const fileName =
      outputPath.split('/').pop() ||
      outputPath.split('\\').pop() ||
      'exported.wav'
    const result = await window.electronAPI?.exportAudioFile?.(
      Array.from(uint8Array),
      fileName,
      'wav'
    )
    if (result?.success && result?.path) {
      return { success: true, path: result.path }
    }
  } catch (e) {
    logWarn('fileExport', 'exportAudioFile exception', e)
  }

  // ── Strategy 4: browser download (last resort) ────────────────────────
  try {
    const blob = new Blob([data], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download =
      outputPath.split('/').pop() ||
      outputPath.split('\\').pop() ||
      'exported.wav'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return { success: true, path: 'download://' + a.download, downloaded: true }
  } catch (e) {
    logError('fileExport', 'All fallbacks failed', e)
    return { success: false, error: e.message }
  }
}

export default { saveAudioBuffer }