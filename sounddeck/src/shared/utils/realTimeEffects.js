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
  
  if (!audioBuffer) {
    console.error('❌ [realTimeEffects] Buffer null')
    return audioBuffer
  }
  
  if (!effects || effects.length === 0) {
    return audioBuffer
  }
  
  // Filtrer les effets actifs
  const activeEffects = effects.filter(e => e.enabled)
  
  if (activeEffects.length === 0) {
    return audioBuffer
  }
  
  let result = audioBuffer
  
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
          console.warn(`⚠️ [realTimeEffects] Effet non reconnu: ${effect.type}`)
      }
    }
    
    // ✅ VÉRIFIER SI LE VOLUME EST LE SEUL EFFET
    const onlyVolume = activeEffects.length === 1 && activeEffects[0].type === 'volume'
    const volumeValue = onlyVolume ? activeEffects[0].params.value : 1
    
    // ✅ DÉTERMINER SI LA NORMALISATION EST NÉCESSAIRE
    // - Si le volume est > 1, on ne normalise PAS (sinon on annule l'effet)
    // - Si le volume est le seul effet, on ne normalise PAS (sauf si volume < 1)
    // - Si volume <= 1 et qu'il y a d'autres effets, on normalise
    const shouldNormalize = normalize && !onlyVolume && volumeValue <= 1
    
    if (shouldNormalize) {
      result = normalizeBuffer(result, ctx)
    } else {
    }
    
    return result
    
  } catch (e) {
    console.error('❌ [realTimeEffects] Erreur application effets:', e)
    return audioBuffer
  } finally {
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {})
    }
  }
}

// ─── EFFETS INDIVIDUELS ──────────────────────────────────────────────────────

/**
 * ✅ Applique un effet de volume
 * @param {AudioBuffer} buffer - Buffer source
 * @param {number} volume - Volume (0 à 5, 1 = normal)
 * @param {AudioContext} ctx - Contexte audio
 * @returns {AudioBuffer} Buffer modifié
 */
function applyVolumeEffect(buffer, volume, ctx) {
  const clampedVolume = Math.max(0, Math.min(5, volume))
  
  
  // ✅ Si le volume est à 1, retourner le buffer inchangé
  if (Math.abs(clampedVolume - 1) < 0.001) {
    return buffer
  }
  
  const channels = buffer.numberOfChannels
  const length = buffer.length
  const newBuffer = ctx.createBuffer(channels, length, buffer.sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      // ✅ Clamper pour éviter l'écrêtage
      let value = data[i] * clampedVolume
      newData[i] = Math.max(-1, Math.min(1, value))
    }
  }
  
  return newBuffer
}

/**
 * ✅ Applique un effet de Fade In
 * @param {AudioBuffer} buffer - Buffer source
 * @param {number} duration - Durée du fade en secondes
 * @param {AudioContext} ctx - Contexte audio
 * @returns {AudioBuffer} Buffer modifié
 */
function applyFadeInEffect(buffer, duration, ctx) {
  if (duration <= 0.05) {
    return buffer
  }
  
  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const channels = buffer.numberOfChannels
  
  let fadeSamples = Math.floor(duration * sampleRate)
  
  
  // ✅ Limiter le fade à la durée du clip
  if (fadeSamples > length) {
    console.warn(`⚠️ Fade In (${duration}s) plus long que le clip (${(length / sampleRate).toFixed(2)}s), réduction à la durée du clip`)
    fadeSamples = length
  }
  
  if (fadeSamples >= length) {
  }
  
  const newBuffer = ctx.createBuffer(channels, length, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    if (fadeSamples >= length) {
      for (let i = 0; i < length; i++) {
        const ratio = i / length
        const gain = ratio * ratio // Courbe quadratique
        newData[i] = data[i] * gain
      }
    } else {
      for (let i = 0; i < length; i++) {
        if (i < fadeSamples) {
          const ratio = i / fadeSamples
          const gain = ratio * ratio // Courbe quadratique
          newData[i] = data[i] * gain
        } else {
          newData[i] = data[i]
        }
      }
    }
  }
  
  return newBuffer
}

/**
 * ✅ Applique un effet de Fade Out
 * @param {AudioBuffer} buffer - Buffer source
 * @param {number} duration - Durée du fade en secondes
 * @param {AudioContext} ctx - Contexte audio
 * @returns {AudioBuffer} Buffer modifié
 */
function applyFadeOutEffect(buffer, duration, ctx) {
  if (duration <= 0.05) {
    return buffer
  }
  
  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const channels = buffer.numberOfChannels
  
  let fadeSamples = Math.floor(duration * sampleRate)
  
  
  // ✅ Limiter le fade à la durée du clip
  if (fadeSamples > length) {
    console.warn(`⚠️ Fade Out (${duration}s) plus long que le clip (${(length / sampleRate).toFixed(2)}s), réduction à la durée du clip`)
    fadeSamples = length
  }
  
  const start = Math.max(0, length - fadeSamples)
  
  if (fadeSamples >= length) {
  }
  
  const newBuffer = ctx.createBuffer(channels, length, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    if (fadeSamples >= length) {
      for (let i = 0; i < length; i++) {
        const ratio = 1 - (i / length)
        const gain = ratio * ratio // Courbe quadratique
        newData[i] = data[i] * gain
      }
    } else {
      for (let i = 0; i < length; i++) {
        if (i >= start) {
          const ratio = (i - start) / fadeSamples
          const gain = 1 - (ratio * ratio) // Courbe quadratique inversée
          newData[i] = data[i] * gain
        } else {
          newData[i] = data[i]
        }
      }
    }
  }
  
  return newBuffer
}

/**
 * Applique un effet de Pitch (hauteur)
 * @param {AudioBuffer} buffer - Buffer source
 * @param {number} semitones - Demi-tons
 * @param {AudioContext} ctx - Contexte audio
 * @returns {AudioBuffer} Buffer modifié
 */
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

/**
 * Applique un effet de Speed (vitesse)
 * @param {AudioBuffer} buffer - Buffer source
 * @param {number} speed - Vitesse (0.1 à 4)
 * @param {AudioContext} ctx - Contexte audio
 * @returns {AudioBuffer} Buffer modifié
 */
function applySpeedEffect(buffer, speed, ctx) {
  const clampedSpeed = Math.max(0.1, Math.min(4, speed))
  
  if (clampedSpeed === 1) return buffer
  
  const channels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const newLength = Math.floor(buffer.length / clampedSpeed)
  const newBuffer = ctx.createBuffer(channels, newLength, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * clampedSpeed
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1)
      const frac = srcIndex - srcIndexFloor
      
      newData[i] = data[srcIndexFloor] * (1 - frac) + data[srcIndexCeil] * frac
    }
  }
  
  return newBuffer
}

/**
 * Applique un effet d'Écho
 * @param {AudioBuffer} buffer - Buffer source
 * @param {number} delay - Délai en secondes
 * @param {number} decay - Atténuation (0 à 1)
 * @param {number} mix - Mix (0 à 1)
 * @param {AudioContext} ctx - Contexte audio
 * @returns {AudioBuffer} Buffer modifié
 */
function applyEchoEffect(buffer, delay, decay, mix, ctx) {
  const clampedDelay = Math.max(0.05, Math.min(3, delay))
  const clampedDecay = Math.max(0, Math.min(1, decay))
  const clampedMix = Math.max(0, Math.min(1, mix))
  
  if (clampedMix <= 0) return buffer
  
  const sampleRate = buffer.sampleRate
  const delaySamples = Math.floor(clampedDelay * sampleRate)
  const channels = buffer.numberOfChannels
  const newLength = buffer.length + delaySamples
  const newBuffer = ctx.createBuffer(channels, newLength, sampleRate)
  
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    
    // Copier le signal original avec le mix
    for (let i = 0; i < data.length; i++) {
      newData[i] += data[i] * (1 - clampedMix)
    }
    
    // Ajouter l'écho
    for (let i = 0; i < data.length; i++) {
      if (i + delaySamples < newData.length) {
        newData[i + delaySamples] += data[i] * clampedMix * clampedDecay
      }
    }
  }
  
  return newBuffer
}

/**
 * Applique un effet de Réverbération
 * @param {AudioBuffer} buffer - Buffer source
 * @param {number} roomSize - Taille de la pièce (0 à 1)
 * @param {number} mix - Mix (0 à 1)
 * @param {AudioContext} ctx - Contexte audio
 * @returns {AudioBuffer} Buffer modifié
 */
function applyReverbEffect(buffer, roomSize, mix, ctx) {
  const clampedRoomSize = Math.max(0.05, Math.min(1, roomSize))
  const clampedMix = Math.max(0, Math.min(1, mix))
  
  if (clampedMix <= 0 || clampedRoomSize <= 0) return buffer
  
  const sampleRate = buffer.sampleRate
  const reverbLength = Math.floor(clampedRoomSize * sampleRate * 1.5)
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
      newData[i] += data[i] * (1 - clampedMix)
    }
    
    // Réverbération - convolution simple
    for (let i = 0; i < data.length; i++) {
      const maxJ = Math.min(reverbLength, newData.length - i)
      for (let j = 0; j < maxJ; j++) {
        newData[i + j] += data[i] * irData[j] * clampedMix
      }
    }
  }
  
  return newBuffer
}

/**
 * Normalise un buffer pour éviter l'écrêtage
 * @param {AudioBuffer} buffer - Buffer à normaliser
 * @param {AudioContext} ctx - Contexte audio
 * @returns {AudioBuffer} Buffer normalisé
 */
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
  
  // ✅ Si maxPeak est déjà dans une plage acceptable, ne rien faire
  if (maxPeak === 0 || (maxPeak < 0.95 && maxPeak > 0.1)) {
    return buffer
  }
  
  // ✅ Si maxPeak > 0.95, réduire pour éviter l'écrêtage
  if (maxPeak > 0.95) {
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
  
  // ✅ Si maxPeak < 0.1, augmenter le gain (pour les sons très faibles)
  if (maxPeak < 0.1) {
    const gain = 0.3 / maxPeak
    
    const newBuffer = ctx.createBuffer(channels, length, buffer.sampleRate)
    for (let channel = 0; channel < channels; channel++) {
      const data = buffer.getChannelData(channel)
      const newData = newBuffer.getChannelData(channel)
      const clampedGain = Math.min(gain, 5)
      for (let i = 0; i < length; i++) {
        let value = data[i] * clampedGain
        newData[i] = Math.max(-1, Math.min(1, value))
      }
    }
    return newBuffer
  }
  
  return buffer
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