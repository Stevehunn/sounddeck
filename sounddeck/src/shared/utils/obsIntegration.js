// src/shared/utils/obsIntegration.js
import { logInfo, logWarn, logError } from './logger'

let obsWebSocket = null
let obsConnected = false

const RECONNECT_MAX_ATTEMPTS = 5
const RECONNECT_BASE_DELAY = 5000
const RECONNECT_MAX_DELAY = 60000

let reconnectTimer = null
let reconnectAttempts = 0

const DEFAULT_OBS_CONFIG = {
  host: 'localhost',
  port: 4455,
  password: '',
  reconnectInterval: 5000,
}

let lastUsedConfig = { ...DEFAULT_OBS_CONFIG }

function cancelReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempts = 0
}

function scheduleReconnect() {
  if (reconnectTimer) return

  if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
    logWarn(
      'obsIntegration',
      `Abandon reconnexion après ${RECONNECT_MAX_ATTEMPTS} tentatives — cliquez sur "Se connecter" pour réessayer`
    )
    return
  }

  const attempt = reconnectAttempts + 1
  const delay = Math.min(
    RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts),
    RECONNECT_MAX_DELAY
  )
  reconnectAttempts++

  logInfo(
    'obsIntegration',
    `🔄 Reconnexion dans ${delay}ms (tentative ${attempt}/${RECONNECT_MAX_ATTEMPTS})`
  )

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null

    if (obsConnected) return

    try {
      const result = await connectOBS(lastUsedConfig)
      if (result?.success) {
        reconnectAttempts = 0
        logInfo('obsIntegration', '✅ Reconnexion réussie')
      } else {
        scheduleReconnect()
      }
    } catch (e) {
      scheduleReconnect()
    }
  }, delay)
}

export async function connectOBS(config = {}) {
  cancelReconnect()

  if (obsWebSocket) {
    try {
      obsWebSocket.disconnect()
    } catch (e) {}
    obsWebSocket = null
  }

  const finalConfig = { ...DEFAULT_OBS_CONFIG, ...config }
  lastUsedConfig = { ...finalConfig }

  try {
    const OBSWebSocketModule = await import('obs-websocket-js')
    const OBSWebSocket = OBSWebSocketModule.default || OBSWebSocketModule

    obsWebSocket = new OBSWebSocket()

    await obsWebSocket.connect(
      `ws://${finalConfig.host}:${finalConfig.port}`,
      finalConfig.password
    )

    obsConnected = true
    reconnectAttempts = 0

    setupOBSEvents()

    return { success: true, connected: true }
  } catch (e) {
    logError('obsIntegration', 'Erreur connexion OBS', e)
    obsConnected = false
    return { success: false, error: e.message }
  }
}

export function disconnectOBS() {
  cancelReconnect()

  if (obsWebSocket) {
    try {
      obsWebSocket.disconnect()
    } catch (e) {
      logWarn('obsIntegration', 'Erreur déconnexion OBS', e)
    }
    obsWebSocket = null
  }
  obsConnected = false
}

function setupOBSEvents() {
  if (!obsWebSocket) return

  try {
    obsWebSocket.on('ConnectionClosed', () => {
      obsConnected = false
      if (!obsWebSocket) return
      scheduleReconnect()
    })

    obsWebSocket.on('error', (error) => {
      logError('obsIntegration', 'Erreur OBS', error)
    })
  } catch (e) {
    logWarn('obsIntegration', 'Erreur configuration événements OBS', e)
  }
}

export async function sendOBSCommand(command, params = {}) {
  if (!obsConnected || !obsWebSocket) {
    logWarn('obsIntegration', 'OBS non connecté')
    return { success: false, error: 'OBS non connecté' }
  }

  try {
    const result = await obsWebSocket.call(command, params)
    return { success: true, result }
  } catch (e) {
    logError('obsIntegration', `Erreur commande OBS ${command}`, e)
    return { success: false, error: e.message }
  }
}

export async function switchOBSScene(sceneName) {
  return await sendOBSCommand('SetCurrentProgramScene', { sceneName })
}

export async function toggleStudioMode() {
  const state = await sendOBSCommand('GetStudioModeEnabled')
  if (state.success) {
    return await sendOBSCommand('SetStudioModeEnabled', {
      studioModeEnabled: !state.result.studioModeEnabled,
    })
  }
  return state
}

export async function startOBSRecording() {
  return await sendOBSCommand('StartRecord')
}

export async function stopOBSRecording() {
  return await sendOBSCommand('StopRecord')
}

export async function startOBSStreaming() {
  return await sendOBSCommand('StartStream')
}

export async function stopOBSStreaming() {
  return await sendOBSCommand('StopStream')
}

export function sendOBSAlert(message, type = 'info', duration = 3000) {
  return { success: true }
}

export function getOBSStatus() {
  return {
    connected: obsConnected,
    websocket: !!obsWebSocket,
    reconnectAttempts,
    reconnectMaxAttempts: RECONNECT_MAX_ATTEMPTS,
  }
}

export default {
  connectOBS,
  disconnectOBS,
  sendOBSCommand,
  switchOBSScene,
  toggleStudioMode,
  startOBSRecording,
  stopOBSRecording,
  startOBSStreaming,
  stopOBSStreaming,
  sendOBSAlert,
  getOBSStatus,
}