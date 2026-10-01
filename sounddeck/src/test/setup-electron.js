// src/test/setup-electron.js
import { vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

// ═══════════════════════════════════════════════════════════════════════
// 0. STUBS GLOBALS (avant tout autre import)
//    Nécessaires pour preload.js qui référence window/File en bare global
// ═══════════════════════════════════════════════════════════════════════
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {}
}

import path from 'path'
import Module, { createRequire } from 'module'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// ═══════════════════════════════════════════════════════════════════════
// 1. EXPOSE vi GLOBALEMENT
// ═══════════════════════════════════════════════════════════════════════
globalThis.__vitest_vi__ = vi

// ═══════════════════════════════════════════════════════════════════════
// 2. MOCK ELECTRON
// ═══════════════════════════════════════════════════════════════════════
const MOCK_ELECTRON_PATH = path.resolve(
  __dirname,
  '../../electron/__test-mocks__/electron.cjs'
)
const electronMock = require(MOCK_ELECTRON_PATH)
globalThis.__electronMock = electronMock

// ═══════════════════════════════════════════════════════════════════════
// 3. MOCK STORE PARTAGÉ
// ═══════════════════════════════════════════════════════════════════════
const storeData = new Map()
const storeMock = {
  _data: storeData,
  get: vi.fn((key, defaultValue) =>
    storeData.has(key) ? storeData.get(key) : defaultValue
  ),
  set: vi.fn((key, value) => storeData.set(key, value)),
  delete: vi.fn((key) => storeData.delete(key)),
  has: vi.fn((key) => storeData.has(key)),
  clear: vi.fn(() => storeData.clear()),
}
globalThis.__storeMock = storeMock

class MockStoreClass {
  constructor() {
    return storeMock
  }
}
globalThis.__MockStoreClass = MockStoreClass

// ═══════════════════════════════════════════════════════════════════════
// 4. MOCK fs
// ═══════════════════════════════════════════════════════════════════════
const fsActual = require('fs')

class MockWriteStream extends EventEmitter {
  constructor() {
    super()
    this._closed = false
  }
  write() {
    return true
  }
  close() {
    if (!this._closed) {
      this._closed = true
      process.nextTick(() => this.emit('close'))
    }
  }
  end() {
    process.nextTick(() => this.emit('finish'))
  }
  on(event, cb) {
    super.on(event, cb)
    if (event === 'close') process.nextTick(() => cb())
    if (event === 'finish') process.nextTick(() => cb())
    return this
  }
}

const fsMocks = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  rmSync: vi.fn(),
  unlinkSync: vi.fn(),
  unlink: vi.fn((p, cb) => cb?.()),
  copyFileSync: vi.fn(),
  statSync: vi.fn(),
  createWriteStream: vi.fn(() => new MockWriteStream()),
  createReadStream: vi.fn(() => ({ pipe: (dest) => dest })),
  promises: { stat: vi.fn() },
}
globalThis.__fsMock = fsMocks

const fsForSource = new Proxy(fsActual, {
  get(target, prop) {
    if (prop in fsMocks) return fsMocks[prop]
    return target[prop]
  },
})

// ═══════════════════════════════════════════════════════════════════════
// 5. MOCK crypto
// ═══════════════════════════════════════════════════════════════════════
let uuidCounter = 0
const cryptoMocks = {
  randomUUID: vi.fn(() => `uuid-${++uuidCounter}`),
}
globalThis.__cryptoMock = cryptoMocks
globalThis.__resetCryptoCounter = () => {
  uuidCounter = 0
}

const cryptoActual = require('crypto')
const cryptoForSource = new Proxy(cryptoActual, {
  get(target, prop) {
    return prop in cryptoMocks ? cryptoMocks[prop] : target[prop]
  },
})

