import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

// ⚠️ IMPORTANT : utiliser des emojis ABSENTS des défauts
// Les défauts incluent : 🦄 🦊 🐲 🐉 ⭐ 🌟 etc.
// Emojis custom safe : 🦥 🦦 🪆 🪐 🪅 🧋 🥷
describe('EmojiService', () => {
  let emojiService
  let electronMock

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    electronMock = {
      storeGet: vi.fn().mockResolvedValue(undefined),
      storeSet: vi.fn().mockResolvedValue(),
    }
    window.electronAPI = electronMock

    const mod = await import('@core/services/EmojiService')
    emojiService = mod.emojiService

    // Reset l'état interne
    emojiService.customEmojis = []
    emojiService.metadata = {}
    emojiService.listeners.clear()
    emojiService.loaded = false
    emojiService.loadingPromise = null
  })

  // ─── load ─────────────────────────────────────────────────────────────

  describe('load', () => {
    it('devrait charger les emojis depuis le store', async () => {
      electronMock.storeGet.mockImplementation((key) => {
        if (key === 'customEmojis') return Promise.resolve(['🦥', '🦦'])
        if (key === 'emojiMetadata') return Promise.resolve({ '🦥': { category: 'animals' } })
        return Promise.resolve(undefined)
      })

      await emojiService.load()

      expect(emojiService.customEmojis).toEqual(['🦥', '🦦'])
      expect(emojiService.metadata['🦥'].category).toBe('animals')
      expect(emojiService.loaded).toBe(true)
    })

    it('ne devrait charger qu\'une seule fois', async () => {
      await emojiService.load()
      await emojiService.load()
      expect(electronMock.storeGet).toHaveBeenCalledTimes(2)
    })

    it('devrait gérer une erreur de store sans planter', async () => {
      electronMock.storeGet.mockRejectedValue(new Error('boom'))
      await emojiService.load()
      expect(emojiService.loaded).toBe(true)
    })

    it('devrait utiliser un tableau vide par défaut', async () => {
      electronMock.storeGet.mockResolvedValue(null)
      await emojiService.load()
      expect(emojiService.customEmojis).toEqual([])
    })
  })

  // ─── subscribe / _notify ─────────────────────────────────────────────

  describe('subscribe', () => {
    it('devrait enregistrer un listener et le retourner pour unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = emojiService.subscribe(listener)

      expect(typeof unsubscribe).toBe('function')
      expect(emojiService.listeners.size).toBe(1)
    })

    it('unsubscribe devrait retirer le listener', () => {
      const listener = vi.fn()
      const unsubscribe = emojiService.subscribe(listener)
      unsubscribe()
      expect(emojiService.listeners.size).toBe(0)
    })

    it('_notify devrait appeler tous les listeners', () => {
      const l1 = vi.fn()
      const l2 = vi.fn()
      emojiService.subscribe(l1)
      emojiService.subscribe(l2)

      emojiService._notify()

      expect(l1).toHaveBeenCalledTimes(1)
      expect(l2).toHaveBeenCalledTimes(1)
    })

    it('_notify devrait ignorer les erreurs de listener', () => {
      const badListener = vi.fn(() => { throw new Error('boom') })
      const goodListener = vi.fn()
      emojiService.subscribe(badListener)
      emojiService.subscribe(goodListener)

      expect(() => emojiService._notify()).not.toThrow()
      expect(goodListener).toHaveBeenCalled()
    })
  })

  // ─── addEmoji ────────────────────────────────────────────────────────

  describe('addEmoji', () => {
    it('devrait ajouter un emoji custom', async () => {
      const result = await emojiService.addEmoji('🦥')

      expect(result.success).toBe(true)
      expect(emojiService.customEmojis).toContain('🦥')
    })

    it('devrait persister après ajout', async () => {
      await emojiService.addEmoji('🦥')
      expect(electronMock.storeSet).toHaveBeenCalledWith(
        'customEmojis',
        expect.arrayContaining(['🦥'])
      )
    })

    it('devrait notifier les listeners', async () => {
      const listener = vi.fn()
      emojiService.subscribe(listener)

      await emojiService.addEmoji('🦥')
      expect(listener).toHaveBeenCalled()
    })

    it('devrait rejeter un emoji vide', async () => {
      const result = await emojiService.addEmoji('')
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un non-emoji', async () => {
      const result = await emojiService.addEmoji('hello')
      expect(result.success).toBe(false)
    })

    it('devrait rejeter un emoji déjà dans les défauts', async () => {
      // 🔊 est dans DEFAULT_EMOJIS (audio)
      const result = await emojiService.addEmoji('🔊')
      expect(result.success).toBe(false)
      expect(result.error).toContain('déjà disponible')
    })

    it('devrait rejeter un emoji déjà custom', async () => {
      await emojiService.addEmoji('🦥')
      const result = await emojiService.addEmoji('🦥')
      expect(result.success).toBe(false)
    })

    it('devrait enregistrer la catégorie', async () => {
      await emojiService.addEmoji('🦥', 'animals')
      expect(emojiService.metadata['🦥'].category).toBe('animals')
    })
  })

  // ─── addCategory ─────────────────────────────────────────────────────

  describe('addCategory', () => {
    it('devrait ajouter plusieurs emojis', async () => {
      const result = await emojiService.addCategory('custom-cat', ['🦥', '🦦', '🪆'])

      expect(result.success).toBe(true)
      expect(result.added).toBe(3)
      expect(result.skipped).toBe(0)
    })

    it('devrait ignorer les emojis invalides', async () => {
      const result = await emojiService.addCategory('cat', ['🦥', 'hello', ''])
      expect(result.added).toBe(1)
      expect(result.skipped).toBe(2)
    })

    it('devrait ignorer les emojis par défaut', async () => {
      const result = await emojiService.addCategory('cat', ['🔊', '🦥'])
      expect(result.added).toBe(1)
      expect(result.skipped).toBe(1)
    })

    it('devrait ignorer les emojis déjà présents', async () => {
      await emojiService.addEmoji('🦥')
      const result = await emojiService.addCategory('cat', ['🦥', '🦦'])
      expect(result.added).toBe(1)
      expect(result.skipped).toBe(1)
    })

    it('devrait retourner success=false si rien ajouté', async () => {
      const result = await emojiService.addCategory('cat', ['hello'])
      expect(result.success).toBe(false)
    })
  })

  // ─── removeEmoji ─────────────────────────────────────────────────────

  describe('removeEmoji', () => {
    it('devrait retirer un emoji', async () => {
      await emojiService.addEmoji('🦥')
      const result = await emojiService.removeEmoji('🦥')

      expect(result.success).toBe(true)
      expect(emojiService.customEmojis).not.toContain('🦥')
    })

    it('devrait nettoyer le metadata', async () => {
      await emojiService.addEmoji('🦥', 'animals')
      await emojiService.removeEmoji('🦥')
      expect(emojiService.metadata['🦥']).toBeUndefined()
    })

    it('devrait retourner success=false si l\'emoji n\'existe pas', async () => {
      const result = await emojiService.removeEmoji('🦥')
      expect(result.success).toBe(false)
    })
  })

  // ─── removeCategory ──────────────────────────────────────────────────

  describe('removeCategory', () => {
    it('devrait retirer tous les emojis de la catégorie', async () => {
      await emojiService.addCategory('cat-a', ['🦥', '🦦'])
      await emojiService.addCategory('cat-b', ['🪆'])

      const result = await emojiService.removeCategory('cat-a')
      expect(result.success).toBe(true)
      expect(result.removed).toBe(2)
      expect(emojiService.customEmojis).toEqual(['🪆'])
    })

    it('devrait retourner success=false si rien à retirer', async () => {
      const result = await emojiService.removeCategory('inexistant')
      expect(result.success).toBe(false)
      expect(result.removed).toBe(0)
    })
  })

  // ─── GETTERS ─────────────────────────────────────────────────────────

  describe('getters', () => {
    it('getCustomEmojis devrait retourner une copie', async () => {
      await emojiService.addEmoji('🦥')
      const list = emojiService.getCustomEmojis()
      expect(list).toEqual(['🦥'])
      // Vérifie que c'est une copie (mutation ne doit pas affecter le service)
      list.push('test')
      expect(emojiService.customEmojis.length).toBe(1)
    })

    it('getAllEmojis devrait combiner défauts + customs', async () => {
      await emojiService.addEmoji('🦥')
      const all = emojiService.getAllEmojis()
      expect(all).toContain('🔊')
      expect(all).toContain('🦥')
    })

    it('getCustomGrouped devrait grouper par catégorie', async () => {
      await emojiService.addEmoji('🦥', 'animals')
      await emojiService.addEmoji('🪐', null)

      const grouped = emojiService.getCustomGrouped()
      expect(grouped.animals).toContain('🦥')
      expect(grouped.__uncategorized__).toContain('🪐')
    })

    it('hasEmoji devrait retourner true pour un emoji par défaut', () => {
      expect(emojiService.hasEmoji('🔊')).toBe(true)
    })

    it('hasEmoji devrait retourner true pour un emoji custom', async () => {
      await emojiService.addEmoji('🦥')
      expect(emojiService.hasEmoji('🦥')).toBe(true)
    })

    it('hasEmoji devrait retourner false sinon', () => {
      // 🦥 n'est ni défaut ni custom
      expect(emojiService.hasEmoji('🦥')).toBe(false)
    })

    it('isCustom devrait détecter les customs', async () => {
      await emojiService.addEmoji('🦥')
      expect(emojiService.isCustom('🦥')).toBe(true)
      expect(emojiService.isCustom('🔊')).toBe(false)
    })

    it('hasCategory devrait retourner true si tous les emojis sont présents', async () => {
      await emojiService.addCategory('cat', ['🦥', '🦦'])
      expect(emojiService.hasCategory('cat', ['🦥', '🦦'])).toBe(true)
      expect(emojiService.hasCategory('cat', ['🦥', '🪆'])).toBe(false)
    })

    it('hasCategory devrait retourner false pour une liste vide', () => {
      expect(emojiService.hasCategory('cat', [])).toBe(false)
    })

    it('getMetadata devrait retourner le metadata', async () => {
      await emojiService.addEmoji('🦥', 'animals')
      const meta = emojiService.getMetadata('🦥')
      expect(meta.category).toBe('animals')
    })

    it('getMetadata devrait retourner null pour un inconnu', () => {
      expect(emojiService.getMetadata('❓')).toBeNull()
    })
  })
})