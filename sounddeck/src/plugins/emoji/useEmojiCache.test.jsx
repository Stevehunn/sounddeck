// src/plugins/emoji/useEmojiCache.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEmojiCache } from './useEmojiCache'

describe('useEmojiCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devrait retourner get/set/getInfo/clear', () => {
    const { result } = renderHook(() => useEmojiCache())
    expect(typeof result.current.get).toBe('function')
    expect(typeof result.current.set).toBe('function')
    expect(typeof result.current.getInfo).toBe('function')
    expect(typeof result.current.clear).toBe('function')
  })

  it('get devrait retourner null pour catégorie absente', () => {
    const { result } = renderHook(() => useEmojiCache())
    expect(result.current.get('missing')).toBeNull()
  })

  it('set puis get devrait retourner les emojis', () => {
    const { result } = renderHook(() => useEmojiCache())
    act(() => {
      result.current.set('smileys', ['😀', '😃'])
    })
    expect(result.current.get('smileys')).toEqual(['😀', '😃'])
  })

  it('getInfo devrait retourner le compte par catégorie', () => {
    const { result } = renderHook(() => useEmojiCache())
    act(() => {
      result.current.set('smileys', ['😀', '😃'])
      result.current.set('flags', ['🏁'])
    })
    const info = result.current.getInfo()
    expect(info.smileys.count).toBe(2)
    expect(info.smileys.cached).toBe(true)
    expect(info.flags.count).toBe(1)
  })

  it('clear devrait vider tout le cache', () => {
    const { result } = renderHook(() => useEmojiCache())
    act(() => {
      result.current.set('smileys', ['😀'])
      result.current.clear()
    })
    expect(result.current.get('smileys')).toBeNull()
    expect(result.current.getInfo()).toEqual({})
  })

  it('devrait expirer le cache après 24h', () => {
    const { result } = renderHook(() => useEmojiCache())
    act(() => {
      result.current.set('smileys', ['😀'])
    })
    vi.advanceTimersByTime(25 * 60 * 60 * 1000)
    expect(result.current.get('smileys')).toBeNull()
  })

  it('ne devrait PAS expirer avant 24h', () => {
    const { result } = renderHook(() => useEmojiCache())
    act(() => {
      result.current.set('smileys', ['😀'])
    })
    vi.advanceTimersByTime(23 * 60 * 60 * 1000)
    expect(result.current.get('smileys')).toEqual(['😀'])
  })

  it('getInfo devrait ignorer les entrées expirées', () => {
    const { result } = renderHook(() => useEmojiCache())
    act(() => {
      result.current.set('smileys', ['😀'])
    })
    vi.advanceTimersByTime(25 * 60 * 60 * 1000)
    expect(result.current.getInfo()).toEqual({})
  })

  it('should reset cache on unmount (nouveau renderHook)', () => {
    const { result, unmount } = renderHook(() => useEmojiCache())
    act(() => {
      result.current.set('smileys', ['😀'])
    })
    unmount()

    const { result: newResult } = renderHook(() => useEmojiCache())
    expect(newResult.current.get('smileys')).toBeNull()
  })

  it('les fonctions devraient être stables (useMemo)', () => {
    const { result, rerender } = renderHook(() => useEmojiCache())
    const firstGet = result.current.get
    const firstSet = result.current.set
    rerender()
    expect(result.current.get).toBe(firstGet)
    expect(result.current.set).toBe(firstSet)
  })
})