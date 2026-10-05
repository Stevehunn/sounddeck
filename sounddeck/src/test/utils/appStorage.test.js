// src/test/utils/appStorage.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

let storeData

beforeEach(() => {
  storeData = {}
  localStorage.clear()

  // Mock localStorage plus complet que dans setup global
  const lsData = {}
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((k) => (k in lsData ? lsData[k] : null)),
      setItem: vi.fn((k, v) => { lsData[k] = String(v) }),
      removeItem: vi.fn((k) => { delete lsData[k] }),
      clear: vi.fn(() => { Object.keys(lsData).forEach((k) => delete lsData[k]) }),
      key: vi.fn((i) => Object.keys(lsData)[i] ?? null),
      get length() { return Object.keys(lsData).length },
      _data: lsData,
    },
    writable: true,
    configurable: true,
  })

  global.window.electronAPI = {
    storeGet: vi.fn((key) => Promise.resolve(storeData[key] ?? undefined)),
    storeSet: vi.fn((key, val) => {
      storeData[key] = val
      return Promise.resolve()
    }),
    storeDelete: vi.fn((key) => {
      delete storeData[key]
      return Promise.resolve()
    }),
  }
})

// Reset module à chaque test pour repartir d'un état propre
// (car appStorage a un `migrationDone` module-level)
const freshImport = async () => {
  vi.resetModules()
  return await import('@shared/utils/appStorage')
}

// ═══════════════════════════════════════════════════════════════════════
// getItem / setItem / removeItem
// ═══════════════════════════════════════════════════════════════════════
describe('appStorage > getItem', () => {
  it('retourne la valeur du store si présente', async () => {
    storeData['appStorage.lang'] = 'fr'
    const { getItem } = await freshImport()
    const v = await getItem('lang')
    expect(v).toBe('fr')
  })

  it('retourne null si absent', async () => {
    const { getItem } = await freshImport()
    expect(await getItem('unknown')).toBeNull()
  })

  it('préfixe la clé avec "appStorage."', async () => {
    const { getItem } = await freshImport()
    await getItem('myKey')
    expect(window.electronAPI.storeGet).toHaveBeenCalledWith('appStorage.myKey')
  })

  it('migre depuis localStorage si store vide', async () => {
    localStorage.setItem('myKey', 'legacy-value')
    const { getItem } = await freshImport()
    const v = await getItem('myKey')
    expect(v).toBe('legacy-value')
    expect(window.electronAPI.storeSet).toHaveBeenCalledWith(
      'appStorage.myKey',
      'legacy-value'
    )
  })
})

describe('appStorage > setItem', () => {
  it('stocke une string telle quelle', async () => {
    const { setItem } = await freshImport()
    await setItem('foo', 'bar')
    expect(storeData['appStorage.foo']).toBe('bar')
  })

  it('stringify les objets', async () => {
    const { setItem } = await freshImport()
    await setItem('obj', { a: 1 })
    expect(storeData['appStorage.obj']).toBe('{"a":1}')
  })

  it('stringify les nombres', async () => {
    const { setItem } = await freshImport()
    await setItem('num', 42)
    expect(storeData['appStorage.num']).toBe('42')
  })

  it('stringify les booléens', async () => {
    const { setItem } = await freshImport()
    await setItem('flag', true)
    expect(storeData['appStorage.flag']).toBe('true')
  })

  it('gère les objets cycliques (fallback String)', async () => {
    const cyclic = { a: 1 }
    cyclic.self = cyclic
    const { setItem } = await freshImport()
    await setItem('cyclic', cyclic)
    expect(storeData['appStorage.cyclic']).toBeDefined()
  })
})

describe('appStorage > removeItem', () => {
  it('supprime du store', async () => {
    storeData['appStorage.x'] = 'val'
    const { removeItem } = await freshImport()
    await removeItem('x')
    expect(storeData['appStorage.x']).toBeUndefined()
  })

  it('supprime aussi du localStorage', async () => {
    localStorage.setItem('x', 'legacy')
    const { removeItem } = await freshImport()
    await removeItem('x')
    expect(localStorage.getItem('x')).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// getBoolean / getNumber
// ═══════════════════════════════════════════════════════════════════════
describe('appStorage > getBoolean', () => {
  it('retourne true si valeur "true"', async () => {
    storeData['appStorage.flag'] = 'true'
    const { getBoolean } = await freshImport()
    expect(await getBoolean('flag')).toBe(true)
  })

  it('retourne false si valeur "false"', async () => {
    storeData['appStorage.flag'] = 'false'
    const { getBoolean } = await freshImport()
    expect(await getBoolean('flag')).toBe(false)
  })

  it('retourne le booléen brut si déjà bool', async () => {
    storeData['appStorage.flag'] = true
    const { getBoolean } = await freshImport()
    expect(await getBoolean('flag')).toBe(true)
  })

  it('retourne defaultValue si absent', async () => {
    const { getBoolean } = await freshImport()
    expect(await getBoolean('missing', true)).toBe(true)
    expect(await getBoolean('missing')).toBe(false)
  })
})

describe('appStorage > getNumber', () => {
  it('retourne un nombre parsé', async () => {
    storeData['appStorage.count'] = '42'
    const { getNumber } = await freshImport()
    expect(await getNumber('count')).toBe(42)
  })

  it('retourne defaultValue si non-fini', async () => {
    storeData['appStorage.bad'] = 'not-a-number'
    const { getNumber } = await freshImport()
    expect(await getNumber('bad', 99)).toBe(99)
  })

  it('retourne defaultValue si absent', async () => {
    const { getNumber } = await freshImport()
    expect(await getNumber('missing', 5)).toBe(5)
  })

  it('retourne 0 par défaut', async () => {
    const { getNumber } = await freshImport()
    expect(await getNumber('missing')).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Migration localStorage
// ═══════════════════════════════════════════════════════════════════════
describe('appStorage > Migration', () => {
  it('ne migre pas si flag déjà présent', async () => {
    storeData['sounddeck_appStorage_migrated'] = true
    localStorage.setItem('sounddeck-old', 'val')
    const { getItem } = await freshImport()
    await getItem('any')
    // L'ancienne clé n'a PAS été supprimée
    expect(localStorage.getItem('sounddeck-old')).toBe('val')
  })

  it('migre les clés sounddeck* en une fois', async () => {
    localStorage.setItem('sounddeck-tutorial-home-done', 'true')
    localStorage.setItem('sounddeck-error-logs', '[1,2]')
    const { getItem } = await freshImport()
    await getItem('any')

    expect(storeData['sounddeck_appStorage_migrated']).toBe(true)
    expect(window.electronAPI.storeSet).toHaveBeenCalledWith(
      'appStorage.sounddeck-tutorial-home-done',
      'true'
    )
  })

  it('migre autoTheme et myinstants_selected_categories', async () => {
    localStorage.setItem('autoTheme', 'dark')
    localStorage.setItem('myinstants_selected_categories', '[1,2]')
    const { getItem } = await freshImport()
    await getItem('any')

    expect(storeData['appStorage.autoTheme']).toBe('dark')
    expect(storeData['appStorage.myinstants_selected_categories']).toBe('[1,2]')
  })

  it('ignore les autres clés localStorage', async () => {
    localStorage.setItem('unrelated_key', 'val')
    const { getItem } = await freshImport()
    await getItem('any')
    // unrelated_key n'a PAS été migré
    expect(storeData['appStorage.unrelated_key']).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Robustesse
// ═══════════════════════════════════════════════════════════════════════
describe('appStorage > Robustesse', () => {
  it('getItem retourne null si storeGet throw', async () => {
    window.electronAPI.storeGet.mockRejectedValueOnce(new Error('boom'))
    const { getItem } = await freshImport()
    expect(await getItem('x')).toBeNull()
  })

  it('setItem ne crash pas si storeSet throw', async () => {
    window.electronAPI.storeSet.mockRejectedValueOnce(new Error('boom'))
    const { setItem } = await freshImport()
    await expect(setItem('x', 'val')).resolves.toBeUndefined()
  })

  it('removeItem ne crash pas si storeDelete throw', async () => {
    window.electronAPI.storeDelete.mockRejectedValueOnce(new Error('boom'))
    const { removeItem } = await freshImport()
    await expect(removeItem('x')).resolves.toBeUndefined()
  })

  it('getItem ne crash pas si localStorage.getItem throw', async () => {
    window.electronAPI.storeGet.mockResolvedValueOnce(undefined)
    localStorage.getItem.mockImplementationOnce(() => {
      throw new Error('quota')
    })
    const { getItem } = await freshImport()
    await expect(getItem('x')).resolves.toBeNull()
  })
})