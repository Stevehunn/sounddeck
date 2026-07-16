import { Howl, Howler } from 'howler'
import { playSoundInMixer, loadAudioBuffer, isMixerActive, mixerState, stopMixer, initAudioMixer } from './audioMixer'

const soundCache = {}

// Cache pour les gains normalisés
const gainCache = {}

// Référence au store pour accéder à l'état du mixeur
let storeRef = null

export function setStoreRef(store) {
  storeRef = store
}

// Construit une URL file:// correcte pour Windows et les chemins avec espaces
function buildFileUrl(filePath) {
  if (!filePath) return null
  if (filePath.startsWith('file://') || filePath.startsWith('http')) return filePath

  let normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const encodedParts = parts.map((part, i) => {
    if (part === '' || /^[A-Za-z]:$/.test(part)) return part
    return encodeURIComponent(part)
      .replace(/%2F/gi, '/')
  })

  return 'file:///' + encodedParts.join('/')
}

// Analyse le gain normalisé d'un fichier audio
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

// Fonction pour définir la cible de normalisation
export function setNormalizationTarget(targetRMS) {
  gainCache.targetRMS = targetRMS
}

// Calcule le volume final avec normalisation + ajustement individuel
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
      onend: () => { if (!loop) delete soundCache[sound.id] },
      onstop: () => { delete soundCache[sound.id] },
      onloaderror: (id, err) => { console.error('Erreur:', err); delete soundCache[sound.id] }
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
      onend: () => { if (!loop) delete soundCache[sound.id] },
      onstop: () => { delete soundCache[sound.id] },
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

// ─── Mode Mixeur (VB-Cable) ────────────────────────────────────────────────

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
  
  const audioBuffer = await loadAudioBuffer(fileUrl)
  if (!audioBuffer) {
    console.warn('⚠️ Impossible de charger le son:', fileUrl)
    return
  }
  
  // Jouer le son dans le mixeur (pour Discord)
  const source = playSoundInMixer(audioBuffer, volumeRatio)
  
  if (source) {
    soundCache[sound.id] = source
    if (loop) {
      source.onended = () => {
        if (storeRef?.loopEnabled) {
          playSoundWithMixer(sound, globalVolume, loop, playLocally)
        } else {
          delete soundCache[sound.id]
        }
      }
    } else {
      source.onended = () => {
        delete soundCache[sound.id]
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

// ─── Version principale de playSound ──────────────────────────────────────

export function playSound(sound, audioDevice = 'default', globalVolume = 80, loop = false, playLocally = true) {
  if (!sound?.path) return
  
  const mixerEnabled = storeRef?.mixerEnabled || false
  if (mixerEnabled && isMixerActive()) {
    playSoundWithMixer(sound, globalVolume, loop, playLocally)
  } else {
    playSoundNormal(sound, audioDevice, globalVolume, loop, playLocally)
  }
}

// Version asynchrone de playSound avec normalisation
export async function playSoundAsync(sound, audioDevice = 'default', globalVolume = 80, loop = false, playLocally = true) {
  if (!sound?.path) return

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
      onend: () => { if (!loop) delete soundCache[sound.id] },
      onstop: () => { delete soundCache[sound.id] },
      onloaderror: (id, err) => { console.error('Erreur:', err); delete soundCache[sound.id] }
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
      onend: () => { if (!loop) delete soundCache[sound.id] },
      onstop: () => { delete soundCache[sound.id] },
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

// Analyse tous les sons d'un coup
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
  const cached = soundCache[soundId]
  if (cached) {
    if (Array.isArray(cached)) {
      cached.forEach(h => { try { h.stop(); h.unload() } catch(e){} })
    } else {
      try { cached.stop(); cached.unload() } catch(e){} 
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

// Exporter les fonctions pour usage externe
export { calculateFinalVolume, gainCache }