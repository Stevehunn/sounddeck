/**
 * Génère les données de waveform depuis un fichier audio via Web Audio API
 */
export async function generateWaveformData(filePath, samples = 200) {
  try {
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

    const rawData = audioBuffer.getChannelData(0)
    const blockSize = Math.floor(rawData.length / samples)
    const data = []

    for (let i = 0; i < samples; i++) {
      let sum = 0
      const start = i * blockSize
      const end = Math.min(start + blockSize, rawData.length)
      for (let j = start; j < end; j++) {
        sum += Math.abs(rawData[j])
      }
      data.push(sum / (end - start))
    }

    // Normaliser entre 0 et 1
    const max = Math.max(...data)
    return max > 0 ? data.map(v => v / max) : data
    
  } catch (e) {
    console.error('Waveform generation error:', e)
    return null
  }
}

/**
 * Version optimisée avec Web Worker (optionnel)
 * Pour l'instant, on garde la version simple
 */
export async function generateWaveformDataWorker(filePath, samples = 200) {
  // TODO: Implémenter avec un Web Worker pour les gros fichiers
  return generateWaveformData(filePath, samples)
}