import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import ClipFadeHandles from '@features/editor/components/Clip/ClipFadeHandles'

describe('ClipFadeHandles', () => {
  let rafQueue
  let rafId

  const createClip = (overrides = {}) => ({
    id: 'c1',
    name: 'Clip',
    fadeIn: 0,
    fadeOut: 0,
    ...overrides,
  })

  const defaultProps = {
    clip: createClip(),
    trackId: 't1',
    isSelected: false,
    isHovering: false,
    onFade: vi.fn(),
    pixelsPerSecond: 80,
  }

  beforeEach(() => {
    rafQueue = []
    rafId = 0

    global.requestAnimationFrame = vi.fn((cb) => {
      rafId++
      rafQueue.push({ id: rafId, cb })
      return rafId
    })

    global.cancelAnimationFrame = vi.fn((id) => {
      rafQueue = rafQueue.filter((item) => item.id !== id)
    })

    // performance.now : avance de 100ms à chaque appel
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => {
      now += 100
      return now
    })

    // getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 0,
      right: 400,
      bottom: 60,
      width: 300,
      height: 60,
      x: 100,
      y: 0,
    }))
  })

  const flushRafs = () => {
    const toRun = [...rafQueue]
    rafQueue = []
    for (const item of toRun) {
      item.cb()
    }
  }

  it('devrait retourner null si ni sélectionné ni hover', () => {
    const { container } = render(<ClipFadeHandles {...defaultProps} />)
    expect(container.firstChild).toBeNull()
  })

  it('devrait rendre les poignées si sélectionné', () => {
    const { container } = render(
      <ClipFadeHandles {...defaultProps} isSelected />
    )
    const handles = container.querySelectorAll('div[style*="cursor: ew-resize"]')
    expect(handles.length).toBeGreaterThan(0)
  })

  it('ne devrait PAS rendre la zone fadeIn si fadeIn = 0', () => {
    const { container } = render(
      <ClipFadeHandles {...defaultProps} isSelected />
    )
    const zones = container.querySelectorAll('div[style*="linear-gradient"]')
    expect(zones).toHaveLength(0)
  })

  it('devrait rendre la zone fadeIn si fadeIn > 0', () => {
    const clip = createClip({ fadeIn: 1 })
    const { container } = render(
      <ClipFadeHandles {...defaultProps} clip={clip} isSelected />
    )
    const zones = container.querySelectorAll('div[style*="linear-gradient"]')
    expect(zones.length).toBeGreaterThanOrEqual(1)
  })

  it('devrait rendre la zone fadeOut si fadeOut > 0', () => {
    const clip = createClip({ fadeOut: 2 })
    const { container } = render(
      <ClipFadeHandles {...defaultProps} clip={clip} isSelected />
    )
    const zones = container.querySelectorAll('div[style*="linear-gradient"]')
    expect(zones.length).toBeGreaterThanOrEqual(1)
  })

  it('devrait rendre les 2 zones si fadeIn et fadeOut', () => {
    const clip = createClip({ fadeIn: 1, fadeOut: 2 })
    const { container } = render(
      <ClipFadeHandles {...defaultProps} clip={clip} isSelected />
    )
    const zones = container.querySelectorAll('div[style*="linear-gradient"]')
    expect(zones).toHaveLength(2)
  })

  it('devrait calculer la largeur fadeIn en pixels', () => {
    const clip = createClip({ fadeIn: 1 })
    const { container } = render(
      <ClipFadeHandles
        {...defaultProps}
        clip={clip}
        isSelected
        pixelsPerSecond={100}
      />
    )
    const zone = container.querySelector('div[style*="linear-gradient"]')
    // 1 * 100 = 100px
    expect(zone?.style.width).toBe('100px')
  })

  it('devrait calculer la largeur fadeOut en pixels', () => {
    const clip = createClip({ fadeOut: 0.5 })
    const { container } = render(
      <ClipFadeHandles
        {...defaultProps}
        clip={clip}
        isSelected
        pixelsPerSecond={100}
      />
    )
    const zone = container.querySelector('div[style*="linear-gradient"]')
    // 0.5 * 100 = 50px
    expect(zone?.style.width).toBe('50px')
  })

  it('devrait appeler onFade au mouseup après un drag', () => {
    const onFade = vi.fn()
    const clip = createClip({ fadeIn: 0 })
    const { container } = render(
      <ClipFadeHandles
        {...defaultProps}
        clip={clip}
        isSelected
        isHovering
        onFade={onFade}
      />
    )

    const handles = container.querySelectorAll('div[style*="cursor: ew-resize"]')
    const fadeInHandle = handles[0]

    act(() => {
      fireEvent.mouseDown(fadeInHandle, { clientX: 100 })
    })

    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200 }))
      flushRafs()
    })

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(onFade).toHaveBeenCalled()
    const [calledClipId, calledEdge] = onFade.mock.calls[0]
    expect(calledClipId).toBe('c1')
    expect(calledEdge).toBe('in')
  })

  it('devrait calculer la valeur au mouseup (flush final)', () => {
    const onFade = vi.fn()
    const clip = createClip({ fadeIn: 0 })
    const { container } = render(
      <ClipFadeHandles
        {...defaultProps}
        clip={clip}
        isSelected
        isHovering
        pixelsPerSecond={100}
        onFade={onFade}
      />
    )

    const handles = container.querySelectorAll('div[style*="cursor: ew-resize"]')
    const fadeInHandle = handles[0]

    act(() => {
      fireEvent.mouseDown(fadeInHandle, { clientX: 100 })
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 250 }))
      flushRafs()
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    // clientX 250 - left 100 = 150 → 150 / 100 = 1.5
    const lastCall = onFade.mock.calls[onFade.mock.calls.length - 1]
    expect(lastCall[2]).toBeCloseTo(1.5, 1)
  })

  it('devrait stopPropagation au mousedown', () => {
    const { container } = render(
      <ClipFadeHandles {...defaultProps} isSelected isHovering />
    )
    const handles = container.querySelectorAll('div[style*="cursor: ew-resize"]')
    const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    const stopSpy = vi.spyOn(e, 'stopPropagation')
    handles[0].dispatchEvent(e)
    expect(stopSpy).toHaveBeenCalled()
  })

  it('devrait retirer les listeners au mouseup', () => {
    const { container } = render(
      <ClipFadeHandles {...defaultProps} isSelected isHovering />
    )
    const handles = container.querySelectorAll('div[style*="cursor: ew-resize"]')

    const removeSpy = vi.spyOn(document, 'removeEventListener')

    act(() => {
      fireEvent.mouseDown(handles[0], { clientX: 100 })
      document.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
  })
})