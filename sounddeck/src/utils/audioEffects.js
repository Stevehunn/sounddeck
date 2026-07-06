/**
 * Applique un fade in sur un buffer audio
 */
export function applyFadeIn(audioBuffer, duration = 0.5) {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const fadeSamples = Math.floor(duration * sampleRate)
  
  for (let i = 0; i < Math.min(fadeSamples, channelData.length); i++) {
    const ratio = i / fadeSamples
    const gain = ratio * ratio
    channelData[i] *= gain
  }
  
  return audioBuffer
}

/**
 * Applique un fade out sur un buffer audio
 */
export function applyFadeOut(audioBuffer, duration = 0.5) {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const fadeSamples = Math.floor(duration * sampleRate)
  const start = Math.max(0, channelData.length - fadeSamples)
  
  for (let i = start; i < channelData.length; i++) {
    const ratio = (i - start) / fadeSamples
    const gain = 1 - (ratio * ratio)
    channelData[i] *= gain
  }
  
  return audioBuffer
}

/**
 * Applique un fade in et fade out sur un buffer audio
 */
export function applyFade(audioBuffer, fadeInDuration = 0.5, fadeOutDuration = 0.5) {
  const result = audioBuffer
  applyFadeIn(result, fadeInDuration)
  applyFadeOut(result, fadeOutDuration)
  return result
}

/**
 * Change la vitesse de lecture d'un buffer audio
 */
export function changePitch(audioBuffer, speed = 1.0) {
  if (speed === 1.0) return audioBuffer
  
  const sampleRate = audioBuffer.sampleRate
  const channels = audioBuffer.numberOfChannels
  const length = Math.floor(audioBuffer.length / speed)
  
  const newBuffer = audioBuffer.context.createBuffer(channels, length, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    for (let i = 0; i < length; i++) {
      const srcIndex = i * speed
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
      const frac = srcIndex - srcIndexFloor
      
      newData[i] = data[srcIndexFloor] * (1 - frac) + data[srcIndexCeil] * frac
    }
  }
  
  return newBuffer
}

/**
 * Change la hauteur tonale (pitch) sans modifier la vitesse
 */
export function changePitchOnly(audioBuffer, semitones = 0) {
  if (semitones === 0) return audioBuffer
  
  const pitchRatio = Math.pow(2, semitones / 12)
  const speed = 1 / pitchRatio
  
  const pitchedBuffer = changePitch(audioBuffer, speed)
  
  const sampleRate = audioBuffer.sampleRate
  const channels = audioBuffer.numberOfChannels
  const originalLength = audioBuffer.length
  
  const finalBuffer = audioBuffer.context.createBuffer(channels, originalLength, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = pitchedBuffer.getChannelData(channel)
    const newData = finalBuffer.getChannelData(channel)
    
    const speedRatio = pitchedBuffer.length / originalLength
    
    for (let i = 0; i < originalLength; i++) {
      const srcIndex = i * speedRatio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
      const frac = srcIndex - srcIndexFloor
      
      newData[i] = data[srcIndexFloor] * (1 - frac) + data[srcIndexCeil] * frac
    }
  }
  
  return finalBuffer
}

/**
 * Applique un effet d'écho simple sur un buffer audio
 */
export function applyEcho(audioBuffer, delay = 0.3, decay = 0.5, mix = 0.3) {
  const sampleRate = audioBuffer.sampleRate
  const channels = audioBuffer.numberOfChannels
  const delaySamples = Math.floor(delay * sampleRate)
  
  const newBuffer = audioBuffer.context.createBuffer(channels, audioBuffer.length + delaySamples, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    for (let i = 0; i < data.length; i++) {
      newData[i] = data[i] * (1 - mix)
    }
    
    for (let i = 0; i < data.length; i++) {
      if (i + delaySamples < newData.length) {
        newData[i + delaySamples] += data[i] * mix * decay
      }
    }
  }
  
  return newBuffer
}

/**
 * Applique une réverbération simple
 */
export function applyReverb(audioBuffer, roomSize = 0.5, mix = 0.2) {
  const sampleRate = audioBuffer.sampleRate
  const channels = audioBuffer.numberOfChannels
  const reverbLength = Math.floor(roomSize * sampleRate * 1.5)
  
  const newBuffer = audioBuffer.context.createBuffer(channels, audioBuffer.length + reverbLength, sampleRate)
  
  const irBuffer = audioBuffer.context.createBuffer(1, reverbLength, sampleRate)
  const irData = irBuffer.getChannelData(0)
  
  for (let i = 0; i < reverbLength; i++) {
    const decay = Math.exp(-i / (reverbLength * 0.3))
    irData[i] = (Math.random() * 2 - 1) * decay
  }
  
  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    for (let i = 0; i < data.length; i++) {
      newData[i] += data[i] * (1 - mix)
    }
    
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < Math.min(reverbLength, newData.length - i); j++) {
        if (j < reverbLength) {
          newData[i + j] += data[i] * irData[j] * mix
        }
      }
    }
  }
  
  return newBuffer
}

/**
 * Normalise un buffer audio
 */
export function normalizeAudio(audioBuffer, targetPeak = 0.95) {
  const channels = audioBuffer.numberOfChannels
  let maxPeak = 0
  
  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i])
      if (abs > maxPeak) maxPeak = abs
    }
  }
  
  if (maxPeak === 0) return audioBuffer
  
  const gain = targetPeak / maxPeak
  
  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    for (let i = 0; i < data.length; i++) {
      data[i] *= gain
    }
  }
  
  return audioBuffer
}

/**
 * Crée un spectre à partir d'un buffer audio
 */
export function getAudioSpectrum(audioBuffer, fftSize = 1024) {
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  )
  
  const source = offlineContext.createBufferSource()
  source.buffer = audioBuffer
  
  const analyser = offlineContext.createAnalyser()
  analyser.fftSize = fftSize
  analyser.smoothingTimeConstant = 0.8
  
  source.connect(analyser)
  analyser.connect(offlineContext.destination)
  
  source.start()
  offlineContext.startRendering()
  
  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(dataArray)
  
  return {
    frequencies: Array.from(dataArray),
    binCount: analyser.frequencyBinCount,
    sampleRate: audioBuffer.sampleRate
  }
}

/**
 * Charge un fichier audio et le décode en AudioBuffer
 */
export async function loadAudioBuffer(filePath) {
  try {
    const fileUrl = filePath.startsWith('file://') 
      ? filePath 
      : 'file:///' + filePath.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    return audioBuffer
  } catch (e) {
    console.error('Erreur chargement audio:', e)
    return null
  }
}

export default {
  applyFadeIn,
  applyFadeOut,
  applyFade,
  changePitch,
  changePitchOnly,
  applyEcho,
  applyReverb,
  normalizeAudio,
  getAudioSpectrum,
  loadAudioBuffer
}