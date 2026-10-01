import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock appStorage ────────────────────────────────────────────────────
const { mockGetItem, mockSetItem } = vi.hoisted(() => ({
  mockGetItem: vi.fn().mockResolvedValue(null),
  mockSetItem: vi.fn().mockResolvedValue(),
}))

vi.mock('@shared/utils/appStorage', () => ({
  getItem: mockGetItem,
  setItem: mockSetItem,
}))

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('useMyInstantsCache', () => {
  let cache

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockGetItem.mockResolvedValue(null)
    cache = await import('./useMyInstantsCache')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── ensureCacheLoaded ────────────────────────────────────────────────

  describe('ensureCacheLoaded', () => {
    it('devrait charger le cache depuis le store', async () => {
      mockGetItem.mockResolvedValue(
        JSON.stringify({
          trending: {
            sounds: [{ id: 's1' }],
            fetchedAt: Date.now(),
          },
        })
      )

      await cache.ensureCacheLoaded()
      const result = cache.getCachedCategory('trending')
      expect(result).toEqual([{ id: 's1' }])
    })

    it('devrait ignorer les entrées expirées (> 24h)', async () => {
      const stale = Date.now() - 25 * 60 * 60 * 1000
      mockGetItem.mockResolvedValue(
        JSON.stringify({
          old: { sounds: [{ id: 's1' }], fetchedAt: stale },
        })
      )

      await cache.ensureCacheLoaded()
      expect(cache.getCachedCategory('old')).toBeNull()
    })

    it('ne devrait charger qu\'une seule fois', async () => {
      await cache.ensureCacheLoaded()
      await cache.ensureCacheLoaded()
      expect(mockGetItem).toHaveBeenCalledTimes(1)
    })

    it('devrait gérer une string non-JSON sans crash', async () => {
      mockGetItem.mockResolvedValue('not-json')
      await expect(cache.ensureCacheLoaded()).resolves.not.toThrow()
    })

    it('devrait gérer une valeur non-objet', async () => {
      mockGetItem.mockResolvedValue(JSON.stringify('hello'))
      await expect(cache.ensureCacheLoaded()).resolves.not.toThrow()
    })

    it('devrait ignorer les entrées sans sounds', async () => {
      mockGetItem.mockResolvedValue(
        JSON.stringify({
          bad: { fetchedAt: Date.now() },
        })
      )
      await cache.ensureCacheLoaded()
      expect(cache.getCachedCategory('bad')).toBeNull()
    })
  })

  // ─── getCachedCategory ────────────────────────────────────────────────

  describe('getCachedCategory', () => {
    it('devrait retourner null pour une catégorie absente', () => {
      expect(cache.getCachedCategory('unknown')).toBeNull()
    })

    it('devrait retourner les sons en cache', () => {
      const sounds = [{ id: 's1' }]
      cache.setCachedCategory('trending', sounds)
      expect(cache.getCachedCategory('trending')).toEqual(sounds)
    })

    it('devrait expirer les entrées après 24h', () => {
      cache.setCachedCategory('trending', [{ id: 's1' }])

      // Avance 25h
      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      expect(cache.getCachedCategory('trending')).toBeNull()
    })

    it('ne devrait PAS expirer avant 24h', () => {
      cache.setCachedCategory('trending', [{ id: 's1' }])
      vi.advanceTimersByTime(23 * 60 * 60 * 1000)
      expect(cache.getCachedCategory('trending')).not.toBeNull()
    })
  })

  // ─── setCachedCategory ────────────────────────────────────────────────

  describe('setCachedCategory', () => {
    it('devrait persister après debounce (1s)', async () => {
      cache.setCachedCategory('trending', [{ id: 's1' }])
      expect(mockSetItem).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1100)
      expect(mockSetItem).toHaveBeenCalled()
    })

    it('devrait accumuler plusieurs set dans le même debounce', async () => {
      cache.setCachedCategory('a', [{ id: 'a' }])
      cache.setCachedCategory('b', [{ id: 'b' }])
      cache.setCachedCategory('c', [{ id: 'c' }])

      await vi.advanceTimersByTimeAsync(1100)

      expect(mockSetItem).toHaveBeenCalledTimes(1)
      const payload = JSON.parse(mockSetItem.mock.calls[0][1])
      expect(Object.keys(payload).sort()).toEqual(['a', 'b', 'c'])
    })

    it('devrait gérer une erreur de storeSet sans crash', async () => {
      mockSetItem.mockRejectedValue(new Error('disk full'))
      cache.setCachedCategory('trending', [{ id: 's1' }])
      await expect(vi.advanceTimersByTimeAsync(1100)).resolves.not.toThrow()
    })
  })

  // ─── getCacheInfo ─────────────────────────────────────────────────────

  describe('getCacheInfo', () => {
    it('devrait retourner {} si cache vide', () => {
      expect(cache.getCacheInfo()).toEqual({})
    })

    it('devrait retourner le count par catégorie', () => {
      cache.setCachedCategory('a', [{ id: 'a' }, { id: 'b' }])
      cache.setCachedCategory('b', [{ id: 'c' }])

      const info = cache.getCacheInfo()
      expect(info.a.count).toBe(2)
      expect(info.b.count).toBe(1)
      expect(info.a.cached).toBe(true)
    })

    it('devrait ignorer les entrées expirées', () => {
      cache.setCachedCategory('a', [{ id: 'a' }])
      vi.advanceTimersByTime(25 * 60 * 60 * 1000)
      expect(cache.getCacheInfo()).toEqual({})
    })

    it('devrait exposer l\'âge de chaque entrée', () => {
      cache.setCachedCategory('a', [{ id: 'a' }])
      vi.advanceTimersByTime(1000)
      const info = cache.getCacheInfo()
      expect(info.a.age).toBeGreaterThanOrEqual(1000)
    })
  })
})