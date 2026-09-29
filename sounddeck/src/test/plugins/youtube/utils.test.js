import { describe, it, expect } from 'vitest'
import { formatDuration } from '@plugins/youtube/utils'

describe('formatDuration (youtube)', () => {
  it('devrait retourner "0:00" pour 0 (falsy)', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('devrait formater 45 secondes en "0:45"', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  it('devrait formater 60 secondes en "1:00"', () => {
    expect(formatDuration(60)).toBe('1:00')
  })

  it('devrait formater 125 secondes en "2:05"', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  it('devrait retourner "0:00" pour null/undefined/NaN', () => {
    expect(formatDuration(null)).toBe('0:00')
    expect(formatDuration(undefined)).toBe('0:00')
    expect(formatDuration(NaN)).toBe('0:00')
  })
})