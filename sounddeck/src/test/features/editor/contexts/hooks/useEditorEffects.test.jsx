import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

import { useEditorEffects } from '@features/editor/contexts/hooks/useEditorEffects'

describe('useEditorEffects', () => {
  let core
  let currentProject
  let uuidCounter

  const createClip = (overrides = {}) => ({
    id: 'c1',
    name: 'Clip',
    start: 0,
    duration: 3,
    effects: [],
    ...overrides,
  })

  beforeEach(() => {
    uuidCounter = 0

    currentProject = {
      id: 'p-1',
      name: 'Test',
      tracks: [
        { id: 't1', name: 'Track 1', clips: [createClip({ id: 'c1' })] },
        { id: 't2', name: 'Track 2', clips: [createClip({ id: 'c2' })] },
      ],
      updatedAt: 1000,
    }

    core = {
      projectRef: { current: currentProject },
      commitProject: vi.fn(),
      generateUniqueId: vi.fn((prefix) => `${prefix}-test-${++uuidCounter}`),
      setIsDirty: vi.fn(),
    }
  })

  const render = () => renderHook(() => useEditorEffects(core))

  // ═══════════════════════════════════════════════════════════════════════
  // addEffectToClip
  // ═══════════════════════════════════════════════════════════════════════

  describe('addEffectToClip', () => {
    it('devrait retourner null si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      let res
      await act(async () => {
        res = await result.current.addEffectToClip('t1', 'c1', 'volume', {
          value: 1,
        })
      })

      expect(res).toBeNull()
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait créer un effet avec un ID généré', async () => {
      const { result } = render()

      let effect
      await act(async () => {
        effect = await result.current.addEffectToClip('t1', 'c1', 'volume', {
          value: 1.5,
        })
      })

      expect(effect).not.toBeNull()
      expect(effect.id).toMatch(/^effect-/)
      expect(effect.type).toBe('volume')
      expect(effect.params).toEqual({ value: 1.5 })
      expect(effect.enabled).toBe(true)
    })

    it('devrait ajouter l\'effet au clip', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.addEffectToClip('t1', 'c1', 'volume', {
          value: 1,
        })
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].clips[0].effects).toHaveLength(1)
      expect(committed.tracks[0].clips[0].effects[0].type).toBe('volume')
    })

    it('ne devrait PAS toucher aux autres clips', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.addEffectToClip('t1', 'c1', 'volume', { value: 1 })
      })

      const committed = core.commitProject.mock.calls[0][0]
      // c2 n'est pas touché
      expect(committed.tracks[1].clips[0].effects).toEqual([])
    })

    it('devrait ajouter à la suite des effets existants', async () => {
      currentProject.tracks[0].clips[0].effects = [
        { id: 'e0', type: 'fadeIn', params: { duration: 0.5 }, enabled: true },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.addEffectToClip('t1', 'c1', 'echo', {
          delay: 0.3,
        })
      })

      const committed = core.commitProject.mock.calls[0][0]
      const effects = committed.tracks[0].clips[0].effects
      expect(effects).toHaveLength(2)
      expect(effects[1].type).toBe('echo')
    })

    it('devrait marquer isDirty=true', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.addEffectToClip('t1', 'c1', 'volume', { value: 1 })
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })

    it('devrait utiliser {} par défaut pour les params', async () => {
      const { result } = render()

      let effect
      await act(async () => {
        effect = await result.current.addEffectToClip('t1', 'c1', 'reverb')
      })

      expect(effect.params).toEqual({})
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // removeEffectFromClip
  // ═══════════════════════════════════════════════════════════════════════

  describe('removeEffectFromClip', () => {
    it('ne devrait rien faire si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      await act(async () => {
        await result.current.removeEffectFromClip('t1', 'c1', 'e1')
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait retirer l\'effet ciblé', async () => {
      currentProject.tracks[0].clips[0].effects = [
        { id: 'e1', type: 'volume', params: { value: 1 } },
        { id: 'e2', type: 'echo', params: {} },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.removeEffectFromClip('t1', 'c1', 'e1')
      })

      const committed = core.commitProject.mock.calls[0][0]
      const effects = committed.tracks[0].clips[0].effects
      expect(effects).toHaveLength(1)
      expect(effects[0].id).toBe('e2')
    })

    it('ne devrait pas planter si le clip n\'a pas d\'effets', async () => {
      currentProject.tracks[0].clips[0].effects = undefined
      const { result } = render()

      await act(async () => {
        await result.current.removeEffectFromClip('t1', 'c1', 'e1')
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].clips[0].effects).toEqual([])
    })

    it('devrait marquer isDirty=true', async () => {
      currentProject.tracks[0].clips[0].effects = [
        { id: 'e1', type: 'volume' },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.removeEffectFromClip('t1', 'c1', 'e1')
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // updateEffectParam
  // ═══════════════════════════════════════════════════════════════════════

  describe('updateEffectParam', () => {
    it('ne devrait rien faire si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      await act(async () => {
        await result.current.updateEffectParam('t1', 'c1', 'e1', 'value', 2)
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait mettre à jour le paramètre', async () => {
      currentProject.tracks[0].clips[0].effects = [
        { id: 'e1', type: 'volume', params: { value: 1 } },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.updateEffectParam('t1', 'c1', 'e1', 'value', 2.5)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].clips[0].effects[0].params.value).toBe(2.5)
    })

    it('devrait préserver les autres params', async () => {
      currentProject.tracks[0].clips[0].effects = [
        {
          id: 'e1',
          type: 'echo',
          params: { delay: 0.3, decay: 0.5, mix: 0.3 },
        },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.updateEffectParam('t1', 'c1', 'e1', 'decay', 0.8)
      })

      const committed = core.commitProject.mock.calls[0][0]
      const params = committed.tracks[0].clips[0].effects[0].params
      expect(params.delay).toBe(0.3)
      expect(params.decay).toBe(0.8)
      expect(params.mix).toBe(0.3)
    })

    it('devrait passer skipHistory: true', async () => {
      currentProject.tracks[0].clips[0].effects = [
        { id: 'e1', type: 'volume', params: { value: 1 } },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.updateEffectParam('t1', 'c1', 'e1', 'value', 2)
      })

      expect(core.commitProject).toHaveBeenCalledWith(expect.any(Object), {
        skipHistory: true,
      })
    })

    it('devrait marquer isDirty=true', async () => {
      currentProject.tracks[0].clips[0].effects = [
        { id: 'e1', type: 'volume', params: { value: 1 } },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.updateEffectParam('t1', 'c1', 'e1', 'value', 2)
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // toggleEffect
  // ═══════════════════════════════════════════════════════════════════════

  describe('toggleEffect', () => {
    it('ne devrait rien faire si projet absent', async () => {
      core.projectRef.current = null
      const { result } = render()

      await act(async () => {
        await result.current.toggleEffect('t1', 'c1', 'e1', false)
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait désactiver l\'effet', async () => {
      currentProject.tracks[0].clips[0].effects = [
        { id: 'e1', type: 'volume', enabled: true },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.toggleEffect('t1', 'c1', 'e1', false)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].clips[0].effects[0].enabled).toBe(false)
    })

    it('devrait réactiver l\'effet', async () => {
      currentProject.tracks[0].clips[0].effects = [
        { id: 'e1', type: 'volume', enabled: false },
      ]
      const { result } = render()

      await act(async () => {
        await result.current.toggleEffect('t1', 'c1', 'e1', true)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].clips[0].effects[0].enabled).toBe(true)
    })

    it('devrait marquer isDirty=true', async () => {
      currentProject.tracks[0].clips[0].effects = [{ id: 'e1', type: 'volume' }]
      const { result } = render()

      await act(async () => {
        await result.current.toggleEffect('t1', 'c1', 'e1', false)
      })
      expect(core.setIsDirty).toHaveBeenCalledWith(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // setClipFade
  // ═══════════════════════════════════════════════════════════════════════

  describe('setClipFade', () => {
    it('ne devrait rien faire si projet absent', () => {
      core.projectRef.current = null
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 0.5)
      })
      expect(core.commitProject).not.toHaveBeenCalled()
    })

    it('devrait créer un effet fadeIn si absent', () => {
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 0.5)
      })

      const committed = core.commitProject.mock.calls[0][0]
      const effects = committed.tracks[0].clips[0].effects
      expect(effects).toHaveLength(1)
      expect(effects[0].type).toBe('fadeIn')
      expect(effects[0].params.duration).toBe(0.5)
      expect(effects[0].enabled).toBe(true)
    })

    it('devrait créer un effet fadeOut si edge=out', () => {
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'out', 1.5)
      })

      const committed = core.commitProject.mock.calls[0][0]
      const effects = committed.tracks[0].clips[0].effects
      expect(effects[0].type).toBe('fadeOut')
      expect(effects[0].params.duration).toBe(1.5)
    })

    it('devrait mettre à jour un fadeIn existant', () => {
      currentProject.tracks[0].clips[0].effects = [
        {
          id: 'existing',
          type: 'fadeIn',
          params: { duration: 0.3 },
          enabled: true,
        },
      ]
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 1.2)
      })

      const committed = core.commitProject.mock.calls[0][0]
      const effects = committed.tracks[0].clips[0].effects
      expect(effects).toHaveLength(1)
      expect(effects[0].id).toBe('existing')
      expect(effects[0].params.duration).toBe(1.2)
    })

    it('devrait clamper duration à 0.05 minimum', () => {
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 0.001)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].clips[0].effects[0].params.duration).toBe(0.05)
    })

    it('devrait clamper duration à 10 maximum', () => {
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 15)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].clips[0].effects[0].params.duration).toBe(10)
    })

    it('devrait désactiver l\'effet si duration <= 0.05', () => {
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 0.05)
      })

      const committed = core.commitProject.mock.calls[0][0]
      // duration = 0.05 pile → enabled = false (0.05 > 0.05 = false)
      expect(committed.tracks[0].clips[0].effects[0].enabled).toBe(false)
    })

    it('devrait activer l\'effet si duration > 0.05', () => {
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 0.06)
      })

      const committed = core.commitProject.mock.calls[0][0]
      expect(committed.tracks[0].clips[0].effects[0].enabled).toBe(true)
    })

    it('devrait passer skipHistory: true', () => {
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 0.5)
      })

      expect(core.commitProject).toHaveBeenCalledWith(expect.any(Object), {
        skipHistory: true,
      })
    })

    it('devrait marquer isDirty=true', () => {
      const { result } = render()

      act(() => {
        result.current.setClipFade('t1', 'c1', 'in', 0.5)
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

      expect(typeof result.current.addEffectToClip).toBe('function')
      expect(typeof result.current.removeEffectFromClip).toBe('function')
      expect(typeof result.current.updateEffectParam).toBe('function')
      expect(typeof result.current.toggleEffect).toBe('function')
      expect(typeof result.current.setClipFade).toBe('function')
    })
  })
})