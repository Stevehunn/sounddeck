// src/test/features/sequencer/hooks/useSequencePlayer.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor, cleanup } from '@testing-library/react'

// ─── MOCKS HOISTÉS ─────────────────────────────────────────────────────
vi.mock('howler', () => ({
  Howl: vi.fn(),
}))

vi.mock('@core/services/AudioService', () => ({
  registerStopSequencerCallback: vi.fn(),
  setCurrentPlayingSound: vi.fn(),
  setCurrentPlayingProgress: vi.fn(),
  getFinalVolumeForSound: vi.fn(() => 0.8),
  analyzeGain: vi.fn().mockResolvedValue(0),
  registerExternalPlayback: vi.fn(),
  unregisterExternalPlayback: vi.fn(),
}))

vi.mock('@core/services/SoundPopupService', () => ({
  showSoundPopup: vi.fn(),
  onSoundPopupAction: vi.fn(() => vi.fn()), // retourne un unsubscribe
}))

vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: vi.fn((p) => (p ? `file://${p}` : null)),
}))

import { Howl } from 'howler'
import * as AudioService from '@core/services/AudioService'
import * as SoundPopupService from '@core/services/SoundPopupService'
import { useSequencePlayer } from '@features/sequencer/hooks/useSequencePlayer'

// ─── HELPERS ───────────────────────────────────────────────────────────
const buildHowlInstance = (options = {}) => ({
  play: vi.fn(() => {
    // ✅ Déclenche onload (utilisé par le hook pour la popup)
    options.onload?.()
  }),
  stop: vi.fn(),
  unload: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(() => 0),
  duration: vi.fn(() => 10),
  playing: vi.fn(() => true),
  on: vi.fn(),
})

const setupHowlMock = () => {
  const instances = []
  Howl.mockImplementation(function (options) {
    const instance = buildHowlInstance(options)
    instances.push(instance)
    return instance
  })
  return instances
}

const defaultProps = (overrides = {}) => {
  const sounds = [
    { id: 's1', path: '/sounds/a.mp3', name: 'A' },
    { id: 's2', path: '/sounds/b.mp3', name: 'B' },
    { id: 's3', path: '/sounds/c.mp3', name: 'C' },
  ]
  const items = [
    { id: 'i1', soundId: 's1', delay: 0 },
    { id: 'i2', soundId: 's2', delay: 0.5 },
    { id: 'i3', soundId: 's3', delay: 0 },
  ]
  return {
    items,
    itemsRef: { current: items },
    sounds,
    audioDevice: 'default',
    volume: 80,
    loopPlaylist: false,
    cardSize: 'medium',       // ✅ NOUVEAU
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SETUP / TEARDOWN
// ═══════════════════════════════════════════════════════════════════════
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })

  Howl.mockReset()
  AudioService.registerStopSequencerCallback.mockReset()
  AudioService.setCurrentPlayingSound.mockReset()
  AudioService.setCurrentPlayingProgress.mockReset()
  AudioService.getFinalVolumeForSound.mockReset().mockReturnValue(0.8)
  AudioService.analyzeGain.mockReset().mockResolvedValue(0)
  AudioService.registerExternalPlayback.mockReset()
  AudioService.unregisterExternalPlayback.mockReset()

  SoundPopupService.showSoundPopup.mockReset()
  SoundPopupService.onSoundPopupAction.mockReset().mockReturnValue(vi.fn())
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

