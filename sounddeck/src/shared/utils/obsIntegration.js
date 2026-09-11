// Intégration OBS WebSocket

let obsWebSocket = null
let obsConnected = false
let reconnectTimer = null

// Configuration OBS
const OBS_CONFIG = {
  host: 'localhost',
  port: 4455,
  password: '',
  reconnectInterval: 5000
}

/**
 * Connecte SoundDeck à OBS via WebSocket
 */
export async function connectOBS(config = {}) {
  const finalConfig = { ...OBS_CONFIG, ...config }
  
  try {
    // Importer dynamiquement le client OBS WebSocket
    const OBSWebSocketModule = await import('obs-websocket-js')
    const OBSWebSocket = OBSWebSocketModule.default || OBSWebSocketModule
    
    obsWebSocket = new OBSWebSocket()
    
    await obsWebSocket.connect(
      `ws://${finalConfig.host}:${finalConfig.port}`,
      finalConfig.password
    )
    
    obsConnected = true
    
    // Configurer les événements
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
    obsWebSocket.on('ConnectionOpened', () => {
    })
    
    obsWebSocket.on('ConnectionClosed', () => {
      obsConnected = false
      if (!reconnectTimer) {
        reconnectTimer = setInterval(() => {
          connectOBS()
        }, OBS_CONFIG.reconnectInterval)
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

/**
 * Change la scène OBS
 */
export async function switchOBSScene(sceneName) {
  return await sendOBSCommand('SetCurrentProgramScene', { sceneName })
}

/**
 * Active/Désactive le mode studio OBS
 */
export async function toggleStudioMode() {
  const state = await sendOBSCommand('GetStudioModeEnabled')
  if (state.success) {
    return await sendOBSCommand('SetStudioModeEnabled', { 
      studioModeEnabled: !state.result.studioModeEnabled 
    })
  }
  return state
}

/**
 * Démarre l'enregistrement OBS
 */
export async function startOBSRecording() {
  return await sendOBSCommand('StartRecord')
}

/**
 * Arrête l'enregistrement OBS
 */
export async function stopOBSRecording() {
  return await sendOBSCommand('StopRecord')
}

/**
 * Démarre le streaming OBS
 */
export async function startOBSStreaming() {
  return await sendOBSCommand('StartStream')
}

/**
 * Arrête le streaming OBS
 */
export async function stopOBSStreaming() {
  return await sendOBSCommand('StopStream')
}

/**
 * Envoie une alerte personnalisée vers OBS (via Browser Source)
 */
export function sendOBSAlert(message, type = 'info', duration = 3000) {
  return { success: true }
}

/**
 * Obtient le statut de connexion OBS
 */
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