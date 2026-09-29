import { describe, it, expect } from 'vitest'
import { formatTime, formatMMSS } from '@shared/utils/format'

describe('formatTime', () => {
  // ─── CAS LIMITES / GARDE-FOUS ────────────────────────────────────────

  it('devrait retourner "0:00" pour null', () => {
    expect(formatTime(null)).toBe('0:00')
  })

  it('devrait retourner "0:00" pour undefined', () => {
    expect(formatTime(undefined)).toBe('0:00')
  })

  it('devrait retourner "0:00" pour NaN', () => {
    expect(formatTime(NaN)).toBe('0:00')
  })

  it('devrait retourner "0:00" pour un nombre négatif', () => {
    expect(formatTime(-5)).toBe('0:00')
  })

  // ─── FORMAT PAR DÉFAUT ──────────────────────────────────────────────

  it('devrait afficher "1:23" pour 83 secondes', () => {
    expect(formatTime(83)).toBe('1:23')
  })

  it('devrait afficher "45.3s" pour 45.3 secondes (auto < 60s)', () => {
    // Sans option, le mode auto affiche "s" avec 1 décimale si < 60s
    expect(formatTime(45.3)).toBe('45.3s')
  })

  // ─── OPTION alwaysMMSS ──────────────────────────────────────────────

  it('devrait afficher "0:45" pour 45 secondes avec alwaysMMSS', () => {
    expect(formatTime(45, { alwaysMMSS: true })).toBe('0:45')
  })

  // ─── OPTION decimals ────────────────────────────────────────────────

  it('devrait afficher "1:23.4" avec decimals=1', () => {
    expect(formatTime(83.456, { decimals: 1 })).toBe('1:23.4')
  })

  it('devrait afficher "1:23.45" avec decimals=2', () => {
    expect(formatTime(83.456, { decimals: 2 })).toBe('1:23.45')
  })

  // ─── OPTION short ───────────────────────────────────────────────────

  it('devrait afficher "45s" avec short=true', () => {
    expect(formatTime(45.3, { short: true })).toBe('45s')
  })

  it('devrait afficher "83s" avec short=true pour 83s (ignore les minutes)', () => {
    // ⚠️ short = secondes seules, pas de minutes
    expect(formatTime(83.3, { short: true })).toBe('23s')
  })

  // ─── OPTION noDecimals ──────────────────────────────────────────────

  it('devrait afficher "45s" avec noDecimals=true pour 45.3s', () => {
    expect(formatTime(45.3, { noDecimals: true })).toBe('45s')
  })

  // ─── FORMAT "0:00" POUR ZÉRO ────────────────────────────────────────

  it('devrait gérer 0 secondes sans planter', () => {
    // Comportement actuel : "0.0s" (mode auto < 60s)
    expect(formatTime(0)).toBe('0.0s')
  })
})

describe('formatMMSS', () => {
  it('devrait toujours formater en MM:SS', () => {
    expect(formatMMSS(45)).toBe('0:45')
    expect(formatMMSS(83)).toBe('1:23')
    expect(formatMMSS(125.7)).toBe('2:05')
  })

  it('devrait retourner "0:00" pour null', () => {
    expect(formatMMSS(null)).toBe('0:00')
  })
})