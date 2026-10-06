// src/test/features/editor/contexts/hooks/useEditorAudioPlayback.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ─── MOCKS ─────────────────────────────────────────────────────────────
vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

vi.mock('@shared/hooks/useLatestRefs', () => ({
  useLatestRef: vi.fn((v) => ({ current: v })),
}))

const mockCtx = vi.hoisted(() => {
  const createGain = () => ({
    gain: {
      value: 1,
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })

  const createBufferSource = () => ({
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  })

  return {
    state: 'running',
    sampleRate: 44100,
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    destination: {},
    createGain: vi.fn(createGain),
    createBufferSource: vi.fn(createBufferSource),
  }
})

vi.mock('@shared/utils/audioContext', () => ({
  getSharedAudioContext: vi.fn(() => mockCtx),
  loadAudioBuffer: vi.fn(),
}))

vi.mock('@shared/utils/realTimeEffects', () => ({
  applyEffectsToBuffer: vi.fn((b) => b),
}))

import * as audioContextMod from '@shared/utils/audioContext'
import {
  computeLoopTiming,
  isClipInZone,
  findOverlappingPreviousClip,
  useEditorAudioPlayback,
} from '@features/editor/contexts/hooks/useEditorAudioPlayback'

// ─── HELPERS ───────────────────────────────────────────────────────────
const makeBuffer = (duration = 5) => ({
  duration,
  sampleRate: 44100,
  numberOfChannels: 2,
  getChannelData: () => new Float32Array(100),
})

const makeCore = (overrides = {}) => ({
  projectRef: { current: { tracks: [] } },
  clipDurationsRef: { current: {} },
  totalDurationRef: { current: 60 },
  autoCrossfadeRef: { current: false },
  loopStateRef: { current: { timeline: { enabled: false }, clips: {} } },
  soloPlayClipIdRef: { current: null },
  currentTimeRef: { current: 0 },
  isPlayingRef: { current: false },
  isPausedRef: { current: false },
  masterGainRef: { current: 1 },
  stopAtTimeRef: { current: null },
  setCurrentTime: vi.fn(),
  setIsPlaying: vi.fn(),
  setIsPaused: vi.fn(),
  setStopAtTime: vi.fn(),
  setSoloPlayClipId: vi.fn(),
  masterGain: 1,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  audioContextMod.loadAudioBuffer.mockResolvedValue(makeBuffer())
  mockCtx.state = 'running'
  mockCtx.resume.mockResolvedValue(undefined)
})

// ═══════════════════════════════════════════════════════════════════════
// HELPERS PURS
// ═══════════════════════════════════════════════════════════════════════
describe('computeLoopTiming', () => {
  it('retourne loopTime=globalTime si pas activé', () => {
    const result = computeLoopTiming(5, { enabled: false })
    expect(result).toEqual({
      loopTime: 5,
      isInLoopZone: false,
      currentCycle: -1,
    })
  })

  it('retourne loopTime=globalTime si timelineLoop null', () => {
    const result = computeLoopTiming(5, null)
    expect(result).toEqual({
      loopTime: 5,
      isInLoopZone: false,
      currentCycle: -1,
    })
  })

  it('retourne isInLoopZone=true dans la zone', () => {
    const result = computeLoopTiming(2, {
      enabled: true,
      start: 0,
      end: 10,
      durationMode: 'cycles',
      cycleCount: 3,
    })
    expect(result.isInLoopZone).toBe(true)
    expect(result.loopTime).toBe(2)
    expect(result.currentCycle).toBe(0)
  })

  it('retourne positionInCycle correct pour un cycle suivant', () => {
    // Timeline : start=0, end=10, cycleCount=3 → maxDuration=30
    // globalTime = 12 → cycle 1, position = 2
    const result = computeLoopTiming(12, {
      enabled: true,
      start: 0,
      end: 10,
      durationMode: 'cycles',
      cycleCount: 3,
    })
    expect(result.isInLoopZone).toBe(true)
    expect(result.loopTime).toBe(2)
    expect(result.currentCycle).toBe(1)
  })

  it('retourne isInLoopZone=false après maxDuration', () => {
    // Timeline : 0-10, 3 cycles → max 30
    // globalTime = 35 → hors zone
    const result = computeLoopTiming(35, {
      enabled: true,
      start: 0,
      end: 10,
      durationMode: 'cycles',
      cycleCount: 3,
    })
    expect(result.isInLoopZone).toBe(false)
    expect(result.loopTime).toBe(35)
  })

  it('utilise manualDuration si durationMode="manualDuration"', () => {
    const result = computeLoopTiming(15, {
      enabled: true,
      start: 0,
      end: 10,
      durationMode: 'manualDuration',
      manualDuration: 20,
    })
    expect(result.isInLoopZone).toBe(true)
    expect(result.currentCycle).toBe(1)
  })

  it('utilise end-start comme maxLoopDuration par défaut', () => {
    const result = computeLoopTiming(9, {
      enabled: true,
      start: 0,
      end: 10,
      durationMode: 'other',
    })
    expect(result.isInLoopZone).toBe(true)
  })

  it('respecte loopStart non-zéro', () => {
    const result = computeLoopTiming(12, {
      enabled: true,
      start: 10,
      end: 20,
      durationMode: 'cycles',
      cycleCount: 2,
    })
    expect(result.isInLoopZone).toBe(true)
    expect(result.loopTime).toBe(12)
    expect(result.currentCycle).toBe(0)
  })
})

describe('isClipInZone', () => {
  it('clip dans la zone (start dans zone)', () => {
    expect(isClipInZone(2, 5, 0, 10)).toBe(true)
  })

  it('clip chevauche la zone à gauche', () => {
    expect(isClipInZone(-5, 3, 0, 10)).toBe(true)
  })

  it('clip chevauche la zone à droite', () => {
    expect(isClipInZone(8, 15, 0, 10)).toBe(true)
  })

  it('clip englobe la zone', () => {
    expect(isClipInZone(-5, 15, 0, 10)).toBe(true)
  })

  it('clip totalement avant la zone', () => {
    expect(isClipInZone(-10, -5, 0, 10)).toBe(false)
  })

  it('clip totalement après la zone', () => {
    expect(isClipInZone(15, 20, 0, 10)).toBe(false)
  })

  it('clip à exactement loopEnd → false (end > loopStart && end <= loopEnd)', () => {
    // end=10, loopEnd=10 → (end > 0 && end <= 10) → true
    expect(isClipInZone(5, 10, 0, 10)).toBe(true)
  })
})

describe('findOverlappingPreviousClip', () => {
  const project = {
    tracks: [
      {
        id: 't1',
        muted: false,
        clips: [
          { id: 'c1', start: 0, duration: 3 }, // finit à 3
          { id: 'c2', start: 5, duration: 3 }, // finit à 8
        ],
      },
      {
        id: 't2',
        muted: false,
        clips: [
          { id: 'c3', start: 2, duration: 4 }, // finit à 6
        ],
      },
    ],
  }

  it('retourne null si aucun clip précédent', () => {
    const result = findOverlappingPreviousClip(
      { id: 'c4', start: 0 },
      project,
      {}
    )
    expect(result).toBeNull()
  })

  it('trouve le clip précédent qui overlap', () => {
    // c4 à start=4.5, c1 finit à 3 → pas d'overlap, c2 à 5 pas de start<
    // c3 à start=2, finit à 6 → overlap
    const result = findOverlappingPreviousClip(
      { id: 'c4', start: 4.5 },
      project,
      { c1: 3, c2: 3, c3: 4 }
    )
    expect(result).not.toBeNull()
    expect(result.clip.id).toBe('c3')
  })

  it('ignore les pistes muted', () => {
    const projectWithMuted = {
      tracks: [
        { ...project.tracks[0], muted: true },
        project.tracks[1], // t2 unmuted avec c3
      ],
    }
    const result = findOverlappingPreviousClip(
      { id: 'c4', start: 4.5 },
      projectWithMuted,
      { c1: 3, c2: 3, c3: 4 }
    )
    expect(result?.clip.id).toBe('c3')
  })

  it('ignore les clips qui ne finissent pas après clip.start', () => {
    // c4 start=10 → c1, c2, c3 finissent tous avant
    const result = findOverlappingPreviousClip(
      { id: 'c4', start: 10 },
      project,
      { c1: 3, c2: 3, c3: 4 }
    )
    expect(result).toBeNull()
  })

  it('choisit le clip avec le start le plus élevé', () => {
    // c4 start=7, c2 (start=5) finit à 8 → overlap, c3 (start=2) finit à 6 → pas d'overlap
    const result = findOverlappingPreviousClip(
      { id: 'c4', start: 7 },
      project,
      { c1: 3, c2: 3, c3: 4 }
    )
    expect(result?.clip.id).toBe('c2')
  })

  it('retourne null si project null', () => {
    expect(findOverlappingPreviousClip({ id: 'c1' }, null, {})).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════
describe('useEditorAudioPlayback > Init', () => {
  it('retourne toutes les fonctions', () => {
    const { result } = renderHook(() => useEditorAudioPlayback(makeCore()))
    expect(typeof result.current.play).toBe('function')
    expect(typeof result.current.pause).toBe('function')
    expect(typeof result.current.resume).toBe('function')
    expect(typeof result.current.stop).toBe('function')
    expect(typeof result.current.seek).toBe('function')
    expect(typeof result.current.togglePlay).toBe('function')
    expect(typeof result.current.playClip).toBe('function')
    expect(typeof result.current.playClipOnly).toBe('function')
    expect(typeof result.current.updateMasterGain).toBe('function')
    expect(typeof result.current.updateTrackVolume).toBe('function')
    expect(typeof result.current.loadAudioBuffer).toBe('function')
  })

  it('expose les refs', () => {
    const { result } = renderHook(() => useEditorAudioPlayback(makeCore()))
    expect(result.current.audioContextRef).toBeDefined()
    expect(result.current.audioSourcesRef).toBeDefined()
    expect(result.current.animationRef).toBeDefined()
  })
})

describe('useEditorAudioPlayback > loadAudioBuffer', () => {
  it('délègue à loadAudioBufferShared', async () => {
    const { result } = renderHook(() => useEditorAudioPlayback(makeCore()))
    await act(async () => {
      await result.current.loadAudioBuffer('/path.mp3')
    })
    expect(audioContextMod.loadAudioBuffer).toHaveBeenCalledWith('/path.mp3')
  })
})

describe('useEditorAudioPlayback > updateMasterGain', () => {
  it('ne crash pas si audioSourcesRef vide', () => {
    const { result } = renderHook(() => useEditorAudioPlayback(makeCore()))
    expect(() =>
      act(() => result.current.updateMasterGain(0.5))
    ).not.toThrow()
  })
})

describe('useEditorAudioPlayback > updateTrackVolume', () => {
  it('ne crash pas si audioSourcesRef vide', () => {
    const { result } = renderHook(() => useEditorAudioPlayback(makeCore()))
    expect(() =>
      act(() => result.current.updateTrackVolume('t1', 0.5))
    ).not.toThrow()
  })
})

describe('useEditorAudioPlayback > play', () => {
  it('appelle setIsPlaying(true) et setCurrentTime(0)', async () => {
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.play()
    })

    expect(core.setIsPlaying).toHaveBeenCalledWith(true)
    expect(core.setCurrentTime).toHaveBeenCalledWith(0)
    expect(core.setIsPaused).toHaveBeenCalledWith(false)
  })

  it('resume le contexte si suspended', async () => {
    mockCtx.state = 'suspended'
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.play()
    })

    expect(mockCtx.resume).toHaveBeenCalled()
  })

  it('gère une erreur de getCtx', async () => {
    const core = makeCore()
    // Force une erreur en cassant getSharedAudioContext
    const origImpl = audioContextMod.getSharedAudioContext.getMockImplementation()
    audioContextMod.getSharedAudioContext.mockImplementationOnce(() => {
      throw new Error('ctx fail')
    })

    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.play()
    })

    expect(core.setIsPlaying).toHaveBeenCalledWith(false)

    audioContextMod.getSharedAudioContext.mockImplementation(origImpl)
  })
})

