// src/shared/utils/realTimeEffects.js

/**
 * Applique les effets en temps réel sur un buffer audio source
 * Utilisé pour la prévisualisation des effets pendant l'édition
 * ET pour l'export réel
 */

// Cache des buffers traités
const effectCache = new Map()

/**
 * Applique tous les effets d'un clip sur son buffer audio
 * @param {AudioBuffer} audioBuffer - Buffer source
 * @param {Array} effects - Liste des effets du clip
 * @param {number} sampleRate - Taux d'échantillonnage
 * @param {boolean} normalize - Normaliser le résultat
 * @returns {AudioBuffer} Buffer avec effets appliqués
 */
export function applyEffectsToBuffer(audioBuffer, effects, sampleRate = 44100, normalize = true) {
  if (!audioBuffer || !effects || effects.length === 0) return audioBuffer
  
  let result = audioBuffer
  
  // Filtrer les effets actifs
  const activeEffects = effects.filter(e => e.enabled)
  if (activeEffects.length === 0) return result
  
  // Créer un AudioContext pour le traitement
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  
  try {
    // Appliquer les effets dans l'ordre
    for (const effect of activeEffects) {
      switch (effect.type) {
        case 'volume':
          result = applyVolumeEffect(result, effect.params.value || 1, ctx)
          break
        case 'fadeIn':
          result = applyFadeInEffect(result, effect.params.duration || 0.5, ctx)
          break
        case 'fadeOut':
          result = applyFadeOutEffect(result, effect.params.duration || 0.5, ctx)
          break
        case 'pitch':
          result = applyPitchEffect(result, effect.params.semitones || 0, ctx)
          break
        case 'speed':
          result = applySpeedEffect(result, effect.params.value || 1, ctx)
          break
        case 'echo':
          result = applyEchoEffect(result, effect.params.delay || 0.3, effect.params.decay || 0.5, effect.params.mix || 0.3, ctx)
          break
        case 'reverb':
          result = applyReverbEffect(result, effect.params.roomSize || 0.5, effect.params.mix || 0.2, ctx)
          break
        default:
          break
      }
    }
    
    // Normaliser pour éviter l'écrêtage
    if (normalize) {
      result = normalizeBuffer(result, ctx)
    }
    
    return result
    
  } catch (e) {
    console.warn('Erreur application effets:', e)
    return audioBuffer
  } finally {
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {})
    }
  }
}

// ─── EFFETS INDIVIDUELS ──────────────────────────────────────────────────────

function applyVolumeEffect(buffer, volume, ctx) {
  if (volume === 1) return buffer
  
  const channels = buffer.numberOfChannels
  const length = buffer.length
  const newBuffer = ctx.createBuffer(channels, length, buffer.sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      newData[i] = data[i] * volume
    }
  }
  
  return newBuffer
}

function applyFadeInEffect(buffer, duration, ctx) {
  if (duration <= 0) return buffer
  
  const sampleRate = buffer.sampleRate
  const fadeSamples = Math.floor(duration * sampleRate)
  const channels = buffer.numberOfChannels
  const length = buffer.length
  const newBuffer = ctx.createBuffer(channels, length, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      if (i < fadeSamples) {
        const ratio = i / fadeSamples
        newData[i] = data[i] * (ratio * ratio)
      } else {
        newData[i] = data[i]
      }
    }
  }
  
  return newBuffer
}

function applyFadeOutEffect(buffer, duration, ctx) {
  if (duration <= 0) return buffer
  
  const sampleRate = buffer.sampleRate
  const fadeSamples = Math.floor(duration * sampleRate)
  const channels = buffer.numberOfChannels
  const length = buffer.length
  const newBuffer = ctx.createBuffer(channels, length, sampleRate)
  const start = Math.max(0, length - fadeSamples)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      if (i >= start) {
        const ratio = (i - start) / fadeSamples
        newData[i] = data[i] * (1 - ratio * ratio)
      } else {
        newData[i] = data[i]
      }
    }
  }
  
  return newBuffer
}

function applyPitchEffect(buffer, semitones, ctx) {
  if (semitones === 0) return buffer
  
  const pitchRatio = Math.pow(2, semitones / 12)
  const speed = 1 / pitchRatio
  
  const channels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const newLength = Math.floor(buffer.length * speed)
  const newBuffer = ctx.createBuffer(channels, newLength, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i / speed
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
      const frac = srcIndex - srcIndexFloor
      
      if (srcIndexFloor >= 0 && srcIndexCeil < data.length) {
        newData[i] = data[srcIndexFloor] * (1 - frac) + data[srcIndexCeil] * frac
      }
    }
  }
  
  return newBuffer
}

