// src/shared/utils/obsIntegration.js
// Intégration OBS WebSocket

let obsWebSocket = null
let obsConnected = false
let reconnectTimer = null

// Configuration OBS par défaut
const DEFAULT_OBS_CONFIG = {
  host: 'localhost',
  port: 4455,
  password: '',
  reconnectInterval: 5000
}

// ✅ S5 : mémoriser la dernière config utilisée pour la reconnexion
let lastUsedConfig = { ...DEFAULT_OBS_CONFIG }

/**
 * Connecte SoundDeck à OBS via WebSocket
 */
export async function connectOBS(config = {}) {
  const finalConfig = { ...DEFAULT_OBS_CONFIG, ...config }
  // ✅ S5 : sauvegarder la config pour la reconnexion
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
    setupOBSEvents()

    return { success: true, connected: true }
  } catch (e) {
    console.error('❌ Erreur connexion OBS:', e.message)
    obsConnected = false
    return { success: false, error: e.message }
  }
}

/**
 * Déconnecte OBS
 */
export function disconnectOBS() {
  if (obsWebSocket) {
    try {
      obsWebSocket.disconnect()
    } catch (e) {
      console.warn('Erreur déconnexion OBS:', e.message)
    }
    obsWebSocket = null
  }
  obsConnected = false
  if (reconnectTimer) {
    clearInterval(reconnectTimer)
    reconnectTimer = null
  }
}

/**
 * Configure les événements OBS
 */
function setupOBSEvents() {
  if (!obsWebSocket) return

  try {
    obsWebSocket.on('ConnectionClosed', () => {
      obsConnected = false
      if (!reconnectTimer) {
        // ✅ S5 : utiliser lastUsedConfig au lieu des defaults
        reconnectTimer = setInterval(() => {
          connectOBS(lastUsedConfig)
        }, lastUsedConfig.reconnectInterval)
      }
    })

    obsWebSocket.on('error', (error) => {
      console.error('❌ Erreur OBS:', error)
    })
  } catch (e) {
    console.warn('⚠️ Erreur configuration événements OBS:', e.message)
  }
}

/**
 * Envoie une commande à OBS
 */
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
      studioModeEnabled: !state.result.studioModeEnabled
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
    websocket: !!obsWebSocket
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
  getOBSStatus
}