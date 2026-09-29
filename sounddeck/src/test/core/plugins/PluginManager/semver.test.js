import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  semverSatisfies,
  checkCompatibility,
} from '@core/plugins/PluginManager/semver'

describe('semverSatisfies', () => {
  // ─── OPÉRATEUR >= ────────────────────────────────────────────────────

  it('devrait satisfaire ">=1.0.0" pour la version 1.3.0', () => {
    expect(semverSatisfies('1.3.0', '>=1.0.0')).toBe(true)
  })

  it('ne devrait pas satisfaire ">=2.0.0" pour la version 1.3.0', () => {
    expect(semverSatisfies('1.3.0', '>=2.0.0')).toBe(false)
  })

  // ─── OPÉRATEUR <= ────────────────────────────────────────────────────

  it('devrait satisfaire "<=1.5.0" pour la version 1.3.0', () => {
    expect(semverSatisfies('1.3.0', '<=1.5.0')).toBe(true)
  })

  // ─── OPÉRATEUR > ─────────────────────────────────────────────────────

  it('ne devrait pas satisfaire ">1.3.0" pour la version 1.3.0 (strict)', () => {
    expect(semverSatisfies('1.3.0', '>1.3.0')).toBe(false)
  })

  // ─── OPÉRATEUR < ─────────────────────────────────────────────────────

  it('devrait satisfaire "<2.0.0" pour la version 1.5.0', () => {
    expect(semverSatisfies('1.5.0', '<2.0.0')).toBe(true)
  })

  // ─── OPÉRATEUR = (explicite) ─────────────────────────────────────────

  it('devrait satisfaire "=1.3.0" pour la version 1.3.0', () => {
    expect(semverSatisfies('1.3.0', '=1.3.0')).toBe(true)
  })

  // ─── SANS OPÉRATEUR (défaut '=') ─────────────────────────────────────

  it('devrait utiliser "=" par défaut sans opérateur', () => {
    expect(semverSatisfies('1.3.0', '1.3.0')).toBe(true)
    expect(semverSatisfies('1.3.0', '1.4.0')).toBe(false)
  })

  // ─── COMPARAISON NUMÉRIQUE (pas lexicographique) ─────────────────────

  it('devrait comparer 1.10.0 > 1.9.0 numériquement', () => {
    expect(semverSatisfies('1.10.0', '>1.9.0')).toBe(true)
  })

  // ─── LONGUEURS DIFFÉRENTES (remplies avec 0) ─────────────────────────

  it('devrait considérer 1.0 et 1.0.0 comme équivalents', () => {
    expect(semverSatisfies('1.0', '1.0.0')).toBe(true)
    expect(semverSatisfies('1.0.0', '1.0')).toBe(true)
  })
})

describe('checkCompatibility', () => {
  let warnSpy

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('devrait retourner true si le plugin n\'a pas de champ requires', () => {
    expect(checkCompatibility({ id: 'test' })).toBe(true)
  })

  it('devrait retourner true si la version de l\'app satisfait le requires', () => {
    expect(
      checkCompatibility(
        { id: 'test', requires: '>=1.0.0' },
        '1.3.0'
      )
    ).toBe(true)
  })

  it('devrait retourner false si la version est incompatible', () => {
    expect(
      checkCompatibility(
        { id: 'test', requires: '>=2.0.0' },
        '1.3.0'
      )
    ).toBe(false)
  })
})