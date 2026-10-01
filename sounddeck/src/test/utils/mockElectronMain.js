// src/test/utils/mockElectronMain.js
import { vi } from 'vitest'

/**
 * Crée un mock complet des APIs Electron utilisées côté main process.
 * Retourne à la fois le mock ET un handle sur les objets internes pour
 * permettre des assertions (ex: _ipcMain._handlers.get('store-get')).
 */
export function createElectronMainMock(options = {}) {
  const {
    appPath = '/fake/app',
    userData = '/fake/userData',
    isPackaged = false,
    locale = 'fr-FR',
    version = '1.3.0',
  } = options

  const ipcHandlers = new Map()
  const ipcListeners = new Map()

  // ─── APP ──────────────────────────────────────────────────────────
  const mockApp = {
    isPackaged,
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    quit: vi.fn(),
    exit: vi.fn(),
    getPath: vi.fn((name) => {
      const paths = {
        userData,
        temp: '/fake/temp',
        exe: '/fake/sounddeck.exe',
        desktop: '/fake/desktop',
        appData: '/fake/appData',
        home: '/fake/home',
        downloads: '/fake/downloads',
      }
      return paths[name] ?? `/fake/${name}`
    }),
    getLocale: vi.fn(() => locale),
    getAppPath: vi.fn(() => appPath),
    getVersion: vi.fn(() => version),
    requestSingleInstanceLock: vi.fn(() => true),
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
  }

  // ─── BROWSER WINDOW ───────────────────────────────────────────────
  const mockWebContents = {
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    openDevTools: vi.fn(),
    getURL: vi.fn(() => 'http://localhost:5173'),
    session: {
      on: vi.fn(),
    },
  }

  const mockWindow = {
    loadURL: vi.fn().mockResolvedValue(undefined),
    loadFile: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    restore: vi.fn(),
    isVisible: vi.fn(() => true),
    isMinimized: vi.fn(() => false),
    setContextMenu: vi.fn(),
    webContents: mockWebContents,
  }

  const BrowserWindow = vi.fn(() => mockWindow)
  BrowserWindow.getAllWindows = vi.fn(() => [mockWindow])

  // ─── IPC MAIN ─────────────────────────────────────────────────────
  const ipcMain = {
    handle: vi.fn((channel, handler) => {
      ipcHandlers.set(channel, handler)
    }),
    removeHandler: vi.fn((channel) => {
      ipcHandlers.delete(channel)
    }),
    on: vi.fn((channel, listener) => {
      if (!ipcListeners.has(channel)) ipcListeners.set(channel, [])
      ipcListeners.get(channel).push(listener)
    }),
    removeAllListeners: vi.fn((channel) => {
      if (channel) ipcListeners.delete(channel)
      else ipcListeners.clear()
    }),
    eventNames: vi.fn(() => Array.from(ipcHandlers.keys())),
    listeners: vi.fn((channel) => ipcListeners.get(channel) ?? []),
    // ✅ Handle sur les handlers enregistrés pour tests
    _handlers: ipcHandlers,
    _listeners: ipcListeners,
  }

  // ─── TRAY ─────────────────────────────────────────────────────────
  const mockTray = {
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn(() => false),
  }
  const Tray = vi.fn(() => mockTray)

  // ─── MENU ─────────────────────────────────────────────────────────
  const Menu = {
    setApplicationMenu: vi.fn(),
    buildFromTemplate: vi.fn((template) => ({ items: template })),
  }

  // ─── GLOBAL SHORTCUT ──────────────────────────────────────────────
  const globalShortcut = {
    register: vi.fn(() => true),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
    isRegistered: vi.fn(() => false),
  }

  // ─── DIALOG ───────────────────────────────────────────────────────
  const dialog = {
    showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
    showSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
    showErrorBox: vi.fn(),
    showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
  }

  // ─── SHELL ────────────────────────────────────────────────────────
  const shell = {
    openExternal: vi.fn().mockResolvedValue(undefined),
    openPath: vi.fn().mockResolvedValue(''),
  }

  // ─── PROTOCOL ─────────────────────────────────────────────────────
  const protocol = {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn(),
  }

  // ─── NATIVE IMAGE ─────────────────────────────────────────────────
  const mockImage = {
    resize: vi.fn(() => mockImage),
    isEmpty: vi.fn(() => false),
  }
  const nativeImage = {
    createFromPath: vi.fn(() => mockImage),
    createEmpty: vi.fn(() => mockImage),
  }

  return {
    app: mockApp,
    BrowserWindow,
    ipcMain,
    Tray,
    Menu,
    globalShortcut,
    dialog,
    shell,
    protocol,
    nativeImage,
    // ✅ Handles pour assertions
    _mockWindow: mockWindow,
    _mockWebContents: mockWebContents,
    _mockTray: mockTray,
  }
}

export function installElectronMainMock(options) {
  global.__electronMock = createElectronMainMock(options)
  return global.__electronMock
}

/**
 * Récupère le handler IPC enregistré pour un channel donné.
 * Utile pour tester les handlers directement.
 */
export function getIpcHandler(channel) {
  const mock = global.__electronMock
  if (!mock) throw new Error('Electron mock non installé')
  const handler = mock.ipcMain._handlers.get(channel)
  if (!handler) throw new Error(`Handler IPC introuvable: ${channel}`)
  return handler
}