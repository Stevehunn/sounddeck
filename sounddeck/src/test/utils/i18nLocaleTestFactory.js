// src/test/utils/i18nLocaleTestFactory.js
import { describe, it, expect } from 'vitest'

/**
 * Factory de tests pour un dossier de traductions (fr / en / es).
 * Évite de dupliquer ~230 lignes × 3 langues.
 *
 * @param {string} langCode
 *   Code de langue ('fr', 'en', 'es') — utilisé pour les labels.
 * @param {Record<string, object>} FILES
 *   Map { nomFichier: translations } — ex: { common, editor, ... }
 * @param {object} index
 *   Le fichier `index.js` fusionné de la langue.
 * @param {Record<string, string>} [specificValues]
 *   Valeurs à vérifier individuellement (ex: { add: 'Ajouter' }).
 */
export function testLocaleStructure(langCode, FILES, index, specificValues = {}) {
  describe(`i18n locales/${langCode}`, () => {
    // ════════════════════════════════════════════════════════════════════
    // Validation par fichier (paramétré)
    // ════════════════════════════════════════════════════════════════════
    Object.entries(FILES).forEach(([name, translations]) => {
      describe(`${name}.js`, () => {
        it('devrait être un objet non-null', () => {
          expect(typeof translations).toBe('object')
          expect(translations).not.toBeNull()
        })

        it('devrait être un default export (pas de named)', () => {
          expect(translations).not.toHaveProperty('default')
        })

        it('ne devrait pas être vide', () => {
          expect(Object.keys(translations).length).toBeGreaterThan(0)
        })

        it("devrait n'exposer que des valeurs string", () => {
          for (const [key, value] of Object.entries(translations)) {
            expect(typeof value, `${name}.${key} devrait être une string`).toBe(
              'string'
            )
          }
        })

        it('ne devrait avoir aucune valeur vide', () => {
          for (const [key, value] of Object.entries(translations)) {
            expect(
              value.length,
              `${name}.${key} ne devrait pas être vide`
            ).toBeGreaterThan(0)
          }
        })

        it("les clés ne devraient pas contenir d'espaces", () => {
          for (const key of Object.keys(translations)) {
            expect(key, `${name}.${key}`).not.toMatch(/\s/)
          }
        })

        it('les clés ne devraient pas être vides', () => {
          for (const key of Object.keys(translations)) {
            expect(key.length, `${name}.<empty>`).toBeGreaterThan(0)
          }
        })
      })
    })

    // ════════════════════════════════════════════════════════════════════
    // Validation du fichier index.js (fusion)
    // ════════════════════════════════════════════════════════════════════
    describe('index.js', () => {
      it('devrait être un objet non-null', () => {
        expect(typeof index).toBe('object')
        expect(index).not.toBeNull()
      })

      it('devrait contenir beaucoup de clés (> 500)', () => {
        expect(Object.keys(index).length).toBeGreaterThan(500)
      })

      it("les valeurs de l'index devraient toutes être des strings", () => {
        for (const [key, value] of Object.entries(index)) {
          expect(typeof value, `index.${key}`).toBe('string')
        }
      })

      // ─── Vérifie que CHAQUE fichier contribue à l'index ──────────────
      Object.entries(FILES).forEach(([name, translations]) => {
        it(`devrait contenir toutes les clés de ${name}.js`, () => {
          for (const key of Object.keys(translations)) {
            expect(index).toHaveProperty(key)
          }
        })
      })

      // ─── Vérifie la fusion complète ──────────────────────────────────
      it('devrait contenir la somme (dédupliquée) des clés de tous les fichiers', () => {
        const allKeys = new Set()
        for (const translations of Object.values(FILES)) {
          for (const key of Object.keys(translations)) {
            allKeys.add(key)
          }
        }
        expect(Object.keys(index).length).toBe(allKeys.size)
      })

      it("les clés de l'index devraient être uniques", () => {
        const keys = Object.keys(index)
        const uniqueKeys = new Set(keys)
        expect(uniqueKeys.size).toBe(keys.length)
      })

      it('aucune valeur de l\'index ne devrait être "undefined" (string)', () => {
        for (const [key, value] of Object.entries(index)) {
          expect(value, `index.${key}`).not.toBe('undefined')
          expect(value, `index.${key}`).not.toBe('null')
        }
      })
    })

    // ════════════════════════════════════════════════════════════════════
    // Valeurs spécifiques critiques (paramétrées)
    // ════════════════════════════════════════════════════════════════════
    if (Object.keys(specificValues).length > 0) {
      describe('valeurs spécifiques', () => {
        Object.entries(specificValues).forEach(([key, expected]) => {
          it(`${key} devrait valoir "${expected}"`, () => {
            expect(index[key]).toBe(expected)
          })
        })
      })
    }

    // ════════════════════════════════════════════════════════════════════
    // Cohérence inter-fichiers (garde-fou, pas de nettoyage)
    // ════════════════════════════════════════════════════════════════════
    describe('cohérence', () => {
      it('ne devrait pas y avoir de collisions déraisonnables entre fichiers', () => {
        const seen = new Map()
        let collisions = 0

        for (const [name, translations] of Object.entries(FILES)) {
          for (const key of Object.keys(translations)) {
            if (seen.has(key)) {
              collisions++
            } else {
              seen.set(key, name)
            }
          }
        }

        // Info uniquement : collisions acceptées (dernier spread gagne).
        // Seuil = garde-fou contre duplications accidentelles massives.
        // 📌 Nettoyage des locales prévu en V2 — voir TODO projet.
        expect(collisions).toBeLessThan(60)
      })
    })
  })
}

export default { testLocaleStructure }