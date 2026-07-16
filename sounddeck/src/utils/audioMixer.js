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

// MONITORING (s'entendre)
let monitoringEnabled = false
let monitoringGain = null

// Référence au store
let storeRef = null

// État du mixeur
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
  isWarmup: false,
  monitoringEnabled: false
}

// ✅ Promise pour le préchauffage du worklet
let workletPromise = null

// ─── SET STORE REF ──────────────────────────────────────────────────────────

export function setStoreRef(store) {
  storeRef = store
  window.__storeRef = store
}

// ─── PRÉCHAUFFAGE ──────────────────────────────────────────────────────────

export async function warmupAudioContext() {
  if (mixerState.isWarmup) return
  
  mixerState.isWarmup = true
  console.log('🔥 Préchauffage du contexte audio...')
  
  try {
    const ctx = new AudioContext()
    
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }
    
    const buffer = ctx.createBuffer(1, 1, 44100)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
    source.onended = () => source.disconnect()
    
    if (ctx.audioWorklet) {
      workletPromise = ctx.audioWorklet.addModule('/noise-suppression.js')
        .then(() => {
          workletLoaded = true
          console.log('✅ AudioWorklet préchargé')
          return true
        })
        .catch(() => false)
    }
    
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

export async function initAudioMixer(microphoneDeviceId = 'default', outputDeviceId = 'default') {
  const startTime = performance.now()
  console.log('🎛️ Démarrage du mixeur audio...')
  console.log('📊 Périphérique de sortie demandé:', outputDeviceId)
  
  try {
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close()
      console.log('🔄 Ancien contexte fermé')
    }
    
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
    }
    
    workletLoaded = false
    noiseWorkletNode = null
    noiseSuppressionNode = null
    noiseFilter = null
    noiseCompressor = null
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    console.log('✅ AudioContext créé, état:', audioContext.state)
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
      console.log('▶️ AudioContext repris, état:', audioContext.state)
    }
    
    if (workletPromise) {
      await workletPromise
    } else if (audioContext.audioWorklet && noiseSuppressionMode !== 'filter') {
      await loadNoiseSuppressionWorklet()
    }
    
    microphoneGain = audioContext.createGain()
    microphoneGain.gain.value = 1.0
    
    soundGain = audioContext.createGain()
    soundGain.gain.value = 1.0
    
    masterGain = audioContext.createGain()
    masterGain.gain.value = 1.0
    
    destination = audioContext.createMediaStreamDestination()
    
    microphoneGain.connect(masterGain)
    soundGain.connect(masterGain)
    masterGain.connect(destination)
    
    console.log('✅ Noeuds audio créés et connectés')
    
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
    mixerState.lowLatencyMode = lowLatencyMode
    mixerState.monitoringEnabled = monitoringEnabled
    
    const latency = (performance.now() - startTime).toFixed(2)
    console.log(`✅ Mixeur audio initialisé en ${latency}ms`)
    console.log('📊 Micro connecté:', success)
    console.log('📊 Mode basse latence:', lowLatencyMode)
    console.log('📊 Réduction de bruit:', noiseSuppressionEnabled)
    console.log('📊 Mode:', noiseSuppressionMode)
    console.log('📊 Worklet chargé:', workletLoaded)
    console.log('📊 Monitoring:', monitoringEnabled ? 'activé' : 'désactivé')
    
    // ✅ Connecter le flux à la sortie
    setTimeout(() => {
      connectMixerToOutput(outputDeviceId || storeRef?.audioDevice || 'default')
    }, 100)
    
    return destination.stream
    
  } catch (e) {
    console.error('❌ Erreur initialisation mixeur:', e)
    isInitialized = false
    mixerState.isRunning = false
    return null
  }
}

// ─── CONNEXION DU FLUX À LA SORTIE ──────────────────────────────────────

export function connectMixerToOutput(deviceId) {
  if (!destination || !destination.stream) {
    console.warn('⚠️ Aucun flux mixé disponible')
    return false
  }
  
  try {
    console.log('🔌 Connexion du flux au périphérique:', deviceId || 'default')
    
    if (audioElement) {
      try {
        audioElement.pause()
        audioElement.srcObject = null
      } catch (e) {}
      audioElement = null
    }
    
    audioElement = new Audio()
    audioElement.srcObject = destination.stream
    audioElement.loop = true
    
    audioElement.play().catch(() => {})
    
    if (deviceId && deviceId !== 'default') {
      // @ts-ignore
      audioElement.setSinkId(deviceId)
        .then(() => {
          console.log('✅ Flux redirigé vers:', deviceId)
        })
        .catch((err) => {
          console.warn('⚠️ Erreur setSinkId:', err)
          console.log('🔄 Tentative de redirection automatique...')
          autoRedirectToCable()
        })
    } else {
      autoRedirectToCable()
    }
    
    console.log('✅ Flux connecté au périphérique:', deviceId || 'default')
    return true
    
  } catch (e) {
    console.error('❌ Erreur connexion:', e)
    autoRedirectToCable()
    return false
  }
}

