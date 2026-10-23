import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TUTORIAL_STEPS } from './tutorialSteps'

const t = (k) => k

describe('stats/tutorialSteps', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('devrait retourner 5 étapes', () => {
    expect(TUTORIAL_STEPS(t)).toHaveLength(5)
  })

  it('chaque étape devrait avoir id, title, description, target, hint, position', () => {
    for (const step of TUTORIAL_STEPS(t)) {
      expect(step.id).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.description).toBeTruthy()
      expect(step.target).toBeTruthy()
      expect(step.hint).toBeTruthy()
      expect(step.position).toBeTruthy()
    }
  })

  it('les ids devraient être uniques', () => {
    const ids = TUTORIAL_STEPS(t).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('l\'étape 2 devrait être une fonction qui retourne null si pas de cards', () => {
    const step2 = TUTORIAL_STEPS(t)[1]
    expect(typeof step2.target).toBe('function')
    expect(step2.target()).toBeNull()
  })

  it('l\'étape 2 devrait trouver la 1ère card si elle existe', () => {
    const card = document.createElement('div')
    card.setAttribute('data-testid', 'stat-card')
    document.body.appendChild(card)

    const step2 = TUTORIAL_STEPS(t)[1]
    expect(step2.target()).toBe(card)
  })
})