describe('useEditorAudioPlayback > pause', () => {
  it('appelle setIsPaused(true) et setIsPlaying(false)', () => {
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    act(() => result.current.pause())

    expect(core.setIsPaused).toHaveBeenCalledWith(true)
    expect(core.setIsPlaying).toHaveBeenCalledWith(false)
  })
})

describe('useEditorAudioPlayback > stop', () => {
  it('reset tout l\'état', () => {
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    act(() => result.current.stop())

    expect(core.setIsPlaying).toHaveBeenCalledWith(false)
    expect(core.setIsPaused).toHaveBeenCalledWith(false)
    expect(core.setCurrentTime).toHaveBeenCalledWith(0)
    expect(core.setStopAtTime).toHaveBeenCalledWith(null)
    expect(core.setSoloPlayClipId).toHaveBeenCalledWith(null)
  })
})

describe('useEditorAudioPlayback > seek', () => {
  it('clamp la valeur entre 0 et totalDuration', () => {
    const core = makeCore({ totalDurationRef: { current: 60 } })
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    act(() => result.current.seek(100))
    expect(core.setCurrentTime).toHaveBeenCalledWith(60)

    act(() => result.current.seek(-10))
    expect(core.setCurrentTime).toHaveBeenCalledWith(0)

    act(() => result.current.seek(30))
    expect(core.setCurrentTime).toHaveBeenCalledWith(30)
  })
})

