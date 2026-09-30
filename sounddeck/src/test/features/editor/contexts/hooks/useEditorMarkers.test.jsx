import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

// ✅ useEditorMarkers utilise `uuid` importé DIRECTEMENT
const uuidMock = vi.hoisted(() => {
  let counter = 0
  return vi.fn((prefix) => {
    counter++
    return prefix ? `${prefix}-mock-${counter}` : `mock-${counter}`
  })
})
vi.mock('@shared/utils/uuid', () => ({ uuid: uuidMock }))

import { useEditorMarkers } from '@features/editor/contexts/hooks/useEditorMarkers'

describe('useEditorMarkers', () => {
  let core
  let playback
  let addToast
  let t
  let currentProject

  beforeEach(() => {
    currentProject = {
      id: 'p-1',
      name: 'Test',
      tracks: [],
      markers: [],
      updatedAt: 1000,
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
      currentTimeRef: { current: 5 },
      commitProject: vi.fn(),
      setIsDirty: vi.fn(),
      addToastRef: { current: addToast },
      tRef: { current: t },
    }

    playback = {
      seek: vi.fn(),
    }
  })

  const render = () => renderHook(() => useEditorMarkers(core, playback))

  // ═══════════════════════════════════════════════════════════════════════
  // addMarker
  // ═══════════════════════════════════════════════════════════════════════

  describe('addMarker', () => {
    it('devrait retourner null si projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      let marker
      act(() => {
        marker = result.current.addMarker({ name: 'Marker 1', time: 3 })
      })

      expect(marker).toBeNull()
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait créer un marqueur avec un ID uuid', () => {
      const { result } = render()

      let marker
      act(() => {
        marker = result.current.addMarker({ name: 'Intro', time: 3 })
      })

      expect(marker).not.toBeNull()
      expect(marker.id).toMatch(/^marker-/)
      expect(marker.name).toBe('Intro')
      expect(marker.time).toBe(3)
    })

    it('devrait utiliser la couleur par défaut', () => {
      const { result } = render()

      let marker
      act(() => {
        marker = result.current.addMarker({ name: 'X', time: 3 })
      })

      expect(marker.color).toBe('#3b82f6')
    })

    it('devrait utiliser la couleur fournie', () => {
      const { result } = render()

      let marker
      act(() => {
        marker = result.current.addMarker({
          name: 'X',
          time: 3,
          color: '#ff0000',
        })
      })

      expect(marker.color).toBe('#ff0000')
    })

    it('devrait générer un nom par défaut', () => {
      currentProject.markers = [{ id: 'm1' }]
      const { result } = render()

      let marker
      act(() => {
        marker = result.current.addMarker({ time: 3 })
      })

      expect(marker.name).toBe('Marker 2')
    })

    it('devrait utiliser currentTimeRef.current si time absent', () => {
      core.currentTimeRef.current = 8.5
      const { result } = render()

      let marker
      act(() => {
        marker = result.current.addMarker({ name: 'X' })
      })

      expect(marker.time).toBe(8.5)
    })

    it('devrait ajouter le marqueur à la liste', () => {
      currentProject.markers = [{ id: 'm1', name: 'Existing' }]
      const { result } = render()

      act(() => {
        result.current.addMarker({ name: 'Nouveau', time: 5 })
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.markers).toHaveLength(2)
    })

    it('devrait gérer markers absent (créer un tableau)', () => {
      currentProject.markers = undefined
      const { result } = render()

      act(() => {
        result.current.addMarker({ name: 'X', time: 3 })
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.markers).toHaveLength(1)
    })

    it('devrait marquer isDirty=true et toaster', () => {
      const { result } = render()

      act(() => {
        result.current.addMarker({ name: 'Intro', time: 3 })
      })

      expect(core.setIsDirty).toHaveBeenCalledWith(true)
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastMarkerAdded'),
        'success'
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // removeMarker
  // ═══════════════════════════════════════════════════════════════════════

  describe('removeMarker', () => {
    it('ne devrait rien faire si projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      act(() => {
        result.current.removeMarker('m1')
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('ne devrait rien faire si le marqueur n\'existe pas', () => {
      const { result } = render()

      act(() => {
        result.current.removeMarker('unknown')
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait retirer le marqueur', () => {
      currentProject.markers = [
        { id: 'm1', name: 'A' },
        { id: 'm2', name: 'B' },
      ]
      const { result } = render()

      act(() => {
        result.current.removeMarker('m1')
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.markers).toHaveLength(1)
      expect(committed.markers[0].id).toBe('m2')
    })

    it('devrait gérer markers absent', () => {
      currentProject.markers = undefined
      const { result } = render()

      act(() => {
        result.current.removeMarker('m1')
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait toaster la suppression', () => {
      currentProject.markers = [{ id: 'm1', name: 'Intro' }]
      const { result } = render()

      act(() => {
        result.current.removeMarker('m1')
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastMarkerRemoved'),
        'info'
      )
    })

    it('devrait marquer isDirty=true', () => {
      currentProject.markers = [{ id: 'm1', name: 'Intro' }]
      const { result } = render()

      act(() => {
        result.current.removeMarker('m1')
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // updateMarker
  // ═══════════════════════════════════════════════════════════════════════

  describe('updateMarker', () => {
    it('ne devrait rien faire si projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      act(() => {
        result.current.updateMarker('m1', { name: 'New' })
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait mettre à jour le marqueur ciblé', () => {
      currentProject.markers = [
        { id: 'm1', name: 'Old', time: 3, color: '#abc' },
      ]
      const { result } = render()

      act(() => {
        result.current.updateMarker('m1', { name: 'New' })
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.markers[0].name).toBe('New')
      expect(committed.markers[0].time).toBe(3)
      expect(committed.markers[0].color).toBe('#abc')
    })

    it('devrait ne toucher qu\'au marqueur ciblé', () => {
      currentProject.markers = [
        { id: 'm1', name: 'A' },
        { id: 'm2', name: 'B' },
      ]
      const { result } = render()

      act(() => {
        result.current.updateMarker('m1', { name: 'Updated' })
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.markers[1].name).toBe('B')
    })

    it('devrait mettre à jour plusieurs champs', () => {
      currentProject.markers = [{ id: 'm1', name: 'Old', time: 3, color: '#abc' }]
      const { result } = render()

      act(() => {
        result.current.updateMarker('m1', {
          name: 'New',
          time: 8,
          color: '#ff0000',
        })
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.markers[0].name).toBe('New')
      expect(committed.markers[0].time).toBe(8)
      expect(committed.markers[0].color).toBe('#ff0000')
    })

    it('devrait marquer isDirty=true', () => {
      currentProject.markers = [{ id: 'm1', name: 'Old' }]
      const { result } = render()

      act(() => {
        result.current.updateMarker('m1', { name: 'New' })
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // navigateToMarker
  // ═══════════════════════════════════════════════════════════════════════

  describe('navigateToMarker', () => {
    it('devrait déléguer à playback.seek', () => {
      const { result } = render()

      act(() => {
        result.current.navigateToMarker(7.5)
      })

      expect(playback.seek).toHaveBeenCalledWith(7.5)
    })

    it('devrait accepter n\'importe quel temps', () => {
      const { result } = render()

      act(() => {
        result.current.navigateToMarker(0)
      })
      expect(playback.seek).toHaveBeenCalledWith(0)

      act(() => {
        result.current.navigateToMarker(100)
      })
      expect(playback.seek).toHaveBeenCalledWith(100)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Structure de retour
  // ═══════════════════════════════════════════════════════════════════════

  describe('structure de retour', () => {
    it('devrait exposer toutes les méthodes', () => {
      const { result } = render()

      expect(typeof result.current.addMarker).toBe('function')
      expect(typeof result.current.removeMarker).toBe('function')
      expect(typeof result.current.updateMarker).toBe('function')
      expect(typeof result.current.navigateToMarker).toBe('function')
    })
  })
})