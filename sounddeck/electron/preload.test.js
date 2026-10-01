// electron/preload.test.js
import { describe, it, expect, beforeAll, vi } from 'vitest'

// ✅ Safety net : window/File doivent exister AVANT le moindre import de preload.
//    (Redondant avec setup-electron.js mais garantit l'ordre.)
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File {}
}

describe('preload.js (electron)', () => {
  let contextBridge
  let ipcRenderer
  let exposedApi
  let exposeCalls

  beforeAll(async () => {
    const electron = globalThis.__electronMock
    contextBridge = electron.contextBridge
    ipcRenderer = electron.ipcRenderer

    // Clear avant import
    contextBridge.exposeInMainWorld.mockClear()
    ipcRenderer.invoke.mockClear()

    // Charge preload (exécute ses side-effects)
    await import('./preload')

    exposeCalls = contextBridge.exposeInMainWorld.mock.calls.slice()
    exposedApi = exposeCalls[0]?.[1]
  })

  // ═══════════════════════════════════════════════════════════════════
  // Exposition de l'API
  // ═══════════════════════════════════════════════════════════════════

  it('devrait appeler contextBridge.exposeInMainWorld', () => {
    expect(exposeCalls.length).toBeGreaterThan(0)
  })

  it('devrait exposer sous le nom "electronAPI"', () => {
    expect(exposeCalls[0][0]).toBe('electronAPI')
  })

  it('devrait exposer un objet', () => {
    expect(typeof exposedApi).toBe('object')
    expect(exposedApi).not.toBeNull()
  })

  // ═══════════════════════════════════════════════════════════════════
  // API Fichiers
  // ═══════════════════════════════════════════════════════════════════

  it('devrait exposer openFileDialog, openImageDialog, etc.', () => {
    expect(typeof exposedApi.openFileDialog).toBe('function')
    expect(typeof exposedApi.openImageDialog).toBe('function')
    expect(typeof exposedApi.importSoundFile).toBe('function')
    expect(typeof exposedApi.importImageFile).toBe('function')
    expect(typeof exposedApi.downloadSoundUrl).toBe('function')
    expect(typeof exposedApi.trimSoundFile).toBe('function')
    expect(typeof exposedApi.deleteSoundFile).toBe('function')
    expect(typeof exposedApi.getSoundsDir).toBe('function')
    expect(typeof exposedApi.fileExists).toBe('function')
    expect(typeof exposedApi.writeDroppedFile).toBe('function')
    expect(typeof exposedApi.exportJsonFile).toBe('function')
  })

  // ═══════════════════════════════════════════════════════════════════
  // API Store
  // ═══════════════════════════════════════════════════════════════════

  it('devrait exposer storeGet/storeSet/storeDelete/storeSetLang', () => {
    expect(typeof exposedApi.storeGet).toBe('function')
    expect(typeof exposedApi.storeSet).toBe('function')
    expect(typeof exposedApi.storeDelete).toBe('function')
    expect(typeof exposedApi.storeSetLang).toBe('function')
  })

  it('storeGet devrait appeler ipcRenderer.invoke("store-get", key)', () => {
    ipcRenderer.invoke.mockClear()
    exposedApi.storeGet('lang')
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('store-get', 'lang')
  })

  it('storeSet devrait appeler ipcRenderer.invoke("store-set", key, value)', () => {
    ipcRenderer.invoke.mockClear()
    exposedApi.storeSet('theme', 'dark')
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('store-set', 'theme', 'dark')
  })

  it('storeDelete devrait appeler ipcRenderer.invoke("store-delete", key)', () => {
    ipcRenderer.invoke.mockClear()
    exposedApi.storeDelete('theme')
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('store-delete', 'theme')
  })

  // ═══════════════════════════════════════════════════════════════════
  // API Raccourcis
  // ═══════════════════════════════════════════════════════════════════

  it('devrait exposer les fonctions de raccourcis', () => {
    expect(typeof exposedApi.updateShortcuts).toBe('function')
    expect(typeof exposedApi.updateProfileShortcut).toBe('function')
    expect(typeof exposedApi.updateLoopShortcut).toBe('function')
    expect(typeof exposedApi.updateStopAllShortcut).toBe('function')
    expect(typeof exposedApi.toggleGlobalShortcuts).toBe('function')
  })

  it('updateShortcuts devrait appeler ipcRenderer.invoke', () => {
    ipcRenderer.invoke.mockClear()
    const shortcuts = { 'sound-1': 'Ctrl+1' }
    exposedApi.updateShortcuts(shortcuts)
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('update-shortcuts', shortcuts)
  })

  // ═══════════════════════════════════════════════════════════════════
  // API Listeners (on)
  // ═══════════════════════════════════════════════════════════════════

  it('devrait exposer les listeners on*', () => {
    expect(typeof exposedApi.onPlaySound).toBe('function')
    expect(typeof exposedApi.onSwitchProfile).toBe('function')
    expect(typeof exposedApi.onToggleLoop).toBe('function')
    expect(typeof exposedApi.onStopAllSounds).toBe('function')
    expect(typeof exposedApi.onTogglePresentation).toBe('function')
    expect(typeof exposedApi.onShortcutsToggle).toBe('function')
    expect(typeof exposedApi.onShowQuitConfirm).toBe('function')
    expect(typeof exposedApi.onHideQuitConfirm).toBe('function')
  })

  it('onPlaySound devrait enregistrer un listener via ipcRenderer.on', () => {
    ipcRenderer.on.mockClear()
    const cb = () => {}
    exposedApi.onPlaySound(cb)
    expect(ipcRenderer.on).toHaveBeenCalledWith('play-sound', expect.any(Function))
  })

  it('onPlaySound devrait passer le soundId au callback', () => {
    ipcRenderer.on.mockClear()
    const cb = vi.fn()
    exposedApi.onPlaySound(cb)

    const [, listener] = ipcRenderer.on.mock.calls[0]
    listener({}, 'sound-42')
    expect(cb).toHaveBeenCalledWith('sound-42')
  })

  it('onShortcutsToggle devrait passer le boolean au callback', () => {
    ipcRenderer.on.mockClear()
    const cb = vi.fn()
    exposedApi.onShortcutsToggle(cb)

    const [, listener] = ipcRenderer.on.mock.calls[0]
    listener({}, true)
    expect(cb).toHaveBeenCalledWith(true)
  })

  // ═══════════════════════════════════════════════════════════════════
  // API Système / Plugins / Éditeur
  // ═══════════════════════════════════════════════════════════════════

  it('devrait exposer les fonctions système', () => {
    expect(typeof exposedApi.quitApp).toBe('function')
    expect(typeof exposedApi.hideWindow).toBe('function')
    expect(typeof exposedApi.showWindow).toBe('function')
    expect(typeof exposedApi.confirmQuit).toBe('function')
    expect(typeof exposedApi.getSystemLanguage).toBe('function')
  })

  it('devrait exposer les fonctions plugins', () => {
    expect(typeof exposedApi.getInstalledPlugins).toBe('function')
    expect(typeof exposedApi.getPluginPath).toBe('function')
    expect(typeof exposedApi.installPluginFromBuffer).toBe('function')
    expect(typeof exposedApi.uninstallPlugin).toBe('function')
  })

  it('devrait exposer les fonctions éditeur', () => {
    expect(typeof exposedApi.saveEditorProject).toBe('function')
    expect(typeof exposedApi.loadEditorProject).toBe('function')
    expect(typeof exposedApi.getAllEditorProjects).toBe('function')
    expect(typeof exposedApi.exportEditorProject).toBe('function')
  })

  it('devrait exposer les fonctions YouTube', () => {
    expect(typeof exposedApi.checkYtdlp).toBe('function')
    expect(typeof exposedApi.downloadYtdlp).toBe('function')
    expect(typeof exposedApi.youtubeInfo).toBe('function')
    expect(typeof exposedApi.youtubeDownload).toBe('function')
  })

  it('devrait exposer isElectron: true', () => {
    expect(exposedApi.isElectron).toBe(true)
  })
})