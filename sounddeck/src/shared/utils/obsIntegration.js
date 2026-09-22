// src/shared/utils/obsIntegration.js
// Intégration OBS WebSocket

let obsWebSocket = null
let obsConnected = false

const RECONNECT_MAX_ATTEMPTS = 5
const RECONNECT_BASE_DELAY = 5000    // 5s
const RECONNECT_MAX_DELAY = 60000    // 60s max

let reconnectTimer = null
let reconnectAttempts = 0

// Configuration OBS par défaut
const DEFAULT_OBS_CONFIG = {
  host: 'localhost',
  port: 4455,
  password: '',
  reconnectInterval: 5000,
}

// Mémoriser la dernière config utilisée pour la reconnexion
let lastUsedConfig = { ...DEFAULT_OBS_CONFIG }

// ─── BACKOFF ─────────────────────────────────────────────────────────────
function cancelReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempts = 0
}

function scheduleReconnect() {
  if (reconnectTimer) return // déjà programmé

  if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
    console.warn(
      `⚠️ [OBS] Abandon reconnexion après ${RECONNECT_MAX_ATTEMPTS} tentatives — cliquez sur "Se connecter" pour réessayer`
    )
    return
  }

  const attempt = reconnectAttempts + 1
  const delay = Math.min(
    RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts),
    RECONNECT_MAX_DELAY
  )
  reconnectAttempts++

  console.log(
    `🔄 [OBS] Reconnexion dans ${delay}ms (tentative ${attempt}/${RECONNECT_MAX_ATTEMPTS})`
  )

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null

    // Guard : si on nous a déconnectés entre-temps
    if (obsConnected) return

    try {
      const result = await connectOBS(lastUsedConfig)
      if (result?.success) {
        reconnectAttempts = 0
        console.log('✅ [OBS] Reconnexion réussie')
      } else {
        scheduleReconnect()
      }
    } catch (e) {
      scheduleReconnect()
    }
  }, delay)
}

// ─── CONNEXION / DÉCONNEXION ─────────────────────────────────────────────

export async function connectOBS(config = {}) {
  cancelReconnect()

  // Fermer proprement l'ancienne connexion si elle existe
  if (obsWebSocket) {
    try { obsWebSocket.disconnect() } catch (e) {}
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
    reconnectAttempts = 0 // reset au succès

    setupOBSEvents()

    return { success: true, connected: true }
  } catch (e) {
    console.error('❌ Erreur connexion OBS:', e.message)
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
      console.warn('Erreur déconnexion OBS:', e.message)
    }
    obsWebSocket = null
  }
  obsConnected = false
}

// ─── ÉVÉNEMENTS ──────────────────────────────────────────────────────────

function setupOBSEvents() {
  if (!obsWebSocket) return

  try {
    obsWebSocket.on('ConnectionClosed', () => {
      obsConnected = false

      if (!obsWebSocket) return

      scheduleReconnect()
    })

    obsWebSocket.on('error', (error) => {
      console.error('❌ Erreur OBS:', error)
    })
  } catch (e) {
    console.warn('⚠️ Erreur configuration événements OBS:', e.message)
  }
}

// ─── COMMANDES ───────────────────────────────────────────────────────────

export async function sendOBSCommand(command, params = {}) {
  if (!obsConnected || !obsWebSocket) {
    console.warn('⚠️ OBS non connecté')
    return { success: false, error: 'OBS non connecté' }
  }

  try {
    const result = await obsWebSocket.call(command, params)
    return { success: true, result }
  } catch (e) {
    console.error(`❌ Erreur commande OBS ${command}:`, e.message)
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