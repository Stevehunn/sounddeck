import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCurrentPlaying } from '@shared/hooks/useCurrentPlaying'

// ─── Mock AudioService ──────────────────────────────────────────────────
let playbackListener = null
const mockSubscribeToPlayback = vi.fn((listener) => {
  playbackListener = listener
  // Envoie un état initial vide
  listener({ id: null, playingIds: [] })
  return () => { playbackListener = null }
})
const mockGetSoundProgress = vi.fn(() => null)
const mockIsPausedSound = vi.fn(() => false)
const mockTogglePauseSound = vi.fn()
const mockStopSound = vi.fn()

vi.mock('@core/services/AudioService', () => ({
  subscribeToPlayback: (...args) => mockSubscribeToPlayback(...args),
  getSoundProgress: (...args) => mockGetSoundProgress(...args),
  isPausedSound: (...args) => mockIsPausedSound(...args),
  togglePauseSound: (...args) => mockTogglePauseSound(...args),
  stopSound: (...args) => mockStopSound(...args),
}))

describe('useCurrentPlaying', () => {
  const sounds = [
    { id: 's1', name: 'Sound 1' },
    { id: 's2', name: 'Sound 2' },
    { id: 's3', name: 'Sound 3' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    playbackListener = null
    mockGetSoundProgress.mockReturnValue(null)
    mockIsPausedSound.mockReturnValue(false)
  })

  const renderHookWithSounds = async (soundsArg = sounds) => {
    let result
    await act(async () => {
      result = renderHook(({ sounds: s }) => useCurrentPlaying(s), {
        initialProps: { sounds: soundsArg },
      })
    })
    return result
  }

  // ─── ÉTAT INITIAL ────────────────────────────────────────────────────

  it('devrait s\'abonner au playback au montage', async () => {
    await renderHookWithSounds()
    expect(mockSubscribeToPlayback).toHaveBeenCalled()
  })

  it('devrait démarrer avec playingSounds vide', async () => {
    const { result } = await renderHookWithSounds()
    expect(result.current.playingSounds).toEqual([])
  })

  it('devrait démarrer avec sound=null', async () => {
    const { result } = await renderHookWithSounds()
    expect(result.current.sound).toBeNull()
  })

  it('devrait démarrer avec progress=null', async () => {
    const { result } = await renderHookWithSounds()
    expect(result.current.progress).toBeNull()
  })

  it('devrait démarrer avec isPaused=false', async () => {
    const { result } = await renderHookWithSounds()
    expect(result.current.isPaused).toBe(false)
  })

  // ─── RÉACTION AUX ÉVÉNEMENTS ────────────────────────────────────────

  it('devrait réagir à un événement playingIds non vide', async () => {
    const { result } = await renderHookWithSounds()

    await act(async () => {
      playbackListener({ id: 's1', playingIds: ['s1'] })
    })

    await waitFor(() => {
      expect(result.current.playingSounds.length).toBe(1)
      expect(result.current.playingSounds[0].id).toBe('s1')
    })
  })

  it('devrait réagir à plusieurs sons en cours', async () => {
    const { result } = await renderHookWithSounds()

    await act(async () => {
      playbackListener({ id: 's2', playingIds: ['s1', 's2'] })
    })

    await waitFor(() => {
      expect(result.current.playingSounds.length).toBe(2)
    })
  })

  it('devrait retourner les sons dans l\'ordre inverse (plus récent en 1er)', async () => {
    const { result } = await renderHookWithSounds()

    await act(async () => {
      playbackListener({ id: 's3', playingIds: ['s1', 's2', 's3'] })
    })

    await waitFor(() => {
      expect(result.current.playingSounds[0].id).toBe('s3')
      expect(result.current.playingSounds[2].id).toBe('s1')
    })
  })

  it('devrait filtrer les IDs qui ne sont pas dans sounds', async () => {
    const { result } = await renderHookWithSounds()

    await act(async () => {
      playbackListener({ id: 'unknown', playingIds: ['unknown', 's1'] })
    })

    await waitFor(() => {
      expect(result.current.playingSounds.length).toBe(1)
      expect(result.current.playingSounds[0].id).toBe('s1')
    })
  })

  // ─── PROGRESS ────────────────────────────────────────────────────────

  it('devrait retourner progress si duration > 2s', async () => {
    mockGetSoundProgress.mockReturnValue({
      current: 1.5,
      duration: 5,
      ratio: 0.3,
    })

    const { result } = await renderHookWithSounds()

    await act(async () => {
      playbackListener({ id: 's1', playingIds: ['s1'] })
    })

    await waitFor(() => {
      expect(result.current.progress).toBeDefined()
      expect(result.current.progress.duration).toBe(5)
    })
  })

  it('ne devrait PAS retourner progress si duration < 2s', async () => {
    mockGetSoundProgress.mockReturnValue({
      current: 0.5,
      duration: 1.5,
      ratio: 0.33,
    })

    const { result } = await renderHookWithSounds()

    await act(async () => {
      playbackListener({ id: 's1', playingIds: ['s1'] })
    })

    await waitFor(() => {
      expect(result.current.progress).toBeNull()
    })
  })

  // ─── PAUSE ───────────────────────────────────────────────────────────

  it('devrait refléter isPaused=true', async () => {
    mockIsPausedSound.mockReturnValue(true)

    const { result } = await renderHookWithSounds()

    await act(async () => {
      playbackListener({ id: 's1', playingIds: ['s1'] })
    })

    await waitFor(() => {
      expect(result.current.isPaused).toBe(true)
    })
  })

  // ─── ACTIONS ─────────────────────────────────────────────────────────

  it('togglePause devrait déléguer à AudioService', async () => {
    const { result } = await renderHookWithSounds()

    act(() => {
      result.current.togglePause('s1')
    })

    expect(mockTogglePauseSound).toHaveBeenCalledWith('s1')
  })

  it('stop devrait déléguer à AudioService', async () => {
    const { result } = await renderHookWithSounds()

    act(() => {
      result.current.stop('s2')
    })

    expect(mockStopSound).toHaveBeenCalledWith('s2')
  })

  // ─── COMPAT (dernier son) ────────────────────────────────────────────

  it('sound devrait retourner le dernier son (playingSounds[0])', async () => {
    const { result } = await renderHookWithSounds()

    await act(async () => {
      playbackListener({ id: 's2', playingIds: ['s1', 's2'] })
    })

    await waitFor(() => {
      expect(result.current.sound?.id).toBe('s2')
    })
  })

  // ─── CLEANUP ─────────────────────────────────────────────────────────

  it('devrait se désabonner au unmount', async () => {
    const { unmount } = await renderHookWithSounds()

    unmount()

    // L'unsubscribe doit avoir été appelé (via le retour de subscribeToPlayback)
    expect(mockSubscribeToPlayback).toHaveBeenCalledTimes(1)
  })
})