// ─── REDIRECTION AUTOMATIQUE VERS VB-CABLE ─────────────────────────────

function autoRedirectToCable() {
  console.log('🔍 Recherche automatique de VB-Cable...')
  
  try {
    if (!audioElement || !destination || !destination.stream) {
      console.warn('⚠️ Flux non disponible')
      return
    }
    
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const outputs = devices.filter(d => d.kind === 'audiooutput')
        console.log('📊 Périphériques de sortie disponibles:', outputs.map(d => d.label))
        
        const cableDevice = outputs.find(d => {
          const label = d.label.toLowerCase()
          return label.includes('cable output') || 
                 label.includes('cable-out') ||
                 (label.includes('cable') && label.includes('output')) ||
                 label.includes('vb-audio') || 
                 label.includes('cable input')
        })
        
        if (cableDevice) {
          console.log('🔌 VB-Cable trouvé:', cableDevice.label, cableDevice.deviceId)
          // @ts-ignore
          audioElement.setSinkId(cableDevice.deviceId)
            .then(() => {
              console.log('✅ Flux redirigé vers VB-Cable (auto)')
              audioElement.play().catch(() => {})
            })
            .catch((err) => {
              console.warn('⚠️ Échec redirection vers VB-Cable:', err)
            })
        } else {
          console.log('⚠️ VB-Cable non trouvé dans les périphériques')
        }
      })
      .catch(err => {
        console.warn('⚠️ Erreur énumération périphériques:', err)
      })
      
  } catch (e) {
    console.warn('⚠️ Erreur autoRedirectToCable:', e)
  }
}

// ─── CHARGEMENT DE L'AUDIOWORKLET ──────────────────────────────────────────

async function loadNoiseSuppressionWorklet() {
  if (workletLoaded) return true
  
  try {
    if (!audioContext || !audioContext.audioWorklet) {
      console.warn('⚠️ AudioWorklet non supporté')
      return false
    }
    
    const baseUrl = window.location.origin
    const workletUrl = `${baseUrl}/noise-suppression.js`
    
    console.log('📥 Chargement de l\'AudioWorklet depuis:', workletUrl)
    await audioContext.audioWorklet.addModule(workletUrl)
    workletLoaded = true
    console.log('✅ AudioWorklet chargé')
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
  
  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureMicrophoneConnection()
  }
}

// ─── RECONFIGURATION DE LA CONNEXION MICRO ──────────────────────────────

function reconfigureMicrophoneConnection() {
  try {
    if (!microphoneSource || !microphoneGain) return
    
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
      microphoneSource.connect(microphoneGain)
      console.log('⚡ Connexion directe micro → gain')
    } else if (noiseSuppressionEnabled && noiseSuppressionMode !== 'off') {
      applyNoiseSuppressionConnection()
    } else {
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
    
    if (noiseSuppressionMode !== 'filter' && audioContext.audioWorklet && workletLoaded) {
      try {
        noiseWorkletNode = new AudioWorkletNode(audioContext, 'noise-suppression')
        microphoneSource.connect(noiseWorkletNode)
        noiseWorkletNode.connect(microphoneGain)
        console.log('🔇 Réduction de bruit (AudioWorklet) activée')
        return
      } catch (e) {
        console.warn('⚠️ Erreur AudioWorklet:', e.message)
        noiseWorkletNode = null
      }
    }
    
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
    console.warn('⚠️ Erreur filtre:', e)
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
    if (microphoneSource) {
      microphoneSource.disconnect()
      microphoneSource = null
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
    
    let actualDeviceId = deviceId
    if (deviceId && deviceId !== 'default') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(d => d.kind === 'audioinput')
        const deviceExists = audioInputs.some(d => d.deviceId === deviceId)
        
        if (!deviceExists) {
          console.warn(`⚠️ Périphérique ${deviceId} non trouvé, fallback sur default`)
          actualDeviceId = 'default'
        }
      } catch (e) {
        console.warn('⚠️ Erreur énumération:', e)
        actualDeviceId = 'default'
      }
    }
    
    const constraints = {
      audio: {
        deviceId: actualDeviceId && actualDeviceId !== 'default' ? { exact: actualDeviceId } : undefined,
        echoCancellation: !lowLatencyMode,
        noiseSuppression: !lowLatencyMode,
        autoGainControl: !lowLatencyMode,
        sampleRate: lowLatencyMode ? 16000 : 48000,
        channelCount: lowLatencyMode ? 1 : 2
      }
    }
    
    console.log('🎤 Connexion au micro:', constraints)
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    
    if (!stream.getAudioTracks().length) {
      console.error('❌ Aucune piste audio')
      return false
    }
    
    console.log('✅ Stream micro obtenu:', stream.getAudioTracks().length, 'piste(s)')
    
    microphoneSource = audioContext.createMediaStreamSource(stream)
    reconfigureMicrophoneConnection()
    
    currentDeviceId = actualDeviceId
    mixerState.microphoneDeviceId = actualDeviceId
    mixerState.isMicrophoneConnected = true
    
    console.log('✅ Micro connecté')
    return true
    
  } catch (e) {
    console.error('❌ Erreur micro:', e)
    mixerState.isMicrophoneConnected = false
    return false
  }
}

