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
export function changePitch(audioBuffer, speed = 1.0, ctx = null) {
  if (speed === 1.0) return audioBuffer
  
  const context = ctx || new (window.AudioContext || window.webkitAudioContext)()
  
  const sampleRate = audioBuffer.sampleRate
  const channels = audioBuffer.numberOfChannels
  const length = Math.floor(audioBuffer.length / speed)
  
  const newBuffer = context.createBuffer(channels, length, sampleRate)
  
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
export function changePitchOnly(audioBuffer, semitones = 0, ctx = null) {
  if (semitones === 0) return audioBuffer
  
  const context = ctx || new (window.AudioContext || window.webkitAudioContext)()
  
  const pitchRatio = Math.pow(2, semitones / 12)
  const speed = 1 / pitchRatio
  
  const pitchedBuffer = changePitch(audioBuffer, speed, context)
  
  const sampleRate = audioBuffer.sampleRate
  const channels = audioBuffer.numberOfChannels
  const originalLength = audioBuffer.length
  
  const finalBuffer = context.createBuffer(channels, originalLength, sampleRate)
  
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
export function applyEcho(audioBuffer, delay = 0.3, decay = 0.5, mix = 0.3, ctx = null) {
  const context = ctx || new (window.AudioContext || window.webkitAudioContext)()
  
  const sampleRate = audioBuffer.sampleRate
  const channels = audioBuffer.numberOfChannels
  const delaySamples = Math.floor(delay * sampleRate)
  
  const newBuffer = context.createBuffer(channels, audioBuffer.length + delaySamples, sampleRate)
  
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
 * ✅ Applique une réverbération optimisée (version légère)
 * Utilise un filtre simple au lieu d'une convolution complète pour éviter les crashes
 */
export function applyReverb(audioBuffer, roomSize = 0.5, mix = 0.2, ctx = null) {
  if (roomSize <= 0 || mix <= 0) return audioBuffer
  
  const context = ctx || new (window.AudioContext || window.webkitAudioContext)()
  
  const sampleRate = audioBuffer.sampleRate
  const channels = audioBuffer.numberOfChannels
  
  // ✅ Réverbération simplifiée : multiples échos avec décroissance
  // Beaucoup plus léger et ne fait pas crash
  const delays = [0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24]
  const decays = delays.map((_, i) => Math.pow(0.6, i + 1) * roomSize * 0.5)
  
  const maxDelaySamples = Math.floor(delays[delays.length - 1] * sampleRate)
  const newLength = audioBuffer.length + maxDelaySamples + Math.floor(0.1 * sampleRate)
  const newBuffer = context.createBuffer(channels, newLength, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    // Copier le signal original avec le mix
    for (let i = 0; i < data.length; i++) {
      newData[i] = data[i] * (1 - mix)
    }
    
    // Ajouter les échos avec décroissance
    for (let echoIndex = 0; echoIndex < delays.length; echoIndex++) {
      const delaySamples = Math.floor(delays[echoIndex] * sampleRate)
      const decay = decays[echoIndex] * mix
      
      for (let i = 0; i < data.length; i++) {
        if (i + delaySamples < newData.length) {
          newData[i + delaySamples] += data[i] * decay
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
 * Applique un effet individuel sur un buffer
 */
export function applyEffectToBuffer(audioBuffer, effect, sampleRate = 44100, ctx = null) {
  if (!effect.enabled) return audioBuffer
  
  const context = ctx || new (window.AudioContext || window.webkitAudioContext)()
  
  switch (effect.type) {
    case 'volume':
      return applyVolumeEffect(audioBuffer, effect.params.value || 1)
    case 'fadeIn':
      return applyFadeIn(audioBuffer, effect.params.duration || 0.5)
    case 'fadeOut':
      return applyFadeOut(audioBuffer, effect.params.duration || 0.5)
    case 'pitch':
      return changePitchOnly(audioBuffer, effect.params.semitones || 0, context)
    case 'speed':
      return changePitch(audioBuffer, effect.params.value || 1, context)
    case 'echo':
      return applyEcho(audioBuffer, effect.params.delay || 0.3, effect.params.decay || 0.5, effect.params.mix || 0.3, context)
    case 'reverb':
      return applyReverb(audioBuffer, effect.params.roomSize || 0.5, effect.params.mix || 0.2, context)
    default:
      return audioBuffer
  }
}

/**
 * Applique un effet de volume
 */
function applyVolumeEffect(audioBuffer, volume) {
  if (volume === 1) return audioBuffer
  
  const channels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  
  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      data[i] *= volume
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

/**
 * ✅ Applique les effets sur un fichier audio avec limite de taille
 * Pour éviter les crashes, on limite la durée des effets lourds
 */
export async function applyEffectsToFile(filePath, effects, sampleRate = 44100) {
  try {
    // Vérifier si le clip a des effets actifs
    const activeEffects = effects.filter(e => e.enabled)
    if (activeEffects.length === 0) {
      return { success: true, url: null, needsProcessing: false }
    }

    // Charger le fichier audio
    const fileUrl = filePath.startsWith('file://') 
      ? filePath 
      : 'file:///' + filePath.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    
    // ✅ Créer un contexte audio unique pour tout le traitement
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // ✅ Vérifier la durée du son - si trop long, réduire la qualité de la réverbération
    const duration = audioBuffer.duration
    const hasReverb = activeEffects.some(e => e.type === 'reverb')
    
    if (hasReverb && duration > 10) {
      console.log('⚠️ Son long détecté, réverbération optimisée pour éviter le crash')
      // Réduire la taille de la pièce et le mix pour les sons longs
      activeEffects.forEach(e => {
        if (e.type === 'reverb') {
          e.params.roomSize = Math.min(e.params.roomSize || 0.5, 0.3)
          e.params.mix = Math.min(e.params.mix || 0.2, 0.15)
        }
      })
    }
    
    // Appliquer les effets en passant le contexte à chaque fonction
    let processedBuffer = audioBuffer
    for (const effect of activeEffects) {
      processedBuffer = applyEffectToBuffer(processedBuffer, effect, sampleRate, audioContext)
    }
    
    // Normaliser pour éviter l'écrêtage
    processedBuffer = normalizeAudio(processedBuffer, 0.95)
    
    // Convertir en WAV
    const wavData = audioBufferToWav(processedBuffer)
    const blob = new Blob([wavData], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    
    // Nettoyer le contexte
    await audioContext.close()
    
    return { success: true, url, blob, needsProcessing: true }
  } catch (e) {
    console.error('Erreur application effets:', e)
    return { success: false, error: e.message, needsProcessing: false }
  }
}

/**
 * Convertit un AudioBuffer en WAV (ArrayBuffer)
 */
export function audioBufferToWav(buffer) {
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
  loadAudioBuffer,
  applyEffectToBuffer,
  applyEffectsToFile,
  audioBufferToWav
}