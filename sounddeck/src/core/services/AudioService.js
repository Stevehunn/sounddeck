// src/core/services/AudioService.js
import { Howl } from 'howler'
import * as AudioMixerService from './AudioMixerService'

const soundCache = {}
const gainCache = {}
let storeRef = null

export function setStoreRef(store) {
  storeRef = store
}

// ─── SYSTÈME D'ÉVÉNEMENTS DE LECTURE ─────────────────────────────────────────
const playbackListeners = new Set()
let currentPlayingId = null

export function subscribeToPlayback(callback) {
  playbackListeners.add(callback)
  try {
    callback({ id: currentPlayingId })
  } catch (e) {
    console.error('[AudioService] Erreur callback initial:', e)
  }
  return () => playbackListeners.delete(callback)
}

function notifyPlaybackListeners(id) {
  currentPlayingId = id
  playbackListeners.forEach(cb => {
    try {
      cb({ id })
    } catch (e) {
      console.error('[AudioService] Erreur callback playback:', e)
    }
  })
}

// ─── OVERRIDE POUR LECTEURS EXTERNES (séquenceur, etc.) ────────────────────
let manualOverrideId = null
let manualProgress = { id: null, current: 0, duration: 0, ratio: 0 }

export function setCurrentPlayingSound(soundId) {
  manualOverrideId = soundId || null
  if (!soundId) {
    manualProgress = { id: null, current: 0, duration: 0, ratio: 0 }
  }
  notifyPlaybackListeners(soundId || null)
}

export function setCurrentPlayingProgress(soundId, current, duration) {
  if (manualOverrideId !== soundId) return
  manualProgress = {
    id: soundId,
    current: current || 0,
    duration: duration || 0,
    ratio: duration > 0 ? Math.min(1, (current || 0) / duration) : 0
  }
}

// ─── BUILD FILE URL ────────────────────────────────────────────────────────
function buildFileUrl(filePath) {
  if (!filePath) return null
  if (filePath.startsWith('file://') || filePath.startsWith('http')) return filePath

  let normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const encodedParts = parts.map((part, i) => {
    if (part === '' || /^[A-Za-z]:$/.test(part)) return part
    return encodeURIComponent(part).replace(/%2F/gi, '/')
  })

  return 'file:///' + encodedParts.join('/')
}

// ─── ANALYSE GAIN ──────────────────────────────────────────────────────────
export async function analyzeGain(filePath, sampleCount = 200) {
  if (gainCache[filePath]) return gainCache[filePath]

  try {
    const fileUrl = buildFileUrl(filePath)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const response = await fetch(fileUrl)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    await audioContext.close()

    const channelData = audioBuffer.getChannelData(0)
    let sumSquares = 0
    const step = Math.max(1, Math.floor(channelData.length / sampleCount))

    for (let i = 0; i < channelData.length; i += step) {
      sumSquares += channelData[i] * channelData[i]
    }

    const rms = Math.sqrt(sumSquares / (channelData.length / step))
    const defaultTarget = 0.2
    const targetRMS = gainCache.targetRMS || defaultTarget
    const gain = rms > 0.001 ? targetRMS / rms : 1
    const gainDb = 20 * Math.log10(Math.min(gain, 20))

    gainCache[filePath] = gainDb
    return gainDb
  } catch (e) {
    console.warn('Gain analysis failed:', e)
    return 0
  }
}

export function setNormalizationTarget(targetRMS) {
  gainCache.targetRMS = targetRMS
}

function calculateFinalVolume(globalVolume, soundVolumeDb, gainDb = 0) {
  const normalizedGlobal = globalVolume / 100
  const globalRatio = Math.pow(normalizedGlobal, 1.8)
  const individualGain = (soundVolumeDb || 0)
  const normalizationGain = gainDb || 0
  const totalGainDb = individualGain + normalizationGain
  const linearGain = Math.pow(10, totalGainDb / 20)
  const finalVolume = Math.min(1, globalRatio * linearGain)
  return Math.max(0.0001, finalVolume)
}

export function getFinalVolumeForSound(sound, globalVolume = 80) {
  if (!sound) return 1
  const gainDb = gainCache[sound.path] || 0
  const soundVolumeDb = sound.volumeDb ?? sound.volume ?? 0
  return calculateFinalVolume(globalVolume, soundVolumeDb, gainDb)
}