// ═══════════════════════════════════════════════════════════════════════
// 6. MOCK os
// ═══════════════════════════════════════════════════════════════════════
const osActual = require('os')
const osMocks = {
  type: vi.fn(() => 'Linux'),
  release: vi.fn(() => '5.15.0-test'),
  cpus: vi.fn(() => [{ model: 'Test CPU Model' }]),
  totalmem: vi.fn(() => 16 * 1024 * 1024 * 1024),
}
globalThis.__osMock = osMocks

const osForSource = new Proxy(osActual, {
  get(target, prop) {
    return prop in osMocks ? osMocks[prop] : target[prop]
  },
})

// ═══════════════════════════════════════════════════════════════════════
// 7. MOCK child_process
// ═══════════════════════════════════════════════════════════════════════
const childProcessActual = require('child_process')
const childProcessMocks = {
  execFile: vi.fn((file, args, opts, cb) => {
    process.nextTick(() => cb(null, '', ''))
    return { on: vi.fn(), kill: vi.fn() }
  }),
  execSync: vi.fn(() => ''),
}
globalThis.__childProcessMock = childProcessMocks

const childProcessForSource = new Proxy(childProcessActual, {
  get(target, prop) {
    return prop in childProcessMocks ? childProcessMocks[prop] : target[prop]
  },
})

// ═══════════════════════════════════════════════════════════════════════
// 8. MOCK https / http
// ═══════════════════════════════════════════════════════════════════════
const httpsActual = require('https')
const httpActual = require('http')

let httpsResponseHandler = null
let httpResponseHandler = null

function createGetMock(getHandlerRef) {
  return vi.fn((url, optionsOrCb, maybeCb) => {
    const cb = typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb
    const config = getHandlerRef()?.(url, optionsOrCb)

    const req = new EventEmitter()
    req.setTimeout = vi.fn()
    req.destroy = vi.fn()

    setImmediate(() => {
      if (!config) {
        req.emit('error', new Error('https.get mock not configured'))
        return
      }
      if (config.error) {
        req.emit('error', config.error)
        return
      }
      const res = new EventEmitter()
      res.statusCode = config.statusCode ?? 200
      res.headers = config.headers ?? {}
      res.resume = vi.fn()
      res.pipe = vi.fn((dest) => {
        if (config.body) {
          process.nextTick(() => {
            dest.emit('data', config.body)
            if (typeof dest.emit === 'function') dest.emit('finish')
          })
        } else {
          process.nextTick(() => dest.emit('finish'))
        }
        return dest
      })

      // 1. Le code source enregistre ses listeners dans le callback
      cb?.(res)

      // 2. Puis on émet data + end (le callback a eu le temps de s'exécuter)
      setImmediate(() => {
        if (config.body) res.emit('data', config.body)
        res.emit('end')
      })
    })

    return req
  })
}

const httpsMocks = { get: createGetMock(() => httpsResponseHandler) }
const httpMocks = { get: createGetMock(() => httpResponseHandler) }
globalThis.__httpsMock = httpsMocks
globalThis.__httpMock = httpMocks
globalThis.__setHttpsResponse = (fn) => {
  httpsResponseHandler = fn
}
globalThis.__setHttpResponse = (fn) => {
  httpResponseHandler = fn
}

const httpsForSource = new Proxy(httpsActual, {
  get(target, prop) {
    return prop in httpsMocks ? httpsMocks[prop] : target[prop]
  },
})
const httpForSource = new Proxy(httpActual, {
  get(target, prop) {
    return prop in httpMocks ? httpMocks[prop] : target[prop]
  },
})

// ═══════════════════════════════════════════════════════════════════════
// 9. MOCK adm-zip
// ═══════════════════════════════════════════════════════════════════════
let admZipGetEntryOverride = null

