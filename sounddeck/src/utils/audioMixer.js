// sounddeck/src/utils/audioMixer.js
// Mixeur audio local qui combine le micro + les sons de SoundDeck

let audioContext = null
let microphoneSource = null
let microphoneGain = null
let soundGain = null
let masterGain = null
let destination = null
let isInitialized = false
let currentDeviceId = null
let isMicrophoneMuted = false
let audioElement = null // Pour rediriger le flux vers le périphérique de sortie

// État du mixeur
export const mixerState = {
  isRunning: false,
  microphoneLevel: 1.0,
  soundLevel: 1.0,
  microphoneDeviceId: null,
  stream: null,
  isMicrophoneConnected: false
}

// Initialiser le mixeur audio
export async function initAudioMixer(microphoneDeviceId = 'default') {
  try {
    console.log('🎛️ Démarrage du mixeur audio...')
    
    // Fermer l'ancien contexte si existant
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close()
      console.log('🔄 Ancien contexte fermé')
    }
    
    // Nettoyer l'ancien élément audio
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
    }
    
    // Créer le contexte audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    console.log('✅ AudioContext créé, état:', audioContext.state)
    
    // Si le contexte est suspendu, le reprendre
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
      console.log('▶️ AudioContext repris, état:', audioContext.state)
    }
    
    // Créer les noeuds de gain
    microphoneGain = audioContext.createGain()
    microphoneGain.gain.value = 1.0
    
    soundGain = audioContext.createGain()
    soundGain.gain.value = 1.0
    
    // Créer un gain de mixage final
    masterGain = audioContext.createGain()
    masterGain.gain.value = 1.0
    
    // Créer la destination (flux mixé)
    destination = audioContext.createMediaStreamDestination()
    
    // Connecter les gains à la destination
    microphoneGain.connect(masterGain)
    soundGain.connect(masterGain)
    masterGain.connect(destination)
    
    console.log('✅ Noeuds audio créés et connectés')
    
    // Initialiser le micro
    const success = await initMicrophone(microphoneDeviceId)
    if (!success) {
      console.warn('⚠️ Impossible d\'initialiser le micro')
    }
    
    isInitialized = true
    mixerState.isRunning = true
    mixerState.stream = destination.stream
    mixerState.isMicrophoneConnected = success
    
    console.log('✅ Mixeur audio initialisé avec succès')
    console.log('📊 Micro connecté:', success)
    console.log('📊 Flux audio disponible:', !!destination.stream)
    console.log('📊 État AudioContext:', audioContext.state)
    
    return destination.stream
    
  } catch (e) {
    console.error('❌ Erreur initialisation mixeur:', e)
    isInitialized = false
    mixerState.isRunning = false
    return null
  }
}

// Connecter le flux mixé à un périphérique de sortie
export function connectMixerToOutput(deviceId) {
  if (!destination || !destination.stream) {
    console.warn('⚠️ Aucun flux mixé disponible')
    return false
  }
  
  try {
    // Nettoyer l'ancien élément audio
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
    }
    
    // Créer un élément audio pour rediriger le flux
    audioElement = new Audio()
    audioElement.srcObject = destination.stream
    
    // Rediriger vers le périphérique de sortie
    if (deviceId && deviceId !== 'default') {
      // @ts-ignore - setSinkId existe dans les navigateurs modernes
      audioElement.setSinkId(deviceId).then(() => {
        console.log('✅ Flux mixé redirigé vers:', deviceId)
      }).catch(err => {
        console.warn('⚠️ Impossible de rediriger le flux vers', deviceId, ':', err)
        // Essayer avec le périphérique par défaut
        audioElement.setSinkId('default').catch(() => {})
      })
    }
    
    // Démarrer la lecture du flux (nécessaire pour que le flux soit actif)
    audioElement.play().catch(err => {
      console.warn('⚠️ Impossible de lire le flux:', err)
    })
    
    console.log('✅ Flux mixé connecté au périphérique de sortie')
    return true
    
  } catch (e) {
    console.error('❌ Erreur redirection du flux:', e)
    return false
  }
}