// ─── Mode Normal (sans mixeur) ─────────────────────────────────────────────
function playSoundNormal(sound, audioDevice = 'default', globalVolume = 80, loop = false, playLocally = true) {
  const gainDb = gainCache[sound.path] || 0
  const volumeRatio = calculateFinalVolume(globalVolume, sound.volume ?? 0, gainDb)
  let fileUrl = buildFileUrl(sound.path)

  const rawExt = sound.path.split('.').pop()?.split('?')[0]?.split('#')[0]?.toLowerCase()
  const validFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm']
  const format = validFormats.includes(rawExt) ? rawExt : 'mp3'

  if (soundCache[sound.id]) {
    const cached = soundCache[sound.id]
    if (Array.isArray(cached)) {
      cached.forEach(h => { try { h.stop(); h.unload() } catch(e){} })
    } else {
      try { cached.stop(); cached.unload() } catch(e){}
    }
    delete soundCache[sound.id]
    return
  }

  if (!audioDevice || audioDevice === 'default') {
    const howl = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: false,
      loop,
      format: [format],
      onend: () => {
        if (!loop) {
          delete soundCache[sound.id]
          if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
        }
      },
      onstop: () => {
        delete soundCache[sound.id]
        if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
      },
      onloaderror: (id, err) => {
        console.error('Erreur:', err)
        delete soundCache[sound.id]
        if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
      }
    })
    soundCache[sound.id] = howl
    howl.play()
    return
  }

  try {
    const howls = []

    const howlDiscord = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: true,
      loop,
      format: [format],
      onend: () => {
        if (!loop) {
          delete soundCache[sound.id]
          if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
        }
      },
      onstop: () => {
        delete soundCache[sound.id]
        if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
      },
      onloaderror: (id, err) => { console.error('Erreur device virtuel:', err) }
    })

    howlDiscord.once('play', () => {
      try {
        const audioNode = howlDiscord._sounds?.[0]?._node
        if (audioNode && audioNode.setSinkId) {
          audioNode.setSinkId(audioDevice).catch(e => console.warn('setSinkId failed:', e))
        }
      } catch (e) { console.warn('setSinkId error:', e) }
    })

    howls.push(howlDiscord)
    howlDiscord.play()

    if (playLocally) {
      const howlLocal = new Howl({
        src: [fileUrl],
        volume: volumeRatio,
        html5: true,
        loop,
        format: [format],
        onloaderror: (id, err) => { console.error('Erreur local:', err) }
      })
      howlLocal.once('play', () => {
        try {
          const audioNode = howlLocal._sounds?.[0]?._node
          if (audioNode && audioNode.setSinkId) {
            audioNode.setSinkId('default').catch(() => {})
          }
        } catch (e) {}
      })
      howls.push(howlLocal)
      howlLocal.play()
    }

    soundCache[sound.id] = howls

  } catch (e) {
    console.error('playSound error:', e)
    const howl = new Howl({ src: [fileUrl], volume: volumeRatio, html5: false, loop, format: [format] })
    soundCache[sound.id] = howl
    howl.play()
  }
}

// ─── Mode Mixeur ───────────────────────────────────────────────────────────
async function playSoundWithMixer(sound, globalVolume, loop, playLocally = true) {
  const soundVolumeDb = sound.volumeDb ?? sound.volume ?? 0
  let soundRatio = Math.pow(10, soundVolumeDb / 20)
  soundRatio = Math.min(1, soundRatio)

  const globalVol = globalVolume / 100
  const mixerVol = (storeRef?.mixerSoundVolume ?? 100) / 100
  const volumeRatio = soundRatio * globalVol * mixerVol

  const fileUrl = buildFileUrl(sound.path)

  if (soundCache[sound.id]) {
    stopSound(sound.id)
    return
  }

  const audioBuffer = await AudioMixerService.loadAudioBuffer(fileUrl)
  if (!audioBuffer) {
    console.warn('⚠️ Impossible de charger le son:', fileUrl)
    return
  }

  const source = AudioMixerService.playSoundInMixer(audioBuffer, volumeRatio)

  if (source) {
    soundCache[sound.id] = source
    if (loop) {
      source.loop = true
    } else {
      source.onended = () => {
        delete soundCache[sound.id]
        if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
      }
    }
  }

  const shouldPlayLocally = playLocally || storeRef?.monitoringEnabled || false

  if (shouldPlayLocally) {
    try {
      const localHowl = new Howl({
        src: [fileUrl],
        volume: volumeRatio * 0.8,
        html5: true,
        format: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
        onend: () => {},
        onloaderror: (id, err) => {
          console.warn('⚠️ Erreur lecture locale:', err)
        }
      })

      localHowl.once('play', () => {
        try {
          const audioNode = localHowl._sounds?.[0]?._node
          if (audioNode && audioNode.setSinkId) {
            const localDevice = storeRef?.localAudioDevice || 'default'
            audioNode.setSinkId(localDevice).catch(() => {})
          }
        } catch (e) {}
      })

      localHowl.play()

      if (!Array.isArray(soundCache[sound.id])) {
        soundCache[sound.id] = [soundCache[sound.id]]
      }
      if (Array.isArray(soundCache[sound.id])) {
        soundCache[sound.id].push(localHowl)
      }

    } catch (e) {
      console.warn('⚠️ Erreur lecture locale:', e)
    }
  }
}

