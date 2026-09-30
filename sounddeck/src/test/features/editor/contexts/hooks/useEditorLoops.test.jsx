import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

import { useEditorLoops } from '@features/editor/contexts/hooks/useEditorLoops'

describe('useEditorLoops', () => {
  let core
  let addToast
  let t
  let currentProject
  let currentLoopState

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

    currentLoopState = {
      clips: {},
      tracks: {},
      timeline: {
        enabled: false,
        start: 0,
        end: 10,
        color: '#7C6FF7',
        durationMode: 'cycles',
        cycleCount: 3,
        manualDuration: 10,
      },
    }

    addToast = vi.fn()
    t = vi.fn((key, params) => {
      if (params && typeof params === 'object') {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    })

    core = {
      projectRef: { current: currentProject },
      loopStateRef: { current: currentLoopState },
      clipDurationsRef: { current: { c1: 3, c2: 4 } },
      totalDurationRef: { current: 12 },
      commitProject: vi.fn(),
      setLoopState: vi.fn(),
      setLoopRegionState: vi.fn(),
      setIsDirty: vi.fn(),
      addToastRef: { current: addToast },
      tRef: { current: t },
    }
  })

  const render = () => renderHook(() => useEditorLoops(core))

  // ═══════════════════════════════════════════════════════════════════════
  // toggleClipLoop — Désactivation
  // ═══════════════════════════════════════════════════════════════════════

  describe('toggleClipLoop — désactivation', () => {
    it('ne devrait rien faire si projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1')
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('ne devrait rien faire si clip introuvable', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('unknown')
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait désactiver avec enabled: false explicite', () => {
      currentLoopState.clips.c1 = { enabled: true, start: 0, end: 6 }
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', { enabled: false })
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.enabled).toBe(false)
    })

    it('devrait basculer si déjà activé (sans option)', () => {
      currentLoopState.clips.c1 = { enabled: true, start: 0, end: 6 }
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1')
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.enabled).toBe(false)
    })

    it('devrait toaster la désactivation', () => {
      currentLoopState.clips.c1 = { enabled: true }
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', { enabled: false })
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopDisabledOn'),
        'info'
      )
    })

    it('devrait commit le projet avec le nouveau loopState', () => {
      currentLoopState.clips.c1 = { enabled: true }
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', { enabled: false })
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.loops.clips.c1.enabled).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // toggleClipLoop — Activation
  // ═══════════════════════════════════════════════════════════════════════

  describe('toggleClipLoop — activation', () => {
    it('devrait activer avec loopMode par défaut (endOfTrack)', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1')
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.enabled).toBe(true)
      expect(updated.clips.c1.loopMode).toBe('endOfTrack')
      expect(updated.clips.c1.visual).toBe('arrow')
      expect(updated.clips.c1.followClip).toBe(true)
    })

    it('devrait calculer loopEnd = dernier clip normal + 2 (mode endOfTrack)', () => {
      // c2 (normal) finit à 5+4 = 9 → loopEnd = max(9+2, ...) = 11
      // puis max avec start+duration*2 = 0+3*2=6 → 11
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1')
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.end).toBe(11)
    })

    it('devrait utiliser totalDuration si aucun autre clip normal', () => {
      currentProject.tracks[0].clips = [createClip({ id: 'c1' })]
      core.totalDurationRef.current = 15
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1')
      })

      const updated = core.setLoopState.mock.calls[0][0]
      // max(15, 0+3*4=12) = 15
      expect(updated.clips.c1.end).toBe(15)
    })

    it('devrait calculer loopEnd avec loopMode=cycles', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', {
          loopMode: 'cycles',
          cycleCount: 4,
        })
      })

      const updated = core.setLoopState.mock.calls[0][0]
      // 0 + 3 * 4 = 12
      expect(updated.clips.c1.end).toBe(12)
      expect(updated.clips.c1.cycleCount).toBe(4)
      expect(updated.clips.c1.totalCycles).toBe(4)
    })

    it('devrait calculer loopEnd avec loopMode=manualDuration', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', {
          loopMode: 'manualDuration',
          manualDuration: 8,
        })
      })

      const updated = core.setLoopState.mock.calls[0][0]
      // max(0 + 3, 0 + 8) = 8
      expect(updated.clips.c1.end).toBe(8)
      expect(updated.clips.c1.manualDuration).toBe(8)
    })

    it('devrait calculer loopEnd avec loopMode=manualClick', () => {
      core.totalDurationRef.current = 20
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', { loopMode: 'manualClick' })
      })

      const updated = core.setLoopState.mock.calls[0][0]
      // max(3, 20) = 20
      expect(updated.clips.c1.end).toBe(20)
      expect(updated.clips.c1.manualEndTime).toBe(null)
    })

    it('devrait utiliser la couleur arrowColor fournie', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', { arrowColor: '#ff0000' })
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.arrowColor).toBe('#ff0000')
    })

    it('devrait utiliser la couleur par défaut si absente', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1')
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.arrowColor).toBe('#22c55e')
    })

    it('devrait toaster l\'activation avec cycles', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', {
          loopMode: 'cycles',
          cycleCount: 5,
        })
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopEnabledOn'),
        'success'
      )
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopWithCycles'),
        'success'
      )
    })

    it('devrait toaster "endOfTrack"', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', { loopMode: 'endOfTrack' })
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopUntilEndOfTrack'),
        'success'
      )
    })

    it('devrait toaster "manualDuration" avec la valeur', () => {
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1', {
          loopMode: 'manualDuration',
          manualDuration: 7,
        })
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastLoopWithDuration'),
        'success'
      )
    })

    it('devrait exclure les clips déjà en boucle du calcul endOfTrack', () => {
      currentLoopState.clips.c2 = { enabled: true }
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1')
      })

      // c2 exclu → reste juste c1 → totalDuration 12
      // max(12, 0 + 3*4 = 12) = 12
      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.end).toBe(12)
    })

    it('devrait protéger start + duration * 4 minimum en endOfTrack', () => {
      // totalDuration = 5, start = 0, duration = 3 → max(5, 12) = 12
      core.totalDurationRef.current = 5
      currentProject.tracks[0].clips = [createClip({ id: 'c1', duration: 3 })]
      const { result } = render()

      act(() => {
        result.current.toggleClipLoop('c1')
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.end).toBe(12)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // updateClipLoopOptions
  // ═══════════════════════════════════════════════════════════════════════

  describe('updateClipLoopOptions', () => {
    it('ne devrait rien faire si projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      act(() => {
        result.current.updateClipLoopOptions('c1', { enabled: true })
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('ne devrait rien faire si aucun loopState pour ce clip', () => {
      const { result } = render()

      act(() => {
        result.current.updateClipLoopOptions('c1', { enabled: true })
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait mettre à jour les options de la boucle', () => {
      currentLoopState.clips.c1 = {
        enabled: true,
        start: 0,
        end: 6,
        arrowColor: '#22c55e',
      }
      const { result } = render()

      act(() => {
        result.current.updateClipLoopOptions('c1', { arrowColor: '#ff0000' })
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.clips.c1.arrowColor).toBe('#ff0000')
      expect(updated.clips.c1.start).toBe(0)
      expect(updated.clips.c1.end).toBe(6)
    })

    it('devrait commit le projet avec le nouveau loopState', () => {
      currentLoopState.clips.c1 = { enabled: true }
      const { result } = render()

      act(() => {
        result.current.updateClipLoopOptions('c1', { arrowColor: '#abc' })
      })

      expect(core.commitProject).toHaveBeenCalled()
      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.loops.clips.c1.arrowColor).toBe('#abc')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // setTimelineLoop
  // ═══════════════════════════════════════════════════════════════════════

  describe('setTimelineLoop', () => {
    it('ne devrait rien faire si projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      act(() => {
        result.current.setTimelineLoop({ enabled: true })
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait fusionner les options dans timeline', () => {
      const { result } = render()

      act(() => {
        result.current.setTimelineLoop({ enabled: true, start: 2, end: 8 })
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.timeline.enabled).toBe(true)
      expect(updated.timeline.start).toBe(2)
      expect(updated.timeline.end).toBe(8)
      // Les autres champs sont préservés
      expect(updated.timeline.color).toBe('#7C6FF7')
      expect(updated.timeline.cycleCount).toBe(3)
    })

    it('devrait marquer isDirty=true', () => {
      const { result } = render()

      act(() => {
        result.current.setTimelineLoop({ enabled: true })
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })

    it('devrait commit le projet avec le nouveau loopState', () => {
      const { result } = render()

      act(() => {
        result.current.setTimelineLoop({ enabled: true })
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.loops.timeline.enabled).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // toggleTimelineLoop
  // ═══════════════════════════════════════════════════════════════════════

  describe('toggleTimelineLoop', () => {
    it('devrait activer si désactivé', () => {
      currentLoopState.timeline.enabled = false
      currentLoopState.timeline.start = 0
      currentLoopState.timeline.end = 10
      const { result } = render()

      act(() => {
        result.current.toggleTimelineLoop()
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.timeline.enabled).toBe(true)
    })

    it('devrait désactiver si activé', () => {
      currentLoopState.timeline.enabled = true
      const { result } = render()

      act(() => {
        result.current.toggleTimelineLoop()
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.timeline.enabled).toBe(false)
    })

    it('devrait ajuster end si start >= end (cas start=end)', () => {
      currentLoopState.timeline.enabled = false
      currentLoopState.timeline.start = 5
      currentLoopState.timeline.end = 5
      const { result } = render()

      act(() => {
        result.current.toggleTimelineLoop()
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.timeline.enabled).toBe(true)
      expect(updated.timeline.end).toBeGreaterThan(updated.timeline.start)
    })

    it('devrait ajuster end si start > end', () => {
      currentLoopState.timeline.enabled = false
      currentLoopState.timeline.start = 10
      currentLoopState.timeline.end = 5
      const { result } = render()

      act(() => {
        result.current.toggleTimelineLoop()
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.timeline.end).toBe(11) // 10 + 1
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // setLoopRegion
  // ═══════════════════════════════════════════════════════════════════════

  describe('setLoopRegion', () => {
    it('devrait clamper start à 0 minimum', () => {
      const { result } = render()

      act(() => {
        result.current.setLoopRegion(-5, 10)
      })

      expect(core.setLoopRegionState).toHaveBeenCalled()
      const updater = core.setLoopRegionState.mock.calls[0][0]
      const newState = updater({ enabled: false, start: 0, end: 10 })
      expect(newState.start).toBe(0)
    })

    it('devrait clamper end à totalDurationRef.current', () => {
      core.totalDurationRef.current = 20
      const { result } = render()

      act(() => {
        result.current.setLoopRegion(5, 50)
      })

      const updater = core.setLoopRegionState.mock.calls[0][0]
      const newState = updater({ enabled: false, start: 0, end: 10 })
      expect(newState.end).toBe(20)
    })

    it('devrait préserver les autres propriétés du state', () => {
      const { result } = render()

      act(() => {
        result.current.setLoopRegion(2, 8)
      })

      const updater = core.setLoopRegionState.mock.calls[0][0]
      const newState = updater({ enabled: true, start: 0, end: 10, custom: 'x' })
      expect(newState.enabled).toBe(true)
      expect(newState.custom).toBe('x')
      expect(newState.start).toBe(2)
      expect(newState.end).toBe(8)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // toggleLoop (alias)
  // ═══════════════════════════════════════════════════════════════════════

  describe('toggleLoop', () => {
    it('devrait déléguer à toggleTimelineLoop', () => {
      const { result } = render()

      act(() => {
        result.current.toggleLoop()
      })

      expect(core.setLoopState).toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // clearLoop
  // ═══════════════════════════════════════════════════════════════════════

  describe('clearLoop', () => {
    it('devrait reset le loopRegion', () => {
      const { result } = render()

      act(() => {
        result.current.clearLoop()
      })

      expect(core.setLoopRegionState).toHaveBeenCalledWith({
        enabled: false,
        start: 0,
        end: 10,
      })
    })

    it('devrait reset la timeline loop', () => {
      const { result } = render()

      act(() => {
        result.current.clearLoop()
      })

      const updated = core.setLoopState.mock.calls[0][0]
      expect(updated.timeline.enabled).toBe(false)
      expect(updated.timeline.start).toBe(0)
      expect(updated.timeline.end).toBe(10)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Structure de retour
  // ═══════════════════════════════════════════════════════════════════════

  describe('structure de retour', () => {
    it('devrait exposer toutes les méthodes', () => {
      const { result } = render()

      expect(typeof result.current.toggleClipLoop).toBe('function')
      expect(typeof result.current.updateClipLoopOptions).toBe('function')
      expect(typeof result.current.setTimelineLoop).toBe('function')
      expect(typeof result.current.toggleTimelineLoop).toBe('function')
      expect(typeof result.current.setLoopRegion).toBe('function')
      expect(typeof result.current.toggleLoop).toBe('function')
      expect(typeof result.current.clearLoop).toBe('function')
    })
  })
})