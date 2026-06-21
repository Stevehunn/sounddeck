let audioContext = null
let microphoneSource = null
let microphoneGain = null
let soundGain = null
let masterGain = null
let destination = null
let isInitialized = false
let currentDeviceId = null
let isMicrophoneMuted = false
let audioElement = null

// Variables pour la réduction de bruit
let noiseSuppressionEnabled = false
let noiseSuppressionNode = null
let noiseFilter = null
let noiseCompressor = null
let noiseWorkletNode = null
let workletLoaded = false
let noiseSuppressionMode = 'auto'

// État du mixeur
export const mixerState = {
  isRunning: false,
  microphoneLevel: 1.0,
  soundLevel: 1.0,
  microphoneDeviceId: null,
  stream: null,
  isMicrophoneConnected: false,
  noiseSuppression: false,
  noiseSuppressionMode: 'off'
}

// ─── CHARGEMENT DE L'AUDIOWORKLET ──────────────────────────────────────────

async function loadNoiseSuppressionWorklet() {
  if (workletLoaded) return true
  
  try {
    if (!audioContext.audioWorklet) {
      console.warn('⚠️ AudioWorklet non supporté par ce navigateur')
      return false
    }
    
    // ✅ En production, le fichier est à la racine
    const baseUrl = window.location.origin
    const workletUrl = `${baseUrl}/noise-suppression.js`
    
    console.log('📥 Chargement de l\'AudioWorklet depuis:', workletUrl)
    await audioContext.audioWorklet.addModule(workletUrl)
    workletLoaded = true
    console.log('✅ AudioWorklet chargé avec succès')
    return true
    
  } catch (e) {
    console.warn('⚠️ Erreur chargement AudioWorklet:', e.message)
    workletLoaded = false
    return false
  }
}

// ─── RECONFIGURATION DE LA RÉDUCTION DE BRUIT ─────────────────────────────

function reconfigureNoiseSuppression() {
  try {
    // Déconnecter l'ancien noeud si existant
    if (microphoneSource) {
      microphoneSource.disconnect()
    }
    
    // Si le micro n'est pas connecté, on ne fait rien
    if (!microphoneGain) {
      return
    }
    
    // Nettoyer les anciens noeuds
    if (noiseWorkletNode) {
      try { noiseWorkletNode.disconnect() } catch (e) {}
      noiseWorkletNode = null
    }
    if (noiseFilter) {
      try { noiseFilter.disconnect() } catch (e) {}
      noiseFilter = null
    }
    if (noiseCompressor) {
      try { noiseCompressor.disconnect() } catch (e) {}
      noiseCompressor = null
    }
    noiseSuppressionNode = null
    
    if (!noiseSuppressionEnabled) {
      // ❌ Réduction de bruit désactivée - connexion directe
      microphoneSource.connect(microphoneGain)
      console.log('🔊 Réduction de bruit désactivée')
      return
    }
    
    // ✅ Réduction de bruit activée
    
    // ESSAYER AUDIOWORKLET D'ABORD (si supporté et disponible)
    if (noiseSuppressionMode === 'auto' || noiseSuppressionMode === 'worklet') {
      if (audioContext.audioWorklet && workletLoaded) {
        try {
          noiseWorkletNode = new AudioWorkletNode(audioContext, 'noise-suppression')
          microphoneSource.connect(noiseWorkletNode)
          noiseWorkletNode.connect(microphoneGain)
          console.log('🔇 Réduction de bruit (AudioWorklet) activée')
          return
        } catch (e) {
          console.warn('⚠️ Erreur création AudioWorklet:', e.message)
          noiseWorkletNode = null
          // Fallback vers le filtre basique
        }
      } else if (noiseSuppressionMode === 'worklet') {
        console.warn('⚠️ AudioWorklet demandé mais non disponible, fallback vers filtre basique')
      }
    }
    
    // FALLBACK : FILTRE BIQUAD + COMPRESSEUR
    try {
      // Créer un nœud de filtrage pour réduire le bruit
      noiseFilter = audioContext.createBiquadFilter()
      noiseFilter.type = 'lowpass'
      noiseFilter.frequency.value = 4000 // Coupe les fréquences au-dessus de 4kHz
      noiseFilter.Q.value = 0.7
      
      // Ajouter un compresseur léger pour lisser le volume
      noiseCompressor = audioContext.createDynamicsCompressor()
      noiseCompressor.threshold.value = -30
      noiseCompressor.knee.value = 40
      noiseCompressor.ratio.value = 12
      noiseCompressor.attack.value = 0.003
      noiseCompressor.release.value = 0.25
      
      // Connecter : micro → filtre → compresseur → gain micro
      microphoneSource.connect(noiseFilter)
      noiseFilter.connect(noiseCompressor)
      noiseCompressor.connect(microphoneGain)
      
      noiseSuppressionNode = { filter: noiseFilter, compressor: noiseCompressor }
      console.log('🔇 Réduction de bruit (filtre basique) activée')
      
    } catch (e) {
      console.warn('⚠️ Erreur création filtre basique:', e)
      // Dernier recours : connexion directe
      microphoneSource.connect(microphoneGain)
    }
    
  } catch (e) {
    console.warn('⚠️ Erreur lors de la reconfiguration du filtre:', e)
    // Fallback: connexion directe
    try {
      if (microphoneSource && microphoneGain) {
        microphoneSource.disconnect()
        microphoneSource.connect(microphoneGain)
      }
    } catch (err) {}
  }
}

