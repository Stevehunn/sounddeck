// src/core/services/AudioMixerService.js
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
let lowLatencyMode = true

// Variables pour la réduction de bruit
let noiseSuppressionEnabled = false
let noiseSuppressionNode = null
let noiseFilter = null
let noiseCompressor = null
let noiseWorkletNode = null
let workletLoaded = false
let noiseSuppressionMode = 'off'

// Monitoring (s'entendre)
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
  lowLatencyMode: true,
  isWarmup: false,
  monitoringEnabled: false
}

let workletPromise = null

// ─── SET STORE REF ──────────────────────────────────────────────────────────

export function setStoreRef(store) {
  storeRef = store
  window.__mixerStoreRef = { current: store }
}

// ─── PRÉCHAUFFAGE ──────────────────────────────────────────────────────────

export async function warmupAudioContext() {
  if (mixerState.isWarmup) return

  mixerState.isWarmup = true

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
          return true
        })
        .catch(() => false)
    }

    setTimeout(async () => {
      await ctx.close()
      mixerState.isWarmup = false
    }, 100)

  } catch (e) {
    mixerState.isWarmup = false
  }
}

// ─── INITIALISATION DU MIXEUR ──────────────────────────────────────────────

export async function initAudioMixer(microphoneDeviceId = 'default', outputDeviceId = 'default') {
  try {
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close()
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

    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 48000
    })

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    if (noiseSuppressionEnabled && noiseSuppressionMode !== 'off') {
      if (workletPromise) {
        await workletPromise
      } else if (audioContext.audioWorklet && noiseSuppressionMode !== 'filter') {
        await loadNoiseSuppressionWorklet()
      }
    }

    microphoneGain = audioContext.createGain()
    microphoneGain.gain.value = 1.0
    microphoneGain.gain.setValueAtTime(1.0, audioContext.currentTime)

    soundGain = audioContext.createGain()
    soundGain.gain.value = 1.0
    soundGain.gain.setValueAtTime(1.0, audioContext.currentTime)

    masterGain = audioContext.createGain()
    masterGain.gain.value = 1.0
    masterGain.gain.setValueAtTime(1.0, audioContext.currentTime)

    destination = audioContext.createMediaStreamDestination()

    microphoneGain.connect(masterGain)
    soundGain.connect(masterGain)
    masterGain.connect(destination)

    const success = await initMicrophone(microphoneDeviceId)

    isInitialized = true
    mixerState.isRunning = true
    mixerState.stream = destination.stream
    mixerState.isMicrophoneConnected = success
    mixerState.noiseSuppression = noiseSuppressionEnabled
    mixerState.noiseSuppressionMode = noiseSuppressionMode
    mixerState.lowLatencyMode = lowLatencyMode
    mixerState.monitoringEnabled = monitoringEnabled

    const shouldPlayLocally = storeRef?.playLocally !== false
    if (shouldPlayLocally || monitoringEnabled) {
      const deviceToUse = outputDeviceId || storeRef?.audioDevice || 'default'
      connectMixerToOutput(deviceToUse)
    }

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
    return false
  }

  try {
    const shouldPlayLocally = storeRef?.playLocally !== false
    const shouldMonitor = monitoringEnabled

    if (!shouldPlayLocally && !shouldMonitor) {
      return true
    }

    if (audioElement && audioElement.srcObject === destination.stream) {
      return true
    }

    if (audioElement) {
      try {
        audioElement.pause()
        audioElement.srcObject = null
      } catch (e) {}
      audioElement = null
    }

    audioElement = new Audio()
    audioElement.srcObject = destination.stream

    if (deviceId && deviceId !== 'default') {
      audioElement.setSinkId(deviceId).catch(() => {})
    }

    audioElement.play().catch(() => {})

    return true

  } catch (e) {
    return false
  }
}

// ─── PRÉCONNEXION ──────────────────────────────────────────────────────────

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

    if (audioElement.readyState >= 2) {
      audioElement.play().catch(() => {})
    }

    return true
  } catch (e) {
    return false
  }
}

// ─── CHARGEMENT DE L'AUDIOWORKLET ──────────────────────────────────────────

async function loadNoiseSuppressionWorklet() {
  if (workletLoaded) return true

  try {
    if (!audioContext || !audioContext.audioWorklet) {
      return false
    }

    const baseUrl = window.location.origin
    const workletUrl = `${baseUrl}/noise-suppression.js`

    await audioContext.audioWorklet.addModule(workletUrl)
    workletLoaded = true
    return true

  } catch (e) {
    workletLoaded = false
    return false
  }
}

