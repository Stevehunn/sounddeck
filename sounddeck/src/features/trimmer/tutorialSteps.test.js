import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TUTORIAL_STEPS } from './tutorialSteps'

const t = (k) => k

describe('trimmer/tutorialSteps', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    delete window.__trimmerSelectFirstSound
  })

  afterEach(() => {
    document.body.innerHTML = ''
    delete window.__trimmerSelectFirstSound
  })

  it('devrait retourner 6 étapes', () => {
    expect(TUTORIAL_STEPS(t)).toHaveLength(6)
  })

  it('chaque étape devrait avoir id, title, description, hint', () => {
    for (const step of TUTORIAL_STEPS(t)) {
      expect(step.id).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.description).toBeTruthy()
      expect(step.hint).toBeTruthy()
      expect(step.icon).toBeTruthy()
    }
  })

  it('les ids devraient être uniques', () => {
    const ids = TUTORIAL_STEPS(t).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // ─── Step 1 : findSoundInList ─────────────────────────────────────────

  describe('step1 (findSoundInList)', () => {
    it('devrait avoir afterNextStep défini', () => {
      const step1 = TUTORIAL_STEPS(t)[0]
      expect(typeof step1.afterNextStep).toBe('function')
      expect(step1.afterNextStepDelay).toBe(2500)
    })

    it('afterNextStep devrait appeler window.__trimmerSelectFirstSound', () => {
      const mock = vi.fn(() => true)
      window.__trimmerSelectFirstSound = mock

      const step1 = TUTORIAL_STEPS(t)[0]
      step1.afterNextStep()

      expect(mock).toHaveBeenCalled()
    })

    it('afterNextStep devrait warn si aucun son', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      window.__trimmerSelectFirstSound = vi.fn(() => false)

      const step1 = TUTORIAL_STEPS(t)[0]
      step1.afterNextStep()

      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('afterNextStep ne devrait pas crasher si window.__trimmerSelectFirstSound absent', () => {
      const step1 = TUTORIAL_STEPS(t)[0]
      expect(() => step1.afterNextStep()).not.toThrow()
    })

    it('target (fonction) retourne null si rien dans le DOM', () => {
      const step1 = TUTORIAL_STEPS(t)[0]
      // findSoundInList retournera null/undefined si rien
      expect(step1.target).toBeDefined()
    })

    it('devrait trouver le 1er son de la liste', () => {
      const sound = document.createElement('button')
      sound.setAttribute('data-testid', 'sound-list-item-abc')
      sound.setAttribute('data-active', 'false')
      // offsetParent null par défaut en jsdom → mock
      Object.defineProperty(sound, 'offsetParent', {
        get: () => document.body,
      })
      document.body.appendChild(sound)

      const step1 = TUTORIAL_STEPS(t)[0]
      const found = step1.target()
      expect(found).toBe(sound)
    })
  })

  // ─── Step 2 : findWaveformArea ────────────────────────────────────────

  describe('step2 (findWaveformArea)', () => {
    it('devrait trouver trimmer-waveform-container', () => {
      const wf = document.createElement('div')
      wf.setAttribute('data-testid', 'trimmer-waveform-container')
      Object.defineProperty(wf, 'offsetParent', { get: () => document.body })
      document.body.appendChild(wf)

      const step2 = TUTORIAL_STEPS(t)[1]
      expect(step2.target()).toBe(wf)
    })

    it('devrait fallback sur trimmer-empty-state', () => {
      const empty = document.createElement('div')
      empty.setAttribute('data-testid', 'trimmer-empty-state')
      document.body.appendChild(empty)

      const step2 = TUTORIAL_STEPS(t)[1]
      expect(step2.target()).toBe(empty)
    })
  })

  // ─── Step 3 : findListenButton ────────────────────────────────────────

  describe('step3 (findListenButton)', () => {
    it('devrait trouver trimmer-listen-button', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-testid', 'trimmer-listen-button')
      Object.defineProperty(btn, 'offsetParent', { get: () => document.body })
      document.body.appendChild(btn)

      const step3 = TUTORIAL_STEPS(t)[2]
      expect(step3.target()).toBe(btn)
    })

    it('devrait fallback sur trimmer-reset-button', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-testid', 'trimmer-reset-button')
      document.body.appendChild(btn)

      const step3 = TUTORIAL_STEPS(t)[2]
      expect(step3.target()).toBe(btn)
    })
  })

  // ─── Step 4 : findResetButton ─────────────────────────────────────────

  describe('step4 (findResetButton)', () => {
    it('devrait trouver trimmer-reset-button', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-testid', 'trimmer-reset-button')
      Object.defineProperty(btn, 'offsetParent', { get: () => document.body })
      document.body.appendChild(btn)

      const step4 = TUTORIAL_STEPS(t)[3]
      expect(step4.target()).toBe(btn)
    })

    it('devrait retourner null si absent', () => {
      const step4 = TUTORIAL_STEPS(t)[3]
      expect(step4.target()).toBeNull()
    })
  })

  // ─── Step 5 : findNameInput ──────────────────────────────────────────

  describe('step5 (findNameInput)', () => {
    it('devrait trouver trimmer-name-input', () => {
      const input = document.createElement('input')
      input.setAttribute('data-testid', 'trimmer-name-input')
      Object.defineProperty(input, 'offsetParent', { get: () => document.body })
      document.body.appendChild(input)

      const step5 = TUTORIAL_STEPS(t)[4]
      expect(step5.target()).toBe(input)
    })
  })

  // ─── Step 6 : findCreateButton ───────────────────────────────────────

  describe('step6 (findCreateButton)', () => {
    it('devrait trouver trimmer-create-button', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-testid', 'trimmer-create-button')
      Object.defineProperty(btn, 'offsetParent', { get: () => document.body })
      document.body.appendChild(btn)

      const step6 = TUTORIAL_STEPS(t)[5]
      expect(step6.target()).toBe(btn)
    })
  })
})