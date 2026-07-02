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
let lowLatencyMode = false

// Variables pour la réduction de bruit
let noiseSuppressionEnabled = false
let noiseSuppressionNode = null
let noiseFilter = null
let noiseCompressor = null
let noiseWorkletNode = null
let workletLoaded = false
let noiseSuppressionMode = 'auto'

// ✅ Cache des nœuds pour réutilisation
let cachedNodes = {
  micGain: null,
  soundGain: null,
  masterGain: null,
  destination: null,
  ctx: null
}

// ✅ État du mixeur
export const mixerState = {
  isRunning: false,
  microphoneLevel: 1.0,
  soundLevel: 1.0,
  microphoneDeviceId: null,
  stream: null,
  isMicrophoneConnected: false,
  noiseSuppression: false,
  noiseSuppressionMode: 'off',
  lowLatencyMode: false,
  isWarmup: false
}

// ✅ Promise pour le préchauffage du worklet
let workletPromise = null

// ─── PRÉCHAUFFAGE DU CONTEXTE AUDIO ──────────────────────────────────────

export async function warmupAudioContext() {
  if (mixerState.isWarmup) return
  
  mixerState.isWarmup = true
  console.log('🔥 Préchauffage du contexte audio...')
  
  try {
    // Créer un contexte temporaire
    const ctx = new AudioContext()
    
    // Reprendre le contexte
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    
    // Créer un silence pour maintenir le contexte actif
    const buffer = ctx.createBuffer(1, 1, 44100)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
    source.onended = () => source.disconnect()
    
    // Précharger le worklet en arrière-plan
    if (ctx.audioWorklet) {
      workletPromise = ctx.audioWorklet.addModule('/noise-suppression.js')
        .then(() => {
          workletLoaded = true
          console.log('✅ AudioWorklet préchargé')
          return true
        })
        .catch(() => false)
    }
    
    // Fermer le contexte temporaire après le préchauffage
    setTimeout(async () => {
      await ctx.close()
      mixerState.isWarmup = false
      console.log('✅ Contexte audio préchauffé')
    }, 100)
    
  } catch (e) {
    console.warn('⚠️ Erreur préchauffage:', e)
    mixerState.isWarmup = false
  }
}

// ─── INITIALISATION DU MIXEUR ──────────────────────────────────────────────

export async function initAudioMixer(microphoneDeviceId = 'default') {
  const startTime = performance.now()
  console.log('🎛️ Démarrage du mixeur audio...')
  
  try {
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
    
    // ✅ Réinitialiser l'état du worklet
    workletLoaded = false
    noiseWorkletNode = null
    noiseSuppressionNode = null
    noiseFilter = null
    noiseCompressor = null
    
    // ✅ Créer le contexte audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    console.log('✅ AudioContext créé, état:', audioContext.state)
    
    // ✅ Si le contexte est suspendu, le reprendre
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
      console.log('▶️ AudioContext repris, état:', audioContext.state)
    }
    
    // ✅ Utiliser le worklet préchargé si disponible
    if (workletPromise) {
      await workletPromise
    } else if (audioContext.audioWorklet && noiseSuppressionMode !== 'filter') {
      await loadNoiseSuppressionWorklet()
    }
    
    // ✅ Créer les nœuds de gain
    microphoneGain = audioContext.createGain()
    microphoneGain.gain.value = 1.0
    
    soundGain = audioContext.createGain()
    soundGain.gain.value = 1.0
    
    // ✅ Créer un gain de mixage final
    masterGain = audioContext.createGain()
    masterGain.gain.value = 1.0
    
    // ✅ Créer la destination (flux mixé)
    destination = audioContext.createMediaStreamDestination()
    
    // ✅ Connecter les gains à la destination
    microphoneGain.connect(masterGain)
    soundGain.connect(masterGain)
    masterGain.connect(destination)
    
    console.log('✅ Noeuds audio créés et connectés')
    
    // ✅ Initialiser le micro
    const success = await initMicrophone(microphoneDeviceId)
    if (!success) {
      console.warn('⚠️ Impossible d\'initialiser le micro')
    }
    
    // ✅ Préconnecter le flux
    preconnectMixer()
    
    isInitialized = true
    mixerState.isRunning = true
    mixerState.stream = destination.stream
    mixerState.isMicrophoneConnected = success
    mixerState.noiseSuppression = noiseSuppressionEnabled
    mixerState.noiseSuppressionMode = noiseSuppressionMode
    mixerState.lowLatencyMode = lowLatencyMode
    
    const latency = (performance.now() - startTime).toFixed(2)
    console.log(`✅ Mixeur audio initialisé en ${latency}ms`)
    console.log('📊 Micro connecté:', success)
    console.log('📊 Mode basse latence:', lowLatencyMode)
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

// ─── PRÉCONNEXION DU FLUX ──────────────────────────────────────────────────

export function preconnectMixer() {
  if (!destination || !destination.stream) return false
  
  try {
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
    }
    
    audioElement = new Audio()
    audioElement.srcObject = destination.stream
    
    // ✅ Si le flux est déjà prêt, démarrer immédiatement
    if (audioElement.readyState >= 2) {
      audioElement.play().catch(() => {})
      console.log('✅ Flux préconnecté')
    }
    
    return true
  } catch (e) {
    console.warn('⚠️ Erreur préconnexion:', e)
    return false
  }
}

