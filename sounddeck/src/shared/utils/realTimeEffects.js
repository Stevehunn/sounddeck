// src/shared/utils/realTimeEffects.js

const effectCache = new Map()

export function applyEffectsToBuffer(
  audioBuffer,
  effects,
  sampleRate = 44100,
  normalize = true
) {
  if (!audioBuffer) return audioBuffer
  if (!effects || effects.length === 0) return audioBuffer

  const activeEffects = effects.filter((e) => e.enabled)
  if (activeEffects.length === 0) return audioBuffer

  let result = audioBuffer
  // ⚠️ NOTE : AudioContext dédié (non partagé) — chaque appel crée + ferme
  // un contexte temporaire. C'est OK en pratique (fermé dans le `finally`),
  // mais pourrait être optimisé plus tard (cf O(nettoyage) pour passer au shared).
  const ctx = new (window.AudioContext || window.webkitAudioContext)()

  try {
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
          result = applyEchoEffect(
            result,
            effect.params.delay || 0.3,
            effect.params.decay || 0.5,
            effect.params.mix || 0.3,
            ctx
          )
          break
        case 'reverb':
          result = applyReverbEffect(
            result,
            effect.params.roomSize || 0.5,
            effect.params.mix || 0.2,
            ctx
          )
          break
        default:
          break
      }
    }

    const onlyVolume =
      activeEffects.length === 1 && activeEffects[0].type === 'volume'
    const volumeValue = onlyVolume ? activeEffects[0].params.value : 1
    const shouldNormalize = normalize && !onlyVolume && volumeValue <= 1

    if (shouldNormalize) {
      result = normalizeBuffer(result, ctx)
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

function applyVolumeEffect(buffer, volume, ctx) {
  const clampedVolume = Math.max(0, Math.min(5, volume))

  if (Math.abs(clampedVolume - 1) < 0.001) return buffer

  const channels = buffer.numberOfChannels
  const length = buffer.length
  const newBuffer = ctx.createBuffer(channels, length, buffer.sampleRate)

  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      const value = data[i] * clampedVolume
      newData[i] = Math.max(-1, Math.min(1, value))
    }
  }

  return newBuffer
}

function applyFadeInEffect(buffer, duration, ctx) {
  if (duration <= 0.05) return buffer

  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const channels = buffer.numberOfChannels

  let fadeSamples = Math.floor(duration * sampleRate)
  if (fadeSamples > length) fadeSamples = length

  const newBuffer = ctx.createBuffer(channels, length, sampleRate)

  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)

    if (fadeSamples >= length) {
      for (let i = 0; i < length; i++) {
        const ratio = i / length
        newData[i] = data[i] * ratio * ratio
      }
    } else {
      for (let i = 0; i < length; i++) {
        if (i < fadeSamples) {
          const ratio = i / fadeSamples
          newData[i] = data[i] * ratio * ratio
        } else {
          newData[i] = data[i]
        }
      }
    }
  }

  return newBuffer
}

function applyFadeOutEffect(buffer, duration, ctx) {
  if (duration <= 0.05) return buffer

  const sampleRate = buffer.sampleRate
  const length = buffer.length
  const channels = buffer.numberOfChannels

  let fadeSamples = Math.floor(duration * sampleRate)
  if (fadeSamples > length) fadeSamples = length

  const start = Math.max(0, length - fadeSamples)
  const newBuffer = ctx.createBuffer(channels, length, sampleRate)

  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)

    if (fadeSamples >= length) {
      for (let i = 0; i < length; i++) {
        const ratio = 1 - i / length
        newData[i] = data[i] * ratio * ratio
      }
    } else {
      for (let i = 0; i < length; i++) {
        if (i >= start) {
          const ratio = (i - start) / fadeSamples
          newData[i] = data[i] * (1 - ratio * ratio)
        } else {
          newData[i] = data[i]
        }
      }
    }
  }

  return newBuffer
}

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

    for (let i = 0; i < data.length; i++) {
      newData[i] += data[i] * (1 - clampedMix)
    }

    for (let i = 0; i < data.length; i++) {
      if (i + delaySamples < newData.length) {
        newData[i + delaySamples] += data[i] * clampedMix * clampedDecay
      }
    }
  }

  return newBuffer
}

// ✅ FIX : remplace la double boucle O(n²) par des taps fixes (O(n × taps))
function applyReverbEffect(buffer, roomSize, mix, ctx) {
  const clampedRoomSize = Math.max(0.05, Math.min(1, roomSize))
  const clampedMix = Math.max(0, Math.min(1, mix))

  if (clampedMix <= 0 || clampedRoomSize <= 0) return buffer

  const sampleRate = buffer.sampleRate
  const channels = buffer.numberOfChannels
  const length = buffer.length

  // Nombre de taps et délai max proportionnels à la taille de la pièce
  const numTaps = Math.round(6 + clampedRoomSize * 18) // 6 à 24 taps
  const maxDelaySamples = Math.round(clampedRoomSize * 0.2 * sampleRate) // max 200ms
  const baseGain = clampedMix * 0.35
  const decayFactor = 0.68

  const newBuffer = ctx.createBuffer(channels, length, sampleRate)

  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)

    // Signal dry
    for (let i = 0; i < length; i++) {
      newData[i] = data[i] * (1 - clampedMix)
    }

    // Ajout de taps espacés avec décroissance
    for (let tap = 0; tap < numTaps; tap++) {
      const delaySamples = Math.floor(
        ((tap + 1) * maxDelaySamples) / numTaps
      )
      const tapGain = Math.pow(decayFactor, tap) * baseGain

      if (tapGain < 0.001) continue

      const limit = length - delaySamples
      for (let i = 0; i < limit; i++) {
        newData[i + delaySamples] += data[i] * tapGain
      }
    }

    // Clamp pour éviter l'écrêtage
    for (let i = 0; i < length; i++) {
      const v = newData[i]
      if (v > 1) newData[i] = 1
      else if (v < -1) newData[i] = -1
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

  if (maxPeak === 0 || (maxPeak < 0.95 && maxPeak > 0.1)) return buffer

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

  if (maxPeak < 0.1) {
    const gain = Math.min(0.3 / maxPeak, 5)
    const newBuffer = ctx.createBuffer(channels, length, buffer.sampleRate)
    for (let channel = 0; channel < channels; channel++) {
      const data = buffer.getChannelData(channel)
      const newData = newBuffer.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        const v = data[i] * gain
        newData[i] = Math.max(-1, Math.min(1, v))
      }
    }
    return newBuffer
  }

  return buffer
}

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
    const keys = Array.from(effectCache.keys()).filter((k) =>
      k.startsWith(clipId)
    )
    keys.forEach((k) => effectCache.delete(k))
  } else {
    effectCache.clear()
  }
}

export default {
  applyEffectsToBuffer,
  getCachedEffectBuffer,
  setCachedEffectBuffer,
  clearEffectCache,
}