// ─── API PUBLIQUE POUR LA RÉDUCTION DE BRUIT ──────────────────────────────

// Activer/désactiver la réduction de bruit
export function setNoiseSuppression(enabled) {
  noiseSuppressionEnabled = enabled
  mixerState.noiseSuppression = enabled
  console.log(`🎤 Réduction de bruit ${enabled ? 'activée' : 'désactivée'}`)
  
  // Si le mixeur est initialisé, on reconfigure
  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureNoiseSuppression()
  }
}

// Définir le mode de réduction de bruit
// 'auto' : essaye AudioWorklet, fallback sur filtre basique
// 'worklet' : utilise AudioWorklet uniquement (fallback si indisponible)
// 'filter' : utilise le filtre basique uniquement
// 'off' : désactivé
export function setNoiseSuppressionMode(mode) {
  const validModes = ['auto', 'worklet', 'filter', 'off']
  if (!validModes.includes(mode)) {
    console.warn(`⚠️ Mode invalide: ${mode}, utilisation de 'auto'`)
    mode = 'auto'
  }
  
  noiseSuppressionMode = mode
  mixerState.noiseSuppressionMode = mode
  
  if (mode === 'off') {
    setNoiseSuppression(false)
  } else {
    setNoiseSuppression(true)
  }
  
  console.log(`🎤 Mode réduction de bruit: ${mode}`)
}

// Obtenir le statut de la réduction de bruit
export function getNoiseSuppressionStatus() {
  return {
    enabled: noiseSuppressionEnabled,
    mode: noiseSuppressionMode,
    workletAvailable: workletLoaded && !!audioContext?.audioWorklet,
    activeMethod: noiseWorkletNode ? 'worklet' : (noiseSuppressionNode ? 'filter' : 'none'),
    workletLoaded
  }
}

