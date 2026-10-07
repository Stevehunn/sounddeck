// electron/modules/__tests__/soundPopupManager.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── ACCÈS AUX MOCKS GLOBAUX ──────────────────────────────────────────
const electronMock = globalThis.__electronMock
const { ipcMain, app, BrowserWindow, screen } = electronMock

// ─── MOCK DE LA FENÊTRE POPUP ─────────────────────────────────────────
const createPopupWindowMock = () => ({
  setAlwaysOnTop: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
  loadURL: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  isDestroyed: vi.fn(() => false),
  setBounds: vi.fn(),
  showInactive: vi.fn(),
  hide: vi.fn(),
  destroy: vi.fn(),
  webContents: {
    on: vi.fn(),
    once: vi.fn(),
    isLoading: vi.fn(() => false),
    send: vi.fn(),
  },
})

let popupWindowMock
let mod

// ─── HELPERS ──────────────────────────────────────────────────────────
function callHandler(channel, ...args) {
  const handler = ipcMain._handlers.get(channel)
  if (!handler) throw new Error(`Handler "${channel}" non enregistré`)
  return handler({ sender: {} }, ...args)
}

function callListener(channel, ...args) {
  const listeners = ipcMain._listeners.get(channel) || []
  return listeners.forEach((l) => l({ sender: {} }, ...args))
}

// ═══════════════════════════════════════════════════════════════════════
// SETUP / TEARDOWN
// ═══════════════════════════════════════════════════════════════════════
beforeEach(async () => {
  popupWindowMock = createPopupWindowMock()

  BrowserWindow.mockReset()
  BrowserWindow.mockImplementation(function () {
    return popupWindowMock
  })

  screen.getPrimaryDisplay.mockReset().mockReturnValue({
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
  })

  // Reset complet du module pour repartir d'un état propre
  vi.resetModules()
  mod = await import('../soundPopupManager')

  mod.registerSoundPopupHandlers(ipcMain, { getMainWindow: () => null })

  // ✅ Active les fake timers APRÈS l'import (le module peut créer des
  //    timers au chargement ; on ne veut pas les geler).
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  try { mod?.destroyPopupWindow?.() } catch { /* noop */ }
})