// ═══════════════════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════════════════
describe('useSequencePlayer > Init', () => {
  it('retourne playing=false, currentIdx=-1, currentProgress=null', () => {
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))
    expect(result.current.playing).toBe(false)
    expect(result.current.currentIdx).toBe(-1)
    expect(result.current.currentProgress).toBeNull()
  })

  it('expose start, stop, goNext, goPrev', () => {
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))
    expect(typeof result.current.start).toBe('function')
    expect(typeof result.current.stop).toBe('function')
    expect(typeof result.current.goNext).toBe('function')
    expect(typeof result.current.goPrev).toBe('function')
  })

  it('enregistre le stop callback au mount', () => {
    renderHook(() => useSequencePlayer(defaultProps()))
    expect(AudioService.registerStopSequencerCallback).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })

  it('désenregistre le stop callback au unmount', () => {
    const { unmount } = renderHook(() => useSequencePlayer(defaultProps()))
    unmount()
    expect(AudioService.registerStopSequencerCallback).toHaveBeenCalledWith(null)
  })

  it('souscrit aux actions popup au mount', () => {
    renderHook(() => useSequencePlayer(defaultProps()))
    expect(SoundPopupService.onSoundPopupAction).toHaveBeenCalledWith(
      expect.any(Function)
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════
describe('useSequencePlayer > start', () => {
  it('retourne false si items vide', () => {
    const { result } = renderHook(() =>
      useSequencePlayer(defaultProps({ items: [], itemsRef: { current: [] } }))
    )

    let ret
    act(() => {
      ret = result.current.start()
    })

    expect(ret).toBe(false)
    expect(result.current.playing).toBe(false)
  })

  it('start() retourne true et met playing=true', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    let ret
    act(() => {
      ret = result.current.start()
    })

    expect(ret).toBe(true)
    await waitFor(() => expect(result.current.playing).toBe(true))
  })

  it('crée un Howl pour le premier item', async () => {
    const instances = setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })

    await waitFor(() => expect(instances).toHaveLength(1))
    expect(instances[0].play).toHaveBeenCalled()
  })

  it('appelle setCurrentPlayingSound avec le soundId', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })

    await waitFor(() =>
      expect(AudioService.setCurrentPlayingSound).toHaveBeenCalledWith('s1')
    )
  })

  it('appelle analyzeGain avec le path du son', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })

    await waitFor(() =>
      expect(AudioService.analyzeGain).toHaveBeenCalledWith('/sounds/a.mp3')
    )
  })

  it('appelle getFinalVolumeForSound pour calculer le volume', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })

    await waitFor(() =>
      expect(AudioService.getFinalVolumeForSound).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's1' }),
        80
      )
    )
  })

  it('enregistre le playback externe', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })

    await waitFor(() =>
      expect(AudioService.registerExternalPlayback).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({
          isPaused: expect.any(Function),
          pause: expect.any(Function),
          resume: expect.any(Function),
        })
      )
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════
// ✅ NOUVEAU : POPUP
// ═══════════════════════════════════════════════════════════════════════
describe('useSequencePlayer > Popup', () => {
  it('appelle showSoundPopup au onload', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })

    await waitFor(() =>
      expect(SoundPopupService.showSoundPopup).toHaveBeenCalled()
    )

    expect(SoundPopupService.showSoundPopup).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'A',
        index: 0,
        total: 3,
        cardSize: 'medium',
      })
    )
  })

  it('transmet la cardSize courante', async () => {
    setupHowlMock()
    const { result } = renderHook(() =>
      useSequencePlayer(defaultProps({ cardSize: 'large' }))
    )

    act(() => {
      result.current.start()
    })

    await waitFor(() =>
      expect(SoundPopupService.showSoundPopup).toHaveBeenCalledWith(
        expect.objectContaining({ cardSize: 'large' })
      )
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════
// STOP
// ═══════════════════════════════════════════════════════════════════════
describe('useSequencePlayer > stop', () => {
  it('reset playing, currentIdx', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.playing).toBe(true))

    act(() => {
      result.current.stop()
    })

    expect(result.current.playing).toBe(false)
    expect(result.current.currentIdx).toBe(-1)
  })

  it('appelle setCurrentPlayingSound(null)', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.playing).toBe(true))

    AudioService.setCurrentPlayingSound.mockClear()
    act(() => {
      result.current.stop()
    })

    expect(AudioService.setCurrentPlayingSound).toHaveBeenCalledWith(null)
  })

  it('unregisterExternalPlayback est appelé sur stop', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() =>
      expect(AudioService.registerExternalPlayback).toHaveBeenCalled()
    )

    act(() => {
      result.current.stop()
    })

    expect(AudioService.unregisterExternalPlayback).toHaveBeenCalledWith('s1')
  })

  it('unload le Howl courant', async () => {
    const instances = setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(instances).toHaveLength(1))

    act(() => {
      result.current.stop()
    })

    expect(instances[0].stop).toHaveBeenCalled()
    expect(instances[0].unload).toHaveBeenCalled()
  })

  it('stop sans start ne crash pas', () => {
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))
    expect(() =>
      act(() => {
        result.current.stop()
      })
    ).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// goNext / goPrev
// ═══════════════════════════════════════════════════════════════════════
describe('useSequencePlayer > goNext', () => {
  it('passe au son suivant', async () => {
    const instances = setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(instances).toHaveLength(1))

    act(() => {
      result.current.goNext()
    })

    await waitFor(() => expect(instances).toHaveLength(2))
    expect(AudioService.setCurrentPlayingSound).toHaveBeenCalledWith('s2')
  })

  it('à la fin sans loop → stop', async () => {
    setupHowlMock()
    const items = [{ id: 'i1', soundId: 's1', delay: 0 }]
    const props = defaultProps({ items, itemsRef: { current: items } })
    const { result } = renderHook(() => useSequencePlayer(props))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.playing).toBe(true))

    act(() => {
      result.current.goNext()
    })

    await waitFor(() => expect(result.current.playing).toBe(false))
  })

  it('à la fin avec loop → revient à 0', async () => {
    const instances = setupHowlMock()
    const items = [{ id: 'i1', soundId: 's1', delay: 0 }]
    const props = defaultProps({
      items,
      itemsRef: { current: items },
      loopPlaylist: true,
    })
    const { result } = renderHook(() => useSequencePlayer(props))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.playing).toBe(true))

    act(() => {
      result.current.goNext()
    })

    await waitFor(() => expect(instances.length).toBeGreaterThanOrEqual(2))
    expect(result.current.playing).toBe(true)
  })
})

describe('useSequencePlayer > goPrev', () => {
  it('revient au son précédent', async () => {
    const instances = setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(instances).toHaveLength(1))

    act(() => {
      result.current.goNext()
    })
    await waitFor(() => expect(instances).toHaveLength(2))

    act(() => {
      result.current.goPrev()
    })

    await waitFor(() => expect(instances).toHaveLength(3))
    expect(AudioService.setCurrentPlayingSound).toHaveBeenCalledWith('s1')
  })

  it('au premier son → reste à 0', async () => {
    const instances = setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(instances).toHaveLength(1))

    act(() => {
      result.current.goPrev()
    })

    await waitFor(() => expect(instances).toHaveLength(2))
    expect(AudioService.setCurrentPlayingSound).toHaveBeenCalledWith('s1')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Sound introuvable
// ═══════════════════════════════════════════════════════════════════════
describe('useSequencePlayer > Sound introuvable', () => {
  it('skip le son introuvable et joue le suivant', async () => {
    const instances = setupHowlMock()
    const sounds = [
      { id: 's1', path: '/sounds/a.mp3' },
      { id: 's3', path: '/sounds/c.mp3' },
    ]
    const items = [
      { id: 'i1', soundId: 's1', delay: 0 },
      { id: 'i2', soundId: 's2', delay: 0 },
      { id: 'i3', soundId: 's3', delay: 0 },
    ]
    const props = defaultProps({ sounds, items, itemsRef: { current: items } })

    const { result } = renderHook(() => useSequencePlayer(props))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(instances).toHaveLength(1))

    act(() => {
      result.current.goNext()
    })

    await waitFor(() => expect(instances.length).toBeGreaterThanOrEqual(2))
    expect(AudioService.setCurrentPlayingSound).toHaveBeenLastCalledWith('s3')
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Raccourcis clavier
// ═══════════════════════════════════════════════════════════════════════
describe('useSequencePlayer > Raccourcis clavier', () => {
  it('ArrowRight déclenche goNext quand playing', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.playing).toBe(true))

    const initialIdx = result.current.currentIdx

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })

    await waitFor(() =>
      expect(result.current.currentIdx).toBeGreaterThan(initialIdx)
    )
  })

  it('ArrowLeft déclenche goPrev quand playing', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.playing).toBe(true))

    act(() => {
      result.current.goNext()
    })
    await waitFor(() => expect(result.current.currentIdx).toBe(1))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    })

    await waitFor(() => expect(result.current.currentIdx).toBe(0))
  })

  it('ArrowRight ignoré si not playing', () => {
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })

    expect(result.current.currentIdx).toBe(-1)
  })

  it('MediaTrackNext → goNext', async () => {
    setupHowlMock()
    const { result } = renderHook(() => useSequencePlayer(defaultProps()))

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.playing).toBe(true))

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'MediaTrackNext' })
      )
    })

    await waitFor(() => expect(result.current.currentIdx).toBe(1))
  })

  it('retire le listener au unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useSequencePlayer(defaultProps()))
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// Cleanup au démontage
// ═══════════════════════════════════════════════════════════════════════
describe('useSequencePlayer > Cleanup', () => {
  it('stop() est appelé au unmount', async () => {
    setupHowlMock()
    const { result, unmount } = renderHook(() =>
      useSequencePlayer(defaultProps())
    )

    act(() => {
      result.current.start()
    })
    await waitFor(() => expect(result.current.playing).toBe(true))

    AudioService.setCurrentPlayingSound.mockClear()

    act(() => {
      unmount()
    })

    expect(AudioService.setCurrentPlayingSound).toHaveBeenCalledWith(null)
  })
})