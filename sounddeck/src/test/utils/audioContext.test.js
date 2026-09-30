import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock logger ────────────────────────────────────────────────────────
vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

// ─── Mock AudioContext constructible (class) ────────────────────────────
class MockAudioBuffer {
  constructor(duration = 3, sampleRate = 44100) {
    this.duration = duration
    this.sampleRate = sampleRate
    this.length = duration * sampleRate
  }
  getChannelData() {
    return new Float32Array(100)
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running'
    this.sampleRate = 44100
    this.currentTime = 0
  }
  async resume() {}
  async close() {
    this.state = 'closed'
  }
  async decodeAudioData() {
    return new MockAudioBuffer(3, 44100)
  }
}

describe('audioContext', () => {
  let audioContext
  let originalFetch

  beforeEach(async () => {
    vi.resetModules()

    // ✅ Override window.AudioContext avec une classe constructible
    window.AudioContext = MockAudioContext
    window.webkitAudioContext = MockAudioContext

    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // ─── getSharedAudioContext ───────────────────────────────────────────

  describe('getSharedAudioContext', () => {
    it('devrait créer un AudioContext au 1er appel', async () => {
      audioContext = await import('@shared/utils/audioContext')

      const ctx = audioContext.getSharedAudioContext()
      expect(ctx).toBeDefined()
      expect(ctx).toBeInstanceOf(MockAudioContext)
    })

    it('devrait retourner le MÊME contexte aux appels suivants (singleton)', async () => {
      audioContext = await import('@shared/utils/audioContext')

      const ctx1 = audioContext.getSharedAudioContext()
      const ctx2 = audioContext.getSharedAudioContext()
      expect(ctx1).toBe(ctx2)
    })

    it('devrait créer un nouveau contexte si le précédent est closed', async () => {
      audioContext = await import('@shared/utils/audioContext')

      const ctx1 = audioContext.getSharedAudioContext()
      // Simule un contexte fermé
      ctx1.state = 'closed'

      const ctx2 = audioContext.getSharedAudioContext()
      expect(ctx2).not.toBe(ctx1)
    })
  })

  // ─── loadAudioBuffer ─────────────────────────────────────────────────

  describe('loadAudioBuffer', () => {
    it('devrait utiliser buildFileUrl pour un chemin local', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      })

      await audioContext.loadAudioBuffer('C:/test.mp3')

      const calledUrl = global.fetch.mock.calls[0][0]
      expect(calledUrl).toContain('sounddeck-local://')
    })

    it('devrait utiliser l\'URL telle quelle si elle commence par http', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      })

      await audioContext.loadAudioBuffer('https://example.com/test.mp3')

      const calledUrl = global.fetch.mock.calls[0][0]
      expect(calledUrl).toBe('https://example.com/test.mp3')
    })

    it('devrait retourner null si la réponse n\'est pas OK', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await audioContext.loadAudioBuffer('C:/missing.mp3')
      expect(result).toBeNull()
    })

    it('devrait retourner null si fetch throw', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

      const result = await audioContext.loadAudioBuffer('C:/test.mp3')
      expect(result).toBeNull()
    })

    it('devrait retourner un AudioBuffer si tout va bien', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      })

      const result = await audioContext.loadAudioBuffer('C:/test.mp3')
      expect(result).toBeInstanceOf(MockAudioBuffer)
      expect(result.duration).toBe(3)
    })
  })

  // ─── withTemporaryAudioContext ───────────────────────────────────────

  describe('withTemporaryAudioContext', () => {
    it('devrait retourner la valeur du callback', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      })

      const result = await audioContext.withTemporaryAudioContext(
        'C:/test.mp3',
        () => 'callback-result'
      )

      expect(result).toBe('callback-result')
    })

    it('devrait fermer le contexte même si le callback throw', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      })

      const closeSpy = vi.spyOn(MockAudioContext.prototype, 'close')

      await expect(
        audioContext.withTemporaryAudioContext('C:/test.mp3', () => {
          throw new Error('callback error')
        })
      ).rejects.toThrow('callback error')

      // Le finally doit avoir appelé close()
      expect(closeSpy).toHaveBeenCalled()

      closeSpy.mockRestore()
    })

    it('devrait propager une erreur fetch', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(
        audioContext.withTemporaryAudioContext('C:/test.mp3', () => 'x')
      ).rejects.toThrow('HTTP 500')
    })
  })

  // ─── getAudioFileDuration ────────────────────────────────────────────

  describe('getAudioFileDuration', () => {
    it('devrait retourner la durée du buffer', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      })

      const result = await audioContext.getAudioFileDuration('C:/test.mp3')
      expect(typeof result).toBe('number')
      expect(result).toBe(3) // MockAudioBuffer duration
    })

    it('devrait retourner le fallback si loadAudioBuffer échoue', async () => {
      audioContext = await import('@shared/utils/audioContext')

      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })

      const result = await audioContext.getAudioFileDuration('C:/missing.mp3', 7)
      expect(result).toBe(7)
    })
  })
})