/**
 * @file Audio effects applied offline to an `AudioBuffer`.
 *
 * Each effect returns a **new** buffer (no in-place mutation) so they can
 * be chained. Supported effects: `volume`, `fadeIn`, `fadeOut`, `speed`,
 * `echo`, `reverb`.
 *
 * ## When to use this module
 *
 * These are **offline** (post-processing) effects, used by:
 * - The mixdown pipeline (`mixdownProject`) to bake effects into a track.
 * - The clip preview in the editor.
 *
 * For **real-time** playback effects (during `playSound`), see
 * `@core/services/AudioService.js` which uses Web Audio nodes.
 *
 * ## A context is created per call
 *
 * `applyEffectsToBuffer` creates a **dedicated** `AudioContext` for each
 * call and closes it in a `finally`. This is deliberate: the shared
 * context (`audioContext.js`) may be `suspended`, and mixing effects would
 * disturb any ongoing playback. Since effects are offline operations,
 * the extra context is short-lived.
 *
 * ## Caching
 *
 * `getCachedEffectBuffer` / `setCachedEffectBuffer` provide a small LRU-ish
 * cache keyed by `clipId_version`. Use it to avoid re-running effects on
 * every preview render.
 *
 * @see @shared/utils/mixdown.js
 * @see @shared/utils/audioContext.js
 */

import { logError } from './logger'

const effectCache = new Map()

/**
 * Applies a list of effects to an `AudioBuffer`.
 *
 * @param {AudioBuffer} audioBuffer
 * @param {Array<{type: string, enabled: boolean, params: Object}>} effects
 * @param {number} [_sampleRate=44100] - Unused (kept for API compatibility;
 *   each effect reads `buffer.sampleRate`).
 * @param {boolean} [normalize=true] - Apply clipping protection at the end.
 * @returns {AudioBuffer}
 */
export function applyEffectsToBuffer(
  audioBuffer,
  effects,
  _sampleRate = 44100,
  normalize = true
) {
  if (!audioBuffer) return audioBuffer
  if (!effects || effects.length === 0) return audioBuffer

  const activeEffects = effects.filter((e) => e.enabled)
  if (activeEffects.length === 0) return audioBuffer

  let result = audioBuffer
  // Dedicated context per call (see file docstring for rationale).
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
          result = applyFadeOutEffect(
            result,
            effect.params.duration || 0.5,
            ctx
          )
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
    logError('realTimeEffects', 'Error applying effects', e)
    return audioBuffer
  } finally {
    if (ctx.state !== 'closed') {
      ctx.close().catch(() => {})
    }
  }
}

/**
 * Applies a static volume multiplier.
 *
 * @param {AudioBuffer} buffer
 * @param {number} volume - Linear multiplier (clamped to 0-5).
 * @param {AudioContext} ctx
 * @returns {AudioBuffer}
 */
export function applyVolumeEffect(buffer, volume, ctx) {
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

/**
 * Applies a fade-in over `duration` seconds (quadratic curve).
 *
 * @param {AudioBuffer} buffer
 * @param {number} duration - Fade duration in seconds (≤0.05 → no-op).
 * @param {AudioContext} ctx
 * @returns {AudioBuffer}
 */
export function applyFadeInEffect(buffer, duration, ctx) {
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

/**
 * Applies a fade-out over `duration` seconds (quadratic curve).
 *
 * @param {AudioBuffer} buffer
 * @param {number} duration - Fade duration in seconds (≤0.05 → no-op).
 * @param {AudioContext} ctx
 * @returns {AudioBuffer}
 */
export function applyFadeOutEffect(buffer, duration, ctx) {
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

/**
 * Applies a speed change (linear interpolation, no pitch preservation).
 *
 * @param {AudioBuffer} buffer
 * @param {number} speed - Multiplier (clamped to 0.1-4; 1 → no-op).
 * @param {AudioContext} ctx
 * @returns {AudioBuffer}
 */
export function applySpeedEffect(buffer, speed, ctx) {
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
 * Applies a simple echo (single delayed copy, mixed in).
 *
 * @param {AudioBuffer} buffer
 * @param {number} delay - Delay in seconds (clamped to 0.05-3).
 * @param {number} decay - Echo amplitude (0-1).
 * @param {number} mix - Dry/wet mix (0 = dry only, 1 = echo only).
 * @param {AudioContext} ctx
 * @returns {AudioBuffer}
 */
export function applyEchoEffect(buffer, delay, decay, mix, ctx) {
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

/**
 * Applies a cheap multi-tap reverb (comb-filter style, no FFT).
 *
 * @param {AudioBuffer} buffer
 * @param {number} roomSize - 0-1 (larger = more/longer taps).
 * @param {number} mix - Dry/wet mix (0 = dry only).
 * @param {AudioContext} ctx
 * @returns {AudioBuffer}
 */
export function applyReverbEffect(buffer, roomSize, mix, ctx) {
  const clampedRoomSize = Math.max(0.05, Math.min(1, roomSize))
  const clampedMix = Math.max(0, Math.min(1, mix))

  if (clampedMix <= 0 || clampedRoomSize <= 0) return buffer

  const sampleRate = buffer.sampleRate
  const channels = buffer.numberOfChannels
  const length = buffer.length

  const numTaps = Math.round(6 + clampedRoomSize * 18)
  const maxDelaySamples = Math.round(clampedRoomSize * 0.2 * sampleRate)
  const baseGain = clampedMix * 0.35
  const decayFactor = 0.68

  const newBuffer = ctx.createBuffer(channels, length, sampleRate)

  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel)
    const newData = newBuffer.getChannelData(channel)

    for (let i = 0; i < length; i++) {
      newData[i] = data[i] * (1 - clampedMix)
    }

    for (let tap = 0; tap < numTaps; tap++) {
      const delaySamples = Math.floor(((tap + 1) * maxDelaySamples) / numTaps)
      const tapGain = Math.pow(decayFactor, tap) * baseGain

      if (tapGain < 0.001) continue

      const limit = length - delaySamples
      for (let i = 0; i < limit; i++) {
        newData[i + delaySamples] += data[i] * tapGain
      }
    }

    for (let i = 0; i < length; i++) {
      const v = newData[i]
      if (v > 1) newData[i] = 1
      else if (v < -1) newData[i] = -1
    }
  }

  return newBuffer
}

/**
 * Normalizes an `AudioBuffer` to a safe peak (0.95).
 *
 * - Peak > 0.95 → scale down to 0.95.
 * - Peak < 0.1  → scale up (capped at 5x gain).
 * - 0.1 ≤ peak ≤ 0.95 → returned unchanged.
 *
 * @param {AudioBuffer} buffer
 * @param {AudioContext} ctx
 * @returns {AudioBuffer}
 */
export function normalizeBuffer(buffer, ctx) {
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

/**
 * Returns a cached effect buffer for the given `clipId_version`, or `null`.
 *
 * @param {string} clipId
 * @param {number} [version=0]
 * @returns {AudioBuffer|null}
 */
export function getCachedEffectBuffer(clipId, version = 0) {
  const key = `${clipId}_${version}`
  return effectCache.get(key) || null
}

/**
 * Stores an effect buffer in the cache (`clipId_version`).
 * Evicts the oldest entries when the cache exceeds 100 items.
 *
 * @param {string} clipId
 * @param {AudioBuffer} buffer
 * @param {number} [version=0]
 * @returns {void}
 */
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

/**
 * Clears cached effect buffers (all, or a specific `clipId` prefix).
 *
 * @param {string} [clipId]
 * @returns {void}
 */
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