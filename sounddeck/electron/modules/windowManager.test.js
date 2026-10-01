// electron/modules/windowManager.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  createWindow,
  getMainWindow,
  showMainWindow,
  hideMainWindow,
  isWindowVisible,
  focusMainWindow,
  setQuitting,
  setPendingQuit,
  setCloseToTray,
  getCloseToTray,
  getIsQuitting,
  getPendingQuit,
  cleanupWindow,
} from './windowManager'

describe('windowManager', () => {
  let electronMock
  let BrowserWindow
  let mockWindow
  let shell
  let fs

  beforeEach(() => {
    // Reset l'état module-level entre les tests
    cleanupWindow()
    vi.clearAllMocks()

    electronMock = globalThis.__electronMock
    BrowserWindow = electronMock.BrowserWindow
    mockWindow = electronMock._mockWindow
    shell = electronMock.shell
    fs = globalThis.__fsMock

    // Reset toutes les méthodes du mockWindow (c'est le MÊME objet à chaque test)
    mockWindow.loadURL.mockReset().mockResolvedValue(undefined)
    mockWindow.loadFile.mockReset().mockResolvedValue(undefined)
    mockWindow.on.mockReset()
    mockWindow.once.mockReset()
    mockWindow.show.mockReset()
    mockWindow.hide.mockReset()
    mockWindow.focus.mockReset()
    mockWindow.minimize.mockReset()
    mockWindow.maximize.mockReset()
    mockWindow.restore.mockReset()
    mockWindow.isVisible.mockReset().mockReturnValue(true)
    mockWindow.isMinimized.mockReset().mockReturnValue(false)
    mockWindow.setContextMenu.mockReset()

    mockWindow.webContents.send.mockReset()
    mockWindow.webContents.on.mockReset()
    mockWindow.webContents.once.mockReset()
    mockWindow.webContents.openDevTools.mockReset()
    mockWindow.webContents.getURL.mockReset().mockReturnValue('http://localhost:5173')
    mockWindow.webContents.session.on.mockReset()

    // Par défaut, pas d'icône sur disque
    fs.existsSync.mockReset().mockReturnValue(false)

    // app non-packaged → mode dev
    electronMock.app.isPackaged = false
  })

  // ═══════════════════════════════════════════════════════════════════
  // createWindow
  // ═══════════════════════════════════════════════════════════════════

  describe('createWindow', () => {
    it('devrait créer une BrowserWindow et la retourner', () => {
      const win = createWindow()
      expect(BrowserWindow).toHaveBeenCalledTimes(1)
      expect(win).toBe(mockWindow)
    })

    it('devrait passer les bonnes dimensions', () => {
      createWindow()
      const opts = BrowserWindow.mock.calls[0][0]
      expect(opts.width).toBe(1100)
      expect(opts.height).toBe(700)
      expect(opts.minWidth).toBe(800)
      expect(opts.minHeight).toBe(500)
    })

    it('devrait configurer webPreferences correctement', () => {
      createWindow()
      const opts = BrowserWindow.mock.calls[0][0]
      expect(opts.webPreferences.contextIsolation).toBe(true)
      expect(opts.webPreferences.nodeIntegration).toBe(false)
      expect(opts.webPreferences.webSecurity).toBe(true)
      expect(opts.webPreferences.allowRunningInsecureContent).toBe(false)
      expect(opts.webPreferences.experimentalFeatures).toBe(false)
    })

    it('devrait inclure l\'icône si le fichier existe', () => {
      fs.existsSync.mockReturnValue(true)
      createWindow()
      const opts = BrowserWindow.mock.calls[0][0]
      expect(opts.icon).toBeDefined()
    })

    it('ne devrait PAS inclure l\'icône si le fichier est absent', () => {
      fs.existsSync.mockReturnValue(false)
      createWindow()
      const opts = BrowserWindow.mock.calls[0][0]
      expect(opts.icon).toBeUndefined()
    })

    it('devrait montrer la fenêtre par défaut', () => {
      createWindow()
      const opts = BrowserWindow.mock.calls[0][0]
      expect(opts.show).toBe(true)
    })

    it('devrait cacher la fenêtre si shouldStartMinimized=true', () => {
      createWindow(true)
      const opts = BrowserWindow.mock.calls[0][0]
      expect(opts.show).toBe(false)
    })

    // ─── Mode DEV ────────────────────────────────────────────────────

    it('devrait loadURL en mode dev', () => {
      createWindow()
      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:5173')
    })

    it('devrait openDevTools en mode dev', () => {
      createWindow()
      expect(mockWindow.webContents.openDevTools).toHaveBeenCalledTimes(1)
    })

    it('ne devrait PAS appeler loadFile en mode dev', () => {
      createWindow()
      expect(mockWindow.loadFile).not.toHaveBeenCalled()
    })

    // ─── Listeners ───────────────────────────────────────────────────

    it('devrait enregistrer un listener will-navigate', () => {
      createWindow()
      const calls = mockWindow.webContents.on.mock.calls
      expect(calls.some((c) => c[0] === 'will-navigate')).toBe(true)
    })

    it('devrait enregistrer un listener will-download sur la session', () => {
      createWindow()
      expect(mockWindow.webContents.session.on).toHaveBeenCalledWith(
        'will-download',
        expect.any(Function)
      )
    })

    // ─── Retour ──────────────────────────────────────────────────────

    it('devrait retourner la fenêtre ET la rendre accessible via getMainWindow', () => {
      const win = createWindow()
      expect(win).toBe(mockWindow)
      expect(getMainWindow()).toBe(mockWindow)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // getMainWindow
  // ═══════════════════════════════════════════════════════════════════

  describe('getMainWindow', () => {
    it('devrait retourner null avant createWindow', () => {
      expect(getMainWindow()).toBeNull()
    })

    it('devrait retourner la fenêtre après createWindow', () => {
      createWindow()
      expect(getMainWindow()).toBe(mockWindow)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // showMainWindow
  // ═══════════════════════════════════════════════════════════════════

  describe('showMainWindow', () => {
    it('ne devrait rien faire si pas de fenêtre', () => {
      expect(() => showMainWindow()).not.toThrow()
    })

    it('devrait appeler show + focus', () => {
      createWindow()
      showMainWindow()
      expect(mockWindow.show).toHaveBeenCalledTimes(1)
      expect(mockWindow.focus).toHaveBeenCalledTimes(1)
    })

    it('ne devrait PAS envoyer hide-quit-confirm si la fenêtre était visible', () => {
      createWindow()
      mockWindow.isVisible.mockReturnValue(true)
      mockWindow.webContents.send.mockClear()

      showMainWindow()

      expect(mockWindow.webContents.send).not.toHaveBeenCalled()
    })

    it('devrait envoyer hide-quit-confirm si la fenêtre était cachée', () => {
      createWindow()
      mockWindow.isVisible.mockReturnValue(false)
      mockWindow.webContents.send.mockClear()

      showMainWindow()

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('hide-quit-confirm')
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // hideMainWindow
  // ═══════════════════════════════════════════════════════════════════

  describe('hideMainWindow', () => {
    it('ne devrait rien faire si pas de fenêtre', () => {
      expect(() => hideMainWindow()).not.toThrow()
    })

    it('devrait appeler hide', () => {
      createWindow()
      hideMainWindow()
      expect(mockWindow.hide).toHaveBeenCalledTimes(1)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // isWindowVisible
  // ═══════════════════════════════════════════════════════════════════

  describe('isWindowVisible', () => {
    it('devrait retourner false sans fenêtre', () => {
      expect(isWindowVisible()).toBe(false)
    })

    it('devrait retourner true si la fenêtre est visible', () => {
      createWindow()
      mockWindow.isVisible.mockReturnValue(true)
      expect(isWindowVisible()).toBe(true)
    })

    it('devrait retourner false si la fenêtre est cachée', () => {
      createWindow()
      mockWindow.isVisible.mockReturnValue(false)
      expect(isWindowVisible()).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // focusMainWindow
  // ═══════════════════════════════════════════════════════════════════

  describe('focusMainWindow', () => {
    it('ne devrait rien faire si pas de fenêtre', () => {
      expect(() => focusMainWindow()).not.toThrow()
    })

    it('devrait show + focus', () => {
      createWindow()
      focusMainWindow()
      expect(mockWindow.show).toHaveBeenCalledTimes(1)
      expect(mockWindow.focus).toHaveBeenCalledTimes(1)
    })

    it('devrait restore si minimized', () => {
      createWindow()
      mockWindow.isMinimized.mockReturnValue(true)
      focusMainWindow()
      expect(mockWindow.restore).toHaveBeenCalledTimes(1)
    })

    it('ne devrait PAS restore si pas minimized', () => {
      createWindow()
      mockWindow.isMinimized.mockReturnValue(false)
      focusMainWindow()
      expect(mockWindow.restore).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Setters / getters d'état
  // ═══════════════════════════════════════════════════════════════════

  describe('état isQuitting / pendingQuit / closeToTray', () => {
    it('isQuitting : set/get', () => {
      setQuitting(true)
      expect(getIsQuitting()).toBe(true)
      setQuitting(false)
      expect(getIsQuitting()).toBe(false)
    })

    it('pendingQuit : set/get', () => {
      setPendingQuit(true)
      expect(getPendingQuit()).toBe(true)
      setPendingQuit(false)
      expect(getPendingQuit()).toBe(false)
    })

    it('closeToTray : set/get', () => {
      setCloseToTray(false)
      expect(getCloseToTray()).toBe(false)
      setCloseToTray(true)
      expect(getCloseToTray()).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // cleanupWindow
  // ═══════════════════════════════════════════════════════════════════

  describe('cleanupWindow', () => {
    it('devrait remettre mainWindow à null', () => {
      createWindow()
      expect(getMainWindow()).not.toBeNull()

      cleanupWindow()
      expect(getMainWindow()).toBeNull()
    })

    it('ne devrait pas crasher si appelé sans fenêtre', () => {
      expect(() => cleanupWindow()).not.toThrow()
      expect(() => cleanupWindow()).not.toThrow()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Listener will-navigate
  // ═══════════════════════════════════════════════════════════════════

  describe('listener will-navigate', () => {
    let listener

    beforeEach(() => {
      createWindow()
      const call = mockWindow.webContents.on.mock.calls.find(
        (c) => c[0] === 'will-navigate'
      )
      listener = call[1]
    })

    it('ne devrait rien bloquer si URL === URL courante', () => {
      mockWindow.webContents.getURL.mockReturnValue('http://localhost:5173')
      const e = { preventDefault: vi.fn() }

      listener(e, 'http://localhost:5173')

      expect(e.preventDefault).not.toHaveBeenCalled()
    })

    it('devrait preventDefault + openExternal pour URL http externe', () => {
      const e = { preventDefault: vi.fn() }
      listener(e, 'https://example.com')

      expect(e.preventDefault).toHaveBeenCalledTimes(1)
      expect(shell.openExternal).toHaveBeenCalledWith('https://example.com')
    })

    it('devrait preventDefault mais PAS openExternal pour URL non-http', () => {
      const e = { preventDefault: vi.fn() }
      listener(e, 'javascript:alert(1)')

      expect(e.preventDefault).toHaveBeenCalledTimes(1)
      expect(shell.openExternal).not.toHaveBeenCalled()
    })

    it('devrait gérer une erreur openExternal sans crash', () => {
      shell.openExternal.mockImplementationOnce(() => {
        throw new Error('boom')
      })
      const e = { preventDefault: vi.fn() }
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => listener(e, 'https://example.com')).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Listener will-download
  // ═══════════════════════════════════════════════════════════════════

  describe('listener will-download', () => {
    let listener

    beforeEach(() => {
      createWindow()
      const call = mockWindow.webContents.session.on.mock.calls.find(
        (c) => c[0] === 'will-download'
      )
      listener = call[1]
    })

    it('devrait preventDefault (bloquer le téléchargement)', () => {
      const e = { preventDefault: vi.fn() }
      listener(e, { getURL: vi.fn(() => 'https://evil.com/file.exe') })
      expect(e.preventDefault).toHaveBeenCalledTimes(1)
    })

    it('ne devrait pas crasher si item est undefined', () => {
      const e = { preventDefault: vi.fn() }
      expect(() => listener(e, undefined)).not.toThrow()
    })
  })
})