/**
 * @file Audio normalization helpers (Peak or RMS).
 *
 * Analyses an audio file (`analyzeVolume`) to compute its peak / RMS
 * levels, then applies a compensating gain to reach a target level
 * (`normalizeClip`). Supports peak-based or RMS-based normalization, gain
 * clamping (`minGain` / `maxGain`), and post-gain clipping protection
 * (0.95 cap).
 *
 * The output file is written to the sounds directory (`getSoundsDir`),
 * either as WAV or MP3 (via ffmpeg, with a WAV fallback). If a `store` is
 * provided, `updateClipWithPath` is called so the project references the
 * new file.
 *
 * @see @shared/utils/audioContext.js (`withTemporaryAudioContext`)
 * @see @shared/utils/wavEncoder.js
 * @see @shared/utils/fileExport.js
 */

import { audioBufferToWav } from './wavEncoder'
import { withTemporaryAudioContext } from './audioContext'
import { saveAudioBuffer } from './fileExport'
import { buildFileUrl } from './fileUrl'
import { logWarn, logError, logInfo } from './logger'

/**
 * Analyzes an audio file's levels (peak, RMS, dB).
 *
 * @param {string} filePath
 * @returns {Promise<{
 *   maxPeak: number,
 *   rms: number,
 *   peakDb: number,
 *   rmsDb: number,
 *   hasAudio: boolean,
 *   duration: number,
 *   sampleRate: number,
 *   numberOfChannels: number,
 * }|null>} `null` on error.
 */
export async function analyzeVolume(filePath) {
  try {
    const fileUrl = buildFileUrl(filePath)

    const result = await withTemporaryAudioContext(fileUrl, (audioBuffer) => {
      let maxPeak = 0
      let rms = 0
      const channels = audioBuffer.numberOfChannels
      const length = audioBuffer.length

      for (let channel = 0; channel < channels; channel++) {
        const data = audioBuffer.getChannelData(channel)
        let sumSquares = 0

        for (let i = 0; i < length; i++) {
          const abs = Math.abs(data[i])
          if (abs > maxPeak) maxPeak = abs
          sumSquares += data[i] * data[i]
        }

        rms += Math.sqrt(sumSquares / length)
      }

      rms /= channels

      return {
        maxPeak,
        rms,
        peakDb: 20 * Math.log10(Math.max(maxPeak, 0.0001)),
        rmsDb: 20 * Math.log10(Math.max(rms, 0.0001)),
        hasAudio: maxPeak > 0.001,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: channels,
      }
    })

    return result
  } catch (e) {
    logWarn('normalizeUtils', 'Volume analysis error', e)
    return null
  }
}

/**
 * Normalizes a single clip.
 *
 * @param {Object} clip - `{ id, name, path }`.
 * @param {number} [targetPeak=0.95] - Target peak (0-1) for peak-based normalization.
 * @param {Object|null} [store] - App store (optional; used to update the clip path).
 * @param {Object} [options]
 * @param {'wav'|'mp3'} [options.outputFormat='wav']
 * @param {number} [options.bitrate=192]
 * @param {boolean} [options.useRMS=false] - Use RMS instead of peak.
 * @param {number} [options.targetRMS=0.15]
 * @param {number} [options.maxGain=10]
 * @param {number} [options.minGain=0.1]
 * @param {boolean} [options.preserveOriginal=false] - Unused; kept for API compatibility.
 * @returns {Promise<{
 *   normalized: boolean,
 *   gain: number,
 *   originalPeak?: number,
 *   originalRms?: number,
 *   finalPeak?: number,
 *   newPath?: string,
 * }|null>} `null` on error or if the file has no audio.
 */
