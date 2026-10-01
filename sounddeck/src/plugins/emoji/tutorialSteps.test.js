import { describe, it, expect } from 'vitest'
import { TUTORIAL_STEPS } from './tutorialSteps'

const t = (k) => k

describe('emoji/tutorialSteps', () => {
  it('devrait retourner 4 étapes', () => {
    expect(TUTORIAL_STEPS(t)).toHaveLength(4)
  })

  it('chaque étape devrait avoir les champs requis', () => {
    for (const step of TUTORIAL_STEPS(t)) {
      expect(step.id).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.description).toBeTruthy()
      expect(step.target).toBeTruthy()
      expect(step.icon).toBeTruthy()
      expect(step.position).toBeTruthy()
    }
  })

  it('les ids devraient être uniques', () => {
    const ids = TUTORIAL_STEPS(t).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})