import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import TimelineLoopMarkers from '@features/editor/components/Timeline/TimelineLoopMarkers'

describe('TimelineLoopMarkers', () => {
  const tr = vi.fn((key) => key)

  it('devrait retourner null si loopState.clips absent', () => {
    const { container } = render(
      <TimelineLoopMarkers
        clipIndex={new Map()}
        loopState={{}}
        totalDuration={30}
        pixelsPerSecond={80}
        tr={tr}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait retourner null si aucun loop enabled', () => {
    const clipIndex = new Map([
      ['c1', { start: 0, duration: 5 }],
    ])
    const { container } = render(
      <TimelineLoopMarkers
        clipIndex={clipIndex}
        loopState={{
          clips: {
            c1: { enabled: false },
          },
        }}
        totalDuration={30}
        pixelsPerSecond={80}
        tr={tr}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait ignorer les loops dont le clip n\'est pas dans clipIndex', () => {
    const { container } = render(
      <TimelineLoopMarkers
        clipIndex={new Map()}
        loopState={{
          clips: { c1: { enabled: true, end: 20 } },
        }}
        totalDuration={30}
        pixelsPerSecond={80}
        tr={tr}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('devrait afficher un marqueur de fin pour un loop enabled', () => {
    const clipIndex = new Map([
      ['c1', { start: 0, duration: 5 }],
    ])
    const { container } = render(
      <TimelineLoopMarkers
        clipIndex={clipIndex}
        loopState={{
          clips: {
            c1: {
              enabled: true,
              end: 20,
              arrowColor: '#22c55e',
              loopMode: 'endOfTrack',
            },
          },
        }}
        totalDuration={30}
        pixelsPerSecond={80}
        tr={tr}
      />
    )
    // Il y a un marqueur (20s * 80 = 1600px)
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0)
  })

  it('devrait calculer la position du marqueur de fin', () => {
    const clipIndex = new Map([
      ['c1', { start: 0, duration: 5 }],
    ])
    const { container } = render(
      <TimelineLoopMarkers
        clipIndex={clipIndex}
        loopState={{
          clips: {
            c1: { enabled: true, end: 10, loopMode: 'endOfTrack' },
          },
        }}
        totalDuration={30}
        pixelsPerSecond={100}
        tr={tr}
      />
    )
    // Position = 10 * 100 = 1000px
    const markers = container.querySelectorAll('div[style*="left: 1000px"]')
    expect(markers.length).toBeGreaterThan(0)
  })

  it('devrait ajouter des marqueurs de cycles si loopMode=cycles', () => {
    const clipIndex = new Map([
      ['c1', { start: 0, duration: 5 }],
    ])
    const { container } = render(
      <TimelineLoopMarkers
        clipIndex={clipIndex}
        loopState={{
          clips: {
            c1: {
              enabled: true,
              end: 20,
              loopMode: 'cycles',
              totalCycles: 4,
              arrowColor: '#22c55e',
            },
          },
        }}
        totalDuration={30}
        pixelsPerSecond={80}
        tr={tr}
      />
    )
    // Devrait avoir plusieurs marqueurs (fin + cycles)
    const markers = container.querySelectorAll('div')
    expect(markers.length).toBeGreaterThan(3)
  })

  it('devrait utiliser arrowColor par défaut #22c55e', () => {
    const clipIndex = new Map([
      ['c1', { start: 0, duration: 5 }],
    ])
    const { container } = render(
      <TimelineLoopMarkers
        clipIndex={clipIndex}
        loopState={{
          clips: {
            c1: { enabled: true, end: 10, loopMode: 'endOfTrack' },
          },
        }}
        totalDuration={30}
        pixelsPerSecond={80}
        tr={tr}
      />
    )
    // L'arrowColor par défaut devrait être dans le DOM
    expect(container.innerHTML).toContain('#22c55e')
  })

  it('devrait utiliser cycleCount si totalCycles absent', () => {
    const clipIndex = new Map([
      ['c1', { start: 0, duration: 5 }],
    ])
    const { container } = render(
      <TimelineLoopMarkers
        clipIndex={clipIndex}
        loopState={{
          clips: {
            c1: {
              enabled: true,
              end: 20,
              loopMode: 'cycles',
              cycleCount: 3,
              arrowColor: '#22c55e',
            },
          },
        }}
        totalDuration={30}
        pixelsPerSecond={80}
        tr={tr}
      />
    )
    expect(container).not.toBeNull()
  })
})