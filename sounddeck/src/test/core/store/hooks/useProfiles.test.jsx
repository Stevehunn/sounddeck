import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProfiles } from '@core/store/hooks/useProfiles'

// ─── Mock uuid pour des IDs déterministes ───────────────────────────────
vi.mock('@shared/utils/uuid', () => ({
  uuid: vi.fn(() => 'generated-uuid-123'),
}))

describe('useProfiles', () => {
  let save

  const ALL_PROFILE = { id: 'all', name: 'Tous les sons', isDefault: true }
  const PROFILE_A = { id: 'p-a', name: 'Gaming', isDefault: false }
  const PROFILE_B = { id: 'p-b', name: 'Musique', isDefault: false }

  beforeEach(() => {
    vi.clearAllMocks()
    save = vi.fn().mockResolvedValue()
  })

  const renderHookWith = (initialProfiles = [ALL_PROFILE], initialId = 'all') =>
    renderHook(() => useProfiles(initialProfiles, initialId, save))

  // ─── ÉTAT INITIAL ────────────────────────────────────────────────────

  describe('état initial', () => {
    it('devrait démarrer avec les profils passés', () => {
      const { result } = renderHookWith()
      expect(result.current.profiles).toEqual([ALL_PROFILE])
    })

    it('devrait démarrer avec currentProfileId="all"', () => {
      const { result } = renderHookWith()
      expect(result.current.currentProfileId).toBe('all')
    })

    it('devrait accepter un currentProfileId personnalisé', () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A], 'p-a')
      expect(result.current.currentProfileId).toBe('p-a')
    })
  })

  // ─── createProfile ───────────────────────────────────────────────────

  describe('createProfile', () => {
    it('devrait créer un profil avec un UUID', async () => {
      const { result } = renderHookWith()

      let created
      await act(async () => {
        created = await result.current.createProfile('Streaming')
      })

      expect(created.id).toBe('generated-uuid-123')
      expect(created.name).toBe('Streaming')
      expect(created.isDefault).toBe(false)
    })

    it('devrait ajouter le profil à la liste', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.createProfile('Streaming')
      })

      expect(result.current.profiles.length).toBe(2)
      expect(result.current.profiles[1].name).toBe('Streaming')
    })

    it('devrait persister en excluant "all"', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.createProfile('Streaming')
      })

      expect(save).toHaveBeenCalledWith('profiles', [
        expect.objectContaining({ name: 'Streaming' }),
      ])
    })
  })

  // ─── replaceAllProfiles ──────────────────────────────────────────────

  describe('replaceAllProfiles', () => {
    it('devrait remplacer la liste entière', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.replaceAllProfiles([ALL_PROFILE, PROFILE_A, PROFILE_B])
      })

      expect(result.current.profiles.length).toBe(3)
    })

    it('devrait ignorer les valeurs non-tableau', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.replaceAllProfiles(null)
      })

      expect(result.current.profiles.length).toBe(1)
      expect(save).not.toHaveBeenCalled()
    })

    it('devrait persister en excluant "all"', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.replaceAllProfiles([ALL_PROFILE, PROFILE_A])
      })

      expect(save).toHaveBeenCalledWith('profiles', [PROFILE_A])
    })
  })

  // ─── deleteProfile ───────────────────────────────────────────────────

  describe('deleteProfile', () => {
    it('ne devrait PAS supprimer "all"', async () => {
      const { result } = renderHookWith()

      let ok
      await act(async () => {
        ok = await result.current.deleteProfile('all')
      })

      expect(ok).toBeUndefined()
      expect(result.current.profiles.length).toBe(1)
      expect(save).not.toHaveBeenCalled()
    })

    it('devrait supprimer un profil user', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A])

      await act(async () => {
        await result.current.deleteProfile('p-a')
      })

      expect(result.current.profiles.length).toBe(1)
      expect(result.current.profiles[0].id).toBe('all')
    })

    it('devrait basculer sur "all" si on supprime le profil actif', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A], 'p-a')

      await act(async () => {
        await result.current.deleteProfile('p-a')
      })

      expect(result.current.currentProfileId).toBe('all')
      expect(save).toHaveBeenCalledWith('currentProfileId', 'all')
    })

    it('ne devrait PAS changer currentProfileId si on supprime un autre', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A, PROFILE_B], 'p-a')

      await act(async () => {
        await result.current.deleteProfile('p-b')
      })

      expect(result.current.currentProfileId).toBe('p-a')
    })
  })

  // ─── renameProfile ───────────────────────────────────────────────────

  describe('renameProfile', () => {
    it('devrait renommer un profil', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A])

      await act(async () => {
        await result.current.renameProfile('p-a', 'Nouveau nom')
      })

      expect(result.current.profiles[1].name).toBe('Nouveau nom')
    })

    it('devrait persister après renommage', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A])

      await act(async () => {
        await result.current.renameProfile('p-a', 'Renommé')
      })

      expect(save).toHaveBeenCalledWith('profiles', [
        expect.objectContaining({ id: 'p-a', name: 'Renommé' }),
      ])
    })
  })

  // ─── switchProfile ───────────────────────────────────────────────────

  describe('switchProfile', () => {
    it('devrait changer le profil courant', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A])

      await act(async () => {
        await result.current.switchProfile('p-a')
      })

      expect(result.current.currentProfileId).toBe('p-a')
    })

    it('devrait persister le changement', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A])

      await act(async () => {
        await result.current.switchProfile('p-a')
      })

      expect(save).toHaveBeenCalledWith('currentProfileId', 'p-a')
    })
  })

  // ─── switchToNextProfile ────────────────────────────────────────────

  describe('switchToNextProfile', () => {
    it('devrait passer au profil suivant', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A, PROFILE_B], 'all')

      await act(async () => {
        await result.current.switchToNextProfile()
      })

      expect(result.current.currentProfileId).toBe('p-a')
    })

    it('devrait boucler en fin de liste', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A, PROFILE_B], 'p-b')

      await act(async () => {
        await result.current.switchToNextProfile()
      })

      expect(result.current.currentProfileId).toBe('all')
    })

    it('devrait partir de 0 si currentProfileId est inconnu', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A], 'unknown')

      await act(async () => {
        await result.current.switchToNextProfile()
      })

      expect(result.current.currentProfileId).toBe('all')
    })

    it('ne devrait rien faire si aucun profil', async () => {
      const { result } = renderHookWith([], 'all')

      await act(async () => {
        await result.current.switchToNextProfile()
      })

      expect(save).not.toHaveBeenCalled()
    })
  })

  // ─── reorderProfiles ─────────────────────────────────────────────────

  describe('reorderProfiles', () => {
    it('devrait réordonner les profils user', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A, PROFILE_B])

      let ok
      await act(async () => {
        ok = await result.current.reorderProfiles(0, 1)
      })

      expect(ok).toBe(true)
      // A et B échangés
      expect(result.current.profiles.map((p) => p.id)).toEqual(['all', 'p-b', 'p-a'])
    })

    it('ne devrait PAS déplacer "all"', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A, PROFILE_B])

      await act(async () => {
        await result.current.reorderProfiles(0, 1)
      })

      // "all" reste en position 0
      expect(result.current.profiles[0].id).toBe('all')
    })

    it('devrait retourner false si indices invalides', async () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A])

      let ok
      await act(async () => {
        ok = await result.current.reorderProfiles(5, 10)
      })

      expect(ok).toBe(false)
    })
  })

  // ─── getUserProfiles ─────────────────────────────────────────────────

  describe('getUserProfiles', () => {
    it('devrait exclure "all"', () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A, PROFILE_B])

      const users = result.current.getUserProfiles()
      expect(users.length).toBe(2)
      expect(users.every((p) => p.id !== 'all')).toBe(true)
    })
  })

  // ─── getAllProfiles ──────────────────────────────────────────────────

  describe('getAllProfiles', () => {
    it('devrait inclure "all" avec nameKey', () => {
      const { result } = renderHookWith([ALL_PROFILE, PROFILE_A])

      const all = result.current.getAllProfiles()
      expect(all[0].id).toBe('all')
      expect(all[0].nameKey).toBe('allSounds')
      expect(all[0].isDefault).toBe(true)
    })

    it('devrait construire "all" même s\'il n\'est pas dans profiles', () => {
      const { result } = renderHookWith([PROFILE_A])

      const all = result.current.getAllProfiles()
      expect(all[0].id).toBe('all')
      expect(all.length).toBe(2)
    })

    it('devrait toujours retourner au moins "all"', () => {
      const { result } = renderHookWith([])

      const all = result.current.getAllProfiles()
      expect(all.length).toBe(1)
      expect(all[0].id).toBe('all')
    })
  })
})