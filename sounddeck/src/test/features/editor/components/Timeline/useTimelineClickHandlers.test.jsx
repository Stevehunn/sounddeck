import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTimelineClickHandlers } from '@features/editor/components/Timeline/useTimelineClickHandlers'

describe('useTimelineClickHandlers', () => {
  let clipsContainerRef
  let rulerContainerRef
  let onSeek
  let onExecutePendingAction
  let onCancelPendingAction
  let onSplitClip
  let onTimelineClickForLoop
  let addToast
  let tr
  let tracks

  const baseProps = () => ({
    clipsContainerRef,
    rulerContainerRef,
    pixelsPerSecond: 80,
    totalWidth: 2000,
    totalDuration: 20,
    isPendingAction: false,
    isTimelineClickModeActive: false,
    onTimelineClickForLoop,
    onExecutePendingAction,
    onCancelPendingAction,
    onSeek,
    selectedClipId: null,
    selectedTrackId: null,
    tracks,
    clipDurations: {},
    onSplitClip,
    addToast,
    tr,
  })

  const createMouseEvent = (clientX = 200) => ({
    clientX,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: {
      closest: vi.fn(() => null),
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // ⚠️ clipsContainerRef a left=100 (barre de tête = 100px de large)
    clipsContainerRef = {
      current: {
        getBoundingClientRect: () => ({ left: 100, top: 0 }),
        scrollLeft: 0,
      },
    }
    // ⚠️ rulerContainerRef a left=0 (ruler commence tout à gauche)
    rulerContainerRef = {
      current: {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        scrollLeft: 0,
      },
    }

    onSeek = vi.fn()
    onExecutePendingAction = vi.fn()
    onCancelPendingAction = vi.fn()
    onSplitClip = vi.fn()
    onTimelineClickForLoop = vi.fn()
    addToast = vi.fn()
    tr = vi.fn((key) => key)
    tracks = [
      {
        id: 't1',
        clips: [{ id: 'c1', start: 0, duration: 5 }],
      },
    ]
  })

  const render = (overrides = {}) =>
    renderHook(() => useTimelineClickHandlers({ ...baseProps(), ...overrides }))

  // ═══════════════════════════════════════════════════════════════════
  // clientXToTime
  // ═══════════════════════════════════════════════════════════════════

  describe('clientXToTime', () => {
    it('devrait convertir clientX en time', () => {
      const { result } = render()
      // clientX = 200, container left = 100, scrollLeft = 0
      // clickInTimeline = 200 - 100 + 0 = 100
      // time = 100 / 80 = 1.25
      expect(result.current.clientXToTime(200)).toBe(1.25)
    })

    it('devrait prendre en compte le scrollLeft', () => {
      clipsContainerRef.current.scrollLeft = 400
      const { result } = render()
      // 200 - 100 + 400 = 500 → 500 / 80 = 6.25
      expect(result.current.clientXToTime(200)).toBe(6.25)
    })

    it('devrait clamper à 0 minimum', () => {
      const { result } = render()
      // clientX = 0, left = 100 → -100 → clamp à 0
      expect(result.current.clientXToTime(0)).toBe(0)
    })

    it('devrait clamper à totalWidth maximum', () => {
      const { result } = render()
      // clientX = 99999 → clamp à totalWidth = 2000 → 2000 / 80 = 25
      expect(result.current.clientXToTime(99999)).toBe(25)
    })

    it('devrait retourner 0 si container null', () => {
      clipsContainerRef.current = null
      const { result } = render()
      expect(result.current.clientXToTime(200)).toBe(0)
    })

    it('devrait accepter un containerElement custom', () => {
      const customEl = {
        getBoundingClientRect: () => ({ left: 50 }),
        scrollLeft: 0,
      }
      const { result } = render()
      // 100 - 50 = 50 → 50 / 80 = 0.625
      expect(result.current.clientXToTime(100, customEl)).toBe(0.625)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // handleTimelineClick
  // ═══════════════════════════════════════════════════════════════════

  describe('handleTimelineClick', () => {
    it('devrait appeler onSeek au click simple', () => {
      const { result } = render()
      const e = createMouseEvent(200)

      act(() => {
        result.current.handleTimelineClick(e)
      })

      expect(onSeek).toHaveBeenCalledWith(1.25)
    })

    it('devrait gérer click-mode loop en priorité', () => {
      const { result } = render({ isTimelineClickModeActive: true })
      const e = createMouseEvent(200)

      act(() => {
        result.current.handleTimelineClick(e)
      })

      expect(onTimelineClickForLoop).toHaveBeenCalledWith(1.25)
      expect(onSeek).not.toHaveBeenCalled()
      expect(e.preventDefault).toHaveBeenCalled()
      expect(e.stopPropagation).toHaveBeenCalled()
    })

    it('devrait gérer pending action en priorité (après click-mode)', () => {
      const { result } = render({ isPendingAction: true })
      const e = createMouseEvent(200)

      act(() => {
        result.current.handleTimelineClick(e)
      })

      expect(onExecutePendingAction).toHaveBeenCalledWith(1.25)
      expect(onSeek).not.toHaveBeenCalled()
    })

    it('devrait ignorer click sur un clip', () => {
      const { result } = render()
      const e = createMouseEvent(200)
      e.target.closest = vi.fn((sel) => {
        if (sel === '.editor-clip-wrapper') return {}
        return null
      })

      act(() => {
        result.current.handleTimelineClick(e)
      })

      expect(onSeek).not.toHaveBeenCalled()
    })

    it('devrait ignorer click sur un bouton', () => {
      const { result } = render()
      const e = createMouseEvent(200)
      e.target.closest = vi.fn((sel) => {
        if (sel === 'button') return {}
        return null
      })

      act(() => {
        result.current.handleTimelineClick(e)
      })

      expect(onSeek).not.toHaveBeenCalled()
    })

    it('devrait ignorer si time > totalDuration', () => {
      const { result } = render()
      // clientX très grand pour avoir time > 20
      const e = createMouseEvent(10000)

      act(() => {
        result.current.handleTimelineClick(e)
      })

      expect(onSeek).not.toHaveBeenCalled()
    })

    // ✅ FIX : clientXToTime clampe à 0, donc time=0 est DANS les bornes
    //    → onSeek est appelé avec 0 (comportement réel du hook)
    it('devrait clamper à time=0 et appeler onSeek(0) si clientX < left', () => {
      const { result } = render()
      const e = createMouseEvent(-10000)

      act(() => {
        result.current.handleTimelineClick(e)
      })

      expect(onSeek).toHaveBeenCalledWith(0)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // handleRulerClick
  // ═══════════════════════════════════════════════════════════════════

  describe('handleRulerClick', () => {
    it('devrait utiliser rulerContainerRef', () => {
      const { result } = render()
      // ruler left = 0, clientX = 160 → 160 / 80 = 2
      const e = createMouseEvent(160)

      act(() => {
        result.current.handleRulerClick(e)
      })

      expect(onSeek).toHaveBeenCalledWith(2)
    })

    it('devrait gérer click-mode loop', () => {
      const { result } = render({ isTimelineClickModeActive: true })
      const e = createMouseEvent(160)

      act(() => {
        result.current.handleRulerClick(e)
      })

      expect(onTimelineClickForLoop).toHaveBeenCalledWith(2)
    })

    it('devrait gérer pending action', () => {
      const { result } = render({ isPendingAction: true })
      const e = createMouseEvent(160)

      act(() => {
        result.current.handleRulerClick(e)
      })

      expect(onExecutePendingAction).toHaveBeenCalledWith(2)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // handleRulerDoubleClick
  // ═══════════════════════════════════════════════════════════════════

  describe('handleRulerDoubleClick', () => {
    it('devrait seek au double-click', () => {
      const { result } = render()
      // ruler left = 0, clientX = 160 → 160 / 80 = 2
      const e = createMouseEvent(160)

      act(() => {
        result.current.handleRulerDoubleClick(e)
      })

      expect(onSeek).toHaveBeenCalledWith(2)
    })

    it('devrait ignorer si time hors bornes', () => {
      const { result } = render()
      const e = createMouseEvent(99999)

      act(() => {
        result.current.handleRulerDoubleClick(e)
      })

      expect(onSeek).not.toHaveBeenCalled()
    })

    it('ne devrait PAS split si pas de sélection', () => {
      const { result } = render()
      const e = createMouseEvent(200)

      act(() => {
        result.current.handleRulerDoubleClick(e)
      })

      expect(onSplitClip).not.toHaveBeenCalled()
    })

    it('devrait split si clip sélectionné et click dedans', () => {
      const { result } = render({
        selectedClipId: 'c1',
        selectedTrackId: 't1',
      })
      // c1 : start=0, duration=5 → end=5
      // click à 2s → clientX = 2 * 80 = 160
      const e = createMouseEvent(160)

      act(() => {
        result.current.handleRulerDoubleClick(e)
      })

      expect(onSplitClip).toHaveBeenCalledWith('t1', 'c1', 2)
      expect(addToast).toHaveBeenCalledWith('editorSplitSuccess', 'success')
    })

    // ✅ FIX : clientX=0.8 → time=0.01 (proche du début du clip)
    //    Condition de rejet : time <= start + 0.05 → 0.01 <= 0.05 ✓
    it('ne devrait PAS split si click trop proche du début', () => {
      const { result } = render({
        selectedClipId: 'c1',
        selectedTrackId: 't1',
      })
      // ruler left=0, clientX=0.8 → time = 0.8 / 80 = 0.01
      const e = createMouseEvent(0.8)

      act(() => {
        result.current.handleRulerDoubleClick(e)
      })

      expect(onSplitClip).not.toHaveBeenCalled()
    })

    it('ne devrait PAS split si clip introuvable', () => {
      const { result } = render({
        selectedClipId: 'unknown',
        selectedTrackId: 't1',
      })
      const e = createMouseEvent(160)

      act(() => {
        result.current.handleRulerDoubleClick(e)
      })

      expect(onSplitClip).not.toHaveBeenCalled()
    })

    // ✅ FIX : clientX=400 → time=5 (avec ruler left=0)
    it('devrait utiliser clipDurations pour la durée', () => {
      const { result } = render({
        selectedClipId: 'c1',
        selectedTrackId: 't1',
        clipDurations: { c1: 10 },
      })
      // c1 : start=0, duration=10 → end=10
      // click à 5s → clientX = 5 * 80 = 400
      const e = createMouseEvent(400)

      act(() => {
        result.current.handleRulerDoubleClick(e)
      })

      expect(onSplitClip).toHaveBeenCalledWith('t1', 'c1', 5)
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Escape → cancel pending
  // ═══════════════════════════════════════════════════════════════════

  describe('Escape handler', () => {
    it('devrait ajouter un listener keydown au mount', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')
      render()
      expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      addSpy.mockRestore()
    })

    it('devrait appeler onCancelPendingAction sur Escape si isPendingAction', () => {
      render({ isPendingAction: true })

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })

      expect(onCancelPendingAction).toHaveBeenCalled()
    })

    it('ne devrait PAS appeler onCancelPendingAction si pas pending', () => {
      render({ isPendingAction: false })

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })

      expect(onCancelPendingAction).not.toHaveBeenCalled()
    })

    it('devrait ignorer les autres touches', () => {
      render({ isPendingAction: true })

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      })

      expect(onCancelPendingAction).not.toHaveBeenCalled()
    })

    it("devrait cleanup le listener à l'unmount", () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const { unmount } = render()
      unmount()
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      removeSpy.mockRestore()
    })
  })

  // ═══════════════════════════════════════════════════════════════════
  // Structure
  // ═══════════════════════════════════════════════════════════════════

  describe('structure de retour', () => {
    it('devrait exposer toutes les méthodes', () => {
      const { result } = render()

      expect(typeof result.current.clientXToTime).toBe('function')
      expect(typeof result.current.handleTimelineClick).toBe('function')
      expect(typeof result.current.handleRulerClick).toBe('function')
      expect(typeof result.current.handleRulerDoubleClick).toBe('function')
    })
  })
})