class AdmZipMock {
  getEntry(name) {
    if (admZipGetEntryOverride) return admZipGetEntryOverride(name)
    if (name === 'plugin.json') {
      return {
        getData: () =>
          Buffer.from(
            JSON.stringify({
              id: 'test-plugin',
              name: 'Test',
              version: '1.0.0',
            }),
            'utf-8'
          ),
      }
    }
    return null
  }
  extractAllTo() {}
}
globalThis.__AdmZipMock = AdmZipMock
globalThis.__setAdmZipGetEntry = (fn) => {
  admZipGetEntryOverride = fn
}

// ═══════════════════════════════════════════════════════════════════════
// 10. MOCK archiver
// ═══════════════════════════════════════════════════════════════════════
class MockArchiver extends EventEmitter {
  constructor() {
    super()
    this._pointer = 0
    this.appended = []
    this.filed = []
  }
  pipe() {
    return this
  }
  append(content, opts) {
    this.appended.push({ content, opts })
    return this
  }
  file(filePath, opts) {
    this.filed.push({ filePath, opts })
    return this
  }
  finalize() {
    this._pointer = 1024
    process.nextTick(() => this.emit('end'))
  }
  pointer() {
    return this._pointer
  }
}

const archiverMock = vi.fn(() => new MockArchiver())
globalThis.__archiverMock = archiverMock

// ═══════════════════════════════════════════════════════════════════════
// 11. MOCK unzipper
// ═══════════════════════════════════════════════════════════════════════
class MockUnzipperExtract {
  constructor(opts) {
    this.opts = opts
  }
  promise() {
    return Promise.resolve()
  }
}
const unzipperMock = {
  Extract: vi.fn((opts) => new MockUnzipperExtract(opts)),
}
globalThis.__unzipperMock = unzipperMock

// ═══════════════════════════════════════════════════════════════════════
// 11-bis. MOCK windowManager
//   Utilisé par les runtime require() dans ipcHandlers.js
// ═══════════════════════════════════════════════════════════════════════
const windowManagerMock = {
  getMainWindow: vi.fn(() => null),
  showMainWindow: vi.fn(),
  hideMainWindow: vi.fn(),
  focusMainWindow: vi.fn(),
  isWindowVisible: vi.fn(() => true),
  setQuitting: vi.fn(),
  setPendingQuit: vi.fn(),
  setCloseToTray: vi.fn(),
  getCloseToTray: vi.fn(() => true),
  getIsQuitting: vi.fn(() => false),
  getPendingQuit: vi.fn(() => false),
  cleanupWindow: vi.fn(),
  createWindow: vi.fn(),
}
globalThis.__windowManagerMock = windowManagerMock

// ═══════════════════════════════════════════════════════════════════════
// 12. MOCK @ffmpeg-installer/ffmpeg
// ═══════════════════════════════════════════════════════════════════════
const ffmpegInstallerMock = { path: '/fake/node_modules/ffmpeg.exe' }
globalThis.__ffmpegInstallerMock = ffmpegInstallerMock

// ═══════════════════════════════════════════════════════════════════════
// 13. PATCH Module._load
// ═══════════════════════════════════════════════════════════════════════
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return electronMock
  if (request === 'electron-store') return MockStoreClass
  if (request === 'fs' || request === 'node:fs') return fsForSource
  if (request === 'crypto' || request === 'node:crypto') return cryptoForSource
  if (request === 'os' || request === 'node:os') return osForSource
  if (request === 'child_process' || request === 'node:child_process')
    return childProcessForSource
  if (request === 'https' || request === 'node:https') return httpsForSource
  if (request === 'http' || request === 'node:http') return httpForSource
  if (request === 'adm-zip') return AdmZipMock
  if (request === 'archiver') return archiverMock
  if (request === 'unzipper') return unzipperMock
  if (request === '@ffmpeg-installer/ffmpeg') return ffmpegInstallerMock

  // ✅ Intercepte require('./windowManager') appelé depuis ipcHandlers
  if (
    (request === './windowManager' || request === './windowManager.js') &&
    parent?.filename?.includes('ipcHandlers')
  ) {
    return windowManagerMock
  }

  return originalLoad.call(this, request, parent, isMain)
}

