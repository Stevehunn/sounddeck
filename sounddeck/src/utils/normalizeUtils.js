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
      hasAudio: maxPeak > 0.001
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
 * Normalise le volume d'un clip
 * Utilise l'API Electron pour sauvegarder le fichier
 */
export async function normalizeClip(clip, targetPeak = 0.95, store) {
  if (!clip || !clip.path) return null
  
  try {
    // Analyser le volume actuel
    const analysis = await analyzeVolume(clip.path)
    if (!analysis || !analysis.hasAudio) return null
    
    // Calculer le gain nécessaire
    const gain = targetPeak / analysis.maxPeak
    if (Math.abs(gain - 1) < 0.01) {
      return { normalized: false, gain: 1, originalPeak: analysis.maxPeak }
    }
    
    // Charger le buffer
    const fileUrl = clip.path.startsWith('file://') 
      ? clip.path 
      : 'file:///' + clip.path.replace(/\\/g, '/')
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
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
    
    // Convertir en WAV
    const wavBuffer = audioBufferToWav(audioBuffer)
    
    // ✅ Utiliser l'API Electron pour sauvegarder le fichier
    const fileName = `normalized_${Date.now()}.wav`
    const soundsDir = await window.electronAPI.getSoundsDir()
    const outputPath = soundsDir + '/' + fileName
    
    // ✅ Convertir ArrayBuffer en Uint8Array pour l'API Electron
    const uint8Array = new Uint8Array(wavBuffer)
    
    // ✅ Utiliser writeDroppedFile ou une API équivalente
    // Si tu as une API pour écrire un fichier depuis un buffer
    const result = await window.electronAPI.writeSoundFile?.(outputPath, Array.from(uint8Array))
    
    // Fallback: utiliser writeDroppedFile
    if (!result || !result.success) {
      // Créer un Blob et le télécharger via l'API
      const blob = new Blob([wavBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      
      // Utiliser l'API de téléchargement Electron
      const downloadResult = await window.electronAPI.downloadSoundUrl(url, fileName)
      if (!downloadResult?.success) {
        throw new Error('Impossible de sauvegarder le fichier normalisé')
      }
      outputPath = downloadResult.path
    }
    
    await audioContext.close()
    
    // Mettre à jour le clip
    await store.updateClipWithPath(clip.id, outputPath)
    
    return { 
      normalized: true, 
      gain, 
      originalPeak: analysis.maxPeak,
      newPath: outputPath
    }
    
  } catch (e) {
    console.error('Erreur normalisation:', e)
    return null
  }
}

/**
 * Normalise tous les clips d'une piste ou du projet
 */
export async function normalizeAll(clips, targetPeak = 0.95, store, onProgress) {
  const results = []
  let total = clips.length
  let done = 0
  
  for (const clip of clips) {
    const result = await normalizeClip(clip, targetPeak, store)
    results.push({ clipId: clip.id, ...result })
    done++
    if (onProgress) onProgress(done / total)
  }
  
  return results
}