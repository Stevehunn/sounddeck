import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import TimelinePlayhead from '@features/editor/components/Timeline/TimelinePlayhead'

describe('TimelinePlayhead', () => {
  const formatTime = vi.fn((s) => `${s}s`)

  it('devrait calculer left = currentTime * pixelsPerSecond', () => {
    const { container } = render(
      <TimelinePlayhead
        currentTime={3}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={formatTime}
      />
    )
    expect(container.firstChild.style.left).toBe('240px')
  })

  it('devrait avoir width=2px', () => {
    const { container } = render(
      <TimelinePlayhead
        currentTime={0}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={formatTime}
      />
    )
    expect(container.firstChild.style.width).toBe('2px')
  })

  it('devrait avoir zIndex 10', () => {
    const { container } = render(
      <TimelinePlayhead
        currentTime={0}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={formatTime}
      />
    )
    expect(container.firstChild.style.zIndex).toBe('10')
  })

  it('devrait avoir pointerEvents: none', () => {
    const { container } = render(
      <TimelinePlayhead
        currentTime={0}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={formatTime}
      />
    )
    expect(container.firstChild.style.pointerEvents).toBe('none')
  })

  it('devrait appeler formatTime avec currentTime', () => {
    const ft = vi.fn((s) => `${s}s`)
    render(
      <TimelinePlayhead
        currentTime={42}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={ft}
      />
    )
    expect(ft).toHaveBeenCalledWith(42)
  })

  it('devrait afficher le temps formaté', () => {
    const { getByText } = render(
      <TimelinePlayhead
        currentTime={7.5}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={formatTime}
      />
    )
    expect(getByText('7.5s')).toBeInTheDocument()
  })

  it('devrait afficher la tête (cercle)', () => {
    const { container } = render(
      <TimelinePlayhead
        currentTime={0}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={formatTime}
      />
    )
    const circle = container.querySelector('div[style*="border-radius: 50%"]')
    expect(circle).not.toBeNull()
  })

  it('devrait utiliser transition: none si isPlaying', () => {
    const { container } = render(
      <TimelinePlayhead
        currentTime={0}
        pixelsPerSecond={80}
        isPlaying={true}
        formatTime={formatTime}
      />
    )
    expect(container.firstChild.style.transition).toBe('none')
  })

  it('devrait avoir une transition left si non playing', () => {
    const { container } = render(
      <TimelinePlayhead
        currentTime={0}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={formatTime}
      />
    )
    expect(container.firstChild.style.transition).toContain('left')
  })

  it('devrait avoir un background accent', () => {
    const { container } = render(
      <TimelinePlayhead
        currentTime={0}
        pixelsPerSecond={80}
        isPlaying={false}
        formatTime={formatTime}
      />
    )
    expect(container.firstChild.style.background).toContain('var(--accent)')
  })
})