// ═══════════════════════════════════════════════════════════════════════
// 14. RESET ENTRE TESTS
// ═══════════════════════════════════════════════════════════════════════
beforeEach(() => {
  const { ipcMain, globalShortcut } = electronMock

  ipcMain._handlers?.clear()
  ipcMain._listeners?.clear()
  ipcMain.handle?.mockClear?.()
  ipcMain.on?.mockClear?.()
  ipcMain.removeHandler?.mockClear?.()
  ipcMain.removeAllListeners?.mockClear?.()
  ipcMain.eventNames?.mockClear?.()
  ipcMain.listeners?.mockClear?.()

  globalShortcut?.register?.mockClear?.()
  globalShortcut?.unregister?.mockClear?.()
  globalShortcut?.unregisterAll?.mockClear?.()
  globalShortcut?.isRegistered?.mockClear?.()

  storeData.clear()
  storeMock.get.mockClear()
  storeMock.set.mockClear()
  storeMock.delete.mockClear()
  storeMock.has.mockClear()
  storeMock.clear.mockClear()

  // Reset fs mocks
  for (const key of Object.keys(fsMocks)) {
    const val = fsMocks[key]
    if (val && typeof val.mockReset === 'function') val.mockReset()
  }
  fsMocks.promises.stat.mockReset()
  fsMocks.unlink.mockReset().mockImplementation((p, cb) => cb?.())
  fsMocks.createWriteStream
    .mockReset()
    .mockImplementation(() => new MockWriteStream())
  fsMocks.createReadStream
    .mockReset()
    .mockImplementation(() => ({ pipe: (dest) => dest }))

  // Reset crypto
  uuidCounter = 0
  cryptoMocks.randomUUID.mockClear()

  // Reset os mocks
  osMocks.type.mockReset().mockReturnValue('Linux')
  osMocks.release.mockReset().mockReturnValue('5.15.0-test')
  osMocks.cpus.mockReset().mockReturnValue([{ model: 'Test CPU Model' }])
  osMocks.totalmem.mockReset().mockReturnValue(16 * 1024 * 1024 * 1024)

  // Reset child_process
  childProcessMocks.execFile.mockReset().mockImplementation((file, args, opts, cb) => {
    process.nextTick(() => cb(null, '', ''))
    return { on: vi.fn(), kill: vi.fn() }
  })
  childProcessMocks.execSync.mockReset().mockReturnValue('')

  // Reset https / http
  httpsMocks.get.mockClear()
  httpMocks.get.mockClear()
  httpsResponseHandler = null
  httpResponseHandler = null

  // Reset AdmZip
  admZipGetEntryOverride = null

  // Reset archiver / unzipper
  archiverMock.mockClear()
  unzipperMock.Extract.mockClear()

  // Reset windowManager mock
  windowManagerMock.getMainWindow.mockReset().mockReturnValue(null)
  windowManagerMock.showMainWindow.mockReset()
  windowManagerMock.hideMainWindow.mockReset()
  windowManagerMock.focusMainWindow.mockReset()
  windowManagerMock.isWindowVisible.mockReset().mockReturnValue(true)
  windowManagerMock.setQuitting.mockReset()
  windowManagerMock.setPendingQuit.mockReset()
  windowManagerMock.setCloseToTray.mockReset()
  windowManagerMock.getCloseToTray.mockReset().mockReturnValue(true)
  windowManagerMock.getIsQuitting.mockReset().mockReturnValue(false)
  windowManagerMock.getPendingQuit.mockReset().mockReturnValue(false)
  windowManagerMock.cleanupWindow.mockReset()
  windowManagerMock.createWindow.mockReset()
})

afterEach(() => {
  delete globalThis.__updateTrayCallback
})

// Expose les classes de mock pour les tests
globalThis.__MockWriteStream = MockWriteStream
globalThis.__MockArchiver = MockArchiver