// ─── INITIALISATION DU MIXEUR ──────────────────────────────────────────────

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
    
    // Réinitialiser l'état du worklet
    workletLoaded = false
    noiseWorkletNode = null
    noiseSuppressionNode = null
    noiseFilter = null
    noiseCompressor = null
    
    // Créer le contexte audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    console.log('✅ AudioContext créé, état:', audioContext.state)
    
    // Si le contexte est suspendu, le reprendre
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
      console.log('▶️ AudioContext repris, état:', audioContext.state)
    }
    
    // Charger l'AudioWorklet si supporté
    if (audioContext.audioWorklet && noiseSuppressionMode !== 'filter') {
      await loadNoiseSuppressionWorklet()
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
    
    // Initialiser le micro (avec la réduction de bruit si activée)
    const success = await initMicrophone(microphoneDeviceId)
    if (!success) {
      console.warn('⚠️ Impossible d\'initialiser le micro')
    }
    
    isInitialized = true
    mixerState.isRunning = true
    mixerState.stream = destination.stream
    mixerState.isMicrophoneConnected = success
    mixerState.noiseSuppression = noiseSuppressionEnabled
    mixerState.noiseSuppressionMode = noiseSuppressionMode
    
    console.log('✅ Mixeur audio initialisé avec succès')
    console.log('📊 Micro connecté:', success)
    console.log('📊 Flux audio disponible:', !!destination.stream)
    console.log('📊 État AudioContext:', audioContext.state)
    console.log('📊 Réduction de bruit:', noiseSuppressionEnabled)
    console.log('📊 Mode:', noiseSuppressionMode)
    console.log('📊 Worklet chargé:', workletLoaded)
    
    return destination.stream
    
  } catch (e) {
    console.error('❌ Erreur initialisation mixeur:', e)
    isInitialized = false
    mixerState.isRunning = false
    return null
  }
}

// ─── INITIALISATION DU MICRO ───────────────────────────────────────────────

async function initMicrophone(deviceId) {
  try {
    // Arrêter l'ancien stream micro si existant
    if (microphoneSource) {
      microphoneSource.disconnect()
      microphoneSource = null
    }
    
    // Nettoyer les noeuds de réduction de bruit
    if (noiseWorkletNode) {
      try { noiseWorkletNode.disconnect() } catch (e) {}
      noiseWorkletNode = null
    }
    if (noiseFilter) {
      try { noiseFilter.disconnect() } catch (e) {}
      noiseFilter = null
    }
    if (noiseCompressor) {
      try { noiseCompressor.disconnect() } catch (e) {}
      noiseCompressor = null
    }
    noiseSuppressionNode = null
    
    // ✅ Récupérer la liste des périphériques pour vérifier si le deviceId existe
    let actualDeviceId = deviceId
    if (deviceId && deviceId !== 'default') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(d => d.kind === 'audioinput')
        const deviceExists = audioInputs.some(d => d.deviceId === deviceId)
        
        if (!deviceExists) {
          console.warn(`⚠️ Périphérique ${deviceId} non trouvé, utilisation du périphérique par défaut`)
          actualDeviceId = 'default'
        } else {
          console.log(`✅ Périphérique trouvé: ${deviceId}`)
        }
      } catch (e) {
        console.warn('⚠️ Erreur lors de l\'énumération des périphériques:', e)
        actualDeviceId = 'default'
      }
    }
    
    const constraints = {
      audio: {
        deviceId: actualDeviceId && actualDeviceId !== 'default' ? { exact: actualDeviceId } : undefined,
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
    
    // Appliquer la réduction de bruit si activée
    if (noiseSuppressionEnabled && noiseSuppressionMode !== 'off') {
      
      // ESSAYER AUDIOWORKLET (si supporté et disponible)
      if (noiseSuppressionMode !== 'filter' && audioContext.audioWorklet && workletLoaded) {
        try {
          noiseWorkletNode = new AudioWorkletNode(audioContext, 'noise-suppression')
          microphoneSource.connect(noiseWorkletNode)
          noiseWorkletNode.connect(microphoneGain)
          console.log('🔇 Réduction de bruit (AudioWorklet) activée')
        } catch (e) {
          console.warn('⚠️ Erreur création AudioWorklet:', e.message)
          noiseWorkletNode = null
          applyBasicNoiseFilter()
        }
      } else {
        applyBasicNoiseFilter()
      }
      
    } else {
      microphoneSource.connect(microphoneGain)
      console.log('🔊 Réduction de bruit désactivée')
    }
    
    currentDeviceId = actualDeviceId
    mixerState.microphoneDeviceId = actualDeviceId
    mixerState.isMicrophoneConnected = true
    
    console.log('✅ Micro connecté avec succès')
    console.log('📊 État du micro:', {
      deviceId: actualDeviceId,
      audioContextState: audioContext.state,
      gainValue: microphoneGain.gain.value,
      noiseSuppression: noiseSuppressionEnabled,
      noiseMethod: noiseWorkletNode ? 'worklet' : (noiseSuppressionNode ? 'filter' : 'none'),
      trackReady: stream.getAudioTracks()[0]?.readyState || 'unknown'
    })
    
    return true
    
  } catch (e) {
    console.error('❌ Erreur connexion micro:', e)
    mixerState.isMicrophoneConnected = false
    return false
  }
}