// ─── API MONITORING ─────────────────────────────────────────────────────────

export function setMonitoring(enabled) {
  monitoringEnabled = enabled
  mixerState.monitoringEnabled = enabled
  
  if (!audioContext || !masterGain) {
    console.warn('⚠️ Contexte non initialisé pour le monitoring')
    return
  }
  
  try {
    if (enabled) {
      if (!monitoringGain) {
        monitoringGain = audioContext.createGain()
        monitoringGain.gain.value = 0.3
        masterGain.connect(monitoringGain)
        monitoringGain.connect(audioContext.destination)
        console.log('🎤 Monitoring activé')
      }
    } else {
      if (monitoringGain) {
        try {
          monitoringGain.disconnect()
        } catch (e) {}
        monitoringGain = null
        console.log('🔇 Monitoring désactivé')
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur monitoring:', e)
  }
}

export function getMonitoringStatus() {
  return {
    enabled: monitoringEnabled,
    gainValue: monitoringGain?.gain?.value || 0
  }
}

// ─── API PUBLIQUE ──────────────────────────────────────────────────────────

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

// ─── LECTURE DANS LE MIXEUR ──────────────────────────────────────────────

export function playSoundInMixer(audioBuffer, volume = 1.0) {
  if (!isInitialized || !audioContext || !destination) {
    console.warn('⚠️ Mixeur non initialisé')
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
    return source
  } catch (e) {
    console.error('❌ Erreur lecture:', e)
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
    console.error('❌ Erreur chargement:', e)
    return null
  }
}

// ─── CONTROLES ──────────────────────────────────────────────────────────────

export function setMicrophoneVolume(volume) {
  if (!microphoneGain) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  microphoneGain.gain.value = clampedVolume
  mixerState.microphoneLevel = clampedVolume
  console.log('🎤 Volume micro:', clampedVolume)
}

export function setSoundVolume(volume) {
  if (!soundGain) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  soundGain.gain.value = clampedVolume
  mixerState.soundLevel = clampedVolume
  console.log('🔊 Volume sons:', clampedVolume)
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
    console.log('🎤 Test micro...')
    
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
      throw new Error('Aucune piste audio')
    }
    
    const source = tempContext.createMediaStreamSource(tempStream)
    const gain = tempContext.createGain()
    gain.gain.value = 0.3
    source.connect(gain)
    gain.connect(tempContext.destination)
    
    const deviceName = tempStream.getAudioTracks()[0]?.label || 'Microphone'
    
    console.log('✅ Test micro démarré')
    
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
          console.warn('Erreur arrêt test:', e)
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
    lowLatencyMode,
    monitoring: monitoringEnabled
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
    lowLatencyMode,
    monitoring: monitoringEnabled
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
    
    if (monitoringGain) {
      try { monitoringGain.disconnect() } catch (e) {}
      monitoringGain = null
    }
    monitoringEnabled = false
    
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
    mixerState.monitoringEnabled = false
    
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
    console.error('❌ Erreur énumération:', e)
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
    console.log('ℹ️ Gains manquants')
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
    console.log('🔧 Réparation du mixeur...')
    
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
      console.warn('⚠️ Erreur reconnexions:', e)
    }
    
    if (monitoringEnabled) {
      setMonitoring(true)
    }
    
    connectMixerToOutput(storeRef?.audioDevice || 'default')
    
    const operational = isMixerOperational()
    if (operational) {
      console.log('✅ Mixeur réparé')
    } else {
      console.warn('⚠️ Réparation incomplète')
    }
    
    return operational
    
  } catch (e) {
    console.error('❌ Erreur réparation:', e)
    return false
  }
}

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

export default {
  initAudioMixer,
  warmupAudioContext,
  setLowLatencyMode,
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
  mixerState,
  setMonitoring,
  getMonitoringStatus,
  setStoreRef
}