// src/test/features/sequencer/hooks/usePlaylists.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePlaylists } from '@features/sequencer/hooks/usePlaylists'

const getStoreGet = () => window.electronAPI.storeGet
const getStoreSet = () => window.electronAPI.storeSet

beforeEach(() => {
  getStoreGet().mockReset().mockResolvedValue(null)
  getStoreSet().mockReset().mockResolvedValue(undefined)
})

// ═══════════════════════════════════════════════════════════════════════
// CHARGEMENT INITIAL
// ═══════════════════════════════════════════════════════════════════════
describe('usePlaylists > Chargement', () => {
  it('initialise playlists à [] et activePlaylistId à null', () => {
    const { result } = renderHook(() => usePlaylists())
    expect(result.current.playlists).toEqual([])
    expect(result.current.activePlaylistId).toBeNull()
  })

  it('charge les playlists depuis le store au mount', async () => {
    const saved = [
      { id: 'p1', name: 'Rock', items: [], loop: false },
      { id: 'p2', name: 'Jazz', items: [], loop: true },
    ]
    getStoreGet().mockResolvedValue(saved)

    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(2))
    expect(result.current.playlists[0].id).toBe('p1')
    expect(result.current.playlists[0].name).toBe('Rock')
  })

  it('appelle storeGet avec la clé "playlists"', async () => {
    renderHook(() => usePlaylists())
    await waitFor(() => expect(getStoreGet()).toHaveBeenCalledWith('playlists'))
  })

  it('gère une erreur de storeGet sans crash', async () => {
    getStoreGet().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(getStoreGet()).toHaveBeenCalled())
    expect(result.current.playlists).toEqual([])
  })

  it('ne met pas à jour l\'état après unmount', async () => {
    let resolveGet
    getStoreGet().mockReturnValue(new Promise((r) => { resolveGet = r }))

    const { result, unmount } = renderHook(() => usePlaylists())
    unmount()

    await act(async () => {
      resolveGet([{ id: 'p1', name: 'Late', items: [] }])
    })

    expect(result.current.playlists).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════
// createPlaylist
// ═══════════════════════════════════════════════════════════════════════
describe('usePlaylists > createPlaylist', () => {
  it('crée une playlist avec un id unique', async () => {
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(getStoreGet()).toHaveBeenCalled())

    let created
    await act(async () => {
      created = await result.current.createPlaylist('Ma Playlist')
    })

    expect(created.id).toBeTruthy()
    expect(created.name).toBe('Ma Playlist')
    expect(created.items).toEqual([])
    expect(created.loop).toBe(false)
    expect(created.createdAt).toBeGreaterThan(0)
  })

  it('persiste la nouvelle playlist dans le store', async () => {
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(getStoreGet()).toHaveBeenCalled())

    await act(async () => {
      await result.current.createPlaylist('Test')
    })

    expect(getStoreSet()).toHaveBeenCalledWith('playlists', expect.any(Array))
    const [, saved] = getStoreSet().mock.calls[0]
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('Test')
  })

  it('sélectionne automatiquement la nouvelle playlist', async () => {
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(getStoreGet()).toHaveBeenCalled())

    let created
    await act(async () => {
      created = await result.current.createPlaylist('Test')
    })

    expect(result.current.activePlaylistId).toBe(created.id)
  })

  it('retourne null si name vide', async () => {
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(getStoreGet()).toHaveBeenCalled())

    let returned
    await act(async () => {
      returned = await result.current.createPlaylist('')
    })

    expect(returned).toBeNull()
    expect(result.current.playlists).toEqual([])
  })

  it('trim le nom', async () => {
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(getStoreGet()).toHaveBeenCalled())

    let created
    await act(async () => {
      created = await result.current.createPlaylist('   Spaced   ')
    })

    expect(created.name).toBe('Spaced')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// deletePlaylist
// ═══════════════════════════════════════════════════════════════════════
describe('usePlaylists > deletePlaylist', () => {
  const setupWithTwo = async () => {
    getStoreGet().mockResolvedValue([
      { id: 'p1', name: 'A', items: [], loop: false },
      { id: 'p2', name: 'B', items: [], loop: false },
    ])
    const hook = renderHook(() => usePlaylists())
    await waitFor(() => expect(hook.result.current.playlists).toHaveLength(2))
    return hook
  }

  it('retire la playlist par id', async () => {
    const { result } = await setupWithTwo()

    await act(async () => {
      await result.current.deletePlaylist('p1')
    })

    expect(result.current.playlists).toHaveLength(1)
    expect(result.current.playlists[0].id).toBe('p2')
  })

  it('désélectionne si la playlist supprimée était active', async () => {
    const { result } = await setupWithTwo()

    act(() => result.current.selectPlaylist('p1'))
    expect(result.current.activePlaylistId).toBe('p1')

    await act(async () => {
      await result.current.deletePlaylist('p1')
    })

    expect(result.current.activePlaylistId).toBeNull()
  })

  it('ne change pas la sélection si on supprime une autre playlist', async () => {
    const { result } = await setupWithTwo()

    act(() => result.current.selectPlaylist('p1'))
    await act(async () => {
      await result.current.deletePlaylist('p2')
    })

    expect(result.current.activePlaylistId).toBe('p1')
  })

  it('persiste après suppression', async () => {
    const { result } = await setupWithTwo()

    await act(async () => {
      await result.current.deletePlaylist('p1')
    })

    const lastCall = getStoreSet().mock.calls[getStoreSet().mock.calls.length - 1]
    expect(lastCall[1]).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// updatePlaylist
// ═══════════════════════════════════════════════════════════════════════
describe('usePlaylists > updatePlaylist', () => {
  it('remplace la playlist par id', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'Old', items: [], loop: false }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    await act(async () => {
      await result.current.updatePlaylist({ id: 'p1', name: 'New', items: [], loop: true })
    })

    expect(result.current.playlists[0].name).toBe('New')
    expect(result.current.playlists[0].loop).toBe(true)
  })

  it('ne fait rien si l\'id n\'existe pas', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'X', items: [] }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    const before = result.current.playlists
    await act(async () => {
      await result.current.updatePlaylist({ id: 'unknown', name: 'Y' })
    })

    expect(result.current.playlists).toEqual(before)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// savePlaylistItems
// ═══════════════════════════════════════════════════════════════════════
describe('usePlaylists > savePlaylistItems', () => {
  it('met à jour les items d\'une playlist', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'X', items: [] }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    await act(async () => {
      await result.current.savePlaylistItems('p1', [
        { id: 'i1', soundId: 's1', delay: 0 },
      ])
    })

    expect(result.current.playlists[0].items).toHaveLength(1)
    expect(result.current.playlists[0].items[0].id).toBe('i1')
  })

  it('met aussi à jour loop si fourni', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'X', items: [], loop: false }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    await act(async () => {
      await result.current.savePlaylistItems('p1', [], true)
    })

    expect(result.current.playlists[0].loop).toBe(true)
  })

  it('ne modifie pas loop si non fourni', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'X', items: [], loop: true }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    await act(async () => {
      await result.current.savePlaylistItems('p1', [])
    })

    expect(result.current.playlists[0].loop).toBe(true)
  })

  it('no-op si l\'id n\'existe pas', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'X', items: [] }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    getStoreSet().mockClear()
    await act(async () => {
      await result.current.savePlaylistItems('unknown', [])
    })

    expect(getStoreSet()).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// selectPlaylist / activePlaylist
// ═══════════════════════════════════════════════════════════════════════
describe('usePlaylists > selectPlaylist', () => {
  it('change activePlaylistId', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'X', items: [] }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    act(() => result.current.selectPlaylist('p1'))
    expect(result.current.activePlaylistId).toBe('p1')
  })

  it('activePlaylist est dérivé de activePlaylistId', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'Rock', items: [] }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    act(() => result.current.selectPlaylist('p1'))
    expect(result.current.activePlaylist.id).toBe('p1')
    expect(result.current.activePlaylist.name).toBe('Rock')
  })

  it('activePlaylist est null si activePlaylistId est null', () => {
    const { result } = renderHook(() => usePlaylists())
    expect(result.current.activePlaylist).toBeNull()
  })

  it('activePlaylist est null si l\'id n\'existe pas', async () => {
    getStoreGet().mockResolvedValue([{ id: 'p1', name: 'X', items: [] }])
    const { result } = renderHook(() => usePlaylists())
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    act(() => result.current.selectPlaylist('unknown'))
    expect(result.current.activePlaylist).toBeNull()
  })
})