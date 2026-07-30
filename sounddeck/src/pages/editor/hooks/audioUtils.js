// src/pages/editor/hooks/audioUtils.js

/**
 * Convertit dB en valeur linéaire
 */
export function dbToLinear(db) {
  return Math.pow(10, db / 20)
}

/**
 * Convertit une valeur linéaire en dB
 */
export function linearToDb(linear) {
  return 20 * Math.log10(linear)
}

/**
 * Formate un temps en MM:SS.ms
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`
}

/**
 * Charge un fichier audio en buffer
 */
export async function loadAudioBuffer(audioContext, filePath) {
  try {
    const fileUrl = filePath.startsWith('file://')
      ? filePath
      : 'file:///' + filePath.replace(/\\/g, '/')
    
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return await audioContext.decodeAudioData(arrayBuffer)
  } catch (e) {
    console.error('Erreur chargement audio:', e)
    throw e
  }
}

/**
 * Crée un gain node avec les paramètres donnés
 */
export function createGainNode(audioContext, initialValue = 1.0) {
  const gainNode = audioContext.createGain()
  gainNode.gain.value = Math.max(0, Math.min(5, initialValue))
  return gainNode
}

/**
 * Crée un delay node pour l'écho
 */
export function createDelayNode(audioContext, delayTime = 0.3) {
  const delayNode = audioContext.createDelay()
  delayNode.delayTime.value = Math.max(0.05, Math.min(3, delayTime))
  return delayNode
}

/**
 * Génère une réponse impulsionnelle pour la réverbération
 */
export function generateImpulseResponse(audioContext, roomSize, decay = 0.5) {
  const sampleRate = audioContext.sampleRate
  const length = Math.max(0.1, roomSize * 2) * sampleRate
  const impulseBuffer = audioContext.createBuffer(1, length, sampleRate)
  const data = impulseBuffer.getChannelData(0)
  
  for (let i = 0; i < length; i++) {
    const envelope = Math.exp(-i / (length * decay))
    data[i] = (Math.random() * 2 - 1) * envelope
  }
  
  return impulseBuffer
}