// src/core/services/AudioService.js
import { Howl } from 'howler'
import * as AudioMixerService from './AudioMixerService'
import { buildFileUrl } from '@shared/utils/fileUrl'
import { withTemporaryAudioContext } from '@shared/utils/audioContext'
import { logError, logWarn } from '@shared/utils/logger'

const soundCache = {}
const gainCache = {}
let storeRef = null

const DEFAULT_NORMALIZATION_TARGET_RMS = 0.2
let normalizationTargetRMS = DEFAULT_NORMALIZATION_TARGET_RMS

const pausedSounds = new Set()
const playingIds = new Set()
const pausedProgresses = new Map()
const mixerSourceState = new Map()
const pausedStates = new Map()
const soundMetadata = new Map()
const externalPlaybackHandlers = new Map()

// DEBUG : logs actifs uniquement en dev
const DEBUG_AUDIO =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV

function dbg(tag, data) {
  if (!DEBUG_AUDIO) return
  try {
    // eslint-disable-next-line no-console
    console.log(`[AudioService][${tag}]`, data)
  } catch (e) {}
}

export function setStoreRef(store) {
  storeRef = store
}

// ─── SYSTÈME D'ÉVÉNEMENTS DE LECTURE ────────────────────────────────────────

const playbackListeners = new Set()
let currentPlayingId = null

export function subscribeToPlayback(callback) {
  playbackListeners.add(callback)
  try {
    callback({
      id: currentPlayingId,
      playingIds: Array.from(playingIds),
    })
  } catch (e) {
    logError('AudioService', 'Callback playback initial', e)
  }
  return () => playbackListeners.delete(callback)
}

function notifyPlaybackListeners(id = null) {
  currentPlayingId = id ?? null
  const snapshot = {
    id: currentPlayingId,
    playingIds: Array.from(playingIds),
  }
  playbackListeners.forEach((cb) => {
    try {
      cb(snapshot)
    } catch (e) {
      logError('AudioService', 'Callback playback', e)
    }
  })
}

function markSoundPlaying(soundId) {
  if (!soundId) return
  playingIds.add(soundId)
}

function markSoundStopped(soundId) {
  if (!soundId) return
  playingIds.delete(soundId)
  pausedSounds.delete(soundId)
  pausedProgresses.delete(soundId)
  mixerSourceState.delete(soundId)
  pausedStates.delete(soundId)
  soundMetadata.delete(soundId)
}

function handleHowlTerminated(soundId) {
  if (pausedSounds.has(soundId)) return

  delete soundCache[soundId]
  markSoundStopped(soundId)

  if (currentPlayingId === soundId) {
    notifyPlaybackListeners(null)
  } else {
    notifyPlaybackListeners(currentPlayingId)
  }
}

export function getPlayingIds() {
  return Array.from(playingIds)
}

// ─── OVERRIDE POUR LECTEURS EXTERNES ────────────────────────────────────────

let manualOverrideId = null
let manualProgress = { id: null, current: 0, duration: 0, ratio: 0 }