// Initialiser le micro
async function initMicrophone(deviceId) {
  try {
    // Arrêter l'ancien stream micro si existant
    if (microphoneSource) {
      microphoneSource.disconnect()
      microphoneSource = null
    }
    
    const constraints = {
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 2
      }
    }
    
    console.log('🎤 Connexion au micro avec les contraintes:', constraints)
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    // Vérifier que le stream a des pistes audio
    if (!stream.getAudioTracks().length) {
      console.error('❌ Aucune piste audio dans le stream')
      return false
    }
    
    console.log('✅ Stream micro obtenu:', stream.getAudioTracks().length, 'piste(s)')
    
    // Créer la source micro
    microphoneSource = audioContext.createMediaStreamSource(stream)
    microphoneSource.connect(microphoneGain)
    
    currentDeviceId = deviceId
    mixerState.microphoneDeviceId = deviceId
    mixerState.isMicrophoneConnected = true
    
    console.log('✅ Micro connecté avec succès')
    console.log('📊 État du micro:', {
      deviceId,
      audioContextState: audioContext.state,
      gainValue: microphoneGain.gain.value,
      trackReady: stream.getAudioTracks()[0]?.readyState || 'unknown'
    })
    
    return true
    
  } catch (e) {
    console.error('❌ Erreur connexion micro:', e)
    mixerState.isMicrophoneConnected = false
    return false
  }
}

// Obtenir l'état du micro
export function getMicrophoneStatus() {
  return {
    isConnected: mixerState.isMicrophoneConnected,
    deviceId: currentDeviceId,
    audioContextState: audioContext?.state || 'closed',
    gainValue: microphoneGain?.gain?.value || 0
  }
}

// Obtenir les statistiques du mixeur
export function getMixerStats() {
  return {
    isInitialized,
    isRunning: mixerState.isRunning,
    isMicrophoneConnected: mixerState.isMicrophoneConnected,
    audioContextState: audioContext?.state || 'closed',
    microphoneGain: microphoneGain?.gain?.value || 0,
    soundGain: soundGain?.gain?.value || 0,
    masterGain: masterGain?.gain?.value || 0,
    hasStream: !!destination?.stream,
    streamActive: destination?.stream?.active || false,
    tracksCount: destination?.stream?.getAudioTracks().length || 0,
    audioElementActive: !!audioElement
  }
}

// Changer le périphérique micro
export async function changeMicrophone(deviceId) {
  if (!isInitialized) {
    console.warn('⚠️ Mixeur non initialisé')
    return false
  }
  
  return await initMicrophone(deviceId)
}

// Changer le périphérique de sortie
export function changeOutputDevice(deviceId) {
  return connectMixerToOutput(deviceId)
}

// Jouer un son dans le mixeur
export function playSoundInMixer(audioBuffer, volume = 1.0) {
  if (!isInitialized || !audioContext || !destination) {
    console.warn('⚠️ Mixeur non initialisé, impossible de jouer le son')
    return null
  }
  
  try {
    // Vérifier que l'AudioContext est actif
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
    
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    
    const gain = audioContext.createGain()
    gain.gain.value = volume
    
    source.connect(gain)
    gain.connect(soundGain)
    source.start()
    
    console.log('🔊 Son joué dans le mixeur, volume:', volume)
    
    // S'assurer que le flux est bien connecté
    if (!audioElement) {
      const defaultDevice = 'default'
      connectMixerToOutput(defaultDevice)
    }
    
    return source
  } catch (e) {
    console.error('❌ Erreur lecture son:', e)
    return null
  }
}

// Charger un fichier audio dans un buffer
export async function loadAudioBuffer(fileUrl) {
  if (!audioContext) {
    console.warn('⚠️ AudioContext non initialisé')
    return null
  }
  
  try {
    // Vérifier que l'AudioContext est actif
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    return audioBuffer
  } catch (e) {
    console.error('❌ Erreur chargement audio:', e)
    return null
  }
}

// Régler le volume du micro
export function setMicrophoneVolume(volume) {
  if (!microphoneGain) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  microphoneGain.gain.value = clampedVolume
  mixerState.microphoneLevel = clampedVolume
  console.log('🎤 Volume micro réglé à:', clampedVolume)
}

// Régler le volume des sons
export function setSoundVolume(volume) {
  if (!soundGain) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  soundGain.gain.value = clampedVolume
  mixerState.soundLevel = clampedVolume
  console.log('🔊 Volume sons réglé à:', clampedVolume)
}

// Obtenir le flux audio mixé
export function getMixedStream() {
  if (destination && destination.stream) {
    console.log('📊 Flux mixé:', {
      active: destination.stream.active,
      tracks: destination.stream.getAudioTracks().length,
      state: destination.stream.getAudioTracks()[0]?.readyState
    })
  }
  return destination ? destination.stream : null
}

