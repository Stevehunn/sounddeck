import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TUTORIAL_STEPS } from '@features/options/tutorialSteps'

const t = (k) => k

describe('options/tutorialSteps', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('devrait retourner 9 étapes', () => {
    expect(TUTORIAL_STEPS(t)).toHaveLength(9)
  })

  it('chaque étape devrait avoir id, title, description, icon, target', () => {
    for (const step of TUTORIAL_STEPS(t)) {
      expect(step.id).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.description).toBeTruthy()
      expect(step.hint).toBeTruthy()
      expect(step.icon).toBeTruthy()
      expect(typeof step.target).toBe('function')
      expect(step.position).toBe('bottom')
    }
  })

  it('les ids devraient être uniques', () => {
    const ids = TUTORIAL_STEPS(t).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // ─── findSection ───────────────────────────────────────────────────

  const SECTIONS = [
    'appearance',
    'audio',
    'shortcuts',
    'soundManagement',
    'plugins',
    'integrations',
    'advanced',
    'backup',
    'profiles',
  ]

  SECTIONS.forEach((sectionId, index) => {
    it(`step${index + 1} devrait trouver [data-testid="section-${sectionId}"]`, () => {
      const el = document.createElement('div')
      el.setAttribute('data-testid', `section-${sectionId}`)
      Object.defineProperty(el, 'offsetParent', { get: () => document.body })
      document.body.appendChild(el)

      const step = TUTORIAL_STEPS(t)[index]
      expect(step.target()).toBe(el)
    })
  })

  it('devrait retourner null si la section est absente', () => {
    const step1 = TUTORIAL_STEPS(t)[0]
    expect(step1.target()).toBeNull()
  })

  it('fallback : devrait trouver [data-section="audio"] si testid absent', () => {
    const el = document.createElement('div')
    el.setAttribute('data-section', 'audio')
    Object.defineProperty(el, 'offsetParent', { get: () => document.body })
    document.body.appendChild(el)

    const step2 = TUTORIAL_STEPS(t)[1]
    expect(step2.target()).toBe(el)
  })
})