export function setCurrentPlayingSound(soundId) {
  manualOverrideId = soundId || null
  if (!soundId) {
    manualProgress = { id: null, current: 0, duration: 0, ratio: 0 }
    playingIds.clear()
  } else {
    playingIds.add(soundId)
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

// ─── REGISTRE DES LECTEURS EXTERNES ────────────────────────────────────────

export function registerExternalPlayback(soundId, handlers) {
  if (!soundId || !handlers) return
  externalPlaybackHandlers.set(soundId, handlers)
}

export function unregisterExternalPlayback(soundId) {
  if (!soundId) return
  externalPlaybackHandlers.delete(soundId)
}

// ─── HELPERS CACHE ─────────────────────────────────────────────────────────

function findTrackableHowl(cached) {
  if (!cached || cached === 'loading' || cached === '__mixer_paused__') return null

  const isHowl = (h) =>
    h &&
    typeof h.playing === 'function' &&
    typeof h.seek === 'function' &&
    typeof h.duration === 'function'

  if (Array.isArray(cached)) {
    return cached.find(isHowl) || null
  }

  return isHowl(cached) ? cached : null
}

const isBufferSourceNode = (h) =>
  typeof AudioBufferSourceNode !== 'undefined' && h instanceof AudioBufferSourceNode

function captureHowlOffset(h) {
  if (!h) return { offset: null, duration: null }

  let offset = null
  let duration = null

  try {
    const node = h._sounds?.[0]?._node
    if (node) {
      if (typeof node.currentTime === 'number' && node.currentTime > 0) {
        offset = node.currentTime
      }
      if (typeof node.duration === 'number' && node.duration > 0) {
        duration = node.duration
      }
    }
  } catch (e) {}

  if (offset === null) {
    try {
      const s = h.seek()
      if (typeof s === 'number' && s > 0) offset = s
    } catch (e) {}
  }

  if (duration === null) {
    try {
      const d = h.duration()
      if (typeof d === 'number' && d > 0) duration = d
    } catch (e) {}
  }

  return { offset, duration }
}

// ─── DÉTECTION DES DEVICES VIRTUELS ────────────────────────────────────────

const VIRTUAL_DEVICE_KEYWORDS = [
  'cable', 'vb-audio', 'vb audio', 'virtual', 'voicemeeter', 'scream',
]

async function getDeviceLabel(deviceId) {
  if (!deviceId || deviceId === 'default') return ''
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const device = devices.find(
      (d) => d.deviceId === deviceId && d.kind === 'audiooutput'
    )
    return (device?.label || '').toLowerCase()
  } catch (e) {
    return ''
  }
}

function isVirtualDeviceLabel(label) {
  if (!label) return false
  return VIRTUAL_DEVICE_KEYWORDS.some((kw) => label.includes(kw))
}

async function shouldCreateLocalHowl(audioDevice, localDeviceId, playLocally) {
  if (!playLocally) return false

  if (localDeviceId === audioDevice) {
    logWarn('AudioService', `Skip local : même device (${audioDevice})`)
    return false
  }

  const audioLabel = await getDeviceLabel(audioDevice)
  const localLabel = await getDeviceLabel(localDeviceId)

  const audioIsVirtual = isVirtualDeviceLabel(audioLabel)
  const localIsVirtual = isVirtualDeviceLabel(localLabel)

  if (localIsVirtual) {
    logWarn('AudioService',
      `Skip local : "${localLabel}" est un device virtuel.`)
    return false
  }

  if (localDeviceId === 'default' && audioIsVirtual) {
    logWarn('AudioService',
      `Skip local : localDeviceId='default' + audioDevice virtuel.`)
    return false
  }

  return true
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
      const gain = rms > 0.001 ? normalizationTargetRMS / rms : 1
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
  const clamped = Math.max(
    0.02,
    Math.min(1, Number(targetRMS) || DEFAULT_NORMALIZATION_TARGET_RMS)
  )
  normalizationTargetRMS = clamped
}

export function getNormalizationTarget() {
  return normalizationTargetRMS
}

function calculateFinalVolume(globalVolume, soundVolumeDb, gainDb = 0) {
  const normalizedGlobal = globalVolume / 100
  const globalRatio = Math.pow(normalizedGlobal, 1.8)
  const individualGain = soundVolumeDb || 0
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

function playSoundNormal(
  sound,
  audioDevice = 'default',
  globalVolume = 80,
  loop = false,
  playLocally = true
) {
  const gainDb = gainCache[sound.path] || 0
  const volumeRatio = calculateFinalVolume(globalVolume, sound.volume ?? 0, gainDb)
  const fileUrl = buildFileUrl(sound.path)

  const rawExt = sound.path
    .split('.').pop()?.split('?')[0]?.split('#')[0]?.toLowerCase()
  const validFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm']
  const format = validFormats.includes(rawExt) ? rawExt : 'mp3'

  if (soundCache[sound.id]) {
    const cached = soundCache[sound.id]
    if (Array.isArray(cached)) {
      cached.forEach((h) => {
        try { h.stop(); h.unload() } catch (e) {}
      })
    } else {
      try { cached.stop(); cached.unload() } catch (e) {}
    }
    delete soundCache[sound.id]
    return
  }

  // ─── Cas 1 : device par défaut → Howl html5:false ────────────────────
  if (!audioDevice || audioDevice === 'default') {
    const howl = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: false,
      loop,
      format: [format],
      onend: () => {
        if (!loop) handleHowlTerminated(sound.id)
      },
      onstop: () => handleHowlTerminated(sound.id),
      onloaderror: (id, err) => {
        logError('AudioService', 'playSoundNormal onloaderror', err)
        handleHowlTerminated(sound.id)
      },
    })
    soundCache[sound.id] = howl

    soundMetadata.set(sound.id, {
      mode: 'howler-default',
      fileUrl,
      format,
      volume: volumeRatio,
      loop,
      audioDevice,
    })

    dbg('PLAY-NORMAL', {
      soundId: sound.id,
      mode: 'howler-default',
      html5: false,
    })

    howl.play()
    return
  }

  // ─── Cas 2 : device virtuel → Howls html5:true ───────────────────────
  const localDeviceId = storeRef?.localAudioDevice || 'default'

  try {
    const howls = []

    const howlDiscord = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: true,
      loop,
      format: [format],
      onend: () => {
        if (!loop) handleHowlTerminated(sound.id)
      },
      onstop: () => handleHowlTerminated(sound.id),
      onloaderror: (id, err) => {
        logError('AudioService', 'device virtuel', err)
        handleHowlTerminated(sound.id)
      },
    })

    howlDiscord.once('play', () => {
      try {
        const audioNode = howlDiscord._sounds?.[0]?._node
        if (audioNode && audioNode.setSinkId) {
          audioNode.setSinkId(audioDevice)
            .catch((e) => logWarn('AudioService', 'setSinkId failed', e))
        }
      } catch (e) {
        logWarn('AudioService', 'setSinkId error', e)
      }
    })

    howls.push(howlDiscord)
    howlDiscord.play()

    soundCache[sound.id] = howls

    soundMetadata.set(sound.id, {
      mode: 'howler-virtual',
      fileUrl,
      format,
      volume: volumeRatio,
      loop,
      audioDevice,
      localDevice: localDeviceId,
      howlsConfig: [
        { fileUrl, volume: volumeRatio, format, loop, device: audioDevice },
      ],
      hasLocal: false,
    })

    dbg('PLAY-NORMAL', {
      soundId: sound.id,
      mode: 'howler-virtual',
      html5: true,
      audioDevice,
      localDeviceId,
    })

    shouldCreateLocalHowl(audioDevice, localDeviceId, playLocally).then(
      (shouldCreate) => {
        if (!shouldCreate) return
        if (!soundCache[sound.id]) return

        const howlLocal = new Howl({
          src: [fileUrl],
          volume: volumeRatio * 0.8,
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
              audioNode.setSinkId(localDeviceId).catch(() => {})
            }
          } catch (e) {}
        })

        if (Array.isArray(soundCache[sound.id])) {
          soundCache[sound.id].push(howlLocal)
        } else {
          soundCache[sound.id] = [howlLocal]
        }

        const meta = soundMetadata.get(sound.id)
        if (meta && meta.mode === 'howler-virtual') {
          meta.hasLocal = true
          meta.howlsConfig.push({
            fileUrl,
            volume: volumeRatio * 0.8,
            format,
            loop,
            device: localDeviceId,
          })
        }

        howlLocal.play()
      }
    )
  } catch (e) {
    logError('AudioService', 'playSoundNormal', e)
    const howl = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: false,
      loop,
      format: [format],
    })
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

  if (cached && cached !== 'loading') {
    stopSound(sound.id)
    return
  }

  if (cached === 'loading') return

  soundCache[sound.id] = 'loading'

  let audioBuffer = null
  try {
    audioBuffer = await AudioMixerService.loadAudioBuffer(fileUrl)
  } catch (e) {
    delete soundCache[sound.id]
    logWarn('AudioService', 'Erreur chargement buffer', e)
    return
  }

  if (soundCache[sound.id] !== 'loading') return

  if (!audioBuffer) {
    delete soundCache[sound.id]
    logWarn('AudioService', `Impossible de charger: ${fileUrl}`)
    return
  }

  const source = AudioMixerService.playSoundInMixer(audioBuffer, volumeRatio)

  if (source) {
    soundCache[sound.id] = source
    if (loop) source.loop = true
    else {
      source.onended = () => handleHowlTerminated(sound.id)
    }

    mixerSourceState.set(sound.id, {
      buffer: audioBuffer,
      offset: 0,
      volume: volumeRatio,
      loop,
      playLocally,
      startedAtMs: performance.now(),
      fileUrl,
      localDevice: storeRef?.localAudioDevice || 'default',
      localHowlVolume: volumeRatio * 0.8,
    })

    soundMetadata.set(sound.id, {
      mode: 'mixer',
      fileUrl,
      volume: volumeRatio,
      loop,
      playLocally,
      localDevice: storeRef?.localAudioDevice || 'default',
      localHowlVolume: volumeRatio * 0.8,
    })

    dbg('PLAY-MIXER', {
      soundId: sound.id,
      bufferDuration: audioBuffer.duration,
      volumeRatio,
    })

    notifyPlaybackListeners(currentPlayingId)
  } else {
    delete soundCache[sound.id]
    return
  }

  if (playLocally) {
    try {
      const localDevice = storeRef?.localAudioDevice || 'default'

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

  markSoundPlaying(sound.id)
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

  markSoundPlaying(sound.id)
  notifyPlaybackListeners(sound.id)

  if (sound.path && !gainCache[sound.path]) {
    try { await analyzeGain(sound.path) } catch (e) {
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

  markSoundStopped(soundId)

  if (currentPlayingId === soundId) {
    notifyPlaybackListeners(null)
  } else {
    notifyPlaybackListeners(currentPlayingId)
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

  const safeStop = (h) => {
    try {
      if (isBufferSourceNode(h) || (h.stop && typeof h.stop === 'function')) h.stop()
      if (h.disconnect && typeof h.disconnect === 'function') h.disconnect()
      if (h.unload && typeof h.unload === 'function') h.unload()
    } catch (e) {}
  }

  if (Array.isArray(cached)) cached.forEach(safeStop)
  else safeStop(cached)

  delete soundCache[soundId]
}

let stopSequencerCallback = null

export function registerStopSequencerCallback(cb) {
  stopSequencerCallback = cb
}

export function stopAllSounds() {
  const ids = Object.keys(soundCache)

  for (const id of ids) {
    playingIds.delete(id)
    pausedSounds.delete(id)
    pausedProgresses.delete(id)
    mixerSourceState.delete(id)
    pausedStates.delete(id)
    soundMetadata.delete(id)
  }

  ids.forEach((k) => {
    const cached = soundCache[k]
    if (!cached) return

    const safeStop = (h) => {
      try {
        if (isBufferSourceNode(h) || (h.stop && typeof h.stop === 'function')) h.stop()
        if (h.disconnect && typeof h.disconnect === 'function') h.disconnect()
        if (h.unload && typeof h.unload === 'function') h.unload()
      } catch (e) {}
    }

    if (Array.isArray(cached)) cached.forEach(safeStop)
    else if (cached !== 'loading') safeStop(cached)

    delete soundCache[k]
  })

  manualOverrideId = null
  manualProgress = { id: null, current: 0, duration: 0, ratio: 0 }

  notifyPlaybackListeners(null)

  if (stopSequencerCallback) stopSequencerCallback()
}

// ─── PAUSE / RESUME ────────────────────────────────────────────────────────

export function pauseSound(soundId) {
  const cached = soundCache[soundId]
  if (!cached || cached === 'loading') return false

  pausedSounds.add(soundId)

  try {
    const items = Array.isArray(cached) ? cached : [cached]
    const meta = soundMetadata.get(soundId) || {}
    const mode = meta.mode || 'howler-default'

    let capturedOffset = null
    let capturedDuration = null

    // ─── MODE 3 : MIXER ────────────────────────────────────────────────
    if (mode === 'mixer') {
      const state = mixerSourceState.get(soundId)

      if (state?.buffer) {
        const now = performance.now()
        const elapsed = Math.max(0, (now - (state.startedAtMs ?? now)) / 1000)
        const newOffset = Math.min(
          (state.offset || 0) + elapsed,
          Math.max(0, state.buffer.duration - 0.05)
        )
        capturedOffset = newOffset
        capturedDuration = state.buffer.duration

        pausedStates.set(soundId, {
          mode: 'mixer',
          offset: newOffset,
          duration: state.buffer.duration,
          buffer: state.buffer,
          mixerVolume: state.volume,
          loop: state.loop,
          playLocally: state.playLocally,
          fileUrl: state.fileUrl,
          localDevice: state.localDevice,
          localHowlVolume: state.localHowlVolume,
        })
      }

      for (const h of items) {
        if (isBufferSourceNode(h)) {
          try { h.onended = null } catch (e) {}
          try { h.stop() } catch (e) {}
          try { h.disconnect() } catch (e) {}
        }
      }
      for (const h of items) {
        if (!isBufferSourceNode(h) && h?.unload) {
          try { h.unload() } catch (e) {}
        }
      }

      soundCache[soundId] = '__mixer_paused__'
    }

    // ─── MODE 2 : HOWLER VIRTUEL (html5:true) ──────────────────────────
    else if (mode === 'howler-virtual') {
      const firstHowl = items.find((h) => !isBufferSourceNode(h))
      if (firstHowl) {
        const capture = captureHowlOffset(firstHowl)
        capturedOffset = capture.offset
        capturedDuration = capture.duration
      }

      if (capturedOffset !== null && capturedDuration !== null) {
        pausedStates.set(soundId, {
          mode: 'howler-virtual',
          offset: capturedOffset,
          duration: capturedDuration,
          howlsConfig: meta.howlsConfig || [],
        })
      }

      for (const h of items) {
        if (!isBufferSourceNode(h) && h?.unload) {
          try { h.unload() } catch (e) {}
        }
      }

      soundCache[soundId] = '__mixer_paused__'
    }

    // ─── MODE 1 : HOWLER DEFAULT (html5:false) ─────────────────────────
    else {
      const firstHowl = items.find((h) => !isBufferSourceNode(h))
      if (firstHowl) {
        const captureBefore = captureHowlOffset(firstHowl)
        capturedOffset = captureBefore.offset
        capturedDuration = captureBefore.duration

        try { firstHowl.pause() } catch (e) {}

        const captureAfter = captureHowlOffset(firstHowl)
        if (captureAfter.offset !== null) capturedOffset = captureAfter.offset
      }
    }

    if (capturedOffset !== null && capturedDuration !== null) {
      pausedProgresses.set(soundId, {
        current: capturedOffset,
        duration: capturedDuration,
      })
    }

    notifyPlaybackListeners(currentPlayingId)
    return true
  } catch (e) {
    pausedSounds.delete(soundId)
    logWarn('AudioService', 'Erreur pauseSound', e)
    return false
  }
}

export function resumeSound(soundId) {
  try {
    const state = pausedStates.get(soundId)
    const meta = soundMetadata.get(soundId) || {}
    const mode = state?.mode || meta.mode || 'howler-default'

    // ─── MODE 3 : MIXER ────────────────────────────────────────────────
    if (mode === 'mixer' && state) {
      const newSource = AudioMixerService.playSoundInMixer(
        state.buffer,
        state.mixerVolume,
        state.offset
      )

      if (newSource) {
        mixerSourceState.set(soundId, {
          buffer: state.buffer,
          offset: state.offset,
          volume: state.mixerVolume,
          loop: state.loop,
          playLocally: state.playLocally,
          startedAtMs: performance.now(),
          fileUrl: state.fileUrl,
          localDevice: state.localDevice,
          localHowlVolume: state.localHowlVolume,
        })

        if (state.loop) {
          newSource.loop = true
        } else {
          newSource.onended = () => handleHowlTerminated(soundId)
        }

        let newLocalHowl = null

        if (state.playLocally && state.fileUrl) {
          const savedOffset = state.offset
          const localDevice = state.localDevice || 'default'

          newLocalHowl = new Howl({
            src: [state.fileUrl],
            volume: state.localHowlVolume || 0.8,
            html5: true,
            format: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
            loop: state.loop || false,
            onloaderror: (id, err) => {
              logWarn('AudioService', 'Erreur recréation lecture locale', err)
            },
          })

          const applyOffsetAndPlay = () => {
            if (!playingIds.has(soundId) || pausedSounds.has(soundId)) {
              try { newLocalHowl.unload() } catch (e) {}
              return
            }
            // ✅ Seek via Howler (support Range côté protocolHandler)
            if (savedOffset > 0) {
              try { newLocalHowl.seek(savedOffset) } catch (e) {}
            }
            try {
              const node = newLocalHowl._sounds?.[0]?._node
              if (node && node.setSinkId && localDevice && localDevice !== 'default') {
                node.setSinkId(localDevice).catch(() => {})
              }
            } catch (e) {}
            try { newLocalHowl.play() } catch (e) {}
          }

          if (newLocalHowl.state() === 'loaded') {
            applyOffsetAndPlay()
          } else {
            newLocalHowl.once('load', applyOffsetAndPlay)
          }
        }

        soundCache[soundId] = newLocalHowl
          ? [newSource, newLocalHowl]
          : newSource
      }
    }

    // ─── MODE 2 : HOWLER VIRTUEL (html5:true) ──────────────────────────
    // ✅ SIMPLIFIÉ : plus besoin de setTimeout de correction.
    //    Le protocolHandler gère les Range requests → howl.seek() fonctionne.
    else if (mode === 'howler-virtual' && state) {
      const savedOffset = state.offset
      const configs = state.howlsConfig || []
      const newHowls = []

      configs.forEach((cfg, index) => {
        const howl = new Howl({
          src: [cfg.fileUrl],
          volume: cfg.volume,
          html5: true,
          format: [cfg.format || 'mp3'],
          loop: cfg.loop || false,
          onloaderror: (id, err) => {
            logWarn('AudioService', `Erreur recréation howl ${index}`, err)
          },
        })

        const applyAndPlay = () => {
          if (!playingIds.has(soundId) || pausedSounds.has(soundId)) {
            try { howl.unload() } catch (e) {}
            return
          }

          // ✅ Seek direct via Howler (le Range fonctionne maintenant)
          if (savedOffset > 0) {
            try { howl.seek(savedOffset) } catch (e) {}
          }

          try {
            const node = howl._sounds?.[0]?._node
            if (node && cfg.device && cfg.device !== 'default' && node.setSinkId) {
              node.setSinkId(cfg.device).catch(() => {})
            }
          } catch (e) {}

          try { howl.play() } catch (e) {}
        }

        if (howl.state() === 'loaded') {
          applyAndPlay()
        } else {
          howl.once('load', applyAndPlay)
        }

        newHowls.push(howl)
      })

      if (newHowls.length === 1) {
        soundCache[soundId] = newHowls[0]
      } else if (newHowls.length > 1) {
        soundCache[soundId] = newHowls
      }
    }

    // ─── MODE 1 : HOWLER DEFAULT (html5:false) ─────────────────────────
    // html5:false → le buffer est déjà en RAM, seek trivial.
    else {
      const cached = soundCache[soundId]
      if (cached && cached !== 'loading' && cached !== '__mixer_paused__') {
        const items = Array.isArray(cached) ? cached : [cached]
        const savedOffset = pausedProgresses.get(soundId)?.current || 0

        for (const h of items) {
          if (!h?.play || typeof h.play !== 'function') continue

          if (savedOffset > 0) {
            try { h.seek(savedOffset) } catch (e) {}
          }

          try { h.play() } catch (e) {}
        }
      }
    }

    pausedStates.delete(soundId)
    pausedSounds.delete(soundId)
    pausedProgresses.delete(soundId)
    notifyPlaybackListeners(currentPlayingId)
    return true
  } catch (e) {
    pausedSounds.delete(soundId)
    logWarn('AudioService', 'Erreur resumeSound', e)
    return false
  }
}

export function isPausedSound(soundId) {
  const ext = externalPlaybackHandlers.get(soundId)
  if (ext?.isPaused) {
    try { return ext.isPaused() } catch (e) {
      logWarn('AudioService', 'Erreur ext.isPaused', e)
    }
  }
  return pausedSounds.has(soundId)
}

export function togglePauseSound(soundId) {
  const ext = externalPlaybackHandlers.get(soundId)
  if (ext) {
    try {
      const isPaused = ext.isPaused?.() ?? false
      return isPaused ? (ext.resume?.() ?? false) : (ext.pause?.() ?? false)
    } catch (e) {
      logWarn('AudioService', 'Erreur togglePauseSound (ext)', e)
      return false
    }
  }

  if (pausedSounds.has(soundId)) return resumeSound(soundId)
  return pauseSound(soundId)
}

// ─── API DE LECTURE ────────────────────────────────────────────────────────

export function isPlaying(soundId) {
  if (manualOverrideId === soundId) return true
  if (pausedSounds.has(soundId)) return false

  const cached = soundCache[soundId]
  if (!cached || cached === 'loading' || cached === '__mixer_paused__') return false

  const howl = findTrackableHowl(cached)
  if (howl) return howl.playing()

  if (Array.isArray(cached)) {
    const hasBufferSource = cached.some(isBufferSourceNode)
    if (hasBufferSource) return true
    return cached.length > 0
  }
  if (isBufferSourceNode(cached)) return true
  return !!cached
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

  if (pausedSounds.has(soundId)) {
    const frozen = pausedProgresses.get(soundId)
    if (frozen?.duration > 0) {
      return {
        current: frozen.current,
        duration: frozen.duration,
        ratio: Math.min(1, frozen.current / frozen.duration),
      }
    }
    return null
  }

  // Mode mixer : on calcule depuis startedAtMs (le BufferSourceNode
  // n'expose pas sa position courante de façon fiable).
  const state = mixerSourceState.get(soundId)
  if (state?.buffer) {
    const now = performance.now()
    const elapsed = Math.max(0, (now - (state.startedAtMs ?? now)) / 1000)
    const current = Math.min(
      (state.offset || 0) + elapsed,
      state.buffer.duration
    )
    if (state.buffer.duration > 0) {
      return {
        current,
        duration: state.buffer.duration,
        ratio: Math.min(1, current / state.buffer.duration),
      }
    }
  }

  // Mode howler : howl.seek() renvoie maintenant la bonne valeur
  // (le protocolHandler supporte les Range requests).
  const cached = soundCache[soundId]
  if (!cached || cached === 'loading' || cached === '__mixer_paused__') return null

  const howl = findTrackableHowl(cached)
  if (!howl) return null
  if (!howl.playing()) return null

  const seek = howl.seek()
  const duration = howl.duration()
  if (typeof seek !== 'number' || typeof duration !== 'number') return null
  if (!duration || duration <= 0) return null

  return {
    current: seek,
    duration,
    ratio: Math.min(1, seek / duration),
  }
}

export function getSoundDuration(soundId) {
  const cached = soundCache[soundId]
  if (!cached || cached === '__mixer_paused__') return null
  const howl = findTrackableHowl(cached)
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
  getNormalizationTarget,
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
  pauseSound,
  resumeSound,
  isPausedSound,
  togglePauseSound,
  registerExternalPlayback,
  unregisterExternalPlayback,
  getPlayingIds,
}