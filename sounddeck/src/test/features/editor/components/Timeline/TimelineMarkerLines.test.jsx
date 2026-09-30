import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('@shared/utils/format', () => ({
  formatTime: (s) => `${s}s`,
}))

import TimelineMarkerLines from '@features/editor/components/Timeline/TimelineMarkerLines'

describe('TimelineMarkerLines', () => {
  const createMarker = (o = {}) => ({
    id: 'm1',
    name: 'Intro',
    time: 5,
    color: '#3b82f6',
    ...o,
  })

  it('devrait retourner null si markers vide', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="timeline"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait retourner null si markers null', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={null}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="timeline"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  // ─── Variant "timeline" ─────────────────────────────────────────

  it('devrait rendre des lignes verticales pour variant=timeline', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[createMarker()]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="timeline"
      />
    )
    expect(container.querySelectorAll('div').length).toBe(1)
  })

  it('devrait positionner la ligne à time * pixelsPerSecond', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[createMarker({ time: 3 })]}
        pixelsPerSecond={100}
        totalWidth={2000}
        variant="timeline"
      />
    )
    expect(container.querySelector('div')?.style.left).toBe('300px')
  })

  it('devrait avoir width 2px', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[createMarker()]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="timeline"
      />
    )
    expect(container.querySelector('div')?.style.width).toBe('2px')
  })

  it('devrait skip les markers hors totalWidth', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[
          createMarker({ id: 'm1', time: 5 }),
          createMarker({ id: 'm2', time: 1000 }),
        ]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="timeline"
      />
    )
    expect(container.querySelectorAll('div').length).toBe(1)
  })

  // ✅ FIX : jsdom convertit #3b82f6 en rgb
  it('devrait utiliser la couleur du marker (hex → rgb)', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[createMarker({ color: '#ff0000' })]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="timeline"
      />
    )
    expect(container.querySelector('div')?.style.background).toBe(
      'rgb(255, 0, 0)'
    )
  })

  // ─── Variant "ruler" ────────────────────────────────────────────

  it('devrait rendre un triangle + label pour variant=ruler', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[createMarker()]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="ruler"
      />
    )
    const wrapper = container.querySelector('div')
    expect(wrapper).not.toBeNull()
    expect(container.innerHTML).toContain('border-top')
  })

  it('devrait afficher le nom du marker dans variant=ruler', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[createMarker({ name: 'Refrain' })]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="ruler"
      />
    )
    expect(container.textContent).toContain('Refrain')
  })

  it('devrait tronquer les noms > 8 caractères', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[createMarker({ name: 'VeryLongMarkerName' })]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="ruler"
      />
    )
    expect(container.textContent).toContain('VeryLong…')
  })

  // ✅ FIX : jsdom convertit #3b82f6 en rgb(59, 130, 246)
  it('devrait utiliser #3b82f6 si couleur absente (variant=ruler)', () => {
    const { container } = render(
      <TimelineMarkerLines
        markers={[createMarker({ color: undefined })]}
        pixelsPerSecond={80}
        totalWidth={2000}
        variant="ruler"
      />
    )
    // jsdom normalise les couleurs → on cherche la version rgb
    expect(container.innerHTML).toContain('rgb(59, 130, 246)')
  })
})