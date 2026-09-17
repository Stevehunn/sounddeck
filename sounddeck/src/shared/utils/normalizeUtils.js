/**
 * Analyse et normalisation du volume audio
 */
import { audioBufferToWav } from './wavEncoder'
import { withTemporaryAudioContext } from './audioContext'
import { saveAudioBuffer } from './fileExport'
import { buildFileUrl } from './fileUrl'

/**
 * Analyse le volume d'un fichier audio
 */
export async function analyzeVolume(filePath) {
  try {
    const fileUrl = buildFileUrl(filePath)

    // ✅ S6 : withTemporaryAudioContext gère fetch + decode + close
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
    console.warn('Erreur analyse volume:', e)
    return null
  }
}

/**
 * Normalise le volume d'un clip avec options avancées
 */
export async function normalizeClip(clip, targetPeak = 0.95, store, options = {}) {
  if (!clip || !clip.path) return null

  const {
    outputFormat = 'wav',
    bitrate = 192,
    useRMS = false,
    targetRMS = 0.15,
    maxGain = 10,
    minGain = 0.1,
    preserveOriginal = false,
  } = options

  try {
    const analysis = await analyzeVolume(clip.path)
    if (!analysis || !analysis.hasAudio) {
      console.warn('⚠️ Aucun signal audio détecté dans', clip.name)
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

    console.log(
      `🔊 Normalisation de "${clip.name}": gain = ${gain.toFixed(2)}x (${analysis.peakDb.toFixed(1)}dB → ${(20 * Math.log10(targetPeak)).toFixed(1)}dB)`
    )

    const fileUrl = buildFileUrl(clip.path)

    // ✅ S6 : withTemporaryAudioContext gère fetch + decode + close
    const normalizedResult = await withTemporaryAudioContext(fileUrl, async (audioBuffer, audioContext) => {
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
        console.warn(
          `⚠️ Écrêtage détecté (${maxPeakAfter.toFixed(2)}), réduction du gain à ${(gain * reduction).toFixed(2)}x`
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
      const fileName = `normalized_${Date.now()}_${clip.name.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`
      const soundsDir = await window.electronAPI.getSoundsDir()
      const outputPath = soundsDir + '/' + fileName

      const wavBuffer = audioBufferToWav(audioBuffer)
      const uint8Array = new Uint8Array(wavBuffer)

      let finalPath = outputPath

      if (outputFormat === 'mp3') {
        const tempPath = outputPath.replace('.mp3', '.temp.wav')
        // ✅ S6 : saveAudioBuffer centralisé
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
          } catch (e) {}
          finalPath = outputPath
        } else {
          console.warn('⚠️ Conversion MP3 échouée, utilisation du WAV')
          finalPath = tempPath
        }
      } else {
        const result = await saveAudioBuffer(uint8Array, outputPath)
        if (!result.success) {
          throw new Error('Impossible de sauvegarder le fichier normalisé')
        }
        finalPath = outputPath
      }

      return {
        gain,
        maxPeakAfter,
        finalPath,
      }
    })

    if (!normalizedResult) return null

    if (store && typeof store.updateClipWithPath === 'function') {
      try {
        await store.updateClipWithPath(clip.id, normalizedResult.finalPath)
      } catch (e) {
        console.warn('⚠️ [normalizeClip] updateClipWithPath a échoué:', e?.message)
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
    console.error('❌ Erreur normalisation:', e)
    return null
  }
}

/**
 * Normalise tous les clips d'une piste ou du projet
 */
export async function normalizeAll(
  clips,
  targetPeak = 0.95,
  store,
  onProgress,
  options = {}
) {
  const results = []
  let total = clips.length
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
 * Analyse et retourne des informations sur le volume d'un fichier
 */
export async function getVolumeInfo(filePath) {
  const analysis = await analyzeVolume(filePath)
  if (!analysis) return null

  return {
    ...analysis,
    summary: {
      peak: analysis.peakDb.toFixed(1) + ' dB',
      rms: analysis.rmsDb.toFixed(1) + ' dB',
      hasAudio: analysis.hasAudio ? 'Oui' : 'Non',
      duration: analysis.duration.toFixed(1) + 's',
      channels: analysis.numberOfChannels,
    },
    recommendation:
      analysis.maxPeak < 0.1
        ? '⚠️ Fichier très silencieux, normalisation recommandée'
        : analysis.maxPeak > 0.9
          ? '⚠️ Fichier proche de l\'écrêtage, réduire le volume'
          : '✅ Niveau correct',
  }
}

export default {
  analyzeVolume,
  normalizeClip,
  normalizeAll,
  getVolumeInfo,
}