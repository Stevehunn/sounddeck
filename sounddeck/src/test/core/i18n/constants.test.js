import { describe, it, expect } from 'vitest'
import { LANGUAGES } from '@core/i18n/constants'
import defaultExport from '@core/i18n/constants'

describe('LANGUAGES', () => {
  it('devrait exposer 3 langues', () => {
    expect(LANGUAGES.length).toBe(3)
  })

  it('devrait avoir les codes fr, en, es dans cet ordre', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['fr', 'en', 'es'])
  })

  it('chaque langue devrait avoir code, label et flag', () => {
    for (const lang of LANGUAGES) {
      expect(lang.code).toBeTruthy()
      expect(lang.label).toBeTruthy()
      expect(lang.flag).toBeTruthy()
    }
  })

  it('devrait avoir les labels humains corrects', () => {
    const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]))
    expect(byCode.fr.label).toBe('Français')
    expect(byCode.en.label).toBe('English')
    expect(byCode.es.label).toBe('Español')
  })

  it('devrait avoir les drapeaux corrects', () => {
    const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]))
    expect(byCode.fr.flag).toBe('🇫🇷')
    expect(byCode.en.flag).toBe('🇬🇧')
    expect(byCode.es.flag).toBe('🇪🇸')
  })

  it('devrait être exporté aussi par défaut', () => {
    expect(defaultExport.LANGUAGES).toBe(LANGUAGES)
  })
})