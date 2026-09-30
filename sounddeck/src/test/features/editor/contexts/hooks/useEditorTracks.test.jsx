import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

import { useEditorTracks } from '@features/editor/contexts/hooks/useEditorTracks'

describe('useEditorTracks', () => {
  let core
  let audioPlayback
  let addToast
  let t
  let confirm
  let currentProject
  let uuidCounter

  const createClip = (overrides = {}) => ({
    id: 'c1',
    name: 'Clip',
    start: 0,
    duration: 3,
    ...overrides,
  })

  beforeEach(() => {
    uuidCounter = 0

    currentProject = {
      id: 'p-1',
      name: 'Test',
      tracks: [
        { id: 't1', name: 'Track 1', clips: [], volume: 1, muted: false, solo: false },
        { id: 't2', name: 'Track 2', clips: [], volume: 1, muted: false, solo: false },
      ],
      updatedAt: 1000,
    }

    addToast = vi.fn()
    t = vi.fn((key, params) => {
      if (params && typeof params === 'object') {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    })
    confirm = vi.fn().mockResolvedValue(true)

    core = {
      projectRef: { current: currentProject },
      clipDurationsRef: { current: {} },
      commitProject: vi.fn(),
      generateUniqueId: vi.fn((prefix) => `${prefix}-test-${++uuidCounter}`),
      setClipDurations: vi.fn(),
      setIsDirty: vi.fn(),
      setSelectedClipId: vi.fn(),
      setSelectedTrackId: vi.fn(),
      selectedClipIdRef: { current: null },
      addToastRef: { current: addToast },
      tRef: { current: t },
      confirm,
    }

    audioPlayback = {
      updateTrackVolume: vi.fn(),
    }
  })

  const render = () => renderHook(() => useEditorTracks(core, audioPlayback))

  // ═══════════════════════════════════════════════════════════════════════
  // addTrack
  // ═══════════════════════════════════════════════════════════════════════

  describe('addTrack', () => {
    it('devrait créer une piste avec le nom fourni', async () => {
      const { result } = render()

      let newTrack
      await act(async () => {
        newTrack = await result.current.addTrack('Custom Name')
      })

      expect(newTrack).not.toBeNull()
      expect(newTrack.name).toBe('Custom Name')
      expect(newTrack.id).toMatch(/^track-/)
    })

    it('devrait générer un nom par défaut si absent', async () => {
      const { result } = render()

      let newTrack
      await act(async () => {
        newTrack = await result.current.addTrack()
      })

      // Project a 2 tracks → Piste 3
      expect(newTrack.name).toBe('Piste 3')
    })

    it('devrait générer une couleur HSL si absente', async () => {
      const { result } = render()

      let newTrack
      await act(async () => {
        newTrack = await result.current.addTrack()
      })

      expect(newTrack.color).toMatch(/^hsl\(/)
    })

    it('devrait utiliser la couleur fournie', async () => {
      const { result } = render()

      let newTrack
      await act(async () => {
        newTrack = await result.current.addTrack('X', '#ff0000')
      })

      expect(newTrack.color).toBe('#ff0000')
    })

    it('devrait ajouter la nouvelle track au projet', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.addTrack()
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks).toHaveLength(3)
    })

    it('devrait initialiser volume=1, muted=false, solo=false', async () => {
      const { result } = render()

      let newTrack
      await act(async () => {
        newTrack = await result.current.addTrack()
      })

      expect(newTrack.volume).toBe(1)
      expect(newTrack.muted).toBe(false)
      expect(newTrack.solo).toBe(false)
      expect(newTrack.clips).toEqual([])
      expect(newTrack.effects).toEqual([])
    })

    it('devrait créer un projet par défaut si absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      let newTrack
      await act(async () => {
        newTrack = await result.current.addTrack('Nouvelle')
      })

      expect(newTrack).not.toBeNull()
      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks).toHaveLength(1)
      expect(committed.name).toBe('Nouveau projet')
    })

    it('devrait recalculer clipDurations', async () => {
      currentProject.tracks[0].clips = [
        createClip({ id: 'existing', duration: 7 }),
      ]
      const { result } = render()

      await act(async () => {
        await result.current.addTrack()
      })

      const newDurations = core.setClipDurations.mock.calls[0][0]
      expect(newDurations.existing).toBe(7)
    })

    it('devrait toaster le succès et marquer isDirty', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.addTrack('Ma track')
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastTrackAdded'),
        'success'
      )
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })

    it('devrait gérer les erreurs', async () => {
      core.commitProject.mockImplementation(() => {
        throw new Error('commit failed')
      })
      const { result } = render()

      let res
      await act(async () => {
        res = await result.current.addTrack()
      })

      expect(res).toBeNull()
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastTrackAddError'),
        'error'
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // removeTrack
  // ═══════════════════════════════════════════════════════════════════════

  describe('removeTrack', () => {
    it('devrait toaster une erreur si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(addToast).toHaveBeenCalledWith('editorToastNoProject', 'error')
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait toaster une erreur si track introuvable', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('unknown')
      })

      expect(addToast).toHaveBeenCalledWith('editorToastTrackNotFound', 'error')
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait refuser de supprimer la dernière piste', async () => {
      currentProject.tracks = [currentProject.tracks[0]]
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(addToast).toHaveBeenCalledWith('editorToastLastTrack', 'warning')
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait supprimer la track si elle est vide (sans confirm)', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(confirm).not.toHaveBeenCalled()
      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks).toHaveLength(1)
      expect(committed.tracks[0].id).toBe('t2')
    })

    it('devrait demander confirmation si la track a des clips', async () => {
      currentProject.tracks[0].clips = [createClip({ id: 'c1' })]
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'confirmDeleteTrack',
          type: 'warning',
        })
      )
    })

    it('devrait annuler si confirm retourne false', async () => {
      currentProject.tracks[0].clips = [createClip({ id: 'c1' })]
      confirm.mockResolvedValue(false)
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait fallback sur window.confirm si confirm absent', async () => {
      currentProject.tracks[0].clips = [createClip({ id: 'c1' })]
      core.confirm = null
      const windowConfirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(windowConfirmSpy).toHaveBeenCalled()
      expect(core.commitProject).toHaveBeenCalled()

      windowConfirmSpy.mockRestore()
    })

    it('devrait nettoyer clipDurations des clips supprimés', async () => {
      currentProject.tracks[0].clips = [
        createClip({ id: 'c1', duration: 5 }),
        createClip({ id: 'c2', duration: 3 }),
      ]
      core.clipDurationsRef.current = { c1: 5, c2: 3, other: 9 }
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      const newDurations = core.setClipDurations.mock.calls[0][0]
      expect(newDurations.c1).toBeUndefined()
      expect(newDurations.c2).toBeUndefined()
      expect(newDurations.other).toBe(9)
    })

    it('devrait désélectionner si le clip sélectionné est supprimé', async () => {
      currentProject.tracks[0].clips = [createClip({ id: 'c1' })]
      core.selectedClipIdRef.current = 'c1'
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(core.setSelectedClipId).toHaveBeenCalledWith(null)
      expect(core.setSelectedTrackId).toHaveBeenCalledWith(null)
    })

    it('ne devrait PAS désélectionner si le clip sélectionné est ailleurs', async () => {
      currentProject.tracks[0].clips = [createClip({ id: 'c1' })]
      currentProject.tracks[1].clips = [createClip({ id: 'c2' })]
      core.selectedClipIdRef.current = 'c2'
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(core.setSelectedClipId).not.toHaveBeenCalled()
    })

    it('devrait toaster et marquer isDirty', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.removeTrack('t1')
      })

      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('editorToastTrackRemoved'),
        'info'
      )
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // renameTrack
  // ═══════════════════════════════════════════════════════════════════════

  describe('renameTrack', () => {
    it('ne devrait rien faire si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      await act(async () => {
        await result.current.renameTrack('t1', 'New')
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait renommer la track ciblée', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.renameTrack('t1', 'Batterie')
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].name).toBe('Batterie')
      expect(committed.tracks[1].name).toBe('Track 2')
    })

    it('devrait marquer isDirty=true', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.renameTrack('t1', 'X')
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // muteTrack
  // ═══════════════════════════════════════════════════════════════════════

  describe('muteTrack', () => {
    it('devrait mute la track ciblée', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.muteTrack('t1', true)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].muted).toBe(true)
      expect(committed.tracks[1].muted).toBe(false)
    })

    it('devrait unmute', async () => {
      currentProject.tracks[0].muted = true
      const { result } = render()

      await act(async () => {
        await result.current.muteTrack('t1', false)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].muted).toBe(false)
    })

    it('ne devrait rien faire si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      await act(async () => {
        await result.current.muteTrack('t1', true)
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // soloTrack
  // ═══════════════════════════════════════════════════════════════════════

  describe('soloTrack', () => {
    it('devrait activer le solo sur la track ciblée', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.soloTrack('t1', true)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].solo).toBe(true)
    })

    it('devrait mute les autres tracks quand solo activé', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.soloTrack('t1', true)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[1].muted).toBe(true)
      expect(committed.tracks[1].solo).toBe(false)
    })

    it('ne devrait pas muter les autres quand solo désactivé', async () => {
      currentProject.tracks[0].solo = true
      currentProject.tracks[1].muted = true
      const { result } = render()

      await act(async () => {
        await result.current.soloTrack('t1', false)
      })

      const committed = core.commitProject.mock.calls[0][0]
      // t1 : solo=false
      expect(committed.tracks[0].solo).toBe(false)
      // t2 : muted reste true (fallback silent au solo=false global)
      expect(committed.tracks[1].solo).toBe(false)
    })

    it('ne devrait rien faire si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      await act(async () => {
        await result.current.soloTrack('t1', true)
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // setTrackVolume
  // ═══════════════════════════════════════════════════════════════════════

  describe('setTrackVolume', () => {
    it('devrait changer le volume de la track', async () => {
      const { result } = render()

      await act(async () => {
        result.current.setTrackVolume('t1', 0.5)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].volume).toBe(0.5)
    })

    it('devrait clamper à 0 minimum', async () => {
      const { result } = render()

      await act(async () => {
        result.current.setTrackVolume('t1', -1)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].volume).toBe(0)
    })

    it('devrait clamper à 5 maximum', async () => {
      const { result } = render()

      await act(async () => {
        result.current.setTrackVolume('t1', 10)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].volume).toBe(5)
    })

    it('devrait passer skipHistory: true à commitProject', async () => {
      const { result } = render()

      await act(async () => {
        result.current.setTrackVolume('t1', 0.8)
      })

      expect(core.commitProject).toHaveBeenCalledWith(expect.any(Object), {
        skipHistory: true,
      })
    })

    it('devrait appeler updateTrackVolume du audioPlayback', async () => {
      const { result } = render()

      await act(async () => {
        result.current.setTrackVolume('t1', 0.3)
      })

      expect(audioPlayback.updateTrackVolume).toHaveBeenCalledWith('t1', 0.3)
    })

    it('devrait transmettre le volume clampé à updateTrackVolume', async () => {
      const { result } = render()

      await act(async () => {
        result.current.setTrackVolume('t1', 10)
      })

      expect(audioPlayback.updateTrackVolume).toHaveBeenCalledWith('t1', 5)
    })

    it('ne devrait rien faire si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      await act(async () => {
        result.current.setTrackVolume('t1', 0.5)
      })
      expect(core.commitProject).not.toHaveBeenCalled()
      expect(audioPlayback.updateTrackVolume).not.toHaveBeenCalled()
    })

    it('devrait marquer isDirty=true', async () => {
      const { result } = render()

      await act(async () => {
        result.current.setTrackVolume('t1', 0.7)
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // Structure de retour
  // ═══════════════════════════════════════════════════════════════════════

  describe('structure de retour', () => {
    it('devrait exposer toutes les méthodes', () => {
      const { result } = render()

      expect(typeof result.current.addTrack).toBe('function')
      expect(typeof result.current.removeTrack).toBe('function')
      expect(typeof result.current.renameTrack).toBe('function')
      expect(typeof result.current.muteTrack).toBe('function')
      expect(typeof result.current.soloTrack).toBe('function')
      expect(typeof result.current.setTrackVolume).toBe('function')
    })
  })
})