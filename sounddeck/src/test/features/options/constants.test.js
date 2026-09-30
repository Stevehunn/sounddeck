import { describe, it, expect } from 'vitest'
import { SECTIONS } from '@features/options/constants'

describe('SECTIONS (options)', () => {
  it('devrait être un tableau non vide', () => {
    expect(Array.isArray(SECTIONS)).toBe(true)
    expect(SECTIONS.length).toBeGreaterThan(0)
  })

  it('chaque section devrait avoir id, icon, labelKey', () => {
    for (const s of SECTIONS) {
      expect(s.id).toBeTruthy()
      expect(s.icon).toBeTruthy()
      expect(s.labelKey).toBeTruthy()
    }
  })

  it('les IDs devraient être uniques', () => {
    const ids = SECTIONS.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('devrait contenir les sections essentielles', () => {
    const ids = SECTIONS.map((s) => s.id)
    expect(ids).toContain('appearance')
    expect(ids).toContain('audio')
    expect(ids).toContain('shortcuts')
    expect(ids).toContain('plugins')
    expect(ids).toContain('backup')
    expect(ids).toContain('profiles')
  })

  it('la 1ère section devrait être "appearance"', () => {
    expect(SECTIONS[0].id).toBe('appearance')
  })

  it('toutes les icônes devraient commencer par "ti-"', () => {
    for (const s of SECTIONS) {
      expect(s.icon).toMatch(/^ti-/)
    }
  })

  it('les labelKey devraient être uniques', () => {
    const keys = SECTIONS.map((s) => s.labelKey)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })
})