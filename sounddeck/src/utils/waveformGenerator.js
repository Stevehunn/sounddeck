/**
 * Génère les données de waveform depuis un fichier audio via Web Audio API
 * @param {string} filePath - chemin du fichier audio source
 * @param {number} samples - nombre de barres à générer
 * @param {number} startOffset - point de départ (en secondes) dans le fichier source.
 *   Utile pour un clip issu d'un split, qui ne doit afficher que SA portion du fichier,
 *   pas le fichier entier compressé dans sa largeur (ce qui donnait l'impression que
 *   les deux moitiés d'un clip coupé affichaient la même waveform en double).
 * @param {number|null} sliceDuration - durée (en secondes) de la portion à afficher,
 *   ou null pour aller jusqu'à la fin du fichier
 */
export async function generateWaveformData(filePath, samples = 200, startOffset = 0, sliceDuration = null) {
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

    const fullData = audioBuffer.getChannelData(0)

    // ✅ Ne garder que la portion du fichier correspondant à ce clip
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
export async function generateWaveformDataWorker(filePath, samples = 200, startOffset = 0, sliceDuration = null) {
  // TODO: Implémenter avec un Web Worker pour les gros fichiers
  return generateWaveformData(filePath, samples, startOffset, sliceDuration)
}