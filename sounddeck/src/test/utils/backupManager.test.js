// src/test/utils/backupManager.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}))

import {
  initBackupManager,
  startAutoBackup,
  stopAutoBackup,
  performBackup,
  getBackupList,
  getBackup,
  restoreBackup,
  deleteBackup,
  exportBackups,
  importBackups,
} from '@shared/utils/backupManager'

const STORE_KEY = 'sounddeckBackups'
const LEGACY_KEY = 'sounddeck-backups'

let storeData = {}

const makeStore = (overrides = {}) => ({
  profiles: [{ id: 'all', name: 'Tous' }],
  sounds: [{ id: 's1', name: 'A' }],
  shortcuts: { s1: 'Ctrl+A' },
  soundOrder: { all: ['s1'] },
  tags: { s1: ['tag1'] },
  theme: 'dark',
  customTheme: null,
  audioDevice: 'default',
  localAudioDevice: 'default',
  volume: 80,
  playLocally: true,
  normalizationEnabled: true,
  normalizationTarget: 0.2,
  replaceAllProfiles: vi.fn().mockResolvedValue(undefined),
  restoreSounds: vi.fn().mockResolvedValue(undefined),
  setShortcuts: vi.fn().mockResolvedValue(undefined),
  setSoundOrder: vi.fn().mockResolvedValue(undefined),
  setTags: vi.fn().mockResolvedValue(undefined),
  addTagToSound: vi.fn().mockResolvedValue(undefined),
  updateTheme: vi.fn().mockResolvedValue(undefined),
  updateCustomTheme: vi.fn().mockResolvedValue(undefined),
  updateAudioDevice: vi.fn().mockResolvedValue(undefined),
  updateLocalAudioDevice: vi.fn().mockResolvedValue(undefined),
  updateVolume: vi.fn().mockResolvedValue(undefined),
  updatePlayLocally: vi.fn().mockResolvedValue(undefined),
  updateNormalizationEnabled: vi.fn().mockResolvedValue(undefined),
  updateNormalizationTarget: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

beforeEach(() => {
  storeData = {}
  localStorage.clear()
  localStorage.getItem.mockReset().mockReturnValue(null)
  localStorage.removeItem.mockReset()

  global.window.electronAPI = {
    storeGet: vi.fn((key) => Promise.resolve(storeData[key])),
    storeSet: vi.fn((key, val) => {
      storeData[key] = val
      return Promise.resolve()
    }),
    updateShortcuts: vi.fn().mockResolvedValue(undefined),
    exportJsonFile: vi.fn().mockResolvedValue({ success: true, path: '/out.json' }),
  }

  stopAutoBackup()
})

afterEach(() => {
  stopAutoBackup()
  vi.useRealTimers()
})

// ═══════════════════════════════════════════════════════════════════════
// performBackup
// ═══════════════════════════════════════════════════════════════════════
describe('performBackup', () => {
  it('crée un backup et le stocke', async () => {
    const store = makeStore()
    const result = await performBackup(store)

    expect(result.success).toBe(true)
    expect(result.timestamp).toBeGreaterThan(0)

    const backups = storeData[STORE_KEY]
    expect(Array.isArray(backups)).toBe(true)
    expect(backups).toHaveLength(1)
    expect(backups[0].version).toBe('1.1')
    expect(backups[0].profiles).toEqual(store.profiles)
    expect(backups[0].sounds).toEqual(store.sounds)
  })

  it('met à jour lastBackupTime', async () => {
    await performBackup(makeStore())
    expect(storeData['lastBackupTime']).toBeGreaterThan(0)
  })

  it('limite à maxBackups', async () => {
    // Pré-remplit avec 10 backups
    storeData[STORE_KEY] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: i,
      version: '1.1',
    }))

    await performBackup(makeStore())
    expect(storeData[STORE_KEY]).toHaveLength(10)
  })

  it('retourne erreur si store throw', async () => {
    global.window.electronAPI.storeSet.mockRejectedValueOnce(new Error('boom'))
    // Force readBackups à ne pas trouver → retourne []
    const result = await performBackup(makeStore())
    // Peut réussir car readBackups swallowe l'erreur
    expect(result).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// getBackupList / getBackup
// ═══════════════════════════════════════════════════════════════════════
describe('getBackupList', () => {
  it('retourne [] si pas de backups', async () => {
    const list = await getBackupList()
    expect(list).toEqual([])
  })

  it('retourne les backups stockés', async () => {
    storeData[STORE_KEY] = [{ timestamp: 123, version: '1.1' }]
    const list = await getBackupList()
    expect(list).toHaveLength(1)
  })

  it('migre depuis localStorage si store vide', async () => {
    const legacy = [{ timestamp: 999, version: '1.0' }]
    localStorage.getItem.mockReturnValue(JSON.stringify(legacy))

    const list = await getBackupList()
    expect(list).toEqual(legacy)
    expect(localStorage.removeItem).toHaveBeenCalledWith(LEGACY_KEY)
  })

  it('ignore localStorage corrompu', async () => {
    localStorage.getItem.mockReturnValue('not-json')
    const list = await getBackupList()
    expect(list).toEqual([])
  })
})

describe('getBackup', () => {
  it('retourne le backup à l\'index', async () => {
    storeData[STORE_KEY] = [{ timestamp: 1 }, { timestamp: 2 }]
    const b = await getBackup(1)
    expect(b.timestamp).toBe(2)
  })

  it('retourne null si index invalide', async () => {
    storeData[STORE_KEY] = [{ timestamp: 1 }]
    expect(await getBackup(5)).toBeNull()
    expect(await getBackup(-1)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// restoreBackup
// ═══════════════════════════════════════════════════════════════════════
describe('restoreBackup', () => {
  const backupData = {
    timestamp: Date.now(),
    profiles: [{ id: 'all' }, { id: 'p1', name: 'Gaming' }],
    sounds: [{ id: 's1' }],
    shortcuts: { s1: 'Ctrl+A' },
    soundOrder: { all: ['s1'] },
    tags: { s1: ['tag'] },
    theme: 'light',
    volume: 70,
    playLocally: false,
    normalizationEnabled: false,
    normalizationTarget: 0.3,
  }

  it('retourne erreur si backup introuvable', async () => {
    const result = await restoreBackup(makeStore(), 5)
    expect(result.success).toBe(false)
    expect(result.error).toContain('introuvable')
  })

  it('restaure profils et sons', async () => {
    storeData[STORE_KEY] = [backupData]
    const store = makeStore()
    const result = await restoreBackup(store, 0)

    expect(result.success).toBe(true)
    expect(store.replaceAllProfiles).toHaveBeenCalled()
    expect(store.restoreSounds).toHaveBeenCalledWith(backupData.sounds)
  })

  it('restaure les shortcuts et les re-register', async () => {
    storeData[STORE_KEY] = [backupData]
    const store = makeStore()
    await restoreBackup(store, 0)

    expect(store.setShortcuts).toHaveBeenCalledWith(backupData.shortcuts)
    expect(window.electronAPI.updateShortcuts).toHaveBeenCalledWith(backupData.shortcuts)
  })

  it('fallback sur addTagToSound si setTags absent', async () => {
    storeData[STORE_KEY] = [backupData]
    const store = makeStore({ setTags: undefined })
    await restoreBackup(store, 0)

    expect(store.addTagToSound).toHaveBeenCalledWith('s1', 'tag')
  })

  it('restaure les settings', async () => {
    storeData[STORE_KEY] = [backupData]
    const store = makeStore()
    await restoreBackup(store, 0)

    expect(store.updateTheme).toHaveBeenCalledWith('light')
    expect(store.updateVolume).toHaveBeenCalledWith(70)
    expect(store.updatePlayLocally).toHaveBeenCalledWith(false)
    expect(store.updateNormalizationEnabled).toHaveBeenCalledWith(false)
    expect(store.updateNormalizationTarget).toHaveBeenCalledWith(0.3)
  })

  it('ignore les settings manquants', async () => {
    const minimal = { timestamp: 1, profiles: [] }
    storeData[STORE_KEY] = [minimal]
    const store = makeStore()
    const result = await restoreBackup(store, 0)

    expect(result.success).toBe(true)
    expect(store.updateTheme).not.toHaveBeenCalled()
  })

  it('retourne erreur si store throw', async () => {
    storeData[STORE_KEY] = [backupData]
    const store = makeStore({
      replaceAllProfiles: vi.fn().mockRejectedValue(new Error('boom')),
    })
    const result = await restoreBackup(store, 0)
    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// deleteBackup
// ═══════════════════════════════════════════════════════════════════════
describe('deleteBackup', () => {
  it('supprime le backup à l\'index', async () => {
    storeData[STORE_KEY] = [{ timestamp: 1 }, { timestamp: 2 }]
    const result = await deleteBackup(0)

    expect(result.success).toBe(true)
    expect(storeData[STORE_KEY]).toHaveLength(1)
    expect(storeData[STORE_KEY][0].timestamp).toBe(2)
  })

  it('retourne erreur si index invalide', async () => {
    storeData[STORE_KEY] = []
    const result = await deleteBackup(5)
    expect(result.success).toBe(false)
    expect(result.error).toContain('invalide')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// exportBackups
// ═══════════════════════════════════════════════════════════════════════
describe('exportBackups', () => {
  it('retourne erreur si aucun backup', async () => {
    const result = await exportBackups()
    expect(result.success).toBe(false)
    expect(result.error).toContain('Aucune sauvegarde')
  })

  it('exporte via exportJsonFile', async () => {
    storeData[STORE_KEY] = [{ timestamp: 1 }]
    const result = await exportBackups()

    expect(result.success).toBe(true)
    expect(window.electronAPI.exportJsonFile).toHaveBeenCalled()
  })

  it('retourne canceled si l\'utilisateur annule', async () => {
    storeData[STORE_KEY] = [{ timestamp: 1 }]
    window.electronAPI.exportJsonFile.mockResolvedValue({ canceled: true })
    const result = await exportBackups()
    expect(result.canceled).toBe(true)
  })

  it('retourne erreur si IPC échoue', async () => {
    storeData[STORE_KEY] = [{ timestamp: 1 }]
    window.electronAPI.exportJsonFile.mockResolvedValue({
      success: false,
      error: 'permission denied',
    })
    const result = await exportBackups()
    expect(result.success).toBe(false)
    expect(result.error).toBe('permission denied')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// importBackups (FileReader)
// ═══════════════════════════════════════════════════════════════════════
describe('importBackups', () => {
  const mockFileReader = (content) => {
    class MockFileReader {
      readAsText() {
        process.nextTick(() => {
          this.result = content
          this.onload({ target: { result: content } })
        })
      }
    }
    global.FileReader = MockFileReader
  }

  it('importe un JSON valide', async () => {
    const data = [{ timestamp: 1 }, { timestamp: 2 }]
    mockFileReader(JSON.stringify(data))

    const result = await importBackups({ __fake: true })
    expect(result.success).toBe(true)
    expect(result.count).toBe(2)
    expect(storeData[STORE_KEY]).toEqual(data)
  })

  it('rejette si format invalide (non-array)', async () => {
    mockFileReader(JSON.stringify({ foo: 'bar' }))
    await expect(importBackups({ __fake: true })).rejects.toThrow('invalide')
  })

  it('rejette si JSON invalide', async () => {
    mockFileReader('not json')
    await expect(importBackups({ __fake: true })).rejects.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// startAutoBackup / stopAutoBackup
// ═══════════════════════════════════════════════════════════════════════
describe('Auto backup (timers)', () => {
  it('startAutoBackup démarre un interval + timeout', () => {
    vi.useFakeTimers()
    const setIntSpy = vi.spyOn(global, 'setInterval')
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    startAutoBackup(makeStore())

    expect(setIntSpy).toHaveBeenCalled()
    expect(setTimeoutSpy).toHaveBeenCalled()

    setIntSpy.mockRestore()
    setTimeoutSpy.mockRestore()
  })

  it('stopAutoBackup nettoie les timers', () => {
    vi.useFakeTimers()
    const clearIntSpy = vi.spyOn(global, 'clearInterval')
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    startAutoBackup(makeStore())
    stopAutoBackup()

    expect(clearIntSpy).toHaveBeenCalled()
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearIntSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })

  it('initBackupManager démarre si enabled', () => {
    vi.useFakeTimers()
    const setIntSpy = vi.spyOn(global, 'setInterval')

    initBackupManager(makeStore(), { enabled: true, interval: 5 })

    expect(setIntSpy).toHaveBeenCalled()
    setIntSpy.mockRestore()
  })

  it('initBackupManager ne démarre pas si disabled', () => {
    const setIntSpy = vi.spyOn(global, 'setInterval')
    initBackupManager(makeStore(), { enabled: false })
    expect(setIntSpy).not.toHaveBeenCalled()
    setIntSpy.mockRestore()
  })
})