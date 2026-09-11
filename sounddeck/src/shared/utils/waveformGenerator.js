// src/shared/utils/waveformGenerator.js

// Cache des waveforms
const waveformCache = new Map()

/**
 * Génère les données de waveform depuis un fichier audio
 */
export async function generateWaveformData(filePath, samples = 200, startOffset = 0, sliceDuration = null, useCache = true) {
  try {
    const cacheKey = `${filePath}_${samples}_${startOffset}_${sliceDuration || 'full'}`
    if (useCache && waveformCache.has(cacheKey)) {
      return waveformCache.get(cacheKey)
    }

    try {
      const exists = await window.electronAPI.fileExists(filePath)
      if (!exists) {
        console.error(`❌ Fichier non trouvé: ${filePath}`)
        return null
      }
    } catch (e) {
      console.warn(`⚠️ Erreur vérification existence:`, e)
    }

    let arrayBuffer
    try {
      const fileUrl = filePath.startsWith('file://')
        ? filePath
        : 'file:///' + filePath.replace(/\\/g, '/')

      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      arrayBuffer = await response.arrayBuffer()
    } catch (fetchError) {
      console.warn(`⚠️ Fetch a échoué:`, fetchError.message)

      try {
        const fileUrl = filePath.startsWith('file://')
          ? filePath
          : 'file:///' + filePath.replace(/\\/g, '/')

        arrayBuffer = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('GET', fileUrl, true)
          xhr.responseType = 'arraybuffer'
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(xhr.response)
            } else {
              reject(new Error(`XHR error: ${xhr.status}`))
            }
          }
          xhr.onerror = () => reject(new Error('XHR network error'))
          xhr.send()
        })
      } catch (xhrError) {
        console.warn(`⚠️ XHR a échoué:`, xhrError.message)

        try {
          const result = await window.electronAPI.readFile(filePath)
          if (result && result.data) {
            arrayBuffer = result.data
          } else {
            throw new Error('readFile a retourné des données vides')
          }
        } catch (readError) {
          console.error(`❌ Toutes les méthodes ont échoué:`, readError.message)
          return null
        }
      }
    }

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      console.error(`❌ ArrayBuffer vide`)
      return null
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    await audioContext.close()

    const fullData = audioBuffer.getChannelData(0)
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

    const max = Math.max(...data)
    const result = max > 0 ? data.map(v => v / max) : data

    if (useCache) {
      waveformCache.set(cacheKey, result)
    }

    return result

  } catch (e) {
    console.error('❌ Waveform generation error:', e)
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

export default {
  generateWaveformData,
  invalidateWaveformCache
}