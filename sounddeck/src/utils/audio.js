import { Howl, Howler } from 'howler'

const soundCache = {}

export function playSound(sound, audioDevice = 'default', globalVolume = 80, loop = false) {
  if (!sound?.path) return

  const volumeRatio = ((sound.volume ?? 100) / 100) * (globalVolume / 100)

  let fileUrl = sound.path
  if (!fileUrl.startsWith('file://') && !fileUrl.startsWith('http')) {
    fileUrl = 'file:///' + fileUrl.replace(/\\/g, '/')
  }

  // Toggle : si en cours → stop
  if (soundCache[sound.id] && soundCache[sound.id].playing()) {
    soundCache[sound.id].stop()
    soundCache[sound.id].unload()
    delete soundCache[sound.id]
    return
  }

  if (soundCache[sound.id]) {
    soundCache[sound.id].unload()
    delete soundCache[sound.id]
  }

  const howl = new Howl({
    src: [fileUrl],
    volume: volumeRatio,
    html5: false,
    loop: loop,
    format: [sound.path.split('.').pop()?.toLowerCase() || 'mp3'],
    onend: () => { if (!loop) delete soundCache[sound.id] },
    onstop: () => { delete soundCache[sound.id] },
    onloaderror: (id, err) => { console.error('Erreur chargement:', err); delete soundCache[sound.id] }
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

export function stopAllSounds() {
  Howler.stop()
  Object.keys(soundCache).forEach(k => delete soundCache[k])
}

export function isPlaying(soundId) {
  return !!(soundCache[soundId] && soundCache[soundId].playing())
}

export function clearSoundCache(soundId) {
  if (soundId) {
    if (soundCache[soundId]) { soundCache[soundId].unload(); delete soundCache[soundId] }
  } else {
    Object.keys(soundCache).forEach(k => { soundCache[k].unload(); delete soundCache[k] })
  }
}