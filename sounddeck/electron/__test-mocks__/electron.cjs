// electron/__test-mocks__/electron.cjs
// Mock CJS de 'electron'. Utilise globalThis.__vitest_vi__ (défini par setup-electron.js).

const vi = globalThis.__vitest_vi__

if (!vi) {
  throw new Error(
    '[electron.cjs] globalThis.__vitest_vi__ non défini. ' +
    'Assure-toi que setup-electron.js est chargé avant.'
  )
}

const ipcHandlers = new Map()
const ipcListeners = new Map()

// ─── APP ───────────────────────────────────────────────────────────────
const app = {
  isPackaged: false,
  whenReady: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  once: vi.fn(),
  quit: vi.fn(),
  exit: vi.fn(),
  getPath: vi.fn((name) => {
    const paths = {
      userData: '/fake/userData',
      temp: '/fake/temp',
      exe: '/fake/sounddeck.exe',
      desktop: '/fake/desktop',
      appData: '/fake/appData',
      home: '/fake/home',
      downloads: '/fake/downloads',
    }
    return paths[name] ?? `/fake/${name}`
  }),
  getLocale: vi.fn(() => 'fr-FR'),
  getAppPath: vi.fn(() => '/fake/app'),
  getVersion: vi.fn(() => '1.3.0'),
  requestSingleInstanceLock: vi.fn(() => true),
  setLoginItemSettings: vi.fn(),
  getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
}

// ─── IPC MAIN ──────────────────────────────────────────────────────────
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
  _handlers: ipcHandlers,
  _listeners: ipcListeners,
}

// ─── GLOBAL SHORTCUT ───────────────────────────────────────────────────
const globalShortcut = {
  register: vi.fn(() => true),
  unregister: vi.fn(),
  unregisterAll: vi.fn(),
  isRegistered: vi.fn(() => false),
}

// ─── BROWSER WINDOW ────────────────────────────────────────────────────
const webContents = {
  send: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  openDevTools: vi.fn(),
  getURL: vi.fn(() => 'http://localhost:5173'),
  session: { on: vi.fn() },
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
  webContents,
}

// ✅ function (pas arrow) → utilisable avec `new BrowserWindow(...)`
const BrowserWindow = vi.fn(function () {
  return mockWindow
})
BrowserWindow.getAllWindows = vi.fn(() => [mockWindow])

// ─── TRAY ──────────────────────────────────────────────────────────────
const mockTray = {
  setToolTip: vi.fn(),
  setContextMenu: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn(() => false),
}

// ✅ function (pas arrow) → utilisable avec `new Tray(...)`
const Tray = vi.fn(function () {
  return mockTray
})

// ─── MENU ──────────────────────────────────────────────────────────────
const Menu = {
  setApplicationMenu: vi.fn(),
  buildFromTemplate: vi.fn((template) => ({ items: template })),
}

// ─── DIALOG ────────────────────────────────────────────────────────────
const dialog = {
  showOpenDialog: vi.fn().mockResolvedValue({ canceled: true, filePaths: [] }),
  showSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
  showErrorBox: vi.fn(),
  showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
}

// ─── SHELL ─────────────────────────────────────────────────────────────
const shell = {
  openExternal: vi.fn().mockResolvedValue(undefined),
  openPath: vi.fn().mockResolvedValue(''),
}

// ─── PROTOCOL ──────────────────────────────────────────────────────────
const protocol = {
  registerSchemesAsPrivileged: vi.fn(),
  handle: vi.fn(),
}

// ─── NATIVE IMAGE ──────────────────────────────────────────────────────
const mockImage = {
  resize: vi.fn(() => mockImage),
  isEmpty: vi.fn(() => false),
}
const nativeImage = {
  createFromPath: vi.fn(() => mockImage),
  createEmpty: vi.fn(() => mockImage),
}

// ─── CONTEXT BRIDGE ────────────────────────────────────────────────────
const contextBridge = {
  exposeInMainWorld: vi.fn(),
}

// ─── IPC RENDERER ──────────────────────────────────────────────────────
const ipcRenderer = {
  invoke: vi.fn().mockResolvedValue(undefined),
  send: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
}

// ─── EXPORTS CJS ───────────────────────────────────────────────────────
module.exports = {
  app,
  ipcMain,
  globalShortcut,
  BrowserWindow,
  Tray,
  Menu,
  dialog,
  shell,
  protocol,
  nativeImage,
  contextBridge,
  ipcRenderer,
  version: '42.5.2',
  _mockWindow: mockWindow,
  _mockWebContents: webContents,
  _mockTray: mockTray,
}

// Interop ESM
module.exports.default = module.exports
module.exports.__esModule = true