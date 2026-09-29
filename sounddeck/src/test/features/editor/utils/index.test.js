import { describe, it, expect } from 'vitest'
import {
  formatTime,
  getClipById,
  getTrackById,
  getTrackIndex,
  generateTrackColor,
} from '@features/editor/utils/index'

describe('formatTime (editor)', () => {
  it('devrait toujours formater en MM:SS', () => {
    expect(formatTime(45)).toBe('0:45')
    expect(formatTime(83)).toBe('1:23')
    expect(formatTime(125)).toBe('2:05')
  })
})

describe('getClipById', () => {
  const tracks = [
    { id: 't1', clips: [{ id: 'c1', name: 'Clip 1' }] },
    { id: 't2', clips: [{ id: 'c2', name: 'Clip 2' }] },
  ]

  it('devrait retourner le clip par son id', () => {
    expect(getClipById(tracks, 'c2')).toEqual({ id: 'c2', name: 'Clip 2' })
  })

  it('devrait retourner null si le clip n\'existe pas', () => {
    expect(getClipById(tracks, 'nonexistent')).toBeNull()
  })
})

describe('getTrackById', () => {
  const tracks = [
    { id: 't1', name: 'Track 1' },
    { id: 't2', name: 'Track 2' },
  ]

  it('devrait retourner la piste par son id', () => {
    expect(getTrackById(tracks, 't2')).toEqual({ id: 't2', name: 'Track 2' })
  })

  it('devrait retourner null si la piste n\'existe pas', () => {
    expect(getTrackById(tracks, 'nonexistent')).toBeNull()
  })
})

describe('getTrackIndex', () => {
  const tracks = [{ id: 't1' }, { id: 't2' }, { id: 't3' }]

  it('devrait retourner l\'index de la piste', () => {
    expect(getTrackIndex(tracks, 't2')).toBe(1)
  })

  it('devrait retourner -1 si la piste n\'existe pas', () => {
    expect(getTrackIndex(tracks, 'nonexistent')).toBe(-1)
  })
})

describe('generateTrackColor', () => {
  it('devrait retourner hsl(200, ...) pour index=0', () => {
    expect(generateTrackColor(0)).toBe('hsl(200, 60%, 50%)')
  })

  it('devrait boucler à 360°', () => {
    // (6 * 30 + 200) % 360 = 380 % 360 = 20
    expect(generateTrackColor(6)).toBe('hsl(20, 60%, 50%)')
  })
})