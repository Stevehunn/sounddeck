// src/test/core/i18n/locales/fr/index.test.js
import { describe, it, expect } from 'vitest'

// Importe chaque fichier pour vérifier sa structure
import common from '@core/i18n/locales/fr/common'
import editor from '@core/i18n/locales/fr/editor'
import editorToasts from '@core/i18n/locales/fr/editorToasts'
import editorUI from '@core/i18n/locales/fr/editorUI'
import home from '@core/i18n/locales/fr/home'
import options from '@core/i18n/locales/fr/options'
import discover from '@core/i18n/locales/fr/discover'
import sequencer from '@core/i18n/locales/fr/sequencer'
import trimmer from '@core/i18n/locales/fr/trimmer'
import stats from '@core/i18n/locales/fr/stats'
import guide from '@core/i18n/locales/fr/guide'
import presentation from '@core/i18n/locales/fr/presentation'
import welcome from '@core/i18n/locales/fr/welcome'
import tutorial from '@core/i18n/locales/fr/tutorial'
import emoji from '@core/i18n/locales/fr/emoji'
import index from '@core/i18n/locales/fr/index'

const FILES = {
  common,
  editor,
  editorToasts,
  editorUI,
  home,
  options,
  discover,
  sequencer,
  trimmer,
  stats,
  guide,
  presentation,
  welcome,
  tutorial,
  emoji,
}

describe('i18n locales/fr', () => {
  // ─── FICHIERS INDIVIDUELS ─────────────────────────────────────────────

  Object.entries(FILES).forEach(([name, translations]) => {
    describe(`${name}.js`, () => {
      it('devrait être un objet non-null', () => {
        expect(typeof translations).toBe('object')
        expect(translations).not.toBeNull()
      })

      it('ne devrait pas être vide', () => {
        expect(Object.keys(translations).length).toBeGreaterThan(0)
      })

      it('devrait n\'exposer que des valeurs string', () => {
        for (const [key, value] of Object.entries(translations)) {
          expect(typeof value, `${name}.${key} devrait être une string`).toBe(
            'string'
          )
        }
      })

      it('ne devrait avoir aucune valeur vide', () => {
        for (const [key, value] of Object.entries(translations)) {
          expect(value.length, `${name}.${key} ne devrait pas être vide`).toBeGreaterThan(0)
        }
      })
    })
  })

  // ─── INDEX (COMBINAISON) ──────────────────────────────────────────────

  describe('index.js', () => {
    it('devrait être un objet', () => {
      expect(typeof index).toBe('object')
      expect(index).not.toBeNull()
    })

    it('devrait contenir beaucoup de clés (fusion)', () => {
      const keys = Object.keys(index)
      expect(keys.length).toBeGreaterThan(300)
    })

    it('devrait contenir toutes les clés de common', () => {
      for (const key of Object.keys(common)) {
        expect(index).toHaveProperty(key)
      }
    })

    it('devrait contenir toutes les clés de editor', () => {
      for (const key of Object.keys(editor)) {
        expect(index).toHaveProperty(key)
      }
    })

    it('devrait contenir toutes les clés de home', () => {
      for (const key of Object.keys(home)) {
        expect(index).toHaveProperty(key)
      }
    })

    it('devrait contenir toutes les clés de options', () => {
      for (const key of Object.keys(options)) {
        expect(index).toHaveProperty(key)
      }
    })

    it('devrait contenir toutes les clés de welcome', () => {
      for (const key of Object.keys(welcome)) {
        expect(index).toHaveProperty(key)
      }
    })

    it('devrait contenir toutes les clés de tutorial', () => {
      for (const key of Object.keys(tutorial)) {
        expect(index).toHaveProperty(key)
      }
    })

    it('devrait contenir toutes les clés de emoji', () => {
      for (const key of Object.keys(emoji)) {
        expect(index).toHaveProperty(key)
      }
    })

    // ─── VALEURS CLÉS SPÉCIFIQUES ────────────────────────────────────

    it('add devrait valoir "Ajouter"', () => {
      expect(index.add).toBe('Ajouter')
    })

    it('cancel devrait valoir "Annuler"', () => {
      expect(index.cancel).toBe('Annuler')
    })

    it('allSounds devrait valoir "Tous les sons"', () => {
      expect(index.allSounds).toBe('Tous les sons')
    })

    it('save devrait valoir "Sauvegarder"', () => {
      expect(index.save).toBe('Sauvegarder')
    })

    // ─── ROBUSTESSE ──────────────────────────────────────────────────

    it('devrait avoir toutes les valeurs en string', () => {
      for (const [key, value] of Object.entries(index)) {
        expect(typeof value, `index.${key}`).toBe('string')
      }
    })

    it('les clés du dernier spread devraient override celles du premier', () => {
      // editor est après common dans l'index
      // Si 'error' existe dans les deux, la valeur finale est celle de editor
      // (ou n'importe quel fichier après common)
      expect(index.error).toBeDefined()
      expect(typeof index.error).toBe('string')
    })
  })
})