// Fonction helper pour appliquer le filtre basique
function applyBasicNoiseFilter() {
  try {
    if (!microphoneSource || !microphoneGain) return
    
    // Créer un nœud de filtrage
    noiseFilter = audioContext.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = 4000
    noiseFilter.Q.value = 0.7
    
    // Ajouter un compresseur léger
    noiseCompressor = audioContext.createDynamicsCompressor()
    noiseCompressor.threshold.value = -30
    noiseCompressor.knee.value = 40
    noiseCompressor.ratio.value = 12
    noiseCompressor.attack.value = 0.003
    noiseCompressor.release.value = 0.25
    
    microphoneSource.connect(noiseFilter)
    noiseFilter.connect(noiseCompressor)
    noiseCompressor.connect(microphoneGain)
    
    noiseSuppressionNode = { filter: noiseFilter, compressor: noiseCompressor }
    console.log('🔇 Réduction de bruit (filtre basique) activée')
    
  } catch (e) {
    console.warn('⚠️ Erreur création filtre basique:', e)
    // Fallback: connexion directe
    try {
      if (microphoneSource && microphoneGain) {
        microphoneSource.disconnect()
        microphoneSource.connect(microphoneGain)
      }
    } catch (err) {}
  }
}

// ─── RESTE DES FONCTIONS (connexion, lecture, etc.) ──────────────────────

