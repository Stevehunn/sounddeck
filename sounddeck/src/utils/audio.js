// sounddeck/src/utils/audio.js
import { Howl, Howler } from 'howler'

const soundCache = {}

// Cache pour les gains normalisés
const gainCache = {}

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
export async function analyzeGain(filePath, sampleCount = 100) {
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
    // Gain en dB pour atteindre -18 LUFS (valeur standard)
    const targetRMS = 0.1 // environ -20 dB
    const gain = rms > 0.001 ? targetRMS / rms : 1
    const gainDb = 20 * Math.log10(Math.min(gain, 10)) // Limiter à +20dB max
    
    gainCache[filePath] = gainDb
    return gainDb
  } catch (e) {
    console.warn('Gain analysis failed:', e)
    return 0
  }
}

// Calcule le volume final avec normalisation + ajustement individuel
function calculateFinalVolume(globalVolume, soundVolumeDb, gainDb = 0) {
  const normalizedGlobal = globalVolume / 100
  const globalRatio = Math.pow(normalizedGlobal, 1.8)
  
  // Ajustement individuel en dB (-24 à +24)
  const individualGain = (soundVolumeDb || 0)
  
  // Gain de normalisation
  const normalizationGain = gainDb || 0
  
  // Gain total en dB
  const totalGainDb = individualGain + normalizationGain
  
  // Convertir en ratio linéaire (plus grande plage)
  const linearGain = Math.pow(10, totalGainDb / 20)
  
  // Volume final = global * gain
  const finalVolume = Math.min(1, globalRatio * linearGain)
  
  return Math.max(0.0001, finalVolume) // Plus petit minimum pour -24dB
}

// Version asynchrone de playSound avec normalisation
export async function playSoundAsync(sound, audioDevice = 'default', globalVolume = 80, loop = false, playLocally = true) {
  if (!sound?.path) return

  // Analyser le gain si pas encore fait
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

  // Toggle : si en cours → stop
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

  // Cas 1 : périphérique par défaut
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

  // Cas 2 : périphérique virtuel
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

// Version synchrone pour compatibilité (utilise le cache existant)
export function playSound(sound, audioDevice = 'default', globalVolume = 80, loop = false, playLocally = true) {
  if (!sound?.path) return
  
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

// ... (le reste des fonctions inchangées)

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
  if (Array.isArray(cached)) return cached.some(h => h.playing())
  return cached.playing()
}

export function getSoundProgress(soundId) {
  const cached = soundCache[soundId]
  if (!cached) return null
  const howl = Array.isArray(cached) ? cached[0] : cached
  if (!howl || !howl.playing()) return null

  const seek = howl.seek()
  const duration = howl.duration()

  if (typeof seek !== 'number' || typeof duration !== 'number') return null
  if (!duration || duration <= 0) return null

  return { current: seek, duration, ratio: Math.min(1, seek / duration) }
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

// Exporter la fonction de calcul pour usage externe
export { calculateFinalVolume, gainCache }