// ─── CHARGEMENT DE L'AUDIOWORKLET ──────────────────────────────────────────

async function loadNoiseSuppressionWorklet() {
  if (workletLoaded) return true
  
  try {
    if (!audioContext || !audioContext.audioWorklet) {
      console.warn('⚠️ AudioWorklet non supporté par ce navigateur')
      return false
    }
    
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

// ─── MODE BASSE LATENCE ────────────────────────────────────────────────────

export function setLowLatencyMode(enabled) {
  lowLatencyMode = enabled
  mixerState.lowLatencyMode = enabled
  console.log(`⚡ Mode basse latence ${enabled ? 'activé' : 'désactivé'}`)
  
  // Si le mixeur est initialisé, on reconfigure
  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureMicrophoneConnection()
  }
}

// ─── RECONFIGURATION DE LA CONNEXION MICRO ──────────────────────────────

function reconfigureMicrophoneConnection() {
  try {
    if (!microphoneSource || !microphoneGain) return
    
    // Déconnecter tout
    try { microphoneSource.disconnect() } catch (e) {}
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
    
    if (lowLatencyMode) {
      // ✅ MODE BASSE LATENCE : connexion directe
      microphoneSource.connect(microphoneGain)
      console.log('⚡ Mode basse latence : connexion directe micro → gain')
    } else if (noiseSuppressionEnabled && noiseSuppressionMode !== 'off') {
      // ✅ Mode normal avec réduction de bruit
      applyNoiseSuppressionConnection()
    } else {
      // ✅ Mode normal sans réduction de bruit
      microphoneSource.connect(microphoneGain)
      console.log('🔊 Connexion standard micro → gain')
    }
    
  } catch (e) {
    console.warn('⚠️ Erreur reconfiguration:', e)
    try {
      if (microphoneSource && microphoneGain) {
        microphoneSource.disconnect()
        microphoneSource.connect(microphoneGain)
      }
    } catch (err) {}
  }
}

// ─── APPLICATION DE LA RÉDUCTION DE BRUIT ───────────────────────────────

function applyNoiseSuppressionConnection() {
  try {
    if (!microphoneSource || !microphoneGain || !audioContext) return
    
    // ESSAYER AUDIOWORKLET (si supporté et disponible)
    if (noiseSuppressionMode !== 'filter' && audioContext.audioWorklet && workletLoaded) {
      try {
        noiseWorkletNode = new AudioWorkletNode(audioContext, 'noise-suppression')
        microphoneSource.connect(noiseWorkletNode)
        noiseWorkletNode.connect(microphoneGain)
        console.log('🔇 Réduction de bruit (AudioWorklet) activée')
        return
      } catch (e) {
        console.warn('⚠️ Erreur création AudioWorklet:', e.message)
        noiseWorkletNode = null
      }
    }
    
    // FALLBACK : FILTRE BIQUAD + COMPRESSEUR
    noiseFilter = audioContext.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = 4000
    noiseFilter.Q.value = 0.7
    
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
    console.warn('⚠️ Erreur création filtre:', e)
    try {
      if (microphoneSource && microphoneGain) {
        microphoneSource.disconnect()
        microphoneSource.connect(microphoneGain)
      }
    } catch (err) {}
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
    
    // ✅ Vérifier si le deviceId existe
    let actualDeviceId = deviceId
    if (deviceId && deviceId !== 'default') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(d => d.kind === 'audioinput')
        const deviceExists = audioInputs.some(d => d.deviceId === deviceId)
        
        if (!deviceExists) {
          console.warn(`⚠️ Périphérique ${deviceId} non trouvé, utilisation du périphérique par défaut`)
          actualDeviceId = 'default'
        }
      } catch (e) {
        console.warn('⚠️ Erreur énumération périphériques:', e)
        actualDeviceId = 'default'
      }
    }
    
    const constraints = {
      audio: {
        deviceId: actualDeviceId && actualDeviceId !== 'default' ? { exact: actualDeviceId } : undefined,
        echoCancellation: !lowLatencyMode, // ✅ Désactivé en mode basse latence
        noiseSuppression: !lowLatencyMode, // ✅ Désactivé en mode basse latence
        autoGainControl: !lowLatencyMode, // ✅ Désactivé en mode basse latence
        sampleRate: lowLatencyMode ? 16000 : 48000, // ✅ Taux d'échantillonnage réduit en mode basse latence
        channelCount: lowLatencyMode ? 1 : 2
      }
    }
    
    console.log('🎤 Connexion au micro avec les contraintes:', constraints)
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (!stream.getAudioTracks().length) {
      console.error('❌ Aucune piste audio dans le stream')
      return false
    }
    
    console.log('✅ Stream micro obtenu:', stream.getAudioTracks().length, 'piste(s)')
    
    // Créer la source micro
    microphoneSource = audioContext.createMediaStreamSource(stream)
    
    // ✅ Appliquer la connexion selon le mode
    reconfigureMicrophoneConnection()
    
    currentDeviceId = actualDeviceId
    mixerState.microphoneDeviceId = actualDeviceId
    mixerState.isMicrophoneConnected = true
    
    console.log('✅ Micro connecté avec succès')
    console.log('📊 État du micro:', {
      deviceId: actualDeviceId,
      audioContextState: audioContext.state,
      gainValue: microphoneGain.gain.value,
      noiseSuppression: noiseSuppressionEnabled,
      lowLatencyMode: lowLatencyMode,
      trackReady: stream.getAudioTracks()[0]?.readyState || 'unknown'
    })
    
    return true
    
  } catch (e) {
    console.error('❌ Erreur connexion micro:', e)
    mixerState.isMicrophoneConnected = false
    return false
  }
}

