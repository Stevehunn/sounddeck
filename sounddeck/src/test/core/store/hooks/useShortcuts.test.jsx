import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShortcuts } from '@core/store/hooks/useShortcuts'

describe('useShortcuts', () => {
  let save
  let electronMock

  beforeEach(() => {
    vi.clearAllMocks()

    save = vi.fn().mockResolvedValue()
    electronMock = {
      updateShortcuts: vi.fn().mockResolvedValue(),
      updateProfileShortcut: vi.fn().mockResolvedValue(),
    }
    window.electronAPI = electronMock
  })

  const renderHookWith = (
    initialShortcuts = {},
    initialProfileShortcut = 'CommandOrControl+Tab'
  ) => renderHook(() => useShortcuts(initialShortcuts, initialProfileShortcut, save))

  // ─── ÉTAT INITIAL ────────────────────────────────────────────────────

  describe('état initial', () => {
    it('devrait démarrer avec les shortcuts passés', () => {
      const { result } = renderHookWith({ 'sound-1': 'Ctrl+1' })
      expect(result.current.shortcuts).toEqual({ 'sound-1': 'Ctrl+1' })
    })

    it('devrait démarrer avec le profileShortcut', () => {
      const { result } = renderHookWith()
      expect(result.current.profileShortcut).toBe('CommandOrControl+Tab')
    })
  })

  // ─── setShortcut ─────────────────────────────────────────────────────

  describe('setShortcut', () => {
    it('devrait ajouter un raccourci pour un son', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.setShortcut('sound-1', 'Ctrl+1')
      })

      expect(result.current.shortcuts['sound-1']).toBe('Ctrl+1')
    })

    it('devrait persister via save', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.setShortcut('sound-1', 'Ctrl+1')
      })

      expect(save).toHaveBeenCalledWith('shortcuts', { 'sound-1': 'Ctrl+1' })
    })

    it('devrait notifier le main process', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.setShortcut('sound-1', 'Ctrl+1')
      })

      expect(electronMock.updateShortcuts).toHaveBeenCalledWith({
        'sound-1': 'Ctrl+1',
      })
    })

    it('devrait écraser un raccourci existant', async () => {
      const { result } = renderHookWith({ 'sound-1': 'Ctrl+1' })

      await act(async () => {
        await result.current.setShortcut('sound-1', 'Ctrl+2')
      })

      expect(result.current.shortcuts['sound-1']).toBe('Ctrl+2')
    })
  })

  // ─── clearShortcut ───────────────────────────────────────────────────

  describe('clearShortcut', () => {
    it('devrait retirer un raccourci', async () => {
      const { result } = renderHookWith({
        'sound-1': 'Ctrl+1',
        'sound-2': 'Ctrl+2',
      })

      await act(async () => {
        await result.current.clearShortcut('sound-1')
      })

      expect(result.current.shortcuts['sound-1']).toBeUndefined()
      expect(result.current.shortcuts['sound-2']).toBe('Ctrl+2')
    })

    it('devrait persister après suppression', async () => {
      const { result } = renderHookWith({ 'sound-1': 'Ctrl+1' })

      await act(async () => {
        await result.current.clearShortcut('sound-1')
      })

      expect(save).toHaveBeenCalledWith('shortcuts', {})
    })

    it('devrait notifier le main process', async () => {
      const { result } = renderHookWith({ 'sound-1': 'Ctrl+1' })

      await act(async () => {
        await result.current.clearShortcut('sound-1')
      })

      expect(electronMock.updateShortcuts).toHaveBeenCalledWith({})
    })

    it('ne devrait pas planter si le raccourci n\'existe pas', async () => {
      const { result } = renderHookWith()

      await expect(
        act(async () => {
          await result.current.clearShortcut('unknown')
        })
      ).resolves.not.toThrow()
    })
  })

  // ─── updateProfileShortcut ──────────────────────────────────────────

  describe('updateProfileShortcut', () => {
    it('devrait mettre à jour le profileShortcut', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.updateProfileShortcut('Ctrl+Alt+P')
      })

      expect(result.current.profileShortcut).toBe('Ctrl+Alt+P')
    })

    it('devrait persister via save', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.updateProfileShortcut('Ctrl+Alt+P')
      })

      expect(save).toHaveBeenCalledWith('profileShortcut', 'Ctrl+Alt+P')
    })

    it('devrait notifier le main process', async () => {
      const { result } = renderHookWith()

      await act(async () => {
        await result.current.updateProfileShortcut('Ctrl+Alt+P')
      })

      expect(electronMock.updateProfileShortcut).toHaveBeenCalledWith('Ctrl+Alt+P')
    })
  })

  // ─── cleanupOrphanShortcuts ─────────────────────────────────────────

  describe('cleanupOrphanShortcuts', () => {
    it('devrait supprimer les raccourcis orphelins', async () => {
      const { result } = renderHookWith({
        'sound-1': 'Ctrl+1',
        'orphan-1': 'Ctrl+2',
        'orphan-2': 'Ctrl+3',
      })

      const soundIds = new Set(['sound-1'])

      let changed
      await act(async () => {
        changed = await result.current.cleanupOrphanShortcuts(soundIds)
      })

      expect(changed).toBe(true)
      expect(result.current.shortcuts).toEqual({ 'sound-1': 'Ctrl+1' })
    })

    it('devrait persister le nettoyage', async () => {
      const { result } = renderHookWith({
        'sound-1': 'Ctrl+1',
        'orphan': 'Ctrl+2',
      })

      await act(async () => {
        await result.current.cleanupOrphanShortcuts(new Set(['sound-1']))
      })

      expect(save).toHaveBeenCalledWith('shortcuts', { 'sound-1': 'Ctrl+1' })
    })

    it('devrait notifier le main process', async () => {
      const { result } = renderHookWith({
        'sound-1': 'Ctrl+1',
        'orphan': 'Ctrl+2',
      })

      await act(async () => {
        await result.current.cleanupOrphanShortcuts(new Set(['sound-1']))
      })

      expect(electronMock.updateShortcuts).toHaveBeenCalledWith({
        'sound-1': 'Ctrl+1',
      })
    })

    it('devrait retourner false si aucun changement', async () => {
      const { result } = renderHookWith({ 'sound-1': 'Ctrl+1' })

      let changed
      await act(async () => {
        changed = await result.current.cleanupOrphanShortcuts(new Set(['sound-1']))
      })

      expect(changed).toBe(false)
      expect(save).not.toHaveBeenCalled()
      expect(electronMock.updateShortcuts).not.toHaveBeenCalled()
    })

    it('devrait tout supprimer si soundIds est vide', async () => {
      const { result } = renderHookWith({
        'sound-1': 'Ctrl+1',
        'sound-2': 'Ctrl+2',
      })

      await act(async () => {
        await result.current.cleanupOrphanShortcuts(new Set())
      })

      expect(result.current.shortcuts).toEqual({})
    })
  })

  // ─── setShortcuts (setter direct) ────────────────────────────────────

  describe('setShortcuts', () => {
    it('devrait remplacer toute la map', () => {
      const { result } = renderHookWith({ 'sound-1': 'Ctrl+1' })

      act(() => {
        result.current.setShortcuts({ 'sound-2': 'Ctrl+2' })
      })

      expect(result.current.shortcuts).toEqual({ 'sound-2': 'Ctrl+2' })
    })
  })
})