// Connecter le flux mixé à un périphérique de sortie
export function connectMixerToOutput(deviceId) {
  if (!destination || !destination.stream) {
    console.warn('⚠️ Aucun flux mixé disponible')
    return false
  }
  
  try {
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
    }
    
    audioElement = new Audio()
    audioElement.srcObject = destination.stream
    
    if (deviceId && deviceId !== 'default') {
      // @ts-ignore
      audioElement.setSinkId(deviceId).then(() => {
        console.log('✅ Flux mixé redirigé vers:', deviceId)
      }).catch(err => {
        console.warn('⚠️ Impossible de rediriger le flux vers', deviceId, ':', err)
        audioElement.setSinkId('default').catch(() => {})
      })
    }
    
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

// Jouer un son dans le mixeur
export function playSoundInMixer(audioBuffer, volume = 1.0) {
  if (!isInitialized || !audioContext || !destination) {
    console.warn('⚠️ Mixeur non initialisé, impossible de jouer le son')
    return null
  }
  
  try {
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
  return destination ? destination.stream : null
}

// Vérifier si le mixeur est actif
export function isMixerActive() {
  return isInitialized && audioContext && audioContext.state === 'running'
}

// Démarrer le contexte audio
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

// Test ponctuel du micro
export async function testMicrophoneOnce(deviceId = 'default') {
  let tempContext = null
  let tempStream = null
  
  try {
    console.log('🎤 Test ponctuel du micro...')
    
    tempContext = new (window.AudioContext || window.webkitAudioContext)()
    if (tempContext.state === 'suspended') {
      await tempContext.resume()
    }
    
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

// Obtenir l'état du micro
export function getMicrophoneStatus() {
  return {
    isConnected: mixerState.isMicrophoneConnected,
    deviceId: currentDeviceId,
    audioContextState: audioContext?.state || 'closed',
    gainValue: microphoneGain?.gain?.value || 0,
    noiseSuppression: noiseSuppressionEnabled,
    noiseMode: noiseSuppressionMode,
    activeMethod: noiseWorkletNode ? 'worklet' : (noiseSuppressionNode ? 'filter' : 'none')
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
    audioElementActive: !!audioElement,
    noiseSuppression: noiseSuppressionEnabled,
    noiseMode: noiseSuppressionMode,
    workletAvailable: workletLoaded,
    activeMethod: noiseWorkletNode ? 'worklet' : (noiseSuppressionNode ? 'filter' : 'none')
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

// Arrêter et nettoyer le mixeur
export async function stopMixer() {
  try {
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
      console.log('🧹 Élément audio nettoyé')
    }
    
    if (noiseWorkletNode) {
      try { noiseWorkletNode.disconnect() } catch (e) {}
      noiseWorkletNode = null
    }
    if (noiseFilter) {
      try { noiseFilter.disconnect() } catch (e) {}
      noiseFilter = null
    }
    if (noiseCompressor) {
      try { noiseCompressor.disconnect() } catch (e) {}
      noiseCompressor = null
    }
    noiseSuppressionNode = null
    
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

// Obtenir la liste des périphériques audio
export async function getAudioInputDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(d => d.kind === 'audioinput')
  } catch (e) {
    console.error('❌ Erreur énumération périphériques:', e)
    return []
  }
}

// ─── VÉRIFICATION ET RÉPARATION DU MIXEUR ─────────────────────────────────────

// Vérifier si le mixeur est opérationnel
export function isMixerOperational() {
  if (!isInitialized) {
    console.log('ℹ️ Mixeur non initialisé')
    return false
  }
  if (!audioContext) {
    console.log('ℹ️ AudioContext null')
    return false
  }
  if (audioContext.state !== 'running') {
    console.log(`ℹ️ AudioContext état: ${audioContext.state}`)
    return false
  }
  if (!destination || !destination.stream) {
    console.log('ℹ️ Destination ou stream manquant')
    return false
  }
  if (!microphoneGain || !soundGain || !masterGain) {
    console.log('ℹ️ Un ou plusieurs gains manquants')
    return false
  }
  return true
}

// Réparer le mixeur si nécessaire
export function repairMixer() {
  if (!isInitialized) {
    console.warn('⚠️ Mixeur non initialisé, impossible de réparer')
    return false
  }
  
  try {
    console.log('🔧 Tentative de réparation du mixeur...')
    
    // 1. Vérifier et reprendre le contexte
    if (audioContext.state === 'suspended') {
      audioContext.resume()
      console.log('▶️ AudioContext repris')
    }
    
    // 2. Reconnecter les noeuds si nécessaire
    try {
      if (microphoneGain && masterGain) {
        // Déconnecter et reconnecter pour être sûr
        try { microphoneGain.disconnect() } catch (e) {}
        microphoneGain.connect(masterGain)
        console.log('🔗 MicrophoneGain reconnecté')
      }
      if (soundGain && masterGain) {
        try { soundGain.disconnect() } catch (e) {}
        soundGain.connect(masterGain)
        console.log('🔗 SoundGain reconnecté')
      }
      if (masterGain && destination) {
        try { masterGain.disconnect() } catch (e) {}
        masterGain.connect(destination)
        console.log('🔗 MasterGain reconnecté')
      }
    } catch (e) {
      console.warn('⚠️ Erreur lors des reconnexions:', e)
    }
    
    // 3. Recréer l'élément audio de sortie
    if (audioElement) {
      try {
        audioElement.pause()
        audioElement.srcObject = null
      } catch (e) {}
      audioElement = null
    }
    
    if (destination && destination.stream) {
      audioElement = new Audio()
      audioElement.srcObject = destination.stream
      audioElement.play().catch(() => {
        console.warn('⚠️ Impossible de jouer le flux audio')
      })
      console.log('✅ Élément audio recréé')
    }
    
    // 4. Vérifier si la réparation a fonctionné
    const operational = isMixerOperational()
    if (operational) {
      console.log('✅ Mixeur réparé avec succès')
    } else {
      console.warn('⚠️ La réparation n\'a pas complètement résolu le problème')
    }
    
    return operational
    
  } catch (e) {
    console.error('❌ Erreur lors de la réparation du mixeur:', e)
    return false
  }
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

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
  testMicrophoneOnce,
  setNoiseSuppression,
  setNoiseSuppressionMode,
  getNoiseSuppressionStatus,
  isMixerOperational,
  repairMixer,
  mixerState
}