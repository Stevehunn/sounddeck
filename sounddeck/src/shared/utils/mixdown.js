/**
 * @file Multi-track mixdown pipeline.
 *
 * Renders a project (tracks + clips + per-clip effects) into a single
 * `AudioBuffer` using an `OfflineAudioContext`, then exports it to a file
 * (`exportMixdown`) either as WAV (direct) or MP3/OGG (via ffmpeg, with a
 * WAV fallback).
 *
 * The renderer is **solo-aware**: if any track has `solo === true`, only
 * soloed tracks are included. Muted tracks are always excluded.
 *
 * Clip effects (volume/fadeIn/fadeOut/speed/echo/reverb) are applied by
 * `applyEffectsToBuffer` from `realTimeEffects.js` — if that module fails
 * to load, the mixdown continues without effects (logged).
 *
 * User-facing error/warning messages are translated via `translate()`.
 *
 * @see @shared/utils/realTimeEffects.js
 * @see @shared/utils/wavEncoder.js
 * @see @shared/utils/fileExport.js
 * @see @shared/utils/translator.js
 */

import { audioBufferToWav } from './wavEncoder'
import { saveAudioBuffer } from './fileExport'
import { buildFileUrl } from './fileUrl'
import { logWarn, logError } from './logger'
import { translate } from './translator'

/**
 * Renders a project to a single `AudioBuffer`.
 *
 * @param {Object} project - `{ tracks: Array<{clips: Array, volume, muted, solo}> }`.
 * @param {Record<string, number>} clipDurations - Map of `clipId → duration (s)`.
 * @param {number} [sampleRate=44100]
 * @param {((progress: number) => void)|null} [onProgress] - Called with 0-1 progress.
 * @param {number} [exportStart=0] - Start of the render window (seconds).
 * @param {number|null} [exportEnd=null] - End of the render window (`null` = end of last clip).
 * @returns {Promise<AudioBuffer>}
 */
export async function mixdownProject(
  project,
  clipDurations,
  sampleRate = 44100,
  onProgress,
  exportStart = 0,
  exportEnd = null
) {
  if (!project || !project.tracks || project.tracks.length === 0) {
    throw new Error(translate('mixdownErrorEmptyProject'))
  }

  let totalDuration = 0
  const clipsWithInfo = []

  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const duration = clipDurations[clip.id] || clip.duration || 3
      const end = clip.start + duration

      if (exportEnd !== null) {
        if (clip.start > exportEnd || end < exportStart) {
          continue
        }
      }

      const endTime = exportEnd !== null ? Math.min(end, exportEnd) : end
      if (endTime > totalDuration) totalDuration = endTime

      clipsWithInfo.push({
        ...clip,
        trackId: track.id,
        duration,
        end,
        trackVolume: track.volume || 1,
        trackMuted: track.muted || false,
        trackSolo: track.solo || false,
      })
    }
  }

  if (exportEnd !== null && exportEnd > totalDuration) {
    totalDuration = exportEnd
  } else {
    totalDuration += 0.1
  }

  if (clipsWithInfo.length === 0) {
    throw new Error(translate('mixdownErrorNoClips'))
  }

  const offlineContext = new OfflineAudioContext(
    2,
    Math.ceil(totalDuration * sampleRate),
    sampleRate
  )

  const hasSolo = clipsWithInfo.some((c) => c.trackSolo)
  const soloTrackIds = hasSolo
    ? clipsWithInfo.filter((c) => c.trackSolo).map((c) => c.trackId)
    : []

  const trackGains = {}
  for (const clip of clipsWithInfo) {
    if (!trackGains[clip.trackId]) {
      trackGains[clip.trackId] = {
        volume: clip.trackVolume || 1,
        muted: clip.trackMuted || false,
        solo: clip.trackSolo || false,
      }
    }
  }

  let processed = 0
  const totalClips = clipsWithInfo.length

  let applyEffectsToBufferFn = null
  try {
    const effectsModule = await import('./realTimeEffects')
    applyEffectsToBufferFn = effectsModule.applyEffectsToBuffer
  } catch {
    logWarn(
      'mixdown',
      'realTimeEffects unavailable, effects will not be applied'
    )
  }

  const mixPromises = clipsWithInfo.map(async (clipInfo) => {
    if (hasSolo && !soloTrackIds.includes(clipInfo.trackId)) {
      processed++
      if (onProgress) onProgress(processed / totalClips)
      return null
    }

    if (trackGains[clipInfo.trackId]?.muted) {
      processed++
      if (onProgress) onProgress(processed / totalClips)
      return null
    }

    try {
      const fileUrl = buildFileUrl(clipInfo.path)

      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer)

      let processedBuffer = audioBuffer
      if (
        clipInfo.effects &&
        clipInfo.effects.length > 0 &&
        applyEffectsToBufferFn
      ) {
        try {
          processedBuffer = applyEffectsToBufferFn(
            audioBuffer,
            clipInfo.effects,
            sampleRate,
            true
          )
        } catch (e) {
          logWarn(
            'mixdown',
            `Error applying effects to "${clipInfo.name}"`,
            e
          )
        }
      }

      const source = offlineContext.createBufferSource()
      source.buffer = processedBuffer

      const clipGain = offlineContext.createGain()

      const clipVolumeDb = clipInfo.volumeDb || clipInfo.volume || 0
      const clipVolumeLinear = Math.pow(10, clipVolumeDb / 20)
      const trackVolume = trackGains[clipInfo.trackId]?.volume || 1
      const masterVolume = 0.9
      const finalVolume = Math.min(
        1,
        clipVolumeLinear * trackVolume * masterVolume
      )
      clipGain.gain.value = finalVolume

      source.connect(clipGain)
      clipGain.connect(offlineContext.destination)

      const startTime = Math.max(0, clipInfo.start - exportStart)
      const duration = clipInfo.duration || 3
      const offset = clipInfo.offset || 0

      let adjustedOffset = offset
      let adjustedDuration = duration
      if (clipInfo.start < exportStart) {
        adjustedOffset = offset + (exportStart - clipInfo.start)
        adjustedDuration = duration - (exportStart - clipInfo.start)
      }

      if (exportEnd !== null && clipInfo.start + duration > exportEnd) {
        adjustedDuration = exportEnd - Math.max(clipInfo.start, exportStart)
      }

      if (adjustedDuration > 0) {
        source.start(startTime, adjustedOffset, adjustedDuration)
      }

      processed++
      if (onProgress) onProgress(processed / totalClips)

      return source
    } catch (e) {
      logWarn('mixdown', `Error mixing clip "${clipInfo.name}"`, e)
      processed++
      if (onProgress) onProgress(processed / totalClips)
      return null
    }
  })

  await Promise.allSettled(mixPromises)

  let renderedBuffer
  try {
    renderedBuffer = await offlineContext.startRendering()
  } catch (e) {
    logError('mixdown', 'Render error', e)
    throw new Error(translate('mixdownErrorRenderError'), { cause: e })
  }

  return renderedBuffer
}

