import { describe, it, expect } from 'vitest'
import {
  CORE_PAGES,
  CORE_PAGE_IDS,
  CORE_PAGES_MAP,
  DEFAULT_ITEM_ORDER,
} from '@shared/constants/pages'

describe('CORE_PAGES', () => {
  it('devrait être un tableau non vide', () => {
    expect(Array.isArray(CORE_PAGES)).toBe(true)
    expect(CORE_PAGES.length).toBeGreaterThan(0)
  })

  it('chaque page devrait avoir id, labelKey, icon, group', () => {
    for (const page of CORE_PAGES) {
      expect(page.id).toBeTruthy()
      expect(page.labelKey).toBeTruthy()
      expect(page.icon).toBeTruthy()
      expect(page.group).toBeTruthy()
    }
  })

  it('devrait contenir les pages essentielles', () => {
    const ids = CORE_PAGES.map((p) => p.id)
    expect(ids).toContain('home')
    expect(ids).toContain('editor')
    expect(ids).toContain('options')
    expect(ids).toContain('guide')
  })

  it('les actions devraient avoir canHide: false', () => {
    const actions = CORE_PAGES.filter((p) =>
      ['loop', 'shortcuts', 'presentation'].includes(p.id)
    )
    expect(actions.length).toBe(3)
    for (const a of actions) {
      expect(a.canHide).toBe(false)
    }
  })
})

describe('CORE_PAGE_IDS', () => {
  it('devrait être un Set contenant tous les ids', () => {
    expect(CORE_PAGE_IDS.size).toBe(CORE_PAGES.length)
    for (const page of CORE_PAGES) {
      expect(CORE_PAGE_IDS.has(page.id)).toBe(true)
    }
  })

  it('devrait contenir "home" et "editor"', () => {
    expect(CORE_PAGE_IDS.has('home')).toBe(true)
    expect(CORE_PAGE_IDS.has('editor')).toBe(true)
  })
})

describe('CORE_PAGES_MAP', () => {
  it('devrait retourner la page complète pour un id valide', () => {
    const home = CORE_PAGES_MAP.get('home')
    expect(home).toBeDefined()
    expect(home.id).toBe('home')
    expect(home.icon).toBe('ti-home')
  })

  it('devrait retourner undefined pour un id inconnu', () => {
    expect(CORE_PAGES_MAP.get('nonexistent')).toBeUndefined()
  })
})

describe('DEFAULT_ITEM_ORDER', () => {
  it('devrait contenir tous les ids de CORE_PAGES', () => {
    expect(DEFAULT_ITEM_ORDER.length).toBe(CORE_PAGES.length)
    for (const page of CORE_PAGES) {
      expect(DEFAULT_ITEM_ORDER).toContain(page.id)
    }
  })

  it('devrait commencer par "home"', () => {
    expect(DEFAULT_ITEM_ORDER[0]).toBe('home')
  })
})