// ─── MODE BASSE LATENCE ────────────────────────────────────────────────────

export function setLowLatencyMode(enabled) {
  lowLatencyMode = enabled
  mixerState.lowLatencyMode = enabled

  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureMicrophoneConnection()
  }
}

export function getLowLatencyStatus() {
  return {
    enabled: lowLatencyMode,
    supported: true,
    latencyReduction: lowLatencyMode ? '~20-40ms' : '0'
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

    if (lowLatencyMode || !noiseSuppressionEnabled || noiseSuppressionMode === 'off') {
      microphoneSource.connect(microphoneGain)
    } else if (noiseSuppressionEnabled && noiseSuppressionMode !== 'off') {
      if (workletLoaded && noiseSuppressionMode !== 'filter') {
        try {
          noiseWorkletNode = new AudioWorkletNode(audioContext, 'noise-suppression')
          microphoneSource.connect(noiseWorkletNode)
          noiseWorkletNode.connect(microphoneGain)
          return
        } catch (e) {
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
      noiseCompressor.attack.value = 0.001
      noiseCompressor.release.value = 0.1

      microphoneSource.connect(noiseFilter)
      noiseFilter.connect(noiseCompressor)
      noiseCompressor.connect(microphoneGain)

      noiseSuppressionNode = { filter: noiseFilter, compressor: noiseCompressor }
    }

  } catch (e) {
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
          actualDeviceId = 'default'
        }
      } catch (e) {
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
        channelCount: 1
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)

    if (!stream.getAudioTracks().length) {
      return false
    }

    microphoneSource = audioContext.createMediaStreamSource(stream)
    microphoneSource.connect(microphoneGain)

    currentDeviceId = actualDeviceId
    mixerState.microphoneDeviceId = actualDeviceId
    mixerState.isMicrophoneConnected = true

    return true

  } catch (e) {
    mixerState.isMicrophoneConnected = false
    return false
  }
}

// ─── API MONITORING ─────────────────────────────────────────────────────────

export function setMonitoring(enabled) {
  monitoringEnabled = enabled
  mixerState.monitoringEnabled = enabled

  if (!audioContext || !masterGain) {
    return
  }

  try {
    if (enabled) {
      if (!monitoringGain) {
        monitoringGain = audioContext.createGain()
        monitoringGain.gain.value = 0.15
        masterGain.connect(monitoringGain)
        monitoringGain.connect(audioContext.destination)
      }
    } else {
      if (monitoringGain) {
        try {
          monitoringGain.disconnect()
        } catch (e) {}
        monitoringGain = null
      }
    }
  } catch (e) {}
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

  if (isInitialized && microphoneSource && microphoneGain) {
    reconfigureMicrophoneConnection()
  }
}

export function setNoiseSuppressionMode(mode) {
  const validModes = ['auto', 'worklet', 'filter', 'off']
  if (!validModes.includes(mode)) {
    mode = 'off'
  }

  noiseSuppressionMode = mode
  mixerState.noiseSuppressionMode = mode

  if (mode === 'off') {
    setNoiseSuppression(false)
  } else {
    setNoiseSuppression(true)
  }
}

export function getNoiseSuppressionStatus() {
  return {
    enabled: noiseSuppressionEnabled,
    mode: noiseSuppressionMode,
    workletAvailable: workletLoaded && !!audioContext?.audioWorklet,
    activeMethod: 'none',
    workletLoaded,
    lowLatencyMode
  }
}

// ─── LECTURE DANS LE MIXEUR ──────────────────────────────────────────────

export function playSoundInMixer(audioBuffer, volume = 1.0) {
  if (!isInitialized || !audioContext || !destination) {
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
    source.start(0)

    return source
  } catch (e) {
    return null
  }
}

export async function loadAudioBuffer(fileUrl) {
  if (!audioContext) {
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
    return null
  }
}

// ─── CONTROLES ──────────────────────────────────────────────────────────────

export function setMicrophoneVolume(volume) {
  if (!microphoneGain) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  microphoneGain.gain.value = clampedVolume
  mixerState.microphoneLevel = clampedVolume
}

