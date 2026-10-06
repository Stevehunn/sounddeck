// src/test/features/tutorialSteps.factory.test.js
import { describe, it, expect } from 'vitest'

// ─── MOCK : t() qui retourne la clé ────────────────────────────────────
const t = (k) => k

// ─── IMPORT DES STEPS ──────────────────────────────────────────────────
import { TUTORIAL_STEPS as editorSteps } from '@features/editor/tutorialSteps'
import { TUTORIAL_STEPS as emojiSteps } from '@features/emoji/tutorialSteps'
import { TUTORIAL_STEPS as homeSteps } from '@features/home/tutorialSteps'
import { TUTORIAL_STEPS as presentationSteps } from '@features/presentation/tutorialSteps'
import { TUTORIAL_STEPS as sequencerSteps } from '@features/sequencer/tutorialSteps'
import { TUTORIAL_STEPS as myinstantsSteps } from '@plugins/myinstants/tutorialSteps'

// ─── FACTORY ───────────────────────────────────────────────────────────
const FILES = {
  editor: { name: 'editor', stepsFn: editorSteps },
  emoji: { name: 'emoji', stepsFn: emojiSteps },
  home: { name: 'home', stepsFn: homeSteps },
  presentation: { name: 'presentation', stepsFn: presentationSteps },
  sequencer: { name: 'sequencer', stepsFn: sequencerSteps },
  myinstants: { name: 'myinstants', stepsFn: myinstantsSteps },
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS COMMUNS À TOUS LES FICHIERS
// ═══════════════════════════════════════════════════════════════════════
describe('tutorialSteps — contrat commun', () => {
  Object.entries(FILES).forEach(([key, { name, stepsFn }]) => {
    describe(`${name}.tutorialSteps`, () => {
      it('TUTORIAL_STEPS est une fonction', () => {
        expect(typeof stepsFn).toBe('function')
      })

      it('retourne un tableau', () => {
        const result = stepsFn(t)
        expect(Array.isArray(result)).toBe(true)
      })

      it('contient au moins 1 étape', () => {
        const result = stepsFn(t)
        expect(result.length).toBeGreaterThanOrEqual(1)
      })

      it('chaque étape a un id unique', () => {
        const result = stepsFn(t)
        const ids = result.map((s) => s.id)
        expect(new Set(ids).size).toBe(ids.length)
      })

      it('chaque étape a un id non vide (string)', () => {
        const result = stepsFn(t)
        result.forEach((step) => {
          expect(typeof step.id).toBe('string')
          expect(step.id.length).toBeGreaterThan(0)
        })
      })

      it('chaque étape a un title non vide', () => {
        const result = stepsFn(t)
        result.forEach((step) => {
          expect(typeof step.title).toBe('string')
          expect(step.title.length).toBeGreaterThan(0)
        })
      })

      it('chaque étape a une description non vide', () => {
        const result = stepsFn(t)
        result.forEach((step) => {
          expect(typeof step.description).toBe('string')
          expect(step.description.length).toBeGreaterThan(0)
        })
      })

      it('chaque étape a un target (string ou fonction)', () => {
        const result = stepsFn(t)
        result.forEach((step) => {
          const targetType = typeof step.target
          expect(['string', 'function']).toContain(targetType)
        })
      })

      // ⚠️ fallbackTarget peut être string OU fonction (cf myinstants)
      it('fallbackTarget est string ou fonction si présent', () => {
        const result = stepsFn(t)
        result.forEach((step) => {
          if (step.fallbackTarget !== undefined) {
            const type = typeof step.fallbackTarget
            expect(['string', 'function']).toContain(type)
          }
        })
      })

      it('les icônes sont des strings (non vide)', () => {
        const result = stepsFn(t)
        result.forEach((step) => {
          if (step.icon !== undefined) {
            expect(typeof step.icon).toBe('string')
            expect(step.icon.length).toBeGreaterThan(0)
          }
        })
      })
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════
// TESTS SPÉCIFIQUES PAR FICHIER (nombre d'étapes minimaux)
// ═══════════════════════════════════════════════════════════════════════
describe('editor.tutorialSteps', () => {
  it('contient au moins 5 étapes (toolbar, timeline, effets, markers, export)', () => {
    const result = editorSteps(t)
    expect(result.length).toBeGreaterThanOrEqual(5)
  })
})

describe('emoji.tutorialSteps', () => {
  it('contient au moins 3 étapes', () => {
    const result = emojiSteps(t)
    expect(result.length).toBeGreaterThanOrEqual(3)
  })
})

describe('home.tutorialSteps', () => {
  it('contient au moins 5 étapes', () => {
    const result = homeSteps(t)
    expect(result.length).toBeGreaterThanOrEqual(5)
  })
})

describe('presentation.tutorialSteps', () => {
  it('contient au moins 3 étapes', () => {
    const result = presentationSteps(t)
    expect(result.length).toBeGreaterThanOrEqual(3)
  })
})

describe('sequencer.tutorialSteps', () => {
  it('contient au moins 5 étapes', () => {
    const result = sequencerSteps(t)
    expect(result.length).toBeGreaterThanOrEqual(5)
  })
})

describe('myinstants.tutorialSteps', () => {
  it('contient au moins 3 étapes', () => {
    const result = myinstantsSteps(t)
    expect(result.length).toBeGreaterThanOrEqual(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// TEST DES TARGETS FONCTION (smoke)
// ═══════════════════════════════════════════════════════════════════════
describe('targets fonction (smoke)', () => {
  it('les fonctions target ne crash pas si l\'élément est absent', () => {
    Object.entries(FILES).forEach(([, { stepsFn }]) => {
      const result = stepsFn(t)
      result.forEach((step) => {
        if (typeof step.target === 'function') {
          expect(() => step.target()).not.toThrow()
        }
      })
    })
  })

  it('les fonctions target retournent null ou un élément', () => {
    Object.entries(FILES).forEach(([, { stepsFn }]) => {
      const result = stepsFn(t)
      result.forEach((step) => {
        if (typeof step.target === 'function') {
          const el = step.target()
          if (el !== null) {
            expect(el instanceof HTMLElement).toBe(true)
          }
        }
      })
    })
  })

  it('les fonctions fallbackTarget ne crash pas si présentes en fonction', () => {
    Object.entries(FILES).forEach(([, { stepsFn }]) => {
      const result = stepsFn(t)
      result.forEach((step) => {
        if (typeof step.fallbackTarget === 'function') {
          expect(() => step.fallbackTarget()).not.toThrow()
        }
      })
    })
  })
})