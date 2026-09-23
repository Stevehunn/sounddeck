// src/core/services/AudioService.js
import { Howl } from 'howler'
import * as AudioMixerService from './AudioMixerService'
import { buildFileUrl } from '@shared/utils/fileUrl'
import { withTemporaryAudioContext } from '@shared/utils/audioContext'
import { logError, logWarn } from '@shared/utils/logger'

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
    logError('AudioService', 'Callback playback initial', e)
  }
  return () => playbackListeners.delete(callback)
}

function notifyPlaybackListeners(id) {
  currentPlayingId = id
  playbackListeners.forEach(cb => {
    try {
      cb({ id })
    } catch (e) {
      logError('AudioService', 'Callback playback', e)
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
    ratio: duration > 0 ? Math.min(1, (current || 0) / duration) : 0,
  }
}

// ─── ANALYSE GAIN ──────────────────────────────────────────────────────────

export async function analyzeGain(filePath, sampleCount = 200) {
  if (gainCache[filePath]) return gainCache[filePath]

  try {
    const fileUrl = buildFileUrl(filePath)

    const result = await withTemporaryAudioContext(fileUrl, (audioBuffer) => {
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

      return gainDb
    })

    gainCache[filePath] = result ?? 0
    return gainCache[filePath]
  } catch (e) {
    logWarn('AudioService', 'Gain analysis failed', e)
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
  const fileUrl = buildFileUrl(sound.path)

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
        logError('AudioService', 'playSoundNormal onloaderror', err)
        delete soundCache[sound.id]
        if (currentPlayingId === sound.id) notifyPlaybackListeners(null)
      },
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
      onloaderror: (id, err) => {
        logError('AudioService', 'device virtuel', err)
      },
    })

    howlDiscord.once('play', () => {
      try {
        const audioNode = howlDiscord._sounds?.[0]?._node
        if (audioNode && audioNode.setSinkId) {
          audioNode.setSinkId(audioDevice).catch(e => logWarn('AudioService', 'setSinkId failed', e))
        }
      } catch (e) {
        logWarn('AudioService', 'setSinkId error', e)
      }
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
        onloaderror: (id, err) => {
          logError('AudioService', 'lecture locale', err)
        },
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
    logError('AudioService', 'playSound', e)
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
  const cached = soundCache[sound.id]

  // Si un son joue ou est en cours de chargement, on l'arrête et on sort.
  if (cached && cached !== 'loading') {
    stopSound(sound.id)
    return
  }

  // Si le son est déjà en chargement, on ignore le nouveau clic.
  if (cached === 'loading') {
    return
  }

  soundCache[sound.id] = 'loading'

  let audioBuffer = null
  try {
    audioBuffer = await AudioMixerService.loadAudioBuffer(fileUrl)
  } catch (e) {
    delete soundCache[sound.id]
    logWarn('AudioService', 'Erreur chargement buffer', e)
    return
  }

  if (!audioBuffer) {
    delete soundCache[sound.id]
    logWarn('AudioService', `Impossible de charger: ${fileUrl}`)
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
  } else {
    delete soundCache[sound.id]
    return
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
          logWarn('AudioService', 'Erreur lecture locale (mixer)', err)
        },
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
      logWarn('AudioService', 'Erreur lecture locale (mixer, catch)', e)
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

  if (sound.path && !gainCache[sound.path]) {
    try {
      await analyzeGain(sound.path)
    } catch (e) {
      logWarn('AudioService', 'Gain analysis fallback', e)
    }
  }

  playSound(sound, audioDevice, globalVolume, loop, playLocally)
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
        logWarn('AudioService', `Analyze failed: ${sound.path}`, e)
      }
    }
    done++
    if (onProgress) onProgress(done / total)
  }

  return gainCache
}

export function stopSound(soundId) {
  const cached = soundCache[soundId]

  if (currentPlayingId === soundId) {
    notifyPlaybackListeners(null)
  }
  if (manualOverrideId === soundId) {
    manualOverrideId = null
    manualProgress = { id: null, current: 0, duration: 0, ratio: 0 }
  }

  if (cached === 'loading') {
    delete soundCache[soundId]
    return
  }

  if (!cached) return

  const isBufferSource = (h) =>
    typeof AudioBufferSourceNode !== 'undefined' && h instanceof AudioBufferSourceNode

  const safeStop = (h) => {
    try {
      if (isBufferSource(h) || (h.stop && typeof h.stop === 'function')) {
        h.stop()
      }
      if (h.disconnect && typeof h.disconnect === 'function') {
        h.disconnect()
      }
      if (h.unload && typeof h.unload === 'function') {
        h.unload()
      }
    } catch (e) {}
  }

  if (Array.isArray(cached)) {
    cached.forEach(safeStop)
  } else {
    safeStop(cached)
  }

  delete soundCache[soundId]
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
      ratio: manualProgress.ratio,
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