export function setSoundVolume(volume) {
  if (!soundGain) return
  const clampedVolume = Math.max(0, Math.min(1, volume))
  soundGain.gain.value = clampedVolume
  mixerState.soundLevel = clampedVolume
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
  }
}

export function toggleMicrophoneMute() {
  if (!microphoneGain) return
  isMicrophoneMuted = !isMicrophoneMuted
  microphoneGain.gain.value = isMicrophoneMuted ? 0 : (mixerState.microphoneLevel || 1.0)
  return isMicrophoneMuted
}

export async function testMicrophoneOnce(deviceId = 'default') {
  let tempContext = null
  let tempStream = null

  try {
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
        } catch (e) {}
      }
    }

  } catch (e) {
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
    activeMethod: 'none',
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
    activeMethod: 'none',
    lowLatencyMode,
    monitoring: monitoringEnabled
  }
}

export function getMixerFullState() {
  return {
    isInitialized,
    isRunning: mixerState.isRunning,
    isMicrophoneConnected: mixerState.isMicrophoneConnected,
    audioContextState: audioContext?.state || 'closed',
    audioContextExists: !!audioContext,
    destinationExists: !!destination,
    destinationStream: !!destination?.stream,
    streamActive: destination?.stream?.active || false,
    audioElementExists: !!audioElement,
    audioElementSrcObject: audioElement?.srcObject ? 'exists' : 'null',
    microphoneSourceExists: !!microphoneSource,
    microphoneGainExists: !!microphoneGain,
    soundGainExists: !!soundGain,
    masterGainExists: !!masterGain,
    monitoringEnabled,
    lowLatencyMode,
    noiseSuppressionEnabled,
    noiseSuppressionMode,
    storeRefExists: !!storeRef,
    storeRefMixerEnabled: storeRef?.mixerEnabled
  }
}

export async function changeMicrophone(deviceId) {
  if (!isInitialized) {
    return false
  }
  return await initMicrophone(deviceId)
}

export function changeOutputDevice(deviceId) {
  return connectMixerToOutput(deviceId)
}

// ─── STOP MIXER ────────────────────────────────────────────────────────────

export async function stopMixer() {
  try {
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      audioElement = null
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
    mixerState.monitoringEnabled = false

    if (microphoneSource) {
      try {
        if (microphoneSource.stream) {
          microphoneSource.stream.getTracks().forEach(track => track.stop())
        }
        microphoneSource.disconnect()
      } catch (e) {}
      microphoneSource = null
    }

    if (microphoneGain) {
      try { microphoneGain.disconnect() } catch (e) {}
      microphoneGain = null
    }

    if (soundGain) {
      try { soundGain.disconnect() } catch (e) {}
      soundGain = null
    }

    if (masterGain) {
      try { masterGain.disconnect() } catch (e) {}
      masterGain = null
    }

    if (destination) {
      try {
        if (destination.stream) {
          destination.stream.getTracks().forEach(track => track.stop())
        }
      } catch (e) {}
      destination = null
    }

    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close()
    }
    audioContext = null

    isInitialized = false
    mixerState.isRunning = false
    mixerState.stream = null
    mixerState.isMicrophoneConnected = false
    mixerState.monitoringEnabled = false

  } catch (e) {
    console.error('❌ Erreur arrêt mixeur:', e)
  }
}

export async function getAudioInputDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(d => d.kind === 'audioinput')
  } catch (e) {
    return []
  }
}

export function isMixerOperational() {
  if (!isInitialized) return false
  if (!audioContext) return false
  if (audioContext.state !== 'running') return false
  if (!destination || !destination.stream) return false
  if (!microphoneGain || !soundGain || !masterGain) return false
  return true
}

export function repairMixer() {
  if (!isInitialized) {
    return false
  }

  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    try {
      if (microphoneGain && masterGain) {
        try { microphoneGain.disconnect() } catch (e) {}
        microphoneGain.connect(masterGain)
      }
      if (soundGain && masterGain) {
        try { soundGain.disconnect() } catch (e) {}
        soundGain.connect(masterGain)
      }
      if (masterGain && destination) {
        try { masterGain.disconnect() } catch (e) {}
        masterGain.connect(destination)
      }
    } catch (e) {}

    if (monitoringEnabled) {
      setMonitoring(true)
    }

    connectMixerToOutput(storeRef?.audioDevice || 'default')

    return isMixerOperational()

  } catch (e) {
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
  preconnectMixer,
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
  getMixerFullState,
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