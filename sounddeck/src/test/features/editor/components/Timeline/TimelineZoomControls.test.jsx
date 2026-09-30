import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'

vi.mock('@shared/utils/format', () => ({
  formatTime: (s) => `${s}s`,
}))

import TimelineZoomControls from '@features/editor/components/Timeline/TimelineZoomControls'

describe('TimelineZoomControls', () => {
  // ✅ FIX : gérer le placeholder {percent} comme la vraie i18n
  const tr = vi.fn((key) => {
    if (key === 'editorZoomPercent') return '{percent}%'
    return key
  })

  const defaultProps = {
    zoomLevel: 1,
    onZoomChange: vi.fn(),
    totalDuration: 30,
    containerRef: { current: { clientWidth: 800 } },
    tr,
  }

  // Indices des boutons :
  // [0] = zoom-out
  // [1] = zoom-in
  // [2] = reset 100%
  // [3] = fit
  const getButtons = (container) => container.querySelectorAll('button')

  it('devrait rendre les 4 boutons de zoom', () => {
    const { container } = render(<TimelineZoomControls {...defaultProps} />)
    expect(getButtons(container).length).toBeGreaterThanOrEqual(4)
  })

  it('devrait avoir data-testid="editor-zoom-controls"', () => {
    const { getByTestId } = render(<TimelineZoomControls {...defaultProps} />)
    expect(getByTestId('editor-zoom-controls')).toBeInTheDocument()
  })

  // ✅ FIX : le composant utilise tr('editorZoomPercent') + replace
  it('devrait afficher le pourcentage de zoom', () => {
    const { container } = render(
      <TimelineZoomControls {...defaultProps} zoomLevel={1.5} />
    )
    expect(container.textContent).toContain('150%')
  })

  // ✅ FIX : index de bouton corrigé (zoom-in = [1])
  it('devrait appeler onZoomChange au click sur zoom-in', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <TimelineZoomControls {...defaultProps} onZoomChange={onZoomChange} />
    )
    fireEvent.click(getButtons(container)[1])
    expect(onZoomChange).toHaveBeenCalledWith(1.1) // 1 + 0.1
  })

  it('devrait appeler onZoomChange au click sur zoom-out', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <TimelineZoomControls
        {...defaultProps}
        zoomLevel={1.5}
        onZoomChange={onZoomChange}
      />
    )
    fireEvent.click(getButtons(container)[0])
    expect(onZoomChange).toHaveBeenCalledWith(1.4) // 1.5 - 0.1
  })

  it('devrait clamper le zoom minimum à 0.05', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <TimelineZoomControls
        {...defaultProps}
        zoomLevel={0.05}
        onZoomChange={onZoomChange}
      />
    )
    fireEvent.click(getButtons(container)[0]) // zoom-out
    expect(onZoomChange).toHaveBeenCalledWith(0.05) // clamp min
  })

  // ✅ FIX : index de bouton corrigé (zoom-in = [1])
  it('devrait clamper le zoom maximum à 10', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <TimelineZoomControls
        {...defaultProps}
        zoomLevel={10}
        onZoomChange={onZoomChange}
      />
    )
    fireEvent.click(getButtons(container)[1]) // zoom-in
    expect(onZoomChange).toHaveBeenCalledWith(10) // clamp max
  })

  // ✅ FIX : index corrigé (reset = [2], pas [3])
  it('devrait reset à 1 au click sur le bouton 100%', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <TimelineZoomControls {...defaultProps} onZoomChange={onZoomChange} />
    )
    fireEvent.click(getButtons(container)[2])
    expect(onZoomChange).toHaveBeenCalledWith(1)
  })

  it('devrait avoir un bouton Fit', () => {
    const { container } = render(<TimelineZoomControls {...defaultProps} />)
    const fitBtn = Array.from(getButtons(container)).find((b) =>
      b.textContent?.includes('editorZoomFit')
    )
    expect(fitBtn).not.toBeNull()
  })

  it('devrait calculer le zoom fit au click sur Fit', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <TimelineZoomControls {...defaultProps} onZoomChange={onZoomChange} />
    )
    const fitBtn = Array.from(getButtons(container)).find((b) =>
      b.textContent?.includes('editorZoomFit')
    )
    fireEvent.click(fitBtn)
    // containerWidth = 800 - 190 = 610
    // neededZoom = 610 / (30 * 80 + 100) = 610 / 2500 = 0.244
    expect(onZoomChange).toHaveBeenCalled()
    const called = onZoomChange.mock.calls[0][0]
    expect(called).toBeGreaterThan(0.2)
    expect(called).toBeLessThan(0.3)
  })

  it('devrait afficher la durée totale', () => {
    const { container } = render(
      <TimelineZoomControls {...defaultProps} totalDuration={42} />
    )
    expect(container.textContent).toContain('42s')
  })

  it('devrait gérer containerRef null', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <TimelineZoomControls
        {...defaultProps}
        containerRef={null}
        onZoomChange={onZoomChange}
      />
    )
    const fitBtn = Array.from(getButtons(container)).find((b) =>
      b.textContent?.includes('editorZoomFit')
    )
    // Ne devrait pas crash
    expect(() => fireEvent.click(fitBtn)).not.toThrow()
  })

  it('devrait avoir displayName TimelineZoomControls', () => {
    expect(TimelineZoomControls.displayName).toBe('TimelineZoomControls')
  })
})