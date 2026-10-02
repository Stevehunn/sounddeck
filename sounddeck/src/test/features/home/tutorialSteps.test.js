import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TUTORIAL_STEPS } from '@features/home/tutorialSteps'

const t = (k) => k

describe('home/tutorialSteps', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('devrait retourner 10 étapes', () => {
    expect(TUTORIAL_STEPS(t)).toHaveLength(10)
  })

  it('chaque étape devrait avoir les champs de base', () => {
    for (const step of TUTORIAL_STEPS(t)) {
      expect(step.id).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.description).toBeTruthy()
      expect(step.hint).toBeTruthy()
      expect(step.icon).toBeTruthy()
      expect(step.target).toBeDefined()
      expect(step.fallbackTarget).toBeTruthy()
    }
  })

  it('les ids devraient être uniques', () => {
    const ids = TUTORIAL_STEPS(t).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('l\'étape 4 devrait avoir une action click', () => {
    const step4 = TUTORIAL_STEPS(t).find((s) => s.id === 'home-step4')
    expect(step4.action).toBe('click')
    expect(step4.actionDelay).toBe(800)
  })

  // ─── findFirstSound ────────────────────────────────────────────────

  describe('findFirstSound (step1)', () => {
    it('devrait retourner null si rien dans le DOM', () => {
      const step1 = TUTORIAL_STEPS(t)[0]
      expect(step1.target()).toBeNull()
    })

    it('devrait trouver une card visible', () => {
      const card = document.createElement('div')
      card.setAttribute('data-testid', 'sound-card-1')
      Object.defineProperty(card, 'offsetParent', { get: () => document.body })
      document.body.appendChild(card)

      const step1 = TUTORIAL_STEPS(t)[0]
      expect(step1.target()).toBe(card)
    })
  })

  // ─── findAddSoundButton ────────────────────────────────────────────

  describe('findAddSoundButton (step2)', () => {
    it('devrait trouver le bouton par testid', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-testid', 'add-sound-button')
      Object.defineProperty(btn, 'offsetParent', { get: () => document.body })
      document.body.appendChild(btn)

      const step2 = TUTORIAL_STEPS(t)[1]
      expect(step2.target()).toBe(btn)
    })

    it('devrait retourner null si rien', () => {
      const step2 = TUTORIAL_STEPS(t)[1]
      expect(step2.target()).toBeNull()
    })
  })

  // ─── findFavoriteButton ────────────────────────────────────────────

  describe('findFavoriteButton (step3)', () => {
    it('devrait trouver par testid', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-testid', 'favorite-button')
      Object.defineProperty(btn, 'offsetParent', { get: () => document.body })
      document.body.appendChild(btn)

      const step3 = TUTORIAL_STEPS(t)[2]
      expect(step3.target()).toBe(btn)
    })

    it('fallback : devrait chercher une étoile dans la 1ère card', () => {
      const card = document.createElement('div')
      card.setAttribute('data-testid', 'sound-card-1')
      Object.defineProperty(card, 'offsetParent', { get: () => document.body })

      const star = document.createElement('i')
      star.className = 'ti ti-star'
      card.appendChild(star)

      document.body.appendChild(card)

      const step3 = TUTORIAL_STEPS(t)[2]
      const found = step3.target()
      expect(found).not.toBeNull()
    })
  })

  // ─── findDotsButton ────────────────────────────────────────────────

  describe('findDotsButton (step4)', () => {
    it('devrait trouver par testid', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-testid', 'dots-button')
      Object.defineProperty(btn, 'offsetParent', { get: () => document.body })
      document.body.appendChild(btn)

      const step4 = TUTORIAL_STEPS(t)[3]
      expect(step4.target()).toBe(btn)
    })
  })

  // ─── findProfilesSection ───────────────────────────────────────────

  describe('findProfilesSection (step5)', () => {
    it('devrait trouver la section avec testid', () => {
      const section = document.createElement('aside')
      section.setAttribute('data-testid', 'profiles-section')
      Object.defineProperty(section, 'offsetParent', { get: () => document.body })
      document.body.appendChild(section)

      const step5 = TUTORIAL_STEPS(t)[4]
      expect(step5.target()).toBe(section)
    })

    it('fallback : devrait retourner le sidebar', () => {
      const sidebar = document.createElement('aside')
      document.body.appendChild(sidebar)

      const step5 = TUTORIAL_STEPS(t)[4]
      expect(step5.target()).toBe(sidebar)
    })
  })

  // ─── findNewProfileButton ──────────────────────────────────────────

  describe('findNewProfileButton (step6)', () => {
    it('devrait trouver par testid', () => {
      const btn = document.createElement('button')
      btn.setAttribute('data-testid', 'new-profile-button')
      Object.defineProperty(btn, 'offsetParent', { get: () => document.body })
      document.body.appendChild(btn)

      const step6 = TUTORIAL_STEPS(t)[5]
      expect(step6.target()).toBe(btn)
    })
  })

  // ─── findSearchOrSortElement ───────────────────────────────────────

  describe('findSearchOrSortElement (step9)', () => {
    it('devrait trouver search-input', () => {
      const input = document.createElement('input')
      input.setAttribute('data-testid', 'search-input')
      document.body.appendChild(input)

      const step9 = TUTORIAL_STEPS(t)[8]
      expect(step9.target()).toBe(input)
    })

    it('fallback : devrait trouver le sort-select', () => {
      const select = document.createElement('select')
      select.setAttribute('data-testid', 'sort-select')
      document.body.appendChild(select)

      const step9 = TUTORIAL_STEPS(t)[8]
      expect(step9.target()).toBe(select)
    })
  })
})