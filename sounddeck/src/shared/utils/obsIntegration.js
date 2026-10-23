/**
 * @file OBS Studio WebSocket integration (obs-websocket v5).
 *
 * Manages a single WebSocket connection to a running OBS instance:
 * - **`connectOBS(config)`** — connects (host/port/password), resets the
 *   reconnect backoff, and installs event handlers.
 * - **`disconnectOBS()`** — closes the socket and cancels pending
 *   reconnects.
 * - **`sendOBSCommand(cmd, params)`** — low-level `call()` wrapper.
 * - **High-level commands** — `switchOBSScene`, `startOBSRecording`,
 *   `stopOBSRecording`, `startOBSStreaming`, `stopOBSStreaming`,
 *   `toggleStudioMode`.
 * - **`getOBSStatus()`** — returns the current connection state for the UI.
 *
 * **Reconnection strategy**: on `ConnectionClosed`, the module schedules a
 * reconnect with exponential backoff (5s → 10s → 20s → 40s → 60s), capped
 * at 5 attempts. A manual `connectOBS()` resets the counter.
 *
 * `sendOBSAlert` is a stub (kept for API compatibility) — alerts were
 * originally planned to trigger OBS events but never implemented.
 *
 * User-facing error messages are translated via `translate()`.
 *
 * @see src/shared/components/settings/OBSControl.jsx
 * @see @shared/utils/translator.js
 */

import { logInfo, logWarn, logError } from './logger'
import { translate } from './translator'

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

/**
 * Cancels any pending reconnect attempt and resets the backoff counter.
 * @returns {void}
 */
function cancelReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  reconnectAttempts = 0
}

/**
 * Schedules a reconnect attempt with exponential backoff.
 * No-op if a reconnect is already scheduled or the max attempts are reached.
 * @returns {void}
 */
function scheduleReconnect() {
  if (reconnectTimer) return

  if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
    logWarn(
      'obsIntegration',
      `Giving up reconnection after ${RECONNECT_MAX_ATTEMPTS} attempts — click "Connect" to retry`
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
    `🔄 Reconnecting in ${delay}ms (attempt ${attempt}/${RECONNECT_MAX_ATTEMPTS})`
  )

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null

    if (obsConnected) return

    try {
      const result = await connectOBS(lastUsedConfig)
      if (result?.success) {
        reconnectAttempts = 0
        logInfo('obsIntegration', '✅ Reconnect successful')
      } else {
        scheduleReconnect()
      }
    } catch {
      scheduleReconnect()
    }
  }, delay)
}

/**
 * Connects to OBS via WebSocket.
 *
 * @param {Object} [config]
 * @param {string} [config.host='localhost']
 * @param {number} [config.port=4455]
 * @param {string} [config.password='']
 * @returns {Promise<{success: boolean, connected?: boolean, error?: string}>}
 */
export async function connectOBS(config = {}) {
  cancelReconnect()

  if (obsWebSocket) {
    try {
      obsWebSocket.disconnect()
    } catch {
      // ignore
    }
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
    logError('obsIntegration', 'OBS connection error', e)
    obsConnected = false
    return { success: false, error: e.message }
  }
}

/**
 * Disconnects from OBS and cancels any pending reconnect.
 * @returns {void}
 */
export function disconnectOBS() {
  cancelReconnect()

  if (obsWebSocket) {
    try {
      obsWebSocket.disconnect()
    } catch (e) {
      logWarn('obsIntegration', 'OBS disconnect error', e)
    }
    obsWebSocket = null
  }
  obsConnected = false
}

/**
 * Installs the OBS event handlers (ConnectionClosed, error).
 * @returns {void}
 */
function setupOBSEvents() {
  if (!obsWebSocket) return

  try {
    obsWebSocket.on('ConnectionClosed', () => {
      obsConnected = false
      if (!obsWebSocket) return
      scheduleReconnect()
    })

    obsWebSocket.on('error', (error) => {
      logError('obsIntegration', 'OBS error', error)
    })
  } catch (e) {
    logWarn('obsIntegration', 'Error setting up OBS events', e)
  }
}

/**
 * Sends a raw OBS command.
 *
 * @param {string} command - The obs-websocket command name.
 * @param {Object} [params={}]
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function sendOBSCommand(command, params = {}) {
  if (!obsConnected || !obsWebSocket) {
    logWarn('obsIntegration', 'OBS not connected')
    return { success: false, error: translate('obsErrorNotConnected') }
  }

  try {
    const result = await obsWebSocket.call(command, params)
    return { success: true, result }
  } catch (e) {
    logError('obsIntegration', `OBS command error ${command}`, e)
    return { success: false, error: e.message }
  }
}

/**
 * Switches the current program scene.
 * @param {string} sceneName
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function switchOBSScene(sceneName) {
  return await sendOBSCommand('SetCurrentProgramScene', { sceneName })
}

/**
 * Toggles Studio Mode on/off.
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function toggleStudioMode() {
  const state = await sendOBSCommand('GetStudioModeEnabled')
  if (state.success) {
    return await sendOBSCommand('SetStudioModeEnabled', {
      studioModeEnabled: !state.result.studioModeEnabled,
    })
  }
  return state
}

/**
 * Starts recording in OBS.
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function startOBSRecording() {
  return await sendOBSCommand('StartRecord')
}

/**
 * Stops recording in OBS.
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function stopOBSRecording() {
  return await sendOBSCommand('StopRecord')
}

/**
 * Starts streaming in OBS.
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function startOBSStreaming() {
  return await sendOBSCommand('StartStream')
}

/**
 * Stops streaming in OBS.
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
export async function stopOBSStreaming() {
  return await sendOBSCommand('StopStream')
}

/**
 * Stub: OBS alerts were never implemented. Kept for API compatibility.
 *
 * @param {string} _message
 * @param {string} [_type='info']
 * @param {number} [_duration=3000]
 * @returns {{success: boolean}}
 */
export function sendOBSAlert(_message, _type = 'info', _duration = 3000) {
  return { success: true }
}

/**
 * Returns the current OBS connection state.
 *
 * @returns {{
 *   connected: boolean,
 *   websocket: boolean,
 *   reconnectAttempts: number,
 *   reconnectMaxAttempts: number,
 * }}
 */
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