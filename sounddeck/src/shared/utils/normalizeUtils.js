/**
 * Analyse le volume d'un fichier audio
 */
export async function analyzeVolume(filePath) {
  try {
    const fileUrl = filePath.startsWith('file://') 
      ? filePath 
      : 'file:///' + filePath.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
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
      numberOfChannels: channels
    }
  } catch (e) {
    console.warn('Erreur analyse volume:', e)
    return null
  }
}

/**
 * Convertit un AudioBuffer en WAV (ArrayBuffer)
 */
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  
  const samples = buffer.length
  const dataSize = samples * numChannels * bytesPerSample
  const headerSize = 44
  const totalSize = headerSize + dataSize
  
  const wav = new ArrayBuffer(totalSize)
  const view = new DataView(wav)
  
  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')
  
  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  
  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  
  // Écrire les données audio
  const offset = 44
  const dataView = new DataView(wav, offset)
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    let idx = channel * bytesPerSample
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      dataView.setInt16(idx + i * blockAlign, int16, true)
    }
  }
  
  return wav
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * ✅ Normalise le volume d'un clip avec options avancées
 * @param {Object} clip - Le clip à normaliser
 * @param {number} targetPeak - Pic cible (0-1), 0.95 par défaut
 * @param {Object} store - Le store de l'application
 * @param {Object} options - Options avancées
 * @param {string} options.outputFormat - Format de sortie ('wav' ou 'mp3')
 * @param {number} options.bitrate - Bitrate pour le MP3 (128-320)
 * @param {boolean} options.useRMS - Utiliser RMS au lieu du peak
 * @param {number} options.targetRMS - Cible RMS si useRMS = true
 * @param {number} options.maxGain - Gain maximum autorisé (évite la distorsion)
 * @param {number} options.minGain - Gain minimum autorisé
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
    preserveOriginal = false
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
        originalRms: analysis.rms
      }
    }
    
    console.log(`🔊 Normalisation de "${clip.name}": gain = ${gain.toFixed(2)}x (${analysis.peakDb.toFixed(1)}dB → ${(20 * Math.log10(targetPeak)).toFixed(1)}dB)`)
    
    // Charger le buffer
    const fileUrl = clip.path.startsWith('file://') 
      ? clip.path 
      : 'file:///' + clip.path.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
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
      console.warn(`⚠️ Écrêtage détecté (${maxPeakAfter.toFixed(2)}), réduction du gain à ${(gain * reduction).toFixed(2)}x`)
      for (let channel = 0; channel < channels; channel++) {
        const data = audioBuffer.getChannelData(channel)
        for (let i = 0; i < length; i++) {
          data[i] *= reduction
        }
      }
      gain *= reduction
    }
    
    // Déterminer le nom du fichier
    const originalExt = clip.path.split('.').pop() || 'wav'
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
      const conversionResult = await window.electronAPI.convertAudio?.(tempPath, outputPath, 'mp3', bitrate)
      
      if (conversionResult?.success) {
        // Supprimer le fichier temporaire
        try {
          await window.electronAPI.deleteSoundFile?.(tempPath)
        } catch (e) {}
        finalPath = outputPath
      } else {
        // Fallback : garder le WAV
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
      newPath: finalPath
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
    const result = await window.electronAPI.writeSoundFile?.(filePath, Array.from(data))
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
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'normalized.wav'
    
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
    a.download = filePath.split('/').pop() || filePath.split('\\').pop() || 'normalized.wav'
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
 * @param {Array} clips - Liste des clips à normaliser
 * @param {number} targetPeak - Pic cible
 * @param {Object} store - Le store de l'application
 * @param {Function} onProgress - Callback de progression (0-1)
 * @param {Object} options - Options avancées
 */
export async function normalizeAll(clips, targetPeak = 0.95, store, onProgress, options = {}) {
  const results = []
  let total = clips.length
  let done = 0
  
  for (const clip of clips) {
    const result = await normalizeClip(clip, targetPeak, store, options)
    results.push({ clipId: clip.id, ...result })
    done++
    if (onProgress) onProgress(done / total)
  }
  
  // Compter les résultats
  const normalized = results.filter(r => r?.normalized)
  const failed = results.filter(r => r === null)
  
  return {
    results,
    total: results.length,
    normalized: normalized.length,
    failed: failed.length,
    success: failed.length === 0
  }
}

/**
 * ✅ Analyse et retourne des informations sur le volume d'un fichier
 * Utile pour le débogage
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
      channels: analysis.numberOfChannels
    },
    recommendation: analysis.maxPeak < 0.1 
      ? '⚠️ Fichier très silencieux, normalisation recommandée'
      : analysis.maxPeak > 0.9 
        ? '⚠️ Fichier proche de l\'écrêtage, réduire le volume'
        : '✅ Niveau correct'
  }
}

export default {
  analyzeVolume,
  normalizeClip,
  normalizeAll,
  getVolumeInfo
}