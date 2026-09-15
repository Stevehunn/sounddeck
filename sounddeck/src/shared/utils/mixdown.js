/**
 * Mixdown réel - Fusionne tous les clips en un seul fichier audio
 */
import { audioBufferToWav } from './wavEncoder'
import { saveAudioBuffer } from './fileExport'

/**
 * Mixe tous les clips d'un projet en un seul buffer audio
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
    throw new Error('Projet vide')
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
        duration: duration,
        end: end,
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
    throw new Error('Aucun clip à mixer dans la sélection')
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
  } catch (e) {
    console.warn(
      '⚠️ realTimeEffects non disponible, les effets ne seront pas appliqués'
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
      const fileUrl = clipInfo.path.startsWith('file://')
        ? clipInfo.path
        : 'file:///' + clipInfo.path.replace(/\\/g, '/')

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
          console.warn(
            `Erreur application effets sur "${clipInfo.name}":`,
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
      console.warn(
        `⚠️ Erreur lors du mixage du clip "${clipInfo.name}":`,
        e.message
      )
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
    console.error('Erreur lors du rendu:', e)
    throw new Error('Erreur lors du rendu audio')
  }

  return renderedBuffer
}

/**
 * Exporte le mixdown vers un fichier audio
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
      console.error('❌ [mixdown] outputPath est undefined !')
      return { success: false, error: 'outputPath manquant' }
    }

    if (onProgress) onProgress(0.1)

    const wavData = audioBufferToWav(buffer)
    if (onProgress) onProgress(0.2)

    if (format === 'wav') {
      // ✅ S6 : utilise saveAudioBuffer centralisé
      const result = await saveAudioBuffer(wavData, outputPath)
      if (onProgress) onProgress(1)
      return result
    }

    try {
      const tempPath = outputPath + '.temp.wav'
      const saveResult = await saveAudioBuffer(wavData, tempPath)

      if (!saveResult.success) {
        const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
        const result = await saveAudioBuffer(wavData, fallbackPath)
        if (onProgress) onProgress(1)
        return {
          success: true,
          path: fallbackPath,
          format: 'wav',
          warning: 'Conversion impossible, export en WAV',
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
      } catch (e) {}

      if (result?.success) {
        if (onProgress) onProgress(1)
        return {
          success: true,
          path: outputPath,
          format: format,
          size: result.size || 0,
        }
      }

      const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
      const fallbackResult = await saveAudioBuffer(wavData, fallbackPath)
      if (onProgress) onProgress(1)
      return {
        success: true,
        path: fallbackPath,
        format: 'wav',
        warning: 'Conversion impossible, export en WAV',
      }
    } catch (e) {
      console.warn('⚠️ Erreur conversion:', e.message)

      const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
      const result = await saveAudioBuffer(wavData, fallbackPath)
      if (onProgress) onProgress(1)
      return {
        success: true,
        path: fallbackPath,
        format: 'wav',
        warning: 'Erreur conversion, export en WAV',
      }
    }
  } catch (e) {
    console.error('❌ Erreur export:', e)
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