// ─── API PRINCIPALE ────────────────────────────────────────────────────────
export function playSound(sound, audioDevice = 'default', globalVolume = 80, loop = false, playLocally = true) {
  if (!sound?.path) return
  notifyPlaybackListeners(sound.id)

  const mixerEnabled = storeRef?.mixerEnabled || false
  if (mixerEnabled && AudioMixerService.isMixerActive()) {
    playSoundWithMixer(sound, globalVolume, loop, playLocally)
  } else {
    playSoundNormal(sound, audioDevice, globalVolume, loop, playLocally)
  }
}

export async function playSoundAsync(sound, audioDevice = 'default', globalVolume = 80, loop = false, playLocally = true) {
  if (!sound?.path) return
  notifyPlaybackListeners(sound.id)

  let gainDb = 0
  if (sound.path && !gainCache[sound.path]) {
    try {
      gainDb = await analyzeGain(sound.path)
    } catch (e) {
      console.warn('Gain analysis failed, using default:', e)
    }
  } else if (sound.path) {
    gainDb = gainCache[sound.path] || 0
  }

  const volumeRatio = calculateFinalVolume(globalVolume, sound.volume ?? 0, gainDb)
  let fileUrl = buildFileUrl(sound.path)

  const rawExt = sound.path.split('.').pop()?.split('?')[0]?.split('#')[0]?.toLowerCase()
  const validFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm']
  const format = validFormats.includes(rawExt) ? rawExt : 'mp3'

  if (soundCache[sound.id]) {
    const cached = soundCache[sound.id]
    if (Array.isArray(cached)) {
      cached.forEach(h => { try { h.stop(); h.unload() } catch(e){} })
    } else {
      try { cached.stop(); cached.unload() } catch(e){}
    }
    delete soundCache[sound.id]
    return
  }

  if (!audioDevice || audioDevice === 'default') {
    const howl = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: false,
      loop,
      format: [format],
      onend: () => {
        if (!loop) {
          delete soundCache[sound.id]
          if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
        }
      },
      onstop: () => {
        delete soundCache[sound.id]
        if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
      },
      onloaderror: (id, err) => {
        console.error('Erreur:', err)
        delete soundCache[sound.id]
        if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
      }
    })
    soundCache[sound.id] = howl
    howl.play()
    return
  }

  try {
    const howls = []

    const howlDiscord = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: true,
      loop,
      format: [format],
      onend: () => {
        if (!loop) {
          delete soundCache[sound.id]
          if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
        }
      },
      onstop: () => {
        delete soundCache[sound.id]
        if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
      },
      onloaderror: (id, err) => { console.error('Erreur device virtuel:', err) }
    })

    howlDiscord.once('play', () => {
      try {
        const audioNode = howlDiscord._sounds?.[0]?._node
        if (audioNode && audioNode.setSinkId) {
          audioNode.setSinkId(audioDevice).catch(e => console.warn('setSinkId failed:', e))
        }
      } catch (e) { console.warn('setSinkId error:', e) }
    })

    howls.push(howlDiscord)
    howlDiscord.play()

    if (playLocally) {
      const howlLocal = new Howl({
        src: [fileUrl],
        volume: volumeRatio,
        html5: true,
        loop,
        format: [format],
        onloaderror: (id, err) => { console.error('Erreur local:', err) }
      })
      howlLocal.once('play', () => {
        try {
          const audioNode = howlLocal._sounds?.[0]?._node
          if (audioNode && audioNode.setSinkId) {
            audioNode.setSinkId('default').catch(() => {})
          }
        } catch (e) {}
      })
      howls.push(howlLocal)
      howlLocal.play()
    }

    soundCache[sound.id] = howls

  } catch (e) {
    console.error('playSound error:', e)
    const howl = new Howl({ src: [fileUrl], volume: volumeRatio, html5: false, loop, format: [format] })
    soundCache[sound.id] = howl
    howl.play()
  }
}