/**
 * Exports a rendered buffer to a file.
 *
 * - `format === 'wav'` — direct WAV save.
 * - `format === 'mp3' | 'ogg'` — converts via ffmpeg; falls back to WAV on
 *   failure (returned with `warning`).
 *
 * @param {AudioBuffer} buffer
 * @param {'mp3'|'wav'|'ogg'} [format='mp3']
 * @param {number} [bitrate=192]
 * @param {string} outputPath
 * @param {((progress: number) => void)|null} [onProgress]
 * @returns {Promise<{
 *   success: boolean,
 *   path?: string,
 *   format?: string,
 *   size?: number,
 *   warning?: string,
 *   error?: string,
 * }>}
 */
export async function exportMixdown(
  buffer,
  format = 'mp3',
  bitrate = 192,
  outputPath,
  onProgress
) {
  try {
    if (!outputPath) {
      logError('mixdown', 'outputPath is undefined')
      return { success: false, error: translate('mixdownErrorMissingPath') }
    }

    if (onProgress) onProgress(0.1)

    const wavData = audioBufferToWav(buffer)
    if (onProgress) onProgress(0.2)

    if (format === 'wav') {
      const result = await saveAudioBuffer(wavData, outputPath)
      if (onProgress) onProgress(1)
      return result
    }

    try {
      const tempPath = outputPath + '.temp.wav'
      const saveResult = await saveAudioBuffer(wavData, tempPath)

      if (!saveResult.success) {
        const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
        await saveAudioBuffer(wavData, fallbackPath)
        if (onProgress) onProgress(1)
        return {
          success: true,
          path: fallbackPath,
          format: 'wav',
          warning: translate('mixdownWarningConversionFailed'),
        }
      }

      if (onProgress) onProgress(0.4)

      const result = await window.electronAPI.convertAudio?.(
        tempPath,
        outputPath,
        format,
        bitrate
      )

      if (onProgress) onProgress(0.9)

      try {
        await window.electronAPI.deleteSoundFile?.(tempPath)
      } catch {
        // ignore
      }

      if (result?.success) {
        if (onProgress) onProgress(1)
        return {
          success: true,
          path: outputPath,
          format,
          size: result.size || 0,
        }
      }

      const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
      await saveAudioBuffer(wavData, fallbackPath)
      if (onProgress) onProgress(1)
      return {
        success: true,
        path: fallbackPath,
        format: 'wav',
        warning: translate('mixdownWarningConversionFailed'),
      }
    } catch (e) {
      logWarn('mixdown', 'Conversion error', e)

      const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
      await saveAudioBuffer(wavData, fallbackPath)
      if (onProgress) onProgress(1)
      return {
        success: true,
        path: fallbackPath,
        format: 'wav',
        warning: translate('mixdownWarningConversionError'),
      }
    }
  } catch (e) {
    logError('mixdown', 'Export error', e)
    return {
      success: false,
      error: e.message,
    }
  }
}

export default {
  mixdownProject,
  exportMixdown,
}