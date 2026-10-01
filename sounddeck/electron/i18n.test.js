// electron/i18n.test.js
import { describe, it, expect } from 'vitest'
import { LANGUAGES } from './i18n'

describe('i18n.js (electron)', () => {
  it('devrait exporter LANGUAGES', () => {
    expect(Array.isArray(LANGUAGES)).toBe(true)
  })

  it('devrait contenir exactement fr, en, es', () => {
    const codes = LANGUAGES.map((l) => l.code)
    expect(codes).toEqual(['fr', 'en', 'es'])
  })

  it('chaque langue devrait avoir code/label/flag/country/myinstantsIndex', () => {
    for (const lang of LANGUAGES) {
      expect(lang.code).toBeTruthy()
      expect(lang.label).toBeTruthy()
      expect(lang.flag).toBeTruthy()
      expect(lang.country).toBeTruthy()
      expect(lang.myinstantsIndex).toBeTruthy()
    }
  })

  it('le français devrait avoir country=fr', () => {
    const fr = LANGUAGES.find((l) => l.code === 'fr')
    expect(fr).toMatchObject({
      label: 'Français',
      flag: '🇫🇷',
      country: 'fr',
      myinstantsIndex: 'fr',
    })
  })

  it('l\'anglais devrait avoir country=us', () => {
    const en = LANGUAGES.find((l) => l.code === 'en')
    expect(en.country).toBe('us')
  })

  it('l\'espagnol devrait avoir country=es', () => {
    const es = LANGUAGES.find((l) => l.code === 'es')
    expect(es.country).toBe('es')
  })
})