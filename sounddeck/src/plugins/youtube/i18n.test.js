import { describe, it, expect } from 'vitest'
import translations from './i18n'

describe('youtube/i18n', () => {
  it('devrait exposer fr, en, es', () => {
    expect(translations).toHaveProperty('fr')
    expect(translations).toHaveProperty('en')
    expect(translations).toHaveProperty('es')
  })

  it('chaque langue devrait avoir les clés essentielles', () => {
    const required = [
      'youtubeTitle',
      'youtubeSub',
      'pasteUrl',
      'load',
      'downloadAudio',
      'configSound',
      'addToLibrary',
      'ytdlpRequired',
    ]
    for (const lang of ['fr', 'en', 'es']) {
      for (const key of required) {
        expect(translations[lang][key], `${lang}.${key}`).toBeTruthy()
      }
    }
  })

  it('les 6 étapes du tutoriel YouTube devraient être présentes', () => {
    for (const lang of ['fr', 'en', 'es']) {
      for (let i = 1; i <= 6; i++) {
        expect(translations[lang][`tutorialYoutubeStep${i}Title`]).toBeTruthy()
        expect(translations[lang][`tutorialYoutubeStep${i}Desc`]).toBeTruthy()
        expect(translations[lang][`tutorialYoutubeStep${i}Hint`]).toBeTruthy()
      }
    }
  })

  it('les 3 langues devraient avoir EXACTEMENT les mêmes clés', () => {
    const frKeys = Object.keys(translations.fr).sort()
    const enKeys = Object.keys(translations.en).sort()
    const esKeys = Object.keys(translations.es).sort()
    expect(enKeys).toEqual(frKeys)
    expect(esKeys).toEqual(frKeys)
  })

  it('toutes les valeurs devraient être des strings non vides', () => {
    for (const lang of ['fr', 'en', 'es']) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(typeof value, `${lang}.${key} devrait être une string`).toBe('string')
        expect(value.length, `${lang}.${key} ne devrait pas être vide`).toBeGreaterThan(0)
      }
    }
  })

  it('les traductions devraient être différentes entre les langues', () => {
    expect(translations.fr.youtubeTitle).not.toBe(translations.en.youtubeTitle)
    expect(translations.fr.pasteUrl).not.toBe(translations.en.pasteUrl)
  })
})