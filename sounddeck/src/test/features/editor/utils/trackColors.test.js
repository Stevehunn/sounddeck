import { describe, it, expect } from 'vitest'
import {
  TRACK_COLORS,
  getTrackColor,
} from '@features/editor/utils/trackColors'

describe('TRACK_COLORS', () => {
  it('devrait contenir 8 couleurs', () => {
    expect(TRACK_COLORS.length).toBe(8)
  })

  it('chaque couleur devrait être au format hsl()', () => {
    for (const color of TRACK_COLORS) {
      expect(color).toMatch(/^hsl\(\d+, 70%, 55%\)$/)
    }
  })
})

describe('getTrackColor', () => {
  it('devrait retourner la couleur correspondant à l\'index', () => {
    expect(getTrackColor(0)).toBe(TRACK_COLORS[0])
    expect(getTrackColor(3)).toBe(TRACK_COLORS[3])
  })

  it('devrait wraper (modulo) pour des index > longueur', () => {
    expect(getTrackColor(8)).toBe(TRACK_COLORS[0])
    expect(getTrackColor(10)).toBe(TRACK_COLORS[2])
  })
})