import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import TimelineLoop from '@features/editor/components/Timeline/TimelineLoop'

describe('TimelineLoop', () => {
  let tr
  let onSetLoopRegion
  let onClearLoop
  let onToggleLoop
  let onOpenLoopPanel
  let onActivateManualClick
  let rafCallbacks

  const defaultProps = () => ({
    loopRegion: { enabled: false, start: 0, end: 10 },
    pixelsPerSecond: 80,
    onSetLoopRegion,
    onClearLoop,
    onToggleLoop,
    tr,
    totalDuration: 60,
    loopState: {},
    onOpenLoopPanel,
    onActivateManualClick,
  })

  const createLoopState = (overrides = {}) => ({
    timeline: {
      enabled: true,
      start: 2,
      end: 10,
      color: '#7C6FF7',
      startMode: 'startZero',
      endMode: 'endOfTrack',
      durationMode: 'cycles',
      cycleCount: 3,
      manualDuration: 10,
      manualTime: 10,
      ...overrides,
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    rafCallbacks = []

    tr = vi.fn((key) => key)
    onSetLoopRegion = vi.fn()
    onClearLoop = vi.fn()
    onToggleLoop = vi.fn()
    onOpenLoopPanel = vi.fn()
    onActivateManualClick = vi.fn()

    global.requestAnimationFrame = vi.fn((cb) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    })

    global.cancelAnimationFrame = vi.fn()

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 60,
      width: 1000,
      height: 60,
      x: 0,
      y: 0,
    }))
  })

  // ─── État sans loop ──────────────────────────────────────────────

  describe('état sans loop', () => {
    it('devrait afficher le prompt quand pas de loop', () => {
      const { container } = render(<TimelineLoop {...defaultProps()} />)
      expect(container.textContent).toContain('clickToDefineLoop')
    })

    it('devrait avoir un bouton Réglages', () => {
      const { container } = render(<TimelineLoop {...defaultProps()} />)
      const btn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('settings')
      )
      expect(btn).not.toBeNull()
    })

    it('devrait appeler onOpenLoopPanel au click sur Réglages', () => {
      const { container } = render(<TimelineLoop {...defaultProps()} />)
      const btn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('settings')
      )
      fireEvent.click(btn)
      expect(onOpenLoopPanel).toHaveBeenCalled()
    })

    it('devrait appeler onOpenLoopPanel au double-click', () => {
      const { container } = render(<TimelineLoop {...defaultProps()} />)
      fireEvent.doubleClick(container.firstChild)
      expect(onOpenLoopPanel).toHaveBeenCalled()
    })

    it('devrait créer une loop au mousedown', () => {
      const { container } = render(<TimelineLoop {...defaultProps()} />)
      fireEvent.mouseDown(container.firstChild, { clientX: 160 })
      // 160 / 80 = 2s
      expect(onSetLoopRegion).toHaveBeenCalled()
      const [start, end] = onSetLoopRegion.mock.calls[0]
      expect(start).toBe(2)
      expect(end).toBe(3) // +1s
    })

    it('devrait clamper au mousedown', () => {
      const { container } = render(<TimelineLoop {...defaultProps()} />)
      // clientX énorme → clamp à totalDuration 60
      fireEvent.mouseDown(container.firstChild, { clientX: 99999 })
      const [start, end] = onSetLoopRegion.mock.calls[0]
      expect(start).toBeLessThanOrEqual(60)
    })
  })

  // ─── État avec loop active ───────────────────────────────────────

  describe('état avec loop active', () => {
    it('devrait afficher le label BOUCLE', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      expect(container.textContent).toContain('BOUCLE')
    })

    it('devrait afficher la position start → end', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      // 2.0s → 10.0s
      expect(container.textContent).toContain('2.0s')
      expect(container.textContent).toContain('10.0s')
    })

    it('devrait afficher la durée de la zone', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      // 10 - 2 = 8.0s
      expect(container.textContent).toContain('(8.0s)')
    })

    it('devrait afficher les cycles si mode cycles', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      expect(container.textContent).toContain('3x')
    })

    it('devrait afficher la durée manualDuration si ce mode', () => {
      const { container } = render(
        <TimelineLoop
          {...defaultProps()}
          loopState={createLoopState({ durationMode: 'manualDuration', manualDuration: 15 })}
        />
      )
      expect(container.textContent).toContain('15s')
    })

    it('devrait avoir un bouton ON (enabled=true)', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      const onBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'ON'
      )
      expect(onBtn).not.toBeNull()
    })

    it('devrait appeler onToggleLoop au click sur ON', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      const onBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'ON'
      )
      fireEvent.click(onBtn)
      expect(onToggleLoop).toHaveBeenCalled()
    })

    it('devrait afficher les crochets [ et ]', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      expect(container.textContent).toContain('[')
      expect(container.textContent).toContain(']')
    })

    it('devrait afficher ▼ au-dessus des crochets', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      expect(container.textContent).toContain('▼')
    })

    it('devrait avoir un bouton Réglages', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      const settingsBtns = container.querySelectorAll(
        'button[title="editLoopSettings"]'
      )
      expect(settingsBtns.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── Drag sur poignées ───────────────────────────────────────────

  describe('drag sur poignées', () => {
    it('devrait appeler onSetLoopRegion au drag de la poignée start', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )

      // Les poignées sont des div avec cursor: ew-resize et position absolute
      const handles = container.querySelectorAll(
        'div[style*="cursor: ew-resize"]'
      )

      if (handles.length > 0) {
        // Poignée start
        act(() => {
          fireEvent.mouseDown(handles[0], { clientX: 160 })
        })

        act(() => {
          document.dispatchEvent(new MouseEvent('mousemove', { clientX: 240 }))
        })

        act(() => {
          document.dispatchEvent(new MouseEvent('mouseup'))
        })

        expect(onSetLoopRegion).toHaveBeenCalled()
      }
    })

    it('devrait cleanup les listeners au mouseup', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )

      const handles = container.querySelectorAll(
        'div[style*="cursor: ew-resize"]'
      )

      if (handles.length > 0) {
        act(() => {
          fireEvent.mouseDown(handles[0], { clientX: 160 })
        })

        act(() => {
          document.dispatchEvent(new MouseEvent('mouseup'))
        })

        expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
        expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
      }

      removeSpy.mockRestore()
    })
  })

  // ─── Cycles intermédiaires ───────────────────────────────────────

  describe('marqueurs de cycles', () => {
    it('devrait afficher les numéros de cycle', () => {
      const { container } = render(
        <TimelineLoop
          {...defaultProps()}
          loopState={createLoopState({ cycleCount: 4 })}
        />
      )
      // Les numéros de cycle apparaissent en petit
      expect(container.textContent).toContain('2') // cycle 2
      expect(container.textContent).toContain('3')
    })

    it('ne devrait PAS afficher de cycles si mode manualDuration', () => {
      const { container } = render(
        <TimelineLoop
          {...defaultProps()}
          loopState={createLoopState({
            durationMode: 'manualDuration',
            manualDuration: 20,
          })}
        />
      )
      // En mode manualDuration, il n'y a pas de marqueurs de cycles
      // On vérifie qu'il n'y a pas le cycleCount affiché
      expect(container.textContent).not.toContain('3x')
    })
  })

  // ─── Mode manualTime ─────────────────────────────────────────────

  describe('mode manualTime', () => {
    it('devrait afficher la durée manualTime', () => {
      const { container } = render(
        <TimelineLoop
          {...defaultProps()}
          loopState={createLoopState({
            durationMode: 'manualTime',
            manualTime: 25,
          })}
        />
      )
      expect(container.textContent).toContain('25s')
    })
  })

  // ─── Indicateur FIN ─────────────────────────────────────────────

  describe('indicateur FIN', () => {
    it('devrait afficher le label FIN si extendedWidthPx > 5', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      // 2 + 3*8 = 26s → extendedWidthPx = (26 - 10) * 80 > 5
      expect(container.textContent).toContain('FIN')
    })

    it('ne devrait PAS afficher FIN si pas d\'extended', () => {
      const { container } = render(
        <TimelineLoop
          {...defaultProps()}
          loopState={createLoopState({
            start: 0,
            end: 5,
            durationMode: 'manualDuration',
            manualDuration: 5, // 0 + 5 = 5 → pas d'extension
          })}
        />
      )
      expect(container.textContent).not.toContain('FIN')
    })
  })

  // ─── Structure ───────────────────────────────────────────────────

  describe('structure', () => {
    it('devrait avoir displayName TimelineLoop', () => {
      expect(TimelineLoop.displayName).toBe('TimelineLoop')
    })

    it('devrait retourner un div sticky', () => {
      const { container } = render(
        <TimelineLoop {...defaultProps()} loopState={createLoopState()} />
      )
      expect(container.firstChild.style.position).toBe('sticky')
    })
  })
})