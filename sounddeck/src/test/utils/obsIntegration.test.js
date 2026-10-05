// src/test/utils/obsIntegration.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

// ─── MOCK obs-websocket-js ─────────────────────────────────────────────
const { mockOBSInstance } = vi.hoisted(() => {
  const instance = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    call: vi.fn(),
    on: vi.fn(),
  }
  return { mockOBSInstance: instance }
})

vi.mock('obs-websocket-js', () => ({
  default: vi.fn(function () {
    return mockOBSInstance
  }),
}))

import {
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
} from '@shared/utils/obsIntegration'

beforeEach(() => {
  mockOBSInstance.connect.mockReset().mockResolvedValue(undefined)
  mockOBSInstance.disconnect.mockReset()
  mockOBSInstance.call.mockReset().mockResolvedValue({ result: 'ok' })
  mockOBSInstance.on.mockReset()

  disconnectOBS()
  vi.clearAllTimers()
})

// ═══════════════════════════════════════════════════════════════════════
// connectOBS / disconnectOBS
// ═══════════════════════════════════════════════════════════════════════
describe('obsIntegration > connectOBS', () => {
  it('connecte avec la config par défaut', async () => {
    const result = await connectOBS()
    expect(result.success).toBe(true)
    expect(result.connected).toBe(true)
    expect(mockOBSInstance.connect).toHaveBeenCalledWith(
      'ws://localhost:4455',
      ''
    )
  })

  it('utilise la config custom', async () => {
    await connectOBS({ host: '192.168.1.10', port: 4444, password: 'secret' })
    expect(mockOBSInstance.connect).toHaveBeenCalledWith(
      'ws://192.168.1.10:4444',
      'secret'
    )
  })

  it('setup les events (ConnectionClosed + error)', async () => {
    await connectOBS()
    expect(mockOBSInstance.on).toHaveBeenCalledWith('ConnectionClosed', expect.any(Function))
    expect(mockOBSInstance.on).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('retourne erreur si connect throw', async () => {
    mockOBSInstance.connect.mockRejectedValue(new Error('refused'))
    const result = await connectOBS()
    expect(result.success).toBe(false)
    expect(result.error).toBe('refused')
  })

  it('disconnect l\'instance précédente avant de reconnecter', async () => {
    await connectOBS()
    mockOBSInstance.disconnect.mockClear()
    await connectOBS()
    expect(mockOBSInstance.disconnect).toHaveBeenCalled()
  })
})

describe('obsIntegration > disconnectOBS', () => {
  it('disconnect proprement', async () => {
    await connectOBS()
    disconnectOBS()
    expect(mockOBSInstance.disconnect).toHaveBeenCalled()
  })

  it('ne crash pas si pas connecté', () => {
    expect(() => disconnectOBS()).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// sendOBSCommand + helpers
// ═══════════════════════════════════════════════════════════════════════
describe('obsIntegration > sendOBSCommand', () => {
  it('retourne erreur si non connecté', async () => {
    const result = await sendOBSCommand('SomeCommand')
    expect(result.success).toBe(false)
    expect(result.error).toContain('non connecté')
  })

  it('appelle obsWebSocket.call quand connecté', async () => {
    await connectOBS()
    mockOBSInstance.call.mockResolvedValue({ foo: 'bar' })
    const result = await sendOBSCommand('GetSceneList', { foo: 1 })
    expect(result.success).toBe(true)
    expect(result.result).toEqual({ foo: 'bar' })
    expect(mockOBSInstance.call).toHaveBeenCalledWith('GetSceneList', { foo: 1 })
  })

  it('retourne erreur si call throw', async () => {
    await connectOBS()
    mockOBSInstance.call.mockRejectedValue(new Error('cmd fail'))
    const result = await sendOBSCommand('Bad')
    expect(result.success).toBe(false)
    expect(result.error).toBe('cmd fail')
  })
})

describe('obsIntegration > switchOBSScene', () => {
  it('envoie la bonne commande', async () => {
    await connectOBS()
    await switchOBSScene('Scene1')
    expect(mockOBSInstance.call).toHaveBeenCalledWith('SetCurrentProgramScene', {
      sceneName: 'Scene1',
    })
  })
})

describe('obsIntegration > toggleStudioMode', () => {
  it('active le studio mode si désactivé', async () => {
    await connectOBS()
    mockOBSInstance.call
      .mockResolvedValueOnce({ studioModeEnabled: false })
      .mockResolvedValueOnce({})
    await toggleStudioMode()
    expect(mockOBSInstance.call).toHaveBeenNthCalledWith(2, 'SetStudioModeEnabled', {
      studioModeEnabled: true,
    })
  })

  it('désactive le studio mode si activé', async () => {
    await connectOBS()
    mockOBSInstance.call
      .mockResolvedValueOnce({ studioModeEnabled: true })
      .mockResolvedValueOnce({})
    await toggleStudioMode()
    expect(mockOBSInstance.call).toHaveBeenNthCalledWith(2, 'SetStudioModeEnabled', {
      studioModeEnabled: false,
    })
  })

  it('retourne erreur si GetStudioModeEnabled échoue', async () => {
    // Non connecté → sendOBSCommand retourne erreur
    const result = await toggleStudioMode()
    expect(result.success).toBe(false)
  })
})

describe('obsIntegration > recording/streaming', () => {
  beforeEach(async () => {
    await connectOBS()
    mockOBSInstance.call.mockReset().mockResolvedValue({})
  })

  it('startOBSRecording → StartRecord', async () => {
    await startOBSRecording()
    expect(mockOBSInstance.call).toHaveBeenCalledWith('StartRecord', {})
  })

  it('stopOBSRecording → StopRecord', async () => {
    await stopOBSRecording()
    expect(mockOBSInstance.call).toHaveBeenCalledWith('StopRecord', {})
  })

  it('startOBSStreaming → StartStream', async () => {
    await startOBSStreaming()
    expect(mockOBSInstance.call).toHaveBeenCalledWith('StartStream', {})
  })

  it('stopOBSStreaming → StopStream', async () => {
    await stopOBSStreaming()
    expect(mockOBSInstance.call).toHaveBeenCalledWith('StopStream', {})
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Utilitaires
// ═══════════════════════════════════════════════════════════════════════
describe('obsIntegration > Utilitaires', () => {
  it('sendOBSAlert retourne success=true', () => {
    const result = sendOBSAlert('message', 'info', 3000)
    expect(result.success).toBe(true)
  })

  it('getOBSStatus retourne l\'état déconnecté', () => {
    disconnectOBS()
    const status = getOBSStatus()
    expect(status.connected).toBe(false)
    expect(status.websocket).toBe(false)
    expect(status.reconnectMaxAttempts).toBe(5)
  })

  it('getOBSStatus retourne l\'état connecté', async () => {
    await connectOBS()
    const status = getOBSStatus()
    expect(status.connected).toBe(true)
    expect(status.websocket).toBe(true)
  })

  it('getOBSStatus expose reconnectAttempts', () => {
    const status = getOBSStatus()
    expect(typeof status.reconnectAttempts).toBe('number')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════════════════
describe('obsIntegration > Events', () => {
  it('ConnectionClosed marque déconnecté', async () => {
    await connectOBS()
    const closedHandler = mockOBSInstance.on.mock.calls.find(
      (c) => c[0] === 'ConnectionClosed'
    )?.[1]
    expect(closedHandler).toBeDefined()

    closedHandler()
    expect(getOBSStatus().connected).toBe(false)
  })

  it('error event log l\'erreur', async () => {
    await connectOBS()
    const errorHandler = mockOBSInstance.on.mock.calls.find(
      (c) => c[0] === 'error'
    )?.[1]
    expect(errorHandler).toBeDefined()
    expect(() => errorHandler(new Error('ws error'))).not.toThrow()
  })
})