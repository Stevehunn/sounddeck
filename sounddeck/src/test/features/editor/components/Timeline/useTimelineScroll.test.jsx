import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimelineScroll } from '@features/editor/components/Timeline/useTimelineScroll'

describe('useTimelineScroll', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('devrait initialiser scrollLeft à 0', () => {
    const { result } = renderHook(() => useTimelineScroll())
    expect(result.current.scrollLeft).toBe(0)
  })

  it('devrait exposer 4 refs (clips, ruler, rulerInner, loop)', () => {
    const { result } = renderHook(() => useTimelineScroll())
    expect(result.current.clipsContainerRef).toBeDefined()
    expect(result.current.rulerContainerRef).toBeDefined()
    expect(result.current.rulerInnerRef).toBeDefined()
    expect(result.current.loopContainerRef).toBeDefined()
  })

  it('devrait exposer handleClipsScroll et handleRulerWheel', () => {
    const { result } = renderHook(() => useTimelineScroll())
    expect(typeof result.current.handleClipsScroll).toBe('function')
    expect(typeof result.current.handleRulerWheel).toBe('function')
  })

  it('handleClipsScroll devrait mettre à jour scrollLeft', () => {
    const { result } = renderHook(() => useTimelineScroll())

    act(() => {
      result.current.handleClipsScroll({
        currentTarget: { scrollLeft: 150 },
      })
    })

    expect(result.current.scrollLeft).toBe(150)
  })

  it('handleClipsScroll devrait sync rulerInnerRef.style.transform', () => {
    const { result } = renderHook(() => useTimelineScroll())

    const fakeEl = { style: { transform: '' } }
    result.current.rulerInnerRef.current = fakeEl

    act(() => {
      result.current.handleClipsScroll({
        currentTarget: { scrollLeft: 200 },
      })
    })

    expect(fakeEl.style.transform).toBe('translateX(-200px)')
  })

  it('handleClipsScroll devrait sync loopContainerRef.style.transform', () => {
    const { result } = renderHook(() => useTimelineScroll())

    const fakeEl = { style: { transform: '' } }
    result.current.loopContainerRef.current = fakeEl

    act(() => {
      result.current.handleClipsScroll({
        currentTarget: { scrollLeft: 75 },
      })
    })

    expect(fakeEl.style.transform).toBe('translateX(-75px)')
  })

  it('handleClipsScroll devrait gérer refs null', () => {
    const { result } = renderHook(() => useTimelineScroll())

    expect(() => {
      act(() => {
        result.current.handleClipsScroll({
          currentTarget: { scrollLeft: 100 },
        })
      })
    }).not.toThrow()
  })

  it('handleRulerWheel devrait scroller clipsContainer si pas de ctrl', () => {
    const { result } = renderHook(() => useTimelineScroll())

    const fakeEl = { scrollLeft: 0 }
    result.current.clipsContainerRef.current = fakeEl

    const preventDefault = vi.fn()
    act(() => {
      result.current.handleRulerWheel({
        deltaY: 50,
        ctrlKey: false,
        metaKey: false,
        preventDefault,
      })
    })

    expect(fakeEl.scrollLeft).toBe(50)
    expect(preventDefault).toHaveBeenCalled()
  })

  it('handleRulerWheel devrait IGNORER si ctrlKey=true (zoom)', () => {
    const { result } = renderHook(() => useTimelineScroll())

    const fakeEl = { scrollLeft: 0 }
    result.current.clipsContainerRef.current = fakeEl

    const preventDefault = vi.fn()
    act(() => {
      result.current.handleRulerWheel({
        deltaY: 50,
        ctrlKey: true,
        metaKey: false,
        preventDefault,
      })
    })

    expect(fakeEl.scrollLeft).toBe(0)
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('handleRulerWheel devrait IGNORER si metaKey=true', () => {
    const { result } = renderHook(() => useTimelineScroll())

    const fakeEl = { scrollLeft: 0 }
    result.current.clipsContainerRef.current = fakeEl

    const preventDefault = vi.fn()
    act(() => {
      result.current.handleRulerWheel({
        deltaY: 50,
        ctrlKey: false,
        metaKey: true,
        preventDefault,
      })
    })

    expect(fakeEl.scrollLeft).toBe(0)
    expect(preventDefault).not.toHaveBeenCalled()
  })

  it('handleRulerWheel devrait gérer clipsContainerRef null', () => {
    const { result } = renderHook(() => useTimelineScroll())

    const preventDefault = vi.fn()
    expect(() => {
      act(() => {
        result.current.handleRulerWheel({
          deltaY: 50,
          ctrlKey: false,
          metaKey: false,
          preventDefault,
        })
      })
    }).not.toThrow()
  })
})