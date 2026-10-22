/**
 * @file Waveform peak data generator.
 *
 * Decodes an audio file and produces a downsampled array of `samples` peak
 * values (0-1). Used by `Waveform.jsx` to draw the waveform on a `<canvas>`.
 *
 * ## Caching
 *
 * Results are cached per `(filePath, samples, startOffset, sliceDuration)`
 * combination. The cache is a module-level `Map` (never evicted) — waveform
 * data is tiny (~300 floats) so it's safe to keep forever.
 *
 * ## Slicing
 *
 * `startOffset` and `sliceDuration` allow extracting a sub-region (e.g. the
 * part of a clip that's actually used in the editor). When both are `null`,
 * the entire file is analyzed.
 *
 * @see @shared/components/audio/Waveform.jsx
 * @see @shared/utils/audioContext.js (`withTemporaryAudioContext`)
 */

import { withTemporaryAudioContext } from './audioContext.js'
import { buildFileUrl } from './fileUrl.js'
import { logError, logWarn } from './logger'

const waveformCache = new Map()

/**
 * Generates waveform peak data for the given file.
 *
 * @param {string} filePath - Absolute path to the audio file.
 * @param {number} [samples=200] - Number of bars to produce.
 * @param {number} [startOffset=0] - Start of the analyzed region (seconds).
 * @param {number|null} [sliceDuration=null] - Length of the analyzed region
 *   (`null` = to the end of the file).
 * @param {boolean} [useCache=true] - If `false`, always re-generates.
 * @returns {Promise<number[]|null>} Array of normalized peak values (0-1),
 *   or `null` on error.
 */
export async function generateWaveformData(
  filePath,
  samples = 200,
  startOffset = 0,
  sliceDuration = null,
  useCache = true
) {
  try {
    const cacheKey = `${filePath}_${samples}_${startOffset}_${sliceDuration || 'full'}`
    if (useCache && waveformCache.has(cacheKey)) {
      return waveformCache.get(cacheKey)
    }

    try {
      const exists = await window.electronAPI.fileExists(filePath)
      if (!exists) {
        logError('waveformGenerator', `File not found: ${filePath}`)
        return null
      }
    } catch (e) {
      logWarn('waveformGenerator', 'fileExists check failed', e)
    }

    const fileUrl = buildFileUrl(filePath)

    const result = await withTemporaryAudioContext(fileUrl, (audioBuffer) => {
      const fullData = audioBuffer.getChannelData(0)
      const startSample = Math.max(
        0,
        Math.min(
          fullData.length,
          Math.floor(startOffset * audioBuffer.sampleRate)
        )
      )
      const endSample =
        sliceDuration != null
          ? Math.max(
              startSample,
              Math.min(
                fullData.length,
                startSample + Math.floor(sliceDuration * audioBuffer.sampleRate)
              )
            )
          : fullData.length

      const rawData = fullData.subarray(startSample, endSample)

      const blockSize = Math.max(1, Math.floor(rawData.length / samples))
      const data = []

      for (let i = 0; i < samples; i++) {
        let sum = 0
        const start = i * blockSize
        const end = Math.min(start + blockSize, rawData.length)
        for (let j = start; j < end; j++) {
          sum += Math.abs(rawData[j])
        }
        data.push(end > start ? sum / (end - start) : 0)
      }

      const max = Math.max(...data)
      return max > 0 ? data.map((v) => v / max) : data
    })

    if (!result) return null

    if (useCache) {
      waveformCache.set(cacheKey, result)
    }

    return result
  } catch (e) {
    logError('waveformGenerator', 'Generation error', e)
    return null
  }
}

/**
 * Invalidates cached waveform data.
 *
 * @param {string} [filePath] - If provided, only clears entries for this
 *   file. Otherwise clears the whole cache.
 * @returns {void}
 */
export function invalidateWaveformCache(filePath) {
  if (filePath) {
    const keys = Array.from(waveformCache.keys()).filter((k) =>
      k.startsWith(filePath)
    )
    keys.forEach((k) => waveformCache.delete(k))
  } else {
    waveformCache.clear()
  }
}

export default {
  generateWaveformData,
  invalidateWaveformCache,
}