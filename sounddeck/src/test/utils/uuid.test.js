import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uuid } from '@shared/utils/uuid'

describe('uuid', () => {
  // Sauvegarde de l'implémentation originale pour restore
  let originalRandomUUID

  beforeEach(() => {
    originalRandomUUID = crypto.randomUUID
  })

  afterEach(() => {
    // ✅ Restore l'implémentation crypto après chaque test
    if (originalRandomUUID) {
      Object.defineProperty(global.crypto, 'randomUUID', {
        value: originalRandomUUID,
        configurable: true,
        writable: true,
      })
    }
    vi.restoreAllMocks()
  })

  // ─── AVEC crypto.randomUUID (branche principale) ───────────────────────

  it('devrait retourner un UUID v4 valide', () => {
    const id = uuid()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('devrait utiliser crypto.randomUUID si disponible', () => {
    const mockId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    Object.defineProperty(global.crypto, 'randomUUID', {
      value: vi.fn(() => mockId),
      configurable: true,
      writable: true,
    })

    expect(uuid()).toBe(mockId)
  })

  it('devrait préfixer avec le préfixe fourni', () => {
    Object.defineProperty(global.crypto, 'randomUUID', {
      value: vi.fn(() => 'abc-123'),
      configurable: true,
      writable: true,
    })

    expect(uuid('clip')).toBe('clip-abc-123')
  })

  it('devrait générer des UUIDs uniques', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) ids.add(uuid())
    expect(ids.size).toBe(100)
  })

  it('devrait accepter un préfixe vide', () => {
    const id = uuid('')
    expect(id).not.toMatch(/^-/)
  })

  // ─── FALLBACK (branche Math.random) ──────────────────────────────────

  it('devrait utiliser le fallback si crypto.randomUUID absent', () => {
    // ✅ Supprime crypto.randomUUID pour forcer le fallback
    Object.defineProperty(global.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const id = uuid()
    // Doit quand même matcher le format UUID v4
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('le fallback devrait générer des UUIDs uniques', () => {
    Object.defineProperty(global.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const ids = new Set()
    for (let i = 0; i < 50; i++) ids.add(uuid())
    expect(ids.size).toBe(50)
  })

  it('le fallback devrait respecter le préfixe', () => {
    Object.defineProperty(global.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const id = uuid('test')
    expect(id).toMatch(/^test-/)
    // Format UUID v4 après le préfixe
    const withoutPrefix = id.replace(/^test-/, '')
    expect(withoutPrefix).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('le fallback devrait être déterministe quant au format v4', () => {
    Object.defineProperty(global.crypto, 'randomUUID', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    for (let i = 0; i < 10; i++) {
      const id = uuid()
      // Le 13e caractère (index 14) doit être '4' (version v4)
      expect(id[14]).toBe('4')
      // Le 17e caractère doit être 8, 9, a ou b (variant)
      expect(['8', '9', 'a', 'b']).toContain(id[19].toLowerCase())
    }
  })
})