function applySpeedEffect(buffer, speed, ctx) {
  if (speed === 1) return buffer
  
  const channels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const newLength = Math.floor(buffer.length / speed)
  const newBuffer = ctx.createBuffer(channels, newLength, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * speed
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
      const frac = srcIndex - srcIndexFloor
      
      newData[i] = data[srcIndexFloor] * (1 - frac) + data[srcIndexCeil] * frac
    }
  }
  
  return newBuffer
}

function applyEchoEffect(buffer, delay, decay, mix, ctx) {
  if (delay <= 0 || mix <= 0) return buffer
  
  const sampleRate = buffer.sampleRate
  const delaySamples = Math.floor(delay * sampleRate)
  const channels = buffer.numberOfChannels
  const newLength = buffer.length + delaySamples
  const newBuffer = ctx.createBuffer(channels, newLength, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    // Copier le signal original avec le mix
    for (let i = 0; i < data.length; i++) {
      newData[i] += data[i] * (1 - mix)
    }
    
    // Ajouter l'écho
    for (let i = 0; i < data.length; i++) {
      if (i + delaySamples < newData.length) {
        newData[i + delaySamples] += data[i] * mix * decay
      }
    }
  }
  
  return newBuffer
}

function applyReverbEffect(buffer, roomSize, mix, ctx) {
  if (roomSize <= 0 || mix <= 0) return buffer
  
  const sampleRate = buffer.sampleRate
  const reverbLength = Math.floor(roomSize * sampleRate * 1.5)
  const channels = buffer.numberOfChannels
  const newLength = buffer.length + reverbLength
  const newBuffer = ctx.createBuffer(channels, newLength, sampleRate)
  
  // Créer une réponse impulsionnelle stochastique
  const irBuffer = ctx.createBuffer(1, reverbLength, sampleRate)
  const irData = irBuffer.getChannelData(0)
  for (let i = 0; i < reverbLength; i++) {
    const decay = Math.exp(-i / (reverbLength * 0.3))
    irData[i] = (Math.random() * 2 - 1) * decay
  }
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    // Signal original avec le mix
    for (let i = 0; i < data.length; i++) {
      newData[i] += data[i] * (1 - mix)
    }
    
    // Réverbération - convolution simple
    for (let i = 0; i < data.length; i++) {
      const maxJ = Math.min(reverbLength, newData.length - i)
      for (let j = 0; j < maxJ; j++) {
        newData[i + j] += data[i] * irData[j] * mix
      }
    }
  }
  
  return newBuffer
}

function normalizeBuffer(buffer, ctx) {
  const channels = buffer.numberOfChannels
  const length = buffer.length
  let maxPeak = 0
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(data[i])
      if (abs > maxPeak) maxPeak = abs
    }
  }
  
  if (maxPeak === 0) return buffer
  if (maxPeak < 0.9) return buffer
  
  const gain = 0.95 / maxPeak
  
  const newBuffer = ctx.createBuffer(channels, length, buffer.sampleRate)
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      newData[i] = data[i] * gain
    }
  }
  
  return newBuffer
}

// ─── CACHE ──────────────────────────────────────────────────────────────────

export function getCachedEffectBuffer(clipId, version = 0) {
  const key = `${clipId}_${version}`
  return effectCache.get(key) || null
}

export function setCachedEffectBuffer(clipId, buffer, version = 0) {
  const key = `${clipId}_${version}`
  effectCache.set(key, buffer)
  if (effectCache.size > 100) {
    const keys = Array.from(effectCache.keys())
    for (let i = 0; i < keys.length - 50; i++) {
      effectCache.delete(keys[i])
    }
  }
}

export function clearEffectCache(clipId) {
  if (clipId) {
    const keys = Array.from(effectCache.keys()).filter(k => k.startsWith(clipId))
    keys.forEach(k => effectCache.delete(k))
  } else {
    effectCache.clear()
  }
}

export default {
  applyEffectsToBuffer,
  getCachedEffectBuffer,
  setCachedEffectBuffer,
  clearEffectCache
}