import { describe, it, expect } from 'vitest'
import { CARD_SIZES, getCardSize } from '@shared/constants/cardSizes'

describe('CARD_SIZES', () => {
  it('devrait exposer 3 tailles', () => {
    expect(Object.keys(CARD_SIZES).sort()).toEqual(['large', 'medium', 'small'])
  })

  it('devrait définir small=90, medium=110, large=140', () => {
    expect(CARD_SIZES.small).toBe(90)
    expect(CARD_SIZES.medium).toBe(110)
    expect(CARD_SIZES.large).toBe(140)
  })
})

describe('getCardSize', () => {
  it('devrait retourner medium par défaut', () => {
    expect(getCardSize()).toBe(110)
  })

  it('devrait retourner la taille demandée', () => {
    expect(getCardSize('small')).toBe(90)
    expect(getCardSize('large')).toBe(140)
  })

  it('devrait retourner medium pour une taille inconnue', () => {
    expect(getCardSize('unknown')).toBe(110)
  })

  it('devrait retourner medium pour null', () => {
    // null n'active PAS la default value (= undefined seulement)
    // mais CARD_SIZES[null] est undefined → fallback
    expect(getCardSize(null)).toBe(110)
  })
})