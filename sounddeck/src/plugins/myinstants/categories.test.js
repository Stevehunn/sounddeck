// src/plugins/myinstants/categories.test.js
import { describe, it, expect } from 'vitest'
import { CATEGORIES, CATEGORIES_LIST, DEFAULT_CATEGORIES } from './categories'

describe('myinstants/categories', () => {
  it('CATEGORIES devrait être un objet non vide', () => {
    expect(typeof CATEGORIES).toBe('object')
    expect(Object.keys(CATEGORIES).length).toBeGreaterThan(0)
  })

  it('chaque catégorie devrait avoir les champs requis', () => {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      expect(cat.id, `${key}.id`).toBe(key)
      expect(cat.labelKey, `${key}.labelKey`).toBeTruthy()
      expect(cat.emoji, `${key}.emoji`).toBeTruthy()
      expect(cat.icon, `${key}.icon`).toBeTruthy()
      expect(cat.color, `${key}.color`).toBeTruthy()
    }
  })

  it('chaque catégorie devrait avoir un mode valide', () => {
    const validModes = ['local', 'multi', 'search', 'trending']
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      expect(validModes, `${key}.mode="${cat.mode}"`).toContain(cat.mode)
    }
  })

  it('les catégories mode=multi devraient avoir une query non vide', () => {
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      if (cat.mode === 'multi') {
        expect(cat.query, `${key}.query`).toBeTruthy()
      }
    }
  })

  it('CATEGORIES_LIST devrait être un array aligné avec CATEGORIES', () => {
    expect(Array.isArray(CATEGORIES_LIST)).toBe(true)
    expect(CATEGORIES_LIST.length).toBe(Object.keys(CATEGORIES).length)
  })

  it('CATEGORIES_LIST devrait contenir les mêmes objets que CATEGORIES', () => {
    for (const cat of CATEGORIES_LIST) {
      expect(CATEGORIES[cat.id]).toBe(cat)
    }
  })

  it('DEFAULT_CATEGORIES devrait être un array non vide', () => {
    expect(Array.isArray(DEFAULT_CATEGORIES)).toBe(true)
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0)
  })

  it('DEFAULT_CATEGORIES ne devrait contenir que default:true', () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(cat.default).toBe(true)
    }
  })

  it('devrait contenir les catégories essentielles', () => {
    expect(CATEGORIES.trending).toBeDefined()
    expect(CATEGORIES.best).toBeDefined()
    expect(CATEGORIES.popular).toBeDefined()
    expect(CATEGORIES.memes).toBeDefined()
  })

  it('trending devrait être en mode local et default', () => {
    expect(CATEGORIES.trending.mode).toBe('local')
    expect(CATEGORIES.trending.default).toBe(true)
  })

  it('les ids devraient être uniques', () => {
    const ids = CATEGORIES_LIST.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})