export async function analyzeAllGains(sounds, onProgress) {
  const total = sounds.length
  let done = 0

  for (const sound of sounds) {
    if (sound.path && !gainCache[sound.path]) {
      try {
        const gain = await analyzeGain(sound.path)
        gainCache[sound.path] = gain
      } catch (e) {
        console.warn('Failed to analyze:', sound.path, e)
      }
    }
    done++
    if (onProgress) onProgress(done / total)
  }

  return gainCache
}

export function stopSound(soundId) {
  if (currentPlayingId === soundId) {
    notifyPlaybackListeners(null)
  }
  if (manualOverrideId === soundId) {
    manualOverrideId = null
    manualProgress = { id: null, current: 0, duration: 0, ratio: 0 }
  }

  const cached = soundCache[soundId]
  if (cached) {
    if (Array.isArray(cached)) {
      cached.forEach(h => {
        try {
          if (h instanceof AudioBufferSourceNode || (h.stop && typeof h.stop === 'function')) {
            h.stop()
          }
          if (h.disconnect && typeof h.disconnect === 'function') {
            h.disconnect()
          }
          if (h.unload && typeof h.unload === 'function') {
            h.unload()
          }
        } catch(e){}
      })
    } else {
      try {
        if (cached instanceof AudioBufferSourceNode || (cached.stop && typeof cached.stop === 'function')) {
          cached.stop()
        }
        if (cached.disconnect && typeof cached.disconnect === 'function') {
          cached.disconnect()
        }
        if (cached.unload && typeof cached.unload === 'function') {
          cached.unload()
        }
      } catch(e){}
    }
    delete soundCache[soundId]
  }
}

let stopSequencerCallback = null

export function registerStopSequencerCallback(cb) {
  stopSequencerCallback = cb
}

export function stopAllSounds() {
  Object.keys(soundCache).forEach(k => stopSound(k))
  if (stopSequencerCallback) stopSequencerCallback()
}

export function isPlaying(soundId) {
  if (manualOverrideId === soundId) return true

  const cached = soundCache[soundId]
  if (!cached) return false

  if (Array.isArray(cached)) {
    return cached.some(h => h.playing && h.playing())
  }

  if (cached.playing && typeof cached.playing === 'function') {
    return cached.playing()
  }

  try {
    return !!cached
  } catch (e) {
    return false
  }
}

export function getSoundProgress(soundId) {
  if (manualOverrideId === soundId && manualProgress.id === soundId) {
    if (manualProgress.duration <= 0) return null
    return {
      current: manualProgress.current,
      duration: manualProgress.duration,
      ratio: manualProgress.ratio
    }
  }

  const cached = soundCache[soundId]
  if (!cached) return null

  if (Array.isArray(cached)) {
    const howl = cached[0]
    if (!howl || !howl.playing || !howl.playing()) return null
    const seek = howl.seek()
    const duration = howl.duration()
    if (typeof seek !== 'number' || typeof duration !== 'number') return null
    if (!duration || duration <= 0) return null
    return { current: seek, duration, ratio: Math.min(1, seek / duration) }
  }

  if (cached.playing && typeof cached.playing === 'function') {
    if (!cached.playing()) return null
    const seek = cached.seek()
    const duration = cached.duration()
    if (typeof seek !== 'number' || typeof duration !== 'number') return null
    if (!duration || duration <= 0) return null
    return { current: seek, duration, ratio: Math.min(1, seek / duration) }
  }

  return null
}

export function getSoundDuration(soundId) {
  const cached = soundCache[soundId]
  if (!cached) return null
  const howl = Array.isArray(cached) ? cached[0] : cached
  return howl?.duration() || null
}

export function clearSoundCache(soundId) {
  if (soundId) stopSound(soundId)
  else stopAllSounds()
}

export { calculateFinalVolume, gainCache }

export default {
  setStoreRef,
  analyzeGain,
  setNormalizationTarget,
  playSound,
  playSoundAsync,
  stopSound,
  stopAllSounds,
  registerStopSequencerCallback,
  isPlaying,
  getSoundProgress,
  getSoundDuration,
  clearSoundCache,
  analyzeAllGains,
  subscribeToPlayback,
  setCurrentPlayingSound,
  setCurrentPlayingProgress,
  getFinalVolumeForSound,
}