export async function normalizeClip(
  clip,
  targetPeak = 0.95,
  store,
  options = {}
) {
  if (!clip || !clip.path) return null

  const {
    outputFormat = 'wav',
    bitrate = 192,
    useRMS = false,
    targetRMS = 0.15,
    maxGain = 10,
    minGain = 0.1,
    // NOTE: `preserveOriginal` is accepted for API compatibility but
    // currently unused — the source file is always kept in `_sounds/`.
  } = options

  try {
    const analysis = await analyzeVolume(clip.path)
    if (!analysis || !analysis.hasAudio) {
      logWarn('normalizeUtils', `No audio signal detected in ${clip.name}`)
      return null
    }

    let gain
    if (useRMS) {
      gain = targetRMS / analysis.rms
    } else {
      gain = targetPeak / analysis.maxPeak
    }

    gain = Math.max(minGain, Math.min(maxGain, gain))

    if (Math.abs(gain - 1) < 0.01) {
      return {
        normalized: false,
        gain: 1,
        originalPeak: analysis.maxPeak,
        originalRms: analysis.rms,
      }
    }

    logInfo(
      'normalizeUtils',
      `🔊 Normalizing "${clip.name}": gain = ${gain.toFixed(2)}x (${analysis.peakDb.toFixed(1)}dB → ${(20 * Math.log10(targetPeak)).toFixed(1)}dB)`
    )

    const fileUrl = buildFileUrl(clip.path)

    const normalizedResult = await withTemporaryAudioContext(
      fileUrl,
      async (audioBuffer) => {
        const channels = audioBuffer.numberOfChannels
        const length = audioBuffer.length

        for (let channel = 0; channel < channels; channel++) {
          const data = audioBuffer.getChannelData(channel)
          for (let i = 0; i < length; i++) {
            data[i] *= gain
          }
        }

        let maxPeakAfter = 0
        for (let channel = 0; channel < channels; channel++) {
          const data = audioBuffer.getChannelData(channel)
          for (let i = 0; i < length; i++) {
            const abs = Math.abs(data[i])
            if (abs > maxPeakAfter) maxPeakAfter = abs
          }
        }

        if (maxPeakAfter > 1.0) {
          const reduction = 0.95 / maxPeakAfter
          logWarn(
            'normalizeUtils',
            `Clipping detected (${maxPeakAfter.toFixed(2)}), reducing gain to ${(gain * reduction).toFixed(2)}x`
          )
          for (let channel = 0; channel < channels; channel++) {
            const data = audioBuffer.getChannelData(channel)
            for (let i = 0; i < length; i++) {
              data[i] *= reduction
            }
          }
          gain *= reduction
        }

        const ext = outputFormat === 'mp3' ? 'mp3' : 'wav'
        const fileName = `normalized_${Date.now()}_${clip.name.replace(
          /[^a-zA-Z0-9]/g,
          '_'
        )}.${ext}`
        const soundsDir = await window.electronAPI.getSoundsDir()
        const outputPath = soundsDir + '/' + fileName

        const wavBuffer = audioBufferToWav(audioBuffer)
        const uint8Array = new Uint8Array(wavBuffer)

        let finalPath

        if (outputFormat === 'mp3') {
          const tempPath = outputPath.replace('.mp3', '.temp.wav')
          await saveAudioBuffer(uint8Array, tempPath)

          const conversionResult = await window.electronAPI.convertAudio?.(
            tempPath,
            outputPath,
            'mp3',
            bitrate
          )

          if (conversionResult?.success) {
            try {
              await window.electronAPI.deleteSoundFile?.(tempPath)
            } catch {
              // ignore
            }
            finalPath = outputPath
          } else {
            logWarn(
              'normalizeUtils',
              'MP3 conversion failed, using WAV'
            )
            finalPath = tempPath
          }
        } else {
          const result = await saveAudioBuffer(uint8Array, outputPath)
          if (!result.success) {
            throw new Error('Failed to save normalized file')
          }
          finalPath = outputPath
        }

        return {
          gain,
          maxPeakAfter,
          finalPath,
        }
      }
    )

    if (!normalizedResult) return null

    if (store && typeof store.updateClipWithPath === 'function') {
      try {
        await store.updateClipWithPath(clip.id, normalizedResult.finalPath)
      } catch (e) {
        logWarn(
          'normalizeUtils',
          'updateClipWithPath failed',
          e
        )
      }
    }

    return {
      normalized: true,
      gain: normalizedResult.gain,
      originalPeak: analysis.maxPeak,
      originalRms: analysis.rms,
      finalPeak: normalizedResult.maxPeakAfter,
      newPath: normalizedResult.finalPath,
    }
  } catch (e) {
    logError('normalizeUtils', 'Normalization error', e)
    return null
  }
}

/**
 * Normalizes every clip in a list (sequential — ffmpeg is single-threaded
 * enough that parallelism isn't worth the complexity).
 *
 * @param {Array<Object>} clips
 * @param {number} [targetPeak=0.95]
 * @param {Object|null} [store]
 * @param {((progress: number) => void)|null} [onProgress]
 * @param {Object} [options] - Same options as `normalizeClip`.
 * @returns {Promise<{
 *   results: Array,
 *   total: number,
 *   normalized: number,
 *   failed: number,
 *   success: boolean,
 * }>}
 */
export async function normalizeAll(
  clips,
  targetPeak = 0.95,
  store,
  onProgress,
  options = {}
) {
  const results = []
  const total = clips.length
  let done = 0

  for (const clip of clips) {
    const result = await normalizeClip(clip, targetPeak, store, options)
    results.push({ clipId: clip.id, ...result })
    done++
    if (onProgress) onProgress(done / total)
  }

  const normalized = results.filter((r) => r?.normalized)
  const failed = results.filter((r) => r === null)

  return {
    results,
    total: results.length,
    normalized: normalized.length,
    failed: failed.length,
    success: failed.length === 0,
  }
}

/**
 * Returns analysis info + a human-readable recommendation for a file.
 *
 * @param {string} filePath
 * @returns {Promise<{
 *   summary: {peak: string, rms: string, hasAudio: string, duration: string, channels: number},
 *   recommendation: string,
 *   [key: string]: any,
 * }|null>}
 */
export async function getVolumeInfo(filePath) {
  const analysis = await analyzeVolume(filePath)
  if (!analysis) return null

  return {
    ...analysis,
    summary: {
      peak: analysis.peakDb.toFixed(1) + ' dB',
      rms: analysis.rmsDb.toFixed(1) + ' dB',
      hasAudio: analysis.hasAudio ? 'Yes' : 'No',
      duration: analysis.duration.toFixed(1) + 's',
      channels: analysis.numberOfChannels,
    },
    recommendation:
      analysis.maxPeak < 0.1
        ? '⚠️ Very quiet file, normalization recommended'
        : analysis.maxPeak > 0.9
          ? '⚠️ File close to clipping, reduce volume'
          : '✅ Correct level',
  }
}

export default {
  analyzeVolume,
  normalizeClip,
  normalizeAll,
  getVolumeInfo,
}