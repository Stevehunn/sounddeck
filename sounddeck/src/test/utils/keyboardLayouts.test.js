import { describe, it, expect } from 'vitest'
import {
  PHYSICAL_TO_AZERTY,
  AZERTY_TO_PHYSICAL,
  getModifierLabel,
  displayKey,
  physicalKey,
} from '@shared/utils/keyboardLayouts'

describe('PHYSICAL_TO_AZERTY', () => {
  it('devrait être un objet non vide', () => {
    expect(Object.keys(PHYSICAL_TO_AZERTY).length).toBeGreaterThan(0)
  })

  it('devrait mapper Q physique → A affiché', () => {
    expect(PHYSICAL_TO_AZERTY['Q']).toBe('A')
  })

  it('devrait mapper A physique → Q affiché', () => {
    expect(PHYSICAL_TO_AZERTY['A']).toBe('Q')
  })

  it('devrait mapper W physique → Z affiché', () => {
    expect(PHYSICAL_TO_AZERTY['W']).toBe('Z')
  })
})

describe('AZERTY_TO_PHYSICAL', () => {
  it('devrait être un objet non vide', () => {
    expect(Object.keys(AZERTY_TO_PHYSICAL).length).toBeGreaterThan(0)
  })

  it('devrait mapper A affiché → Q physique', () => {
    expect(AZERTY_TO_PHYSICAL['A']).toBe('Q')
  })

  it('devrait mapper Z affiché → W physique', () => {
    expect(AZERTY_TO_PHYSICAL['Z']).toBe('W')
  })
})

describe('displayKey', () => {
  it('devrait convertir Q → A en AZERTY', () => {
    expect(displayKey('Q', 'azerty')).toBe('A')
  })

  it('devrait laisser Q inchangé en QWERTY', () => {
    expect(displayKey('Q', 'qwerty')).toBe('Q')
  })

  it('devrait laisser une touche inconnue inchangée', () => {
    expect(displayKey('F1', 'azerty')).toBe('F1')
  })

  it('devrait utiliser QWERTY par défaut', () => {
    expect(displayKey('Q')).toBe('Q')
  })
})

describe('physicalKey', () => {
  it('devrait convertir A → Q en AZERTY', () => {
    expect(physicalKey('A', 'azerty')).toBe('Q')
  })

  it('devrait laisser A inchangé en QWERTY', () => {
    expect(physicalKey('A', 'qwerty')).toBe('A')
  })
})

describe('getModifierLabel', () => {
  it('devrait retourner Ctrl pour CommandOrControl', () => {
    expect(getModifierLabel('CommandOrControl')).toBe('Ctrl')
  })

  it('devrait retourner Shift en QWERTY', () => {
    expect(getModifierLabel('Shift', 'qwerty')).toBe('Shift')
  })

  it('devrait retourner Maj en AZERTY', () => {
    expect(getModifierLabel('Shift', 'azerty')).toBe('Maj')
  })

  it('devrait retourner Alt inchangé', () => {
    expect(getModifierLabel('Alt')).toBe('Alt')
  })

  it('devrait retourner un modificateur inconnu inchangé', () => {
    expect(getModifierLabel('Meta')).toBe('Meta')
  })
})