// ═══════════════════════════════════════════════════════════════════════
// ENREGISTREMENT DES HANDLERS
// ═══════════════════════════════════════════════════════════════════════
describe('registerSoundPopupHandlers', () => {
  it('enregistre tous les handlers invoke', () => {
    expect(ipcMain.handle).toHaveBeenCalledWith('sound-popup:show', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('sound-popup:hide', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('sound-popup:set-enabled', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('sound-popup:set-position', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('sound-popup:set-size', expect.any(Function))
    expect(ipcMain.handle).toHaveBeenCalledWith('sound-popup:preview', expect.any(Function))
  })

  it('enregistre les listeners on', () => {
    expect(ipcMain.on).toHaveBeenCalledWith('sound-popup:ready', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('sound-popup:hover', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('sound-popup:action', expect.any(Function))
    expect(ipcMain.on).toHaveBeenCalledWith('sound-popup:request-hide', expect.any(Function))
  })

  it('enregistre app.on(before-quit)', () => {
    expect(app.on).toHaveBeenCalledWith('before-quit', expect.any(Function))
  })
})

// ═══════════════════════════════════════════════════════════════════════
// setEnabled / setPosition / setSize
// ═══════════════════════════════════════════════════════════════════════
describe('IPC sound-popup:set-enabled', () => {
  it('retourne true', async () => {
    const result = await callHandler('sound-popup:set-enabled', false)
    expect(result).toBe(true)
  })
})

describe('IPC sound-popup:set-position', () => {
  it('retourne true pour une position valide', async () => {
    const result = await callHandler('sound-popup:set-position', 'bottom-left')
    expect(result).toBe(true)
  })

  it('retourne true même pour une position invalide (silencieux)', async () => {
    const result = await callHandler('sound-popup:set-position', 'nope')
    expect(result).toBe(true)
  })
})

describe('IPC sound-popup:set-size', () => {
  it('retourne true', async () => {
    const result = await callHandler('sound-popup:set-size', 'large')
    expect(result).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// IPC show
// ═══════════════════════════════════════════════════════════════════════
describe('IPC sound-popup:show', () => {
  it('crée la fenêtre popup si absente', async () => {
    await callHandler('sound-popup:show', { name: 'Test' })

    expect(BrowserWindow).toHaveBeenCalledTimes(1)
    const config = BrowserWindow.mock.calls[0][0]
    expect(config.transparent).toBe(true)
    expect(config.frame).toBe(false)
    expect(config.alwaysOnTop).toBe(true)
    expect(config.backgroundColor).toBe('#00000000')
  })

  it('envoie le payload via webContents.send', async () => {
    await callHandler('sound-popup:show', {
      name: 'Test',
      emoji: '🎵',
      duration: 10,
    })

    expect(popupWindowMock.webContents.send).toHaveBeenCalledWith(
      'sound-popup:update',
      expect.objectContaining({ name: 'Test' })
    )
  })

  it('applique la position et la taille', async () => {
    await callHandler('sound-popup:show', { cardSize: 'large' })

    expect(popupWindowMock.setBounds).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 480,
        height: 124,
      })
    )
  })

  it('utilise medium par défaut', async () => {
    await callHandler('sound-popup:show', {})

    expect(popupWindowMock.setBounds).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 400,
        height: 108,
      })
    )
  })

  it('no-op si désactivé', async () => {
    await callHandler('sound-popup:set-enabled', false)
    BrowserWindow.mockClear()

    await callHandler('sound-popup:show', { name: 'Test' })
    expect(BrowserWindow).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// IPC preview
// ═══════════════════════════════════════════════════════════════════════
describe('IPC sound-popup:preview', () => {
  it('affiche la popup avec la position sélectionnée', async () => {
    await callHandler('sound-popup:preview', {
      name: 'Preview',
      position: 'top-left',
      hideDelay: 6000,
    })

    expect(popupWindowMock.setBounds).toHaveBeenCalledWith(
      expect.objectContaining({ x: 20, y: 20 }) // top-left avec EDGE_MARGIN
    )
  })

  it('utilise la position courante si non fournie', async () => {
    await callHandler('sound-popup:set-position', 'bottom-right')
    popupWindowMock.setBounds.mockClear()

    await callHandler('sound-popup:preview', {})

    // bottom-right : 1920 - 400 - 20 = 1500 ; 1080 - 108 - 20 = 952
    expect(popupWindowMock.setBounds).toHaveBeenCalledWith(
      expect.objectContaining({ x: 1500, y: 952 })
    )
  })

  it('ignore la position si invalide', async () => {
    await callHandler('sound-popup:set-position', 'top-right')
    popupWindowMock.setBounds.mockClear()

    await callHandler('sound-popup:preview', { position: 'nope' })

    // Reste en top-right
    expect(popupWindowMock.setBounds).toHaveBeenCalledWith(
      expect.objectContaining({ x: 1500, y: 20 })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════
// IPC hide / ready / request-hide
// ═══════════════════════════════════════════════════════════════════════
describe('IPC sound-popup:hide', () => {
  it('appelle popupWindow.hide', async () => {
    await callHandler('sound-popup:show', { name: 'Test' })
    await callHandler('sound-popup:hide')
    expect(popupWindowMock.hide).toHaveBeenCalled()
  })
})

describe('Listener sound-popup:ready', () => {
  it('affiche la fenêtre si pas détruite', async () => {
    await callHandler('sound-popup:show', { name: 'Test' })

    callListener('sound-popup:ready')

    expect(popupWindowMock.showInactive).toHaveBeenCalled()
  })
})

describe('Listener sound-popup:request-hide', () => {
  it('cache la fenêtre', async () => {
    await callHandler('sound-popup:show', { name: 'Test' })
    callListener('sound-popup:request-hide')
    expect(popupWindowMock.hide).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Listener sound-popup:hover
// ═══════════════════════════════════════════════════════════════════════
describe('Listener sound-popup:hover', () => {
  it('hover=true annule le hide timer', async () => {
    await callHandler('sound-popup:show', { name: 'Test' })
    callListener('sound-popup:hover', true)

    // Avance 8s (au-delà de DEFAULT_HIDE_DELAY)
    vi.advanceTimersByTime(8000)

    expect(popupWindowMock.hide).not.toHaveBeenCalled()
  })

  it('hover=false réarme le hide timer', async () => {
    await callHandler('sound-popup:show', { name: 'Test' })
    callListener('sound-popup:hover', true)
    callListener('sound-popup:hover', false)

    vi.advanceTimersByTime(8000)

    expect(popupWindowMock.hide).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Listener sound-popup:action
// ═══════════════════════════════════════════════════════════════════════
describe('Listener sound-popup:action', () => {
  it('forward l\'action à la fenêtre principale', () => {
    const mainWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: { send: vi.fn() },
    }

    // Nouveau register avec un mainWindow
    vi.resetModules()
    return import('../soundPopupManager').then((m) => {
      m.registerSoundPopupHandlers(ipcMain, { getMainWindow: () => mainWindow })
      callListener('sound-popup:action', 'next')

      expect(mainWindow.webContents.send).toHaveBeenCalledWith(
        'sound-popup:action',
        'next'
      )
    })
  })
})