import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import TimelineRuler from '@features/editor/components/Timeline/TimelineRuler'

describe('TimelineRuler', () => {
  const formatTime = vi.fn((s) => `${s}s`)

  const renderRuler = (overrides = {}) => {
    const props = {
      totalDuration: 10,
      pixelsPerSecond: 80,
      zoomLevel: 1,
      formatTime,
      ...overrides,
    }
    return render(<TimelineRuler {...props} />)
  }

  const countMarks = (container) =>
    container.querySelectorAll('div[style*="position: absolute"]').length

  it('devrait rendre un conteneur sticky', () => {
    const { container } = renderRuler()
    expect(container.firstChild.style.position).toBe('sticky')
  })

  it('devrait avoir height 36px', () => {
    const { container } = renderRuler()
    expect(container.firstChild.style.height).toBe('36px')
  })

  it('devrait rendre des marques à chaque step', () => {
    const { container } = renderRuler({ totalDuration: 10, zoomLevel: 1 })
    // Step = 1 à zoom 1 → 11 marques (0..10)
    expect(countMarks(container)).toBe(11)
  })

  // ✅ FIX : formatTime n'est appelé que pour les "main marks"
  //    isMain = time % 5 === 0 || step >= 5
  //    Donc pour step >= 5, toutes les marques sont "main"

  it('devrait utiliser step=60 si zoomLevel < 0.08', () => {
    const { container } = renderRuler({ zoomLevel: 0.05, totalDuration: 120 })
    // step=60 → marks 0, 60, 120 = 3 marques
    expect(countMarks(container)).toBe(3)
  })

  it('devrait utiliser step=30 si zoomLevel < 0.15', () => {
    const { container } = renderRuler({ zoomLevel: 0.1, totalDuration: 60 })
    // step=30 → marks 0, 30, 60 = 3 marques
    expect(countMarks(container)).toBe(3)
  })

  it('devrait utiliser step=10 si zoomLevel < 0.3', () => {
    const { container } = renderRuler({ zoomLevel: 0.2, totalDuration: 30 })
    // step=10 → marks 0, 10, 20, 30 = 4 marques
    expect(countMarks(container)).toBe(4)
  })

  it('devrait utiliser step=5 si zoomLevel < 0.6', () => {
    const { container } = renderRuler({ zoomLevel: 0.4, totalDuration: 15 })
    // step=5 → marks 0, 5, 10, 15 = 4 marques
    expect(countMarks(container)).toBe(4)
  })

  it('devrait utiliser step=1 si zoomLevel < 1.5', () => {
    const { container } = renderRuler({ zoomLevel: 1, totalDuration: 10 })
    // step=1 → 11 marques
    expect(countMarks(container)).toBe(11)
  })

  it('devrait utiliser step=0.5 si zoomLevel < 3', () => {
    const { container } = renderRuler({ zoomLevel: 2, totalDuration: 4 })
    // step=0.5, duration=4 → marks 0, 0.5, 1, ..., 4 = 9 marques
    expect(countMarks(container)).toBe(9)
  })

  it('devrait utiliser step=0.1 si zoomLevel >= 3', () => {
    const { container } = renderRuler({ zoomLevel: 3, totalDuration: 1 })
    // step=0.1, duration=1 → marks 0, 0.1, ..., 1 = 11 marques
    expect(countMarks(container)).toBe(11)
  })

  // ✅ FIX : formatTime est appelé pour les "main marks" (t % 5 === 0 ou step >= 5)
  it('devrait appeler formatTime sur les main marks (t % 5 === 0)', () => {
    const ft = vi.fn((s) => `${s}s`)
    renderRuler({ zoomLevel: 1, totalDuration: 10, formatTime: ft })
    const calls = ft.mock.calls.map((c) => c[0])
    // step=1 → main = 0, 5, 10
    expect(calls).toContain(0)
    expect(calls).toContain(5)
    expect(calls).toContain(10)
  })

  it('devrait appeler formatTime sur TOUTES les marks si step >= 5', () => {
    const ft = vi.fn((s) => `${s}s`)
    renderRuler({ zoomLevel: 0.4, totalDuration: 15, formatTime: ft })
    // step=5 → toutes les marks sont main
    const calls = ft.mock.calls.map((c) => c[0])
    expect(calls).toContain(0)
    expect(calls).toContain(5)
    expect(calls).toContain(10)
    expect(calls).toContain(15)
  })

  it('devrait positionner les marques à time * pixelsPerSecond', () => {
    const { container } = renderRuler({
      totalDuration: 5,
      pixelsPerSecond: 100,
      zoomLevel: 1,
    })
    // La marque 1s doit être à left 100px
    const mark = Array.from(
      container.querySelectorAll('div[style*="position: absolute"]')
    ).find((el) => el.style.left === '100px')
    expect(mark).not.toBeUndefined()
  })

  it('devrait avoir la classe TimelineRuler.displayName', () => {
    expect(TimelineRuler.displayName).toBe('TimelineRuler')
  })

  it('ne devrait PAS avoir de playhead intégré (fix S.A/B33)', () => {
    const { container } = renderRuler()
    // Le playhead est retiré du ruler
    const playheadCandidates = container.querySelectorAll(
      'div[style*="box-shadow: rgba(124, 111, 247"]'
    )
    expect(playheadCandidates.length).toBe(0)
  })
})