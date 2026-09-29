import { describe, it, expect } from 'vitest'
import {
  EMOJI_CATEGORIES,
  DEFAULT_EMOJIS,
  DEFAULT_EMOJI_MAP,
  getDefaultEmojiCategory,
  isValidEmoji,
  searchDefaultEmojis,
} from '@shared/constants/emojis'

describe('EMOJI_CATEGORIES', () => {
  it('devrait contenir les 7 catégories attendues', () => {
    const ids = EMOJI_CATEGORIES.map((c) => c.id)
    expect(ids).toEqual([
      'audio', 'reactions', 'animals', 'games', 'objects', 'food', 'misc',
    ])
  })

  it('chaque catégorie devrait avoir id, labelKey, label, icon, emojis', () => {
    for (const cat of EMOJI_CATEGORIES) {
      expect(cat.id).toBeTruthy()
      expect(cat.labelKey).toBeTruthy()
      expect(cat.label).toBeTruthy()
      expect(cat.icon).toBeTruthy()
      expect(Array.isArray(cat.emojis)).toBe(true)
      expect(cat.emojis.length).toBeGreaterThan(0)
    }
  })
})

describe('DEFAULT_EMOJIS', () => {
  it('devrait contenir tous les emojis de toutes les catégories', () => {
    const expectedTotal = EMOJI_CATEGORIES.reduce(
      (sum, cat) => sum + cat.emojis.length,
      0
    )
    expect(DEFAULT_EMOJIS.length).toBe(expectedTotal)
  })

  it('devrait contenir 🔊 (audio) et 😂 (reactions)', () => {
    expect(DEFAULT_EMOJIS).toContain('🔊')
    expect(DEFAULT_EMOJIS).toContain('😂')
  })
})

describe('getDefaultEmojiCategory', () => {
  it('devrait retourner "audio" pour 🔊', () => {
    expect(getDefaultEmojiCategory('🔊')).toBe('audio')
  })

  it('devrait retourner "animals" pour 🦊', () => {
    expect(getDefaultEmojiCategory('🦊')).toBe('animals')
  })

  it('devrait retourner null pour un emoji absent de la liste', () => {
    // 🦥 (paresseux) n'est dans aucune catégorie par défaut
    expect(getDefaultEmojiCategory('🦥')).toBeNull()
  })

  it('devrait avoir des emojis UNIQUES dans DEFAULT_EMOJIS', () => {
    const unique = new Set(DEFAULT_EMOJIS)
    expect(unique.size).toBe(DEFAULT_EMOJIS.length)
  })

  it('DEFAULT_EMOJI_MAP devrait avoir la taille des emojis uniques', () => {
    const uniqueEmojis = new Set(DEFAULT_EMOJIS)
    expect(DEFAULT_EMOJI_MAP.size).toBe(uniqueEmojis.size)
  })

  it('devrait contenir au moins 200 emojis uniques', () => {
    expect(DEFAULT_EMOJI_MAP.size).toBeGreaterThan(200)
  })
})

describe('isValidEmoji', () => {
  it('devrait accepter un emoji pictographique simple', () => {
    expect(isValidEmoji('😀')).toBe(true)
  })

  it('devrait accepter un drapeau régional', () => {
    expect(isValidEmoji('🇫🇷')).toBe(true)
  })

  it('devrait accepter un keycap', () => {
    expect(isValidEmoji('1️⃣')).toBe(true)
  })

  it('devrait rejeter une chaîne vide', () => {
    expect(isValidEmoji('')).toBe(false)
  })

  it('devrait rejeter null et undefined', () => {
    expect(isValidEmoji(null)).toBe(false)
    expect(isValidEmoji(undefined)).toBe(false)
  })

  it('devrait rejeter un non-string (number)', () => {
    expect(isValidEmoji(42)).toBe(false)
  })

  it('devrait rejeter du texte simple', () => {
    expect(isValidEmoji('hello')).toBe(false)
  })

  it('devrait rejeter une chaîne trop longue (> 30)', () => {
    expect(isValidEmoji('😀'.repeat(20))).toBe(false)
  })
})

describe('searchDefaultEmojis', () => {
  it('devrait retourner les emojis de la catégorie "audio"', () => {
    const results = searchDefaultEmojis('audio')
    expect(results).toContain('🔊')
    expect(results.length).toBeGreaterThan(0)
  })

  it('devrait être insensible à la casse', () => {
    const lower = searchDefaultEmojis('reactions')
    const upper = searchDefaultEmojis('REACTIONS')
    expect(upper.length).toBe(lower.length)
  })

  it('devrait retourner [] pour une requête vide', () => {
    expect(searchDefaultEmojis('')).toEqual([])
    expect(searchDefaultEmojis(null)).toEqual([])
    expect(searchDefaultEmojis(undefined)).toEqual([])
  })

  it('devrait retourner [] si rien ne matche', () => {
    expect(searchDefaultEmojis('zzz_nonexistent')).toEqual([])
  })
})