// ─── API PUBLIQUE POUR LE MODE BASSE LATENCE ─────────────────────────────

export function getLowLatencyStatus() {
  return {
    enabled: lowLatencyMode,
    supported: true,
    latencyReduction: lowLatencyMode ? '~50-100ms' : '0'
  }
}

// ─── API PUBLIQUE POUR LA RÉDUCTION DE BRUIT ──────────────────────────────

export function setNoiseSuppression(enabled) {
  noiseSuppressionEnabled = enabled
  mixerState.noiseSuppression = enabled
  console.log(`🎤 Réduction de bruit ${enabled ? 'activée' : 'désactivée'}`)
  
  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureMicrophoneConnection()
  }
}

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

export function getNoiseSuppressionStatus() {
  return {
    enabled: noiseSuppressionEnabled,
    mode: noiseSuppressionMode,
    workletAvailable: workletLoaded && !!audioContext?.audioWorklet,
    activeMethod: noiseWorkletNode ? 'worklet' : (noiseSuppressionNode ? 'filter' : 'none'),
    workletLoaded,
    lowLatencyMode
  }
}

// ─── RESTE DES FONCTIONS (connexion, lecture, etc.) ──────────────────────

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
      connectMixerToOutput('default')
    }
    
    return source
  } catch (e) {
    console.error('❌ Erreur lecture son:', e)
    return null
  }
}

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

export function setMicrophoneVolume(volume) {
  if (!microphoneGain) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  microphoneGain.gain.value = clampedVolume
  mixerState.microphoneLevel = clampedVolume
  console.log('🎤 Volume micro réglé à:', clampedVolume)
}

export function setSoundVolume(volume) {
  if (!soundGain) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  soundGain.gain.value = clampedVolume
  mixerState.soundLevel = clampedVolume
  console.log('🔊 Volume sons réglé à:', clampedVolume)
}

export function getMixedStream() {
  return destination ? destination.stream : null
}

export function isMixerActive() {
  return isInitialized && audioContext && audioContext.state === 'running'
}

export function resumeAudioContext() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume()
    console.log('▶️ AudioContext repris')
  }
}

export function toggleMicrophoneMute() {
  if (!microphoneGain) return
  isMicrophoneMuted = !isMicrophoneMuted
  microphoneGain.gain.value = isMicrophoneMuted ? 0 : (mixerState.microphoneLevel || 1.0)
  console.log('🎤 Micro', isMicrophoneMuted ? 'coupé' : 'activé')
  return isMicrophoneMuted
}

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

export function getMicrophoneStatus() {
  return {
    isConnected: mixerState.isMicrophoneConnected,
    deviceId: currentDeviceId,
    audioContextState: audioContext?.state || 'closed',
    gainValue: microphoneGain?.gain?.value || 0,
    noiseSuppression: noiseSuppressionEnabled,
    noiseMode: noiseSuppressionMode,
    activeMethod: noiseWorkletNode ? 'worklet' : (noiseSuppressionNode ? 'filter' : 'none'),
    lowLatencyMode
  }
}

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
    activeMethod: noiseWorkletNode ? 'worklet' : (noiseSuppressionNode ? 'filter' : 'none'),
    lowLatencyMode
  }
}

export async function changeMicrophone(deviceId) {
  if (!isInitialized) {
    console.warn('⚠️ Mixeur non initialisé')
    return false
  }
  return await initMicrophone(deviceId)
}

export function changeOutputDevice(deviceId) {
  return connectMixerToOutput(deviceId)
}

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

export async function getAudioInputDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(d => d.kind === 'audioinput')
  } catch (e) {
    console.error('❌ Erreur énumération périphériques:', e)
    return []
  }
}

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

export function repairMixer() {
  if (!isInitialized) {
    console.warn('⚠️ Mixeur non initialisé, impossible de réparer')
    return false
  }
  
  try {
    console.log('🔧 Tentative de réparation du mixeur...')
    
    if (audioContext.state === 'suspended') {
      audioContext.resume()
      console.log('▶️ AudioContext repris')
    }
    
    try {
      if (microphoneGain && masterGain) {
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
  warmupAudioContext,
  setLowLatencyMode,
  getLowLatencyStatus,
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
  preconnectMixer,
  mixerState
}