import { Howl, Howler } from 'howler'

// Cache des instances Howl actives
const soundCache = {}

export function playSound(sound, audioDevice = 'default', globalVolume = 80) {
  if (!sound?.path) { console.warn('playSound: pas de path', sound); return }

  const volumeRatio = ((sound.volume ?? 100) / 100) * (globalVolume / 100)

  let fileUrl = sound.path
  if (!fileUrl.startsWith('file://') && !fileUrl.startsWith('http')) {
    fileUrl = 'file:///' + fileUrl.replace(/\\/g, '/')
  }

  // Si déjà en cours de lecture → stop
  if (soundCache[sound.id] && soundCache[sound.id].playing()) {
    soundCache[sound.id].stop()
    soundCache[sound.id].unload()
    delete soundCache[sound.id]
    return // toggle : un 2e clic arrête le son
  }

  // Nettoyer l'ancienne instance si elle existe
  if (soundCache[sound.id]) {
    soundCache[sound.id].unload()
    delete soundCache[sound.id]
  }

  const howl = new Howl({
    src: [fileUrl],
    volume: volumeRatio,
    html5: false,
    format: [sound.path.split('.').pop()?.toLowerCase() || 'mp3'],
    onend: () => { delete soundCache[sound.id] },
    onstop: () => { delete soundCache[sound.id] },
    onloaderror: (id, err) => {
      console.error('Erreur chargement:', err, fileUrl)
      delete soundCache[sound.id]
    }
  })

  soundCache[sound.id] = howl
  howl.play()
}

export function stopSound(soundId) {
  if (soundCache[soundId]) {
    soundCache[soundId].stop()
    soundCache[soundId].unload()
    delete soundCache[soundId]
  }
}

export function isPlaying(soundId) {
  return !!(soundCache[soundId] && soundCache[soundId].playing())
}

export function stopAllSounds() {
  Howler.stop()
  Object.keys(soundCache).forEach(k => delete soundCache[k])
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