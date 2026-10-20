import { describe, it, expect } from 'vitest'
import { formatDuration } from './utils'

describe('youtube/utils', () => {
  describe('formatDuration', () => {
    it('devrait retourner "0:00" pour 0', () => {
      expect(formatDuration(0)).toBe('0:00')
    })

    it('devrait retourner "0:00" pour null', () => {
      expect(formatDuration(null)).toBe('0:00')
    })

    it('devrait retourner "0:00" pour undefined', () => {
      expect(formatDuration(undefined)).toBe('0:00')
    })

    it('devrait retourner "0:00" pour NaN', () => {
      expect(formatDuration(NaN)).toBe('0:00')
    })

    it('devrait retourner "0:00" pour une string non numérique', () => {
      expect(formatDuration('abc')).toBe('0:00')
    })

    it('devrait formater les secondes seules', () => {
      expect(formatDuration(45)).toBe('0:45')
      expect(formatDuration(9)).toBe('0:09')
    })

    it('devrait formater les minutes et secondes', () => {
      expect(formatDuration(60)).toBe('1:00')
      expect(formatDuration(125)).toBe('2:05')
      expect(formatDuration(605)).toBe('10:05')
    })

    it('devrait formater les heures en minutes', () => {
      expect(formatDuration(3600)).toBe('60:00')
      expect(formatDuration(7265)).toBe('121:05')
    })

    it('devrait arrondir vers le bas (floor)', () => {
      expect(formatDuration(45.9)).toBe('0:45')
      expect(formatDuration(59.99)).toBe('0:59')
    })
  })
})