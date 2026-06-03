import { Howl, Howler } from 'howler'

const soundCache = {}

export function playSound(sound, audioDevice = 'default', globalVolume = 80) {
  if (!sound?.path) { console.warn('playSound: pas de path', sound); return }

  const volumeRatio = ((sound.volume ?? 100) / 100) * (globalVolume / 100)

  // Toujours construire une URL file:// correcte pour Windows
  let fileUrl = sound.path
  if (!fileUrl.startsWith('file://') && !fileUrl.startsWith('http')) {
    // Windows : C:\... → file:///C:/...
    fileUrl = 'file:///' + fileUrl.replace(/\\/g, '/')
  }

  console.log('Playing:', fileUrl)

  // Arrêter et détruire le cache pour forcer le rechargement si besoin
  if (soundCache[sound.id]) {
    soundCache[sound.id].stop()
    soundCache[sound.id].unload()
    delete soundCache[sound.id]
  }

  const howl = new Howl({
    src: [fileUrl],
    volume: volumeRatio,
    html5: false, // false = Web Audio API, plus fiable en Electron
    format: [sound.path.split('.').pop() || 'mp3'],
    onloaderror: (id, err) => {
      console.error('Erreur chargement son:', err, fileUrl)
      delete soundCache[sound.id]
    },
    onplayerror: (id, err) => {
      console.error('Erreur lecture son:', err)
    }
  })

  soundCache[sound.id] = howl
  howl.play()
}

export function stopAllSounds() {
  Howler.stop()
}

export function clearSoundCache(soundId) {
  if (soundId) {
    if (soundCache[soundId]) { soundCache[soundId].unload(); delete soundCache[soundId] }
  } else {
    Object.keys(soundCache).forEach(k => { soundCache[k].unload(); delete soundCache[k] })
  }
}

export function formatDuration(seconds) {
  if (!seconds) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

export function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    let url = filePath
    if (!url.startsWith('file://') && !url.startsWith('http')) {
      url = 'file:///' + filePath.replace(/\\/g, '/')
    }
    const audio = new Audio(url)
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration))
    audio.addEventListener('error', () => resolve(null))
  })
}