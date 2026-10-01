import { describe, it, expect } from 'vitest'
import { TUTORIAL_STEPS } from './tutorialSteps'

const t = (k) => k

describe('myinstants/tutorialSteps', () => {
  it('devrait retourner 8 étapes', () => {
    expect(TUTORIAL_STEPS(t)).toHaveLength(8)
  })

  it('chaque étape devrait avoir les champs requis', () => {
    for (const step of TUTORIAL_STEPS(t)) {
      expect(step.id).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.description).toBeTruthy()
      expect(step.target).toBeTruthy()
      expect(step.icon).toBeTruthy()
    }
  })

  it('les ids devraient être uniques', () => {
    const ids = TUTORIAL_STEPS(t).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('l\'étape 5 devrait avoir une action click', () => {
    const steps = TUTORIAL_STEPS(t)
    const step5 = steps.find((s) => s.id === 'discover-5')
    expect(step5.action).toBe('click')
    expect(step5.actionTarget).toBeTruthy()
  })

  it('l\'étape 5 devrait avoir onLeave', () => {
    const step5 = TUTORIAL_STEPS(t).find((s) => s.id === 'discover-5')
    expect(typeof step5.onLeave).toBe('function')
  })
})