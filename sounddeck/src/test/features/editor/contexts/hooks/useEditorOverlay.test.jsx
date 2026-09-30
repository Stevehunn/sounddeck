import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

import { useEditorOverlay } from '@features/editor/contexts/hooks/useEditorOverlay'

describe('useEditorOverlay', () => {
  let core
  let loops
  let clips
  let addToast
  let t
  let currentProject
  let currentOverlay

  const INITIAL_OVERLAY_STATE = {
    type: null,
    clipId: null,
    trackId: null,
    options: null,
    step: 0,
    totalSteps: 1,
    clipName: null,
    data: {},
  }

  const createClip = (overrides = {}) => ({
    id: 'c1',
    name: 'Clip',
    start: 0,
    duration: 3,
    ...overrides,
  })

  beforeEach(() => {
    currentProject = {
      id: 'p-1',
      name: 'Test',
      tracks: [
        {
          id: 't1',
          clips: [
            createClip({ id: 'c1', name: 'Clip A', start: 0, duration: 3 }),
            createClip({ id: 'c2', name: 'Clip B', start: 5, duration: 4 }),
          ],
        },
      ],
      updatedAt: 1000,
    }

    currentOverlay = { ...INITIAL_OVERLAY_STATE }

    addToast = vi.fn()
    t = vi.fn((key, params) => {
      if (params && typeof params === 'object') {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    })

    core = {
      projectRef: { current: currentProject },
      clipDurationsRef: { current: { c1: 3, c2: 4 } },
      totalDurationRef: { current: 12 },
      actionOverlayRef: { current: currentOverlay },
      setActionOverlay: vi.fn((newOverlay) => {
        core.actionOverlayRef.current = newOverlay
      }),
      addToastRef: { current: addToast },
      tRef: { current: t },
    }

    loops = {
      toggleClipLoop: vi.fn(),
      setTimelineLoop: vi.fn(),
    }

    clips = {
      splitClip: vi.fn(),
    }
  })

  const render = () => renderHook(() => useEditorOverlay(core, loops, clips))

  // ═══════════════════════════════════════════════════════════════════════
  // cancelActionOverlay
  // ═══════════════════════════════════════════════════════════════════════

  describe('cancelActionOverlay', () => {
    it('devrait reset l\'overlay à l\'état initial', () => {
      currentOverlay = {
        type: 'split',
        clipId: 'c1',
        trackId: 't1',
        step: 0,
        totalSteps: 1,
      }
      core.actionOverlayRef.current = currentOverlay

      const { result } = render()

      act(() => {
        result.current.cancelActionOverlay()
      })

      expect(core.setActionOverlay).toHaveBeenCalled()
      const resetState = core.setActionOverlay.mock.calls[0][0]
      expect(resetState.type).toBeNull()
      expect(resetState.clipId).toBeNull()
      expect(resetState.step).toBe(0)
    })

    it('devrait aussi mettre à jour actionOverlayRef', () => {
      const { result } = render()

      act(() => {
        result.current.cancelActionOverlay()
      })

      expect(core.actionOverlayRef.current.type).toBeNull()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // activateLoopManualClick
  // ═══════════════════════════════════════════════════════════════════════

  describe('activateLoopManualClick', () => {
    it('devrait définir un overlay de type "loop-clip"', () => {
      const { result } = render()

      act(() => {
        result.current.activateLoopManualClick('c1', 't1')
      })

      const overlay = core.actionOverlayRef.current
      expect(overlay.type).toBe('loop-clip')
      expect(overlay.clipId).toBe('c1')
      expect(overlay.trackId).toBe('t1')
    })

    it('devrait récupérer le nom du clip', () => {
      const { result } = render()

      act(() => {
        result.current.activateLoopManualClick('c1', 't1')
      })

      expect(core.actionOverlayRef.current.clipName).toBe('Clip A')
    })

    it('devrait utiliser la couleur par défaut si absente', () => {
      const { result } = render()

      act(() => {
        result.current.activateLoopManualClick('c1', 't1')
      })

      const overlay = core.actionOverlayRef.current
      expect(overlay.options.arrowColor).toBe('#22c55e')
      expect(overlay.options.loopMode).toBe('manualClick')
    })

    it('devrait utiliser la couleur fournie', () => {
      const { result } = render()

      act(() => {
        result.current.activateLoopManualClick('c1', 't1', {
          arrowColor: '#ff0000',
        })
      })

      expect(core.actionOverlayRef.current.options.arrowColor).toBe('#ff0000')
    })

    it('devrait merger les options fournies', () => {
      const { result } = render()

      act(() => {
        result.current.activateLoopManualClick('c1', 't1', {
          custom: 'value',
          loopMode: 'cycles',
        })
      })

      const overlay = core.actionOverlayRef.current
      expect(overlay.options.custom).toBe('value')
      // ⚠️ Les options custom ÉCRASENT loopMode: 'manualClick'
      expect(overlay.options.loopMode).toBe('cycles')
    })

    it('devrait toaster l\'activation du mode clic', () => {
      const { result } = render()

      act(() => {
        result.current.activateLoopManualClick('c1', 't1')
      })

      expect(addToast).toHaveBeenCalledWith(
        'editorToastClickModeActivated',
        'info'
      )
    })

    it('devrait gérer un clip introuvable (clipName = null)', () => {
      const { result } = render()

      act(() => {
        result.current.activateLoopManualClick('unknown', 't1')
      })

      expect(core.actionOverlayRef.current.clipName).toBeNull()
      expect(core.actionOverlayRef.current.type).toBe('loop-clip')
    })

    it('devrait fonctionner si projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      act(() => {
        result.current.activateLoopManualClick('c1', 't1')
      })

      expect(core.actionOverlayRef.current.type).toBe('loop-clip')
      expect(core.actionOverlayRef.current.clipName).toBeNull()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // activateTimelineLoopManualClick
  // ═══════════════════════════════════════════════════════════════════════

  describe('activateTimelineLoopManualClick', () => {
    it('devrait définir un overlay de type "loop-timeline"', () => {
      const { result } = render()

      act(() => {
        result.current.activateTimelineLoopManualClick()
      })

      const overlay = core.actionOverlayRef.current
      expect(overlay.type).toBe('loop-timeline')
      expect(overlay.clipId).toBeNull()
      expect(overlay.trackId).toBeNull()
    })

    it('devrait démarrer avec step=0 et totalSteps=3', () => {
      const { result } = render()

      act(() => {
        result.current.activateTimelineLoopManualClick()
      })

      const overlay = core.actionOverlayRef.current
      expect(overlay.step).toBe(0)
      expect(overlay.totalSteps).toBe(3)
    })

    it('devrait initialiser data avec start/end/duration à null', () => {
      const { result } = render()

      act(() => {
        result.current.activateTimelineLoopManualClick()
      })

      const overlay = core.actionOverlayRef.current
      expect(overlay.data).toEqual({ start: null, end: null, duration: null })
    })

    it('devrait toaster l\'activation du step 1', () => {
      const { result } = render()

      act(() => {
        result.current.activateTimelineLoopManualClick()
      })

      expect(addToast).toHaveBeenCalledWith(
        'editorToastClickModeStep1',
        'info'
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // activateSplitManualClick
  // ═══════════════════════════════════════════════════════════════════════

  describe('activateSplitManualClick', () => {
    it('devrait définir un overlay de type "split"', () => {
      const { result } = render()

      act(() => {
        result.current.activateSplitManualClick('c1', 't1')
      })

      const overlay = core.actionOverlayRef.current
      expect(overlay.type).toBe('split')
      expect(overlay.clipId).toBe('c1')
      expect(overlay.trackId).toBe('t1')
    })

    it('devrait récupérer le nom du clip', () => {
      const { result } = render()

      act(() => {
        result.current.activateSplitManualClick('c1', 't1')
      })

      expect(core.actionOverlayRef.current.clipName).toBe('Clip A')
    })

    it('devrait initialiser step=0 et totalSteps=1', () => {
      const { result } = render()

      act(() => {
        result.current.activateSplitManualClick('c1', 't1')
      })

      const overlay = core.actionOverlayRef.current
      expect(overlay.step).toBe(0)
      expect(overlay.totalSteps).toBe(1)
    })

    it('devrait toaster l\'activation du mode clic split', () => {
      const { result } = render()

      act(() => {
        result.current.activateSplitManualClick('c1', 't1')
      })

      expect(addToast).toHaveBeenCalledWith(
        'editorToastSplitClickModeActivated',
        'info'
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // executeActionOverlay — garde-fou
  // ═══════════════════════════════════════════════════════════════════════

  describe('executeActionOverlay — garde-fou', () => {
    it('ne devrait rien faire si type est null', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(5)
      })

      expect(loops.toggleClipLoop).not.toHaveBeenCalled()
      expect(loops.setTimelineLoop).not.toHaveBeenCalled()
      expect(clips.splitClip).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // executeActionOverlay — type "loop-clip"
  // ═══════════════════════════════════════════════════════════════════════

  describe('executeActionOverlay — loop-clip', () => {
    beforeEach(() => {
      core.actionOverlayRef.current = {
        type: 'loop-clip',
        clipId: 'c1',
        trackId: 't1',
        options: { arrowColor: '#22c55e', loopMode: 'manualClick' },
        step: 0,
        totalSteps: 1,
        clipName: 'Clip A',
        data: {},
      }
    })

    it('devrait appeler toggleClipLoop avec manualDuration calculée', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(8)
      })

      expect(loops.toggleClipLoop).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({
          loopMode: 'manualDuration',
          manualDuration: 8, // 8 - 0 (start du clip)
        })
      )
    })

    it('devrait calculer manualDuration = clickTime - clipStart', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(4)
      })

      // clip c1 start = 0 → manualDuration = 4 - 0 = 4
      expect(loops.toggleClipLoop).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ manualDuration: 4 })
      )
    })

    it('devrait garantir manualDuration >= clipDuration', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(1)
      })

      // clip duration = 3, click à 1 → max(3, 1) = 3
      expect(loops.toggleClipLoop).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ manualDuration: 3 })
      )
    })

    it('devrait clamper clickTime à [0, totalDuration]', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(-5)
      })

      // clickTime clampé à 0 → manualDuration = max(3, 0) = 3
      expect(loops.toggleClipLoop).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ manualDuration: 3 })
      )
    })

    it('devrait toaster le succès', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(6)
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopDefinedUntil'),
        'success'
      )
    })

    it('devrait reset l\'overlay après exécution', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(6)
      })

      expect(core.actionOverlayRef.current.type).toBeNull()
    })

    it('devrait gérer un clip introuvable (erreur + reset)', () => {
      core.actionOverlayRef.current.clipId = 'unknown'
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(6)
      })

      expect(loops.toggleClipLoop).not.toHaveBeenCalled()
      expect(addToast).toHaveBeenCalledWith(
        'editorToastClipNotFound',
        'error'
      )
      expect(core.actionOverlayRef.current.type).toBeNull()
    })

    it('devrait gérer un projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(6)
      })

      expect(loops.toggleClipLoop).not.toHaveBeenCalled()
      expect(addToast).toHaveBeenCalledWith(
        'editorToastClipNotFound',
        'error'
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // executeActionOverlay — type "split"
  // ═══════════════════════════════════════════════════════════════════════

  describe('executeActionOverlay — split', () => {
    beforeEach(() => {
      core.actionOverlayRef.current = {
        type: 'split',
        clipId: 'c1',
        trackId: 't1',
        options: null,
        step: 0,
        totalSteps: 1,
        clipName: 'Clip A',
        data: {},
      }
    })

    it('devrait appeler splitClip si clickTime est dans le clip', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(1.5)
      })

      expect(clips.splitClip).toHaveBeenCalledWith('t1', 'c1', 1.5)
    })

    it('ne devrait PAS splitter si trop proche du début', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(0.01)
      })

      expect(clips.splitClip).not.toHaveBeenCalled()
      expect(addToast).toHaveBeenCalledWith(
        'editorToastClipSplitInvalid',
        'warning'
      )
    })

    it('ne devrait PAS splitter si trop proche de la fin', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(2.99)
      })

      expect(clips.splitClip).not.toHaveBeenCalled()
    })

    it('ne devrait PAS splitter si clickTime hors du clip', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(10)
      })

      expect(clips.splitClip).not.toHaveBeenCalled()
    })

    it('devrait reset l\'overlay après exécution', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(1.5)
      })

      expect(core.actionOverlayRef.current.type).toBeNull()
    })

    it('devrait gérer un clip introuvable', () => {
      core.actionOverlayRef.current.clipId = 'unknown'
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(1.5)
      })

      expect(clips.splitClip).not.toHaveBeenCalled()
      expect(addToast).toHaveBeenCalledWith(
        'editorToastClipNotFound',
        'error'
      )
    })

    it('devrait clamper clickTime à [0, totalDuration]', () => {
      core.totalDurationRef.current = 12
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(-3)
      })

      // clamp à 0 → 0 < start + 0.05 → refus
      expect(clips.splitClip).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // executeActionOverlay — loop-timeline (3 étapes)
  // ═══════════════════════════════════════════════════════════════════════

  describe('executeActionOverlay — loop-timeline step 0', () => {
    beforeEach(() => {
      core.actionOverlayRef.current = {
        type: 'loop-timeline',
        clipId: null,
        trackId: null,
        options: null,
        step: 0,
        totalSteps: 3,
        clipName: null,
        data: { start: null, end: null, duration: null },
      }
    })

    it('devrait définir data.start et passer à step=1', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(3)
      })

      const newOverlay = core.actionOverlayRef.current
      expect(newOverlay.step).toBe(1)
      expect(newOverlay.data.start).toBe(3)
    })

    it('devrait toaster la définition du start', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(3)
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopStartDefined'),
        'info'
      )
    })

    it('ne devrait PAS reset l\'overlay', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(3)
      })

      expect(core.actionOverlayRef.current.type).toBe('loop-timeline')
    })
  })

  describe('executeActionOverlay — loop-timeline step 1', () => {
    beforeEach(() => {
      core.actionOverlayRef.current = {
        type: 'loop-timeline',
        clipId: null,
        trackId: null,
        options: null,
        step: 1,
        totalSteps: 3,
        clipName: null,
        data: { start: 2, end: null, duration: null },
      }
    })

    it('devrait définir data.end et passer à step=2', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(8)
      })

      const newOverlay = core.actionOverlayRef.current
      expect(newOverlay.step).toBe(2)
      expect(newOverlay.data.end).toBe(8)
      expect(newOverlay.data.start).toBe(2)
    })

    it('ne devrait pas accepter un end <= start (warning)', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(1)
      })

      expect(core.actionOverlayRef.current.step).toBe(1)
      expect(addToast).toHaveBeenCalledWith(
        'editorToastLoopEndMustBeAfterStart',
        'warning'
      )
    })

    it('devrait accepter un end = start + epsilon', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(2.1)
      })

      expect(core.actionOverlayRef.current.step).toBe(2)
    })

    it('devrait toaster la définition du end', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(8)
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopEndDefined'),
        'info'
      )
    })
  })

  describe('executeActionOverlay — loop-timeline step 2', () => {
    beforeEach(() => {
      core.actionOverlayRef.current = {
        type: 'loop-timeline',
        clipId: null,
        trackId: null,
        options: null,
        step: 2,
        totalSteps: 3,
        clipName: null,
        data: { start: 2, end: 5, duration: null },
      }
    })

    it('devrait appeler setTimelineLoop avec enabled: true', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(9)
      })

      expect(loops.setTimelineLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          start: 2,
          end: 5,
          manualDuration: 7, // 9 - 2
          durationMode: 'manualDuration',
        })
      )
    })

    it('devrait toaster le succès final', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(9)
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopDefined'),
        'success'
      )
    })

    it('devrait reset l\'overlay après exécution', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(9)
      })

      expect(core.actionOverlayRef.current.type).toBeNull()
    })

    it('ne devrait pas valider si duration <= 0.1 (warning)', () => {
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(2.05)
      })

      expect(loops.setTimelineLoop).not.toHaveBeenCalled()
      expect(addToast).toHaveBeenCalledWith(
        'editorToastLoopDurationTooShort',
        'warning'
      )
    })

    it('devrait utiliser clampedTime comme end si data.end absent', () => {
      core.actionOverlayRef.current.data.end = null
      const { result } = render()

      act(() => {
        result.current.executeActionOverlay(9)
      })

      const call = loops.setTimelineLoop.mock.calls[0][0]
      expect(call.start).toBe(2)
      expect(call.end).toBe(9)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Structure de retour
  // ═══════════════════════════════════════════════════════════════════════

  describe('structure de retour', () => {
    it('devrait exposer toutes les méthodes', () => {
      const { result } = render()

      expect(typeof result.current.cancelActionOverlay).toBe('function')
      expect(typeof result.current.activateLoopManualClick).toBe('function')
      expect(typeof result.current.activateTimelineLoopManualClick).toBe(
        'function'
      )
      expect(typeof result.current.activateSplitManualClick).toBe('function')
      expect(typeof result.current.executeActionOverlay).toBe('function')
    })
  })
})