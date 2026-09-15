/**
 * Analyse le volume d'un fichier audio
 */
import { audioBufferToWav } from './wavEncoder'

export async function analyzeVolume(filePath) {
  try {
    const fileUrl = filePath.startsWith('file://')
      ? filePath
      : 'file:///' + filePath.replace(/\\/g, '/')

    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    await audioContext.close()

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
  } catch (e) {
    console.warn('Erreur analyse volume:', e)
    return null
  }
}

/**
 * ✅ Normalise le volume d'un clip avec options avancées
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
    // Analyser le volume actuel
    const analysis = await analyzeVolume(clip.path)
    if (!analysis || !analysis.hasAudio) {
      console.warn('⚠️ Aucun signal audio détecté dans', clip.name)
      return null
    }

    // Calculer le gain nécessaire
    let gain
    if (useRMS) {
      gain = targetRMS / analysis.rms
    } else {
      gain = targetPeak / analysis.maxPeak
    }

    // Limiter le gain pour éviter la distorsion
    gain = Math.max(minGain, Math.min(maxGain, gain))

    // Si le gain est proche de 1, pas besoin de normaliser
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

    // Charger le buffer
    const fileUrl = clip.path.startsWith('file://')
      ? clip.path
      : 'file:///' + clip.path.replace(/\\/g, '/')

    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // Appliquer le gain
    const channels = audioBuffer.numberOfChannels
    const length = audioBuffer.length

    for (let channel = 0; channel < channels; channel++) {
      const data = audioBuffer.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        data[i] *= gain
      }
    }

    // Vérifier l'écrêtage
    let maxPeakAfter = 0
    for (let channel = 0; channel < channels; channel++) {
      const data = audioBuffer.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        const abs = Math.abs(data[i])
        if (abs > maxPeakAfter) maxPeakAfter = abs
      }
    }

    // Si écrêtage, réduire le gain
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

    // Déterminer le nom du fichier
    const ext = outputFormat === 'mp3' ? 'mp3' : 'wav'
    const fileName = `normalized_${Date.now()}_${clip.name.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`
    const soundsDir = await window.electronAPI.getSoundsDir()
    const outputPath = soundsDir + '/' + fileName

    // Convertir en WAV
    const wavBuffer = audioBufferToWav(audioBuffer)
    const uint8Array = new Uint8Array(wavBuffer)

    let finalPath = outputPath

    if (outputFormat === 'mp3') {
      // Sauvegarder d'abord en WAV temporaire
      const tempPath = outputPath.replace('.mp3', '.temp.wav')
      await saveFileViaElectron(tempPath, uint8Array)

      // Convertir en MP3
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
      // Sauvegarder directement en WAV
      const result = await saveFileViaElectron(outputPath, uint8Array)
      if (!result.success) {
        throw new Error('Impossible de sauvegarder le fichier normalisé')
      }
      finalPath = outputPath
    }

    await audioContext.close()

    // Mettre à jour le clip dans le store
    await store.updateClipWithPath(clip.id, finalPath)

    return {
      normalized: true,
      gain,
      originalPeak: analysis.maxPeak,
      originalRms: analysis.rms,
      finalPeak: maxPeakAfter,
      newPath: finalPath,
    }
  } catch (e) {
    console.error('❌ Erreur normalisation:', e)
    return null
  }
}

/**
 * Sauvegarde un fichier via l'API Electron
 */
async function saveFileViaElectron(filePath, data) {
  try {
    const result = await window.electronAPI.writeSoundFile?.(
      filePath,
      Array.from(data)
    )
    if (result?.success) {
      return { success: true, path: filePath }
    }
  } catch (e) {
    console.warn('writeSoundFile non disponible:', e)
  }

  // Fallback : utiliser downloadSoundUrl
  try {
    const blob = new Blob([data], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const fileName =
      filePath.split('/').pop() ||
      filePath.split('\\').pop() ||
      'normalized.wav'

    const result = await window.electronAPI.downloadSoundUrl?.(url, fileName)
    if (result?.success) {
      return { success: true, path: result.path }
    }
  } catch (e) {
    console.warn('downloadSoundUrl non disponible:', e)
  }

  // Dernier fallback : téléchargement via le navigateur
  try {
    const blob = new Blob([data], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download =
      filePath.split('/').pop() ||
      filePath.split('\\').pop() ||
      'normalized.wav'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return { success: true, path: 'download://' + a.download }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

/**
 * ✅ Normalise tous les clips d'une piste ou du projet avec progression
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
 * ✅ Analyse et retourne des informations sur le volume d'un fichier
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