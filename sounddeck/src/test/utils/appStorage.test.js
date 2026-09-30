import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Spy logger pour éviter le bruit ────────────────────────────────────
vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('appStorage', () => {
  let electronMock
  let appStorage

  beforeEach(async () => {
    // ✅ Reset le cache module → migrationDone repart à false
    vi.resetModules()

    electronMock = {
      storeGet: vi.fn().mockImplementation((key) => {
        // Skip la migration par défaut
        if (key === 'sounddeck_appStorage_migrated') return Promise.resolve(true)
        return Promise.resolve(undefined)
      }),
      storeSet: vi.fn().mockResolvedValue(),
      storeDelete: vi.fn().mockResolvedValue(),
    }
    window.electronAPI = electronMock

    // Reset localStorage mock (ne persiste pas entre les tests)
    localStorage.getItem.mockReset()
    localStorage.setItem.mockReset()
    localStorage.removeItem.mockReset()
    localStorage.getItem.mockReturnValue(null)

    // ✅ Import dynamique APRÈS resetModules
    appStorage = await import('@shared/utils/appStorage')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getItem ─────────────────────────────────────────────────────────

  describe('getItem', () => {
    it('devrait retourner la valeur du store si elle existe', async () => {
      electronMock.storeGet.mockImplementation((key) => {
        if (key === 'appStorage.myKey') return Promise.resolve('stored-value')
        if (key === 'sounddeck_appStorage_migrated') return Promise.resolve(true)
        return Promise.resolve(undefined)
      })

      const result = await appStorage.getItem('myKey')

      expect(result).toBe('stored-value')
      expect(electronMock.storeGet).toHaveBeenCalledWith('appStorage.myKey')
    })

    it('devrait préfixer la clé avec "appStorage."', async () => {
      await appStorage.getItem('userTheme')
      expect(electronMock.storeGet).toHaveBeenCalledWith('appStorage.userTheme')
    })

    it('devrait retourner null si ni store ni localStorage', async () => {
      const result = await appStorage.getItem('missing')
      expect(result).toBeNull()
    })

    it('devrait migrer depuis localStorage si store vide', async () => {
      electronMock.storeGet.mockImplementation((key) => {
        if (key === 'appStorage.legacyKey') return Promise.resolve(undefined)
        if (key === 'sounddeck_appStorage_migrated') return Promise.resolve(true)
        return Promise.resolve(undefined)
      })
      localStorage.getItem.mockImplementation((k) =>
        k === 'legacyKey' ? 'legacy-value' : null
      )

      const result = await appStorage.getItem('legacyKey')

      expect(result).toBe('legacy-value')
      expect(electronMock.storeSet).toHaveBeenCalledWith(
        'appStorage.legacyKey',
        'legacy-value'
      )
      expect(localStorage.removeItem).toHaveBeenCalledWith('legacyKey')
    })

    it('devrait gérer une erreur storeGet sans planter', async () => {
      electronMock.storeGet.mockRejectedValue(new Error('store error'))

      const result = await appStorage.getItem('key')
      expect(result).toBeNull()
    })
  })

  // ─── setItem ─────────────────────────────────────────────────────────

  describe('setItem', () => {
    it('devrait stringifier les objets', async () => {
      await appStorage.setItem('obj', { a: 1, b: 'test' })

      expect(electronMock.storeSet).toHaveBeenCalledWith(
        'appStorage.obj',
        '{"a":1,"b":"test"}'
      )
    })

    it('devrait convertir les nombres en string', async () => {
      await appStorage.setItem('num', 42)
      expect(electronMock.storeSet).toHaveBeenCalledWith('appStorage.num', '42')
    })

    it('devrait convertir les booleans en string', async () => {
      await appStorage.setItem('bool', true)
      expect(electronMock.storeSet).toHaveBeenCalledWith('appStorage.bool', 'true')
    })

    it('devrait garder les strings tel quel', async () => {
      await appStorage.setItem('str', 'hello')
      expect(electronMock.storeSet).toHaveBeenCalledWith('appStorage.str', 'hello')
    })

    it('devrait gérer null (stocké tel quel)', async () => {
      await appStorage.setItem('nil', null)
      expect(electronMock.storeSet).toHaveBeenCalledWith('appStorage.nil', null)
    })
  })

  // ─── removeItem ──────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('devrait appeler storeDelete + localStorage.removeItem', async () => {
      await appStorage.removeItem('myKey')

      expect(electronMock.storeDelete).toHaveBeenCalledWith('appStorage.myKey')
      expect(localStorage.removeItem).toHaveBeenCalledWith('myKey')
    })
  })

  // ─── getBoolean ──────────────────────────────────────────────────────

  describe('getBoolean', () => {
    it('devrait retourner true pour la string "true"', async () => {
      electronMock.storeGet.mockImplementation((key) => {
        if (key === 'appStorage.b') return Promise.resolve('true')
        return Promise.resolve(true)
      })
      expect(await appStorage.getBoolean('b')).toBe(true)
    })

    it('devrait retourner false pour la string "false"', async () => {
      electronMock.storeGet.mockImplementation((key) => {
        if (key === 'appStorage.b') return Promise.resolve('false')
        return Promise.resolve(true)
      })
      expect(await appStorage.getBoolean('b')).toBe(false)
    })

    it('devrait retourner la valeur par défaut si absent', async () => {
      expect(await appStorage.getBoolean('missing', true)).toBe(true)
      expect(await appStorage.getBoolean('missing', false)).toBe(false)
    })

    it('devrait retourner la valeur boolean brute si elle est déjà boolean', async () => {
      electronMock.storeGet.mockImplementation((key) => {
        if (key === 'appStorage.b') return Promise.resolve(true)
        return Promise.resolve(true)
      })
      expect(await appStorage.getBoolean('b')).toBe(true)
    })
  })

  // ─── getNumber ───────────────────────────────────────────────────────

  describe('getNumber', () => {
    it('devrait retourner un nombre valide', async () => {
      electronMock.storeGet.mockImplementation((key) => {
        if (key === 'appStorage.n') return Promise.resolve('42')
        return Promise.resolve(true)
      })
      expect(await appStorage.getNumber('n')).toBe(42)
    })

    it('devrait retourner la valeur par défaut si absent', async () => {
      expect(await appStorage.getNumber('missing', 10)).toBe(10)
    })

    it('devrait retourner la valeur par défaut pour NaN', async () => {
      electronMock.storeGet.mockImplementation((key) => {
        if (key === 'appStorage.n') return Promise.resolve('not-a-number')
        return Promise.resolve(true)
      })
      expect(await appStorage.getNumber('n', 5)).toBe(5)
    })
  })
})