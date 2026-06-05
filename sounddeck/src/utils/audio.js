import { Howl, Howler } from 'howler'

const soundCache = {}

// Construit une URL file:// correcte pour Windows et les chemins avec espaces
function buildFileUrl(filePath) {
  if (!filePath) return null
  if (filePath.startsWith('file://') || filePath.startsWith('http')) return filePath

  // Normaliser les backslashes Windows
  let normalized = filePath.replace(/\\/g, '/')

  // Ne pas encoder les : de Windows (C:/) ni les /
  // Utiliser encodeURI qui préserve ces caractères mais encode les espaces etc.
  // Mais encodeURI ne gère pas les # et ? dans les noms de fichiers
  const parts = normalized.split('/')
  const encodedParts = parts.map((part, i) => {
    // Le premier segment peut être vide (chemin absolu) ou le lecteur (C:)
    if (part === '' || /^[A-Za-z]:$/.test(part)) return part
    return encodeURIComponent(part)
      .replace(/%2F/gi, '/')  // restaurer les /
  })

  return 'file:///' + encodedParts.join('/')
}

// Joue un son sur un AudioContext avec un sinkId spécifique
function playSoundOnDevice(fileUrl, volumeRatio, loop, format, soundId, cacheKey) {
  const howl = new Howl({
    src: [fileUrl],
    volume: volumeRatio,
    html5: true, // html5 requis pour setSinkId
    loop: loop,
    format: [format],
    onend: () => { if (!loop) delete soundCache[cacheKey] },
    onstop: () => { delete soundCache[cacheKey] },
    onloaderror: (id, err) => {
      console.error('Erreur chargement:', err)
      delete soundCache[cacheKey]
    }
  })
  return howl
}

export async function playSound(sound, audioDevice = 'default', globalVolume = 80, loop = false, playLocally = true) {
  if (!sound?.path) return

  const volumeRatio = ((sound.volume ?? 100) / 100) * (globalVolume / 100)

  let fileUrl = buildFileUrl(sound.path)
  console.log('playSound path:', sound.path, '→', fileUrl)

  // Extraire le format depuis le chemin — ignorer les paramètres d'URL éventuels
  const rawExt = sound.path.split('.').pop()?.split('?')[0]?.split('#')[0]?.toLowerCase()
  const validFormats = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm']
  const format = validFormats.includes(rawExt) ? rawExt : 'mp3'
  console.log('format détecté:', format, 'depuis:', sound.path)

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

  // Cas 1 : périphérique par défaut ou pas de device spécifique
  // → Howler joue normalement, playLocally détermine si on entend localement
  if (!audioDevice || audioDevice === 'default') {
    // Sans device virtuel, on joue juste normalement
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

  // Cas 2 : périphérique virtuel sélectionné (ex: VB-Audio Cable)
  // On utilise l'API Web Audio avec setSinkId pour router vers le bon device
  try {
    const howls = []

    // Toujours jouer sur le périphérique Discord/virtuel
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

    // Appliquer le sinkId sur l'élément audio sous-jacent
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

    // Si "jouer en local aussi" → jouer aussi sur le périphérique par défaut
    if (playLocally) {
      const howlLocal = new Howl({
        src: [fileUrl],
        volume: volumeRatio,
        html5: true,
        loop,
        format: [format],
        onloaderror: (id, err) => { console.error('Erreur local:', err) }
      })
      // sinkId 'default' = haut-parleurs par défaut
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
    // Fallback simple
    const howl = new Howl({ src: [fileUrl], volume: volumeRatio, html5: false, loop, format: [format] })
    soundCache[sound.id] = howl
    howl.play()
  }
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

export function stopAllSounds() {
  Object.keys(soundCache).forEach(k => stopSound(k))
}

export function isPlaying(soundId) {
  const cached = soundCache[soundId]
  if (!cached) return false
  if (Array.isArray(cached)) return cached.some(h => h.playing())
  return cached.playing()
}

export function clearSoundCache(soundId) {
  if (soundId) stopSound(soundId)
  else stopAllSounds()
}