/**
 * Génère les données de waveform depuis un fichier audio via Web Audio API
 * Optimisé pour une régénération rapide
 */

// Cache des waveforms
const waveformCache = new Map()

/**
 * Génère les données de waveform
 * @param {string} filePath - chemin du fichier audio source
 * @param {number} samples - nombre de barres à générer
 * @param {number} startOffset - point de départ (en secondes)
 * @param {number|null} sliceDuration - durée de la portion à afficher
 * @param {boolean} useCache - utiliser le cache
 * @returns {Promise<Array>} Données de waveform
 */
export async function generateWaveformData(filePath, samples = 200, startOffset = 0, sliceDuration = null, useCache = true) {
  try {
    // Vérifier le cache
    const cacheKey = `${filePath}_${samples}_${startOffset}_${sliceDuration || 'full'}`
    if (useCache && waveformCache.has(cacheKey)) {
      return waveformCache.get(cacheKey)
    }

    const fileUrl = filePath.startsWith('file://') 
      ? filePath 
      : 'file:///' + filePath.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    await audioContext.close()

    const fullData = audioBuffer.getChannelData(0)

    // Ne garder que la portion du fichier correspondant à ce clip
    const startSample = Math.max(0, Math.min(fullData.length, Math.floor(startOffset * audioBuffer.sampleRate)))
    const endSample = sliceDuration != null
      ? Math.max(startSample, Math.min(fullData.length, startSample + Math.floor(sliceDuration * audioBuffer.sampleRate)))
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

    // Normaliser entre 0 et 1
    const max = Math.max(...data)
    const result = max > 0 ? data.map(v => v / max) : data
    
    // Mettre en cache
    if (useCache) {
      waveformCache.set(cacheKey, result)
      // Limiter la taille du cache
      if (waveformCache.size > 200) {
        const keys = Array.from(waveformCache.keys())
        for (let i = 0; i < keys.length - 100; i++) {
          waveformCache.delete(keys[i])
        }
      }
    }
    
    return result
    
  } catch (e) {
    console.error('Waveform generation error:', e)
    return null
  }
}

/**
 * Invalide le cache pour un fichier
 */
export function invalidateWaveformCache(filePath) {
  if (filePath) {
    const keys = Array.from(waveformCache.keys()).filter(k => k.startsWith(filePath))
    keys.forEach(k => waveformCache.delete(k))
  } else {
    waveformCache.clear()
  }
}

/**
 * Génère un waveform avec des points de peaks pour un affichage plus détaillé
 */
export async function generateDetailedWaveform(filePath, samples = 400, startOffset = 0, sliceDuration = null) {
  try {
    const fileUrl = filePath.startsWith('file://') 
      ? filePath 
      : 'file:///' + filePath.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    await audioContext.close()

    const fullData = audioBuffer.getChannelData(0)
    const startSample = Math.max(0, Math.floor(startOffset * audioBuffer.sampleRate))
    const endSample = sliceDuration != null
      ? Math.min(fullData.length, startSample + Math.floor(sliceDuration * audioBuffer.sampleRate))
      : fullData.length
    const rawData = fullData.subarray(startSample, endSample)

    const blockSize = Math.max(1, Math.floor(rawData.length / samples))
    const data = []

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      const end = Math.min(start + blockSize, rawData.length)
      
      let sum = 0
      let max = 0
      for (let j = start; j < end; j++) {
        const abs = Math.abs(rawData[j])
        sum += abs
        if (abs > max) max = abs
      }
      
      const avg = end > start ? sum / (end - start) : 0
      data.push({ avg, max, count: end - start })
    }

    return data
    
  } catch (e) {
    console.error('Detailed waveform generation error:', e)
    return null
  }
}

export default {
  generateWaveformData,
  generateDetailedWaveform,
  invalidateWaveformCache
}