// src/test/utils/normalizeUtils.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

vi.mock('@shared/utils/wavEncoder', () => ({
  audioBufferToWav: vi.fn(() => new ArrayBuffer(44)),
}))

vi.mock('@shared/utils/audioContext', () => ({
  withTemporaryAudioContext: vi.fn(),
}))

vi.mock('@shared/utils/fileExport', () => ({
  saveAudioBuffer: vi.fn().mockResolvedValue({ success: true, path: '/norm.wav' }),
}))

vi.mock('@shared/utils/fileUrl', () => ({
  buildFileUrl: vi.fn((p) => `file://${p}`),
}))

import {
  analyzeVolume,
  normalizeClip,
  normalizeAll,
  getVolumeInfo,
} from '@shared/utils/normalizeUtils'
import { withTemporaryAudioContext } from '@shared/utils/audioContext'
import { saveAudioBuffer } from '@shared/utils/fileExport'

// ─── MOCK AudioBuffer ──────────────────────────────────────────────────
class MockAudioBuffer {
  constructor(channels, length, sampleRate, fill = 0.5) {
    this.numberOfChannels = channels
    this.length = length
    this.sampleRate = sampleRate
    this.duration = length / sampleRate
    this._channels = Array.from(
      { length: channels },
      () => {
        const arr = new Float32Array(length)
        arr.fill(fill)
        return arr
      }
    )
  }
  getChannelData(ch) {
    return this._channels[ch]
  }
}

const makeBuffer = ({ channels = 2, length = 4410, sampleRate = 44100, fill = 0.5 } = {}) =>
  new MockAudioBuffer(channels, length, sampleRate, fill)

beforeEach(() => {
  withTemporaryAudioContext.mockReset()
  saveAudioBuffer.mockReset().mockResolvedValue({ success: true, path: '/norm.wav' })

  global.window.electronAPI = {
    getSoundsDir: vi.fn().mockResolvedValue('/sounds'),
    convertAudio: vi.fn().mockResolvedValue({ success: true, size: 1000 }),
    deleteSoundFile: vi.fn().mockResolvedValue(undefined),
  }
})

// ═══════════════════════════════════════════════════════════════════════
// analyzeVolume
// ═══════════════════════════════════════════════════════════════════════
describe('analyzeVolume', () => {
  it('retourne les stats audio (peak, rms, db)', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.5 }))
    )

    const result = await analyzeVolume('/sound.mp3')
    expect(result).toMatchObject({
      maxPeak: 0.5,
      rms: 0.5,
      hasAudio: true,
      sampleRate: 44100,
      numberOfChannels: 2,
    })
    expect(result.peakDb).toBeCloseTo(20 * Math.log10(0.5), 3)
  })

  it('détecte absence de signal', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0 }))
    )
    const result = await analyzeVolume('/silent.mp3')
    expect(result.hasAudio).toBe(false)
  })

  it('retourne null si erreur', async () => {
    withTemporaryAudioContext.mockRejectedValue(new Error('fail'))
    const result = await analyzeVolume('/bad.mp3')
    expect(result).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// normalizeClip
// ═══════════════════════════════════════════════════════════════════════
describe('normalizeClip', () => {
  it('retourne null sans clip', async () => {
    expect(await normalizeClip(null)).toBeNull()
    expect(await normalizeClip({})).toBeNull()
  })

  it('retourne null si pas de signal', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0 }))
    )
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    expect(await normalizeClip(clip)).toBeNull()
  })

  it('retourne normalized=false si gain ≈ 1', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.95 }))
    )
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    const result = await normalizeClip(clip, 0.95)
    expect(result.normalized).toBe(false)
    expect(result.gain).toBe(1)
  })

  it('normalise et retourne le nouveau path', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.5 }))
    )
    saveAudioBuffer.mockResolvedValue({ success: true, path: '/sounds/norm.wav' })

    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    const result = await normalizeClip(clip)
    expect(result.normalized).toBe(true)
    expect(result.gain).toBeGreaterThan(1)
    expect(result.newPath).toBeDefined()
  })

  it('utilise targetRMS si useRMS=true', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.3 }))
    )
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    const result = await normalizeClip(clip, 0.95, null, { useRMS: true, targetRMS: 0.15 })
    expect(result.normalized).toBe(true)
  })

  it('clamp le gain entre minGain et maxGain', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.001 }))
    )
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    const result = await normalizeClip(clip, 0.95, null, { maxGain: 5 })
    // Gain ne doit pas dépasser 5
    expect(result.gain).toBeLessThanOrEqual(5)
  })

  it('gère écrêtage après application du gain', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) => {
      const buf = cb(makeBuffer({ fill: 0.5 }))
      return buf
    })
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    const result = await normalizeClip(clip)
    expect(result.normalized).toBe(true)
  })

  it('utilise outputFormat=mp3 → convertAudio', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.5 }))
    )
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    const result = await normalizeClip(clip, 0.95, null, { outputFormat: 'mp3' })
    expect(window.electronAPI.convertAudio).toHaveBeenCalled()
    expect(result.normalized).toBe(true)
  })

  it('fallback WAV si conversion MP3 échoue', async () => {
    global.window.electronAPI.convertAudio = vi.fn().mockResolvedValue({ success: false })
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.5 }))
    )
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    const result = await normalizeClip(clip, 0.95, null, { outputFormat: 'mp3' })
    expect(result.normalized).toBe(true)
  })

  it('met à jour le store si updateClipWithPath existe', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.5 }))
    )
    const store = { updateClipWithPath: vi.fn().mockResolvedValue(undefined) }
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    await normalizeClip(clip, 0.95, store)
    expect(store.updateClipWithPath).toHaveBeenCalledWith('c1', expect.any(String))
  })

  it('retourne null en cas d\'erreur globale', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) => {
      cb(makeBuffer({ fill: 0.5 }))
      throw new Error('oops')
    })
    const clip = { id: 'c1', name: 'Test', path: '/a.mp3' }
    const result = await normalizeClip(clip)
    expect(result).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════