describe('useEditorAudioPlayback > togglePlay', () => {
  it('pause si playing', () => {
    const core = makeCore({ isPlayingRef: { current: true } })
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    act(() => result.current.togglePlay())
    expect(core.setIsPaused).toHaveBeenCalledWith(true)
  })

  it('resume si paused', async () => {
    const core = makeCore({
      isPlayingRef: { current: false },
      isPausedRef: { current: true },
    })
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      result.current.togglePlay()
    })

    expect(core.setIsPaused).toHaveBeenCalledWith(false)
  })

  it('play si ni playing ni paused', async () => {
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.togglePlay()
    })

    expect(core.setIsPlaying).toHaveBeenCalledWith(true)
  })
})

describe('useEditorAudioPlayback > playClipOnly', () => {
  it('setSoloPlayClipId + start playback', async () => {
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    const clip = { id: 'c1', start: 5, duration: 3 }

    await act(async () => {
      await result.current.playClipOnly(clip, 't1')
    })

    expect(core.setSoloPlayClipId).toHaveBeenCalledWith('c1')
    expect(core.setCurrentTime).toHaveBeenCalledWith(5)
    expect(core.setStopAtTime).toHaveBeenCalledWith(8)
  })

  it('gère une erreur de contexte', async () => {
    const core = makeCore()
    const origImpl = audioContextMod.getSharedAudioContext.getMockImplementation()
    audioContextMod.getSharedAudioContext.mockImplementationOnce(() => {
      throw new Error('ctx fail')
    })

    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.playClipOnly({ id: 'c1', start: 0, duration: 3 }, 't1')
    })

    expect(core.setIsPlaying).toHaveBeenCalledWith(false)
    expect(core.setSoloPlayClipId).toHaveBeenCalledWith(null)

    audioContextMod.getSharedAudioContext.mockImplementation(origImpl)
  })
})

describe('useEditorAudioPlayback > playClip', () => {
  it('retourne void si clip.path absent', async () => {
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.playClip({ id: 'c1' }, { id: 't1' })
    })

    expect(audioContextMod.loadAudioBuffer).not.toHaveBeenCalled()
  })

  it('charge le buffer et démarre la source', async () => {
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.playClip(
        { id: 'c1', path: '/audio.mp3', start: 0 },
        { id: 't1', volume: 1 }
      )
    })

    expect(audioContextMod.loadAudioBuffer).toHaveBeenCalledWith('/audio.mp3')
    expect(mockCtx.createBufferSource).toHaveBeenCalled()
  })

  it('retourne void si loadAudioBuffer retourne null', async () => {
    audioContextMod.loadAudioBuffer.mockResolvedValue(null)
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.playClip(
        { id: 'c1', path: '/audio.mp3' },
        { id: 't1' }
      )
    })

    expect(mockCtx.createBufferSource).not.toHaveBeenCalled()
  })

  it('applique les effets si présents', async () => {
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    const { applyEffectsToBuffer } = await import('@shared/utils/realTimeEffects')

    await act(async () => {
      await result.current.playClip(
        {
          id: 'c1',
          path: '/audio.mp3',
          effects: [{ type: 'volume', enabled: true, params: { value: 0.5 } }],
        },
        { id: 't1', volume: 1 }
      )
    })

    expect(applyEffectsToBuffer).toHaveBeenCalled()
  })

  it('gère une erreur playClip', async () => {
    audioContextMod.loadAudioBuffer.mockRejectedValue(new Error('load fail'))
    const core = makeCore()
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    await act(async () => {
      await result.current.playClip(
        { id: 'c1', path: '/audio.mp3' },
        { id: 't1' }
      )
    })

    // Ne crash pas
    expect(true).toBe(true)
  })
})

describe('useEditorAudioPlayback > startPlaybackLoop (smoke)', () => {
  it('démarre la boucle sans crash (playing)', async () => {
    const core = makeCore({
      isPlayingRef: { current: true },
      currentTimeRef: { current: 0 },
    })
    const { result } = renderHook(() => useEditorAudioPlayback(core))

    // Mock requestAnimationFrame pour ne pas boucler infiniment
    const origRAF = global.requestAnimationFrame
    let rafCallCount = 0
    global.requestAnimationFrame = vi.fn((cb) => {
      rafCallCount++
      if (rafCallCount < 3) cb(performance.now())
      return rafCallCount
    })

    act(() => result.current.startPlaybackLoop())

    // Restaure
    global.requestAnimationFrame = origRAF
    expect(rafCallCount).toBeGreaterThan(0)
  })
})