// Vérifier si le mixeur est actif
export function isMixerActive() {
  const active = isInitialized && audioContext && audioContext.state === 'running'
  console.log('📊 Mixeur actif:', active, 'État AudioContext:', audioContext?.state)
  return active
}

// Démarrer le contexte audio (nécessaire après une interaction utilisateur)
export function resumeAudioContext() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume()
    console.log('▶️ AudioContext repris')
  }
}

// Couper/activer le micro
export function toggleMicrophoneMute() {
  if (!microphoneGain) return
  isMicrophoneMuted = !isMicrophoneMuted
  microphoneGain.gain.value = isMicrophoneMuted ? 0 : (mixerState.microphoneLevel || 1.0)
  console.log('🎤 Micro', isMicrophoneMuted ? 'coupé' : 'activé')
  return isMicrophoneMuted
}

// Arrêter et nettoyer le mixeur
export async function stopMixer() {
  try {
    // Nettoyer l'élément audio
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
      console.log('🧹 Élément audio nettoyé')
    }
    
    if (microphoneSource) {
      microphoneSource.disconnect()
      microphoneSource = null
    }
    
    if (microphoneGain) {
      microphoneGain.disconnect()
      microphoneGain = null
    }
    
    if (soundGain) {
      soundGain.disconnect()
      soundGain = null
    }
    
    if (masterGain) {
      masterGain.disconnect()
      masterGain = null
    }
    
    if (destination) {
      destination = null
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close()
    }
    
    isInitialized = false
    mixerState.isRunning = false
    mixerState.stream = null
    mixerState.isMicrophoneConnected = false
    
    console.log('✅ Mixeur arrêté')
  } catch (e) {
    console.error('❌ Erreur arrêt mixeur:', e)
  }
}

// Obtenir la liste des périphériques audio (micros)
export async function getAudioInputDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(d => d.kind === 'audioinput')
  } catch (e) {
    console.error('❌ Erreur énumération périphériques:', e)
    return []
  }
}

// Test ponctuel du micro
export async function testMicrophoneOnce(deviceId = 'default') {
  let tempContext = null
  let tempStream = null
  
  try {
    console.log('🎤 Test ponctuel du micro...')
    
    // Créer un contexte temporaire
    tempContext = new (window.AudioContext || window.webkitAudioContext)()
    if (tempContext.state === 'suspended') {
      await tempContext.resume()
    }
    
    // Récupérer le flux du micro
    const constraints = {
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    }
    
    tempStream = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (!tempStream.getAudioTracks().length) {
      throw new Error('Aucune piste audio disponible')
    }
    
    // Créer une source et la connecter à la destination pour entendre le micro
    const source = tempContext.createMediaStreamSource(tempStream)
    const gain = tempContext.createGain()
    gain.gain.value = 0.3
    source.connect(gain)
    gain.connect(tempContext.destination)
    
    const deviceName = tempStream.getAudioTracks()[0]?.label || 'Microphone'
    
    console.log('✅ Test micro démarré pour 3 secondes')
    
    return {
      success: true,
      deviceName,
      stream: tempStream,
      context: tempContext,
      stop: () => {
        try {
          if (tempStream) {
            tempStream.getTracks().forEach(track => track.stop())
            tempStream = null
          }
          if (tempContext && tempContext.state !== 'closed') {
            tempContext.close()
            tempContext = null
          }
          console.log('🔇 Test micro arrêté')
        } catch (e) {
          console.warn('Erreur lors de l\'arrêt du test:', e)
        }
      }
    }
    
  } catch (e) {
    console.error('❌ Erreur test micro:', e)
    if (tempStream) {
      tempStream.getTracks().forEach(track => track.stop())
    }
    if (tempContext && tempContext.state !== 'closed') {
      try { await tempContext.close() } catch (err) {}
    }
    return {
      success: false,
      error: e.message
    }
  }
}

// Exporter les fonctions pour usage externe
export default {
  initAudioMixer,
  changeMicrophone,
  changeOutputDevice,
  connectMixerToOutput,
  playSoundInMixer,
  loadAudioBuffer,
  setMicrophoneVolume,
  setSoundVolume,
  getMixedStream,
  isMixerActive,
  resumeAudioContext,
  stopMixer,
  getAudioInputDevices,
  getMicrophoneStatus,
  getMixerStats,
  toggleMicrophoneMute,
  mixerState
}