// src/test/utils/keyboardLayouts.test.js
import { describe, it, expect } from 'vitest'
import {
  PHYSICAL_TO_AZERTY,
  AZERTY_TO_PHYSICAL,
  getModifierLabel,
  displayKey,
  physicalKey,
} from '@shared/utils/keyboardLayouts'

describe('PHYSICAL_TO_AZERTY', () => {
  it('mappe les lettres principales', () => {
    expect(PHYSICAL_TO_AZERTY['Q']).toBe('A')
    expect(PHYSICAL_TO_AZERTY['W']).toBe('Z')
    expect(PHYSICAL_TO_AZERTY['A']).toBe('Q')
    expect(PHYSICAL_TO_AZERTY['Z']).toBe('W')
    expect(PHYSICAL_TO_AZERTY['M']).toBe('M') // inchangé
  })

  it('mappe les chiffres', () => {
    expect(PHYSICAL_TO_AZERTY['1']).toBe('&')
    expect(PHYSICAL_TO_AZERTY['2']).toBe('é')
    expect(PHYSICAL_TO_AZERTY['3']).toBe('"')
    expect(PHYSICAL_TO_AZERTY['0']).toBe('à')
  })

  it('mappe la ponctuation', () => {
    expect(PHYSICAL_TO_AZERTY[';']).toBe('M')
    expect(PHYSICAL_TO_AZERTY["'"]).toBe('ù')
    expect(PHYSICAL_TO_AZERTY['/']).toBe('!')
  })
})

describe('AZERTY_TO_PHYSICAL', () => {
  it('est l\'inverse de PHYSICAL_TO_AZERTY', () => {
    expect(AZERTY_TO_PHYSICAL['A']).toBe('Q')
    expect(AZERTY_TO_PHYSICAL['Z']).toBe('W')
    expect(AZERTY_TO_PHYSICAL['Q']).toBe('A')
  })

  it('ne contient QUE les majuscules (les valeurs de PHYSICAL_TO_AZERTY sont uppercase)', () => {
    // Les valeurs azerty dans PHYSICAL_TO_AZERTY sont 'A', 'Z', 'Q'...
    // La condition `azerty.match(/[a-z]/)` ne matche jamais → pas de lowercase.
    expect(AZERTY_TO_PHYSICAL['A']).toBe('Q')
    expect(AZERTY_TO_PHYSICAL['Z']).toBe('W')
    expect(AZERTY_TO_PHYSICAL['Q']).toBe('A')
    expect(AZERTY_TO_PHYSICAL['a']).toBeUndefined()
    expect(AZERTY_TO_PHYSICAL['z']).toBeUndefined()
  })

  it('retourne undefined pour un caractère inconnu', () => {
    expect(AZERTY_TO_PHYSICAL['🚀']).toBeUndefined()
  })
})

describe('getModifierLabel', () => {
  it('CommandOrControl → Ctrl', () => {
    expect(getModifierLabel('CommandOrControl')).toBe('Ctrl')
  })

  it('Shift → Shift en qwerty', () => {
    expect(getModifierLabel('Shift', 'qwerty')).toBe('Shift')
  })

  it('Shift → Maj en azerty', () => {
    expect(getModifierLabel('Shift', 'azerty')).toBe('Maj')
  })

  it('Alt → Alt', () => {
    expect(getModifierLabel('Alt')).toBe('Alt')
  })

  it('modificateur inconnu retourné tel quel', () => {
    expect(getModifierLabel('Meta')).toBe('Meta')
  })

  it('qwerty par défaut', () => {
    expect(getModifierLabel('Shift')).toBe('Shift')
  })
})

describe('displayKey', () => {
  it('qwerty : retourne la touche telle quelle', () => {
    expect(displayKey('Q', 'qwerty')).toBe('Q')
    expect(displayKey('A', 'qwerty')).toBe('A')
  })

  it('azerty : convertit Q → A', () => {
    expect(displayKey('Q', 'azerty')).toBe('A')
    expect(displayKey('A', 'azerty')).toBe('Q')
    expect(displayKey('W', 'azerty')).toBe('Z')
  })

  it('azerty : retourne la touche si non mappée', () => {
    expect(displayKey('F1', 'azerty')).toBe('F1')
    expect(displayKey('Enter', 'azerty')).toBe('Enter')
  })

  it('qwerty par défaut', () => {
    expect(displayKey('Q')).toBe('Q')
  })
})

describe('physicalKey', () => {
  it('qwerty : retourne la touche telle quelle', () => {
    expect(physicalKey('A', 'qwerty')).toBe('A')
  })

  it('azerty : convertit A → Q', () => {
    expect(physicalKey('A', 'azerty')).toBe('Q')
    expect(physicalKey('Z', 'azerty')).toBe('W')
  })

  it('azerty : retourne la touche si non mappée', () => {
    expect(physicalKey('Enter', 'azerty')).toBe('Enter')
  })

  it('qwerty par défaut', () => {
    expect(physicalKey('A')).toBe('A')
  })
})