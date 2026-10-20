import { describe, it, expect } from 'vitest'
import { EMOJI_DISCOVER_CATEGORIES } from './categories'

describe('emoji/categories', () => {
  it('devrait être un array', () => {
    expect(Array.isArray(EMOJI_DISCOVER_CATEGORIES)).toBe(true)
  })

  it('devrait contenir les 9 catégories', () => {
    expect(EMOJI_DISCOVER_CATEGORIES).toHaveLength(9)
  })

  it('chaque catégorie devrait avoir id/labelKey/icon/emoji', () => {
    for (const cat of EMOJI_DISCOVER_CATEGORIES) {
      expect(cat.id).toBeTruthy()
      expect(cat.labelKey).toBeTruthy()
      expect(cat.icon).toBeTruthy()
      expect(cat.emoji).toBeTruthy()
    }
  })

  it('devrait commencer par smileys', () => {
    expect(EMOJI_DISCOVER_CATEGORIES[0].id).toBe('smileys')
  })

  it('devrait contenir les catégories standard', () => {
    const ids = EMOJI_DISCOVER_CATEGORIES.map((c) => c.id)
    expect(ids).toContain('smileys')
    expect(ids).toContain('people')
    expect(ids).toContain('animals')
    expect(ids).toContain('food')
    expect(ids).toContain('travel')
    expect(ids).toContain('activities')
    expect(ids).toContain('objects')
    expect(ids).toContain('symbols')
    expect(ids).toContain('flags')
  })

  it('les ids devraient être uniques', () => {
    const ids = EMOJI_DISCOVER_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('les labelKey devraient être uniques', () => {
    const keys = EMOJI_DISCOVER_CATEGORIES.map((c) => c.labelKey)
    expect(new Set(keys).size).toBe(keys.length)
  })
})