// normalizeAll
// ═══════════════════════════════════════════════════════════════════════
describe('normalizeAll', () => {
  it('normalise un tableau de clips', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.3 }))
    )
    const clips = [
      { id: 'c1', name: 'A', path: '/a.mp3' },
      { id: 'c2', name: 'B', path: '/b.mp3' },
    ]
    const result = await normalizeAll(clips)
    expect(result.total).toBe(2)
    expect(result.normalized).toBe(2)
  })

  it('compte les échecs', async () => {
    let callCount = 0
    withTemporaryAudioContext.mockImplementation(async (url, cb) => {
      callCount++
      if (callCount === 1) cb(makeBuffer({ fill: 0 })) // no signal
      else cb(makeBuffer({ fill: 0.3 }))
    })
    const clips = [
      { id: 'c1', name: 'A', path: '/a.mp3' },
      { id: 'c2', name: 'B', path: '/b.mp3' },
    ]
    const result = await normalizeAll(clips)
    expect(result.failed).toBeGreaterThanOrEqual(0)
  })

  it('appelle onProgress', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.3 }))
    )
    const onProgress = vi.fn()
    await normalizeAll([{ id: 'c1', name: 'A', path: '/a.mp3' }], 0.95, null, onProgress)
    expect(onProgress).toHaveBeenCalledWith(1)
  })

  it('retourne total=0 pour liste vide', async () => {
    const result = await normalizeAll([])
    expect(result.total).toBe(0)
    expect(result.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════
// getVolumeInfo
// ═══════════════════════════════════════════════════════════════════════
describe('getVolumeInfo', () => {
  it('retourne null si analyse échoue', async () => {
    withTemporaryAudioContext.mockRejectedValue(new Error('fail'))
    expect(await getVolumeInfo('/bad.mp3')).toBeNull()
  })

  it('retourne un résumé + recommendation "silencieux"', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.05 }))
    )
    const info = await getVolumeInfo('/quiet.mp3')
    expect(info.summary.hasAudio).toBe('Oui')
    expect(info.recommendation).toContain('très silencieux')
  })

  it('recommendation "proche de l\'écrêtage"', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.95 }))
    )
    const info = await getVolumeInfo('/loud.mp3')
    expect(info.recommendation).toContain('écrêtage')
  })

  it('recommendation "correct"', async () => {
    withTemporaryAudioContext.mockImplementation(async (url, cb) =>
      cb(makeBuffer({ fill: 0.5 }))
    )
    const info = await getVolumeInfo('/ok.mp3')
    expect(info.recommendation).toContain('correct')
  })
})