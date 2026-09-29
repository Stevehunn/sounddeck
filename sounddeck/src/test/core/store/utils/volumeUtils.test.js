import { describe, it, expect } from 'vitest'
import {
  convertOldVolumeToDb,
  migrateSoundVolume,
} from '@core/store/utils/volumeUtils'

describe('convertOldVolumeToDb', () => {
  // ─── CAS LIMITES ────────────────────────────────────────────────────

  it('devrait retourner 0 pour null', () => {
    expect(convertOldVolumeToDb(null)).toBe(0)
  })

  it('devrait retourner 0 pour undefined', () => {
    expect(convertOldVolumeToDb(undefined)).toBe(0)
  })

  // ─── VALEURS DÉJÀ EN DB (passe-plat) ────────────────────────────────
  // ⚠️ Toute valeur dans [-24, 24] est considérée comme déjà en dB.
  // Cela inclut 0 (ambigu : 0 dB de l'ancienne échelle serait aussi 0).

  it('devrait laisser -12 inchangé (déjà en dB)', () => {
    expect(convertOldVolumeToDb(-12)).toBe(-12)
  })

  it('devrait laisser 12 inchangé (déjà en dB)', () => {
    expect(convertOldVolumeToDb(12)).toBe(12)
  })

  it('devrait laisser 0 inchangé (ambiguïté historique : 0 dB)', () => {
    // ⚠️ Comportement : 0 est dans la plage [-24, 24] → retourné tel quel.
    // C'est un bug potentiel (0 ancien ≠ 0 dB) mais c'est le comportement réel.
    expect(convertOldVolumeToDb(0)).toBe(0)
  })

  // ─── CONVERSION 0..100 → -24..+24 (hors plage dB) ───────────────────

  it('devrait convertir 25 → -12', () => {
    // (25-50)/50 * 24 = -12
    expect(convertOldVolumeToDb(25)).toBe(-12)
  })

  it('devrait convertir 50 → 0 (point médian)', () => {
    expect(convertOldVolumeToDb(50)).toBe(0)
  })

  it('devrait convertir 75 → 12', () => {
    // (75-50)/50 * 24 = 12
    expect(convertOldVolumeToDb(75)).toBe(12)
  })

  it('devrait convertir 100 → 24', () => {
    expect(convertOldVolumeToDb(100)).toBe(24)
  })

  it('devrait convertir 60 → 4.8', () => {
    // (60-50)/50 * 24 = 4.8
    expect(convertOldVolumeToDb(60)).toBe(4.8)
  })
})

describe('migrateSoundVolume', () => {
  it('devrait retourner null inchangé', () => {
    expect(migrateSoundVolume(null)).toBeNull()
  })

  it('devrait retourner un sound sans volumeDb inchangé si déjà migré', () => {
    const sound = { id: 'x', volumeDb: 5 }
    const result = migrateSoundVolume(sound)
    expect(result).toBe(sound)
  })

  it('devrait migrer un ancien volume vers volumeDb', () => {
    const sound = { id: 'x', volume: 50 }
    const result = migrateSoundVolume(sound)
    expect(result.volume).toBe(0)
    expect(result.volumeDb).toBe(0)
  })

  it('devrait utiliser 100 comme volume par défaut si absent', () => {
    const sound = { id: 'x' }
    const result = migrateSoundVolume(sound)
    // volume par défaut 100 → 24 dB
    expect(result.volumeDb).toBe(24)
  })
})