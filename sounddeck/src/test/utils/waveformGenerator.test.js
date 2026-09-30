import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────
const { mockFileExists, mockWithTempCtx, mockBuildFileUrl } = vi.hoisted(() => ({
  mockFileExists: vi.fn(),
  mockWithTempCtx: vi.fn(),
  mockBuildFileUrl: vi.fn((p) => `sounddeck-local://file/${p}`),
}))

vi.mock('@shared/utils/audioContext.js', () => ({
  withTemporaryAudioContext: mockWithTempCtx,
}))

vi.mock('@shared/utils/fileUrl.js', () => ({
  buildFileUrl: mockBuildFileUrl,
}))

vi.mock('@shared/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

describe('waveformGenerator', () => {
  let waveformGenerator

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()

    window.electronAPI = {
      fileExists: mockFileExists,
    }

    // Par défaut : fichier existe + callback retourne un tableau de samples
    mockFileExists.mockResolvedValue(true)
    mockWithTempCtx.mockImplementation(async (url, callback) => {
      // Simule un AudioBuffer avec une durée + sampleRate
      const audioBuffer = {
        duration: 5,
        sampleRate: 44100,
        length: 220500,
        getChannelData: () => {
          // Tableau de 220500 valeurs dans [0, 1]
          const data = new Float32Array(220500)
          for (let i = 0; i < 220500; i++) {
            data[i] = Math.sin(i / 100) * 0.5
          }
          return data
        },
      }
      return await callback(audioBuffer)
    })

    waveformGenerator = await import('@shared/utils/waveformGenerator')
  })

  afterEach(() => {
    // Vide le cache entre les tests
    waveformGenerator.invalidateWaveformCache()
  })

  // ─── generateWaveformData — cas nominal ───────────────────────────────

  describe('generateWaveformData', () => {
    it('devrait générer un tableau de N samples', async () => {
      const result = await waveformGenerator.generateWaveformData('/file.mp3', 50)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(50)
    })

    it('devrait normaliser les samples entre 0 et 1', async () => {
      const result = await waveformGenerator.generateWaveformData('/file.mp3', 50)
      for (const v of result) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    })

    it('devrait vérifier l\'existence du fichier via electronAPI', async () => {
      await waveformGenerator.generateWaveformData('/file.mp3', 20)
      expect(mockFileExists).toHaveBeenCalledWith('/file.mp3')
    })

    it('devrait retourner null si le fichier n\'existe pas', async () => {
      mockFileExists.mockResolvedValue(false)
      const result = await waveformGenerator.generateWaveformData('/missing.mp3', 20)
      expect(result).toBeNull()
    })

    it('devrait continuer si fileExists throw', async () => {
      mockFileExists.mockRejectedValue(new Error('api error'))
      const result = await waveformGenerator.generateWaveformData('/file.mp3', 20)
      expect(result).not.toBeNull()
    })

    it('devrait utiliser buildFileUrl pour construire l\'URL', async () => {
      await waveformGenerator.generateWaveformData('/test.mp3', 20)
      expect(mockBuildFileUrl).toHaveBeenCalledWith('/test.mp3')
    })

    it('devrait retourner null si le withTemporaryAudioContext retourne null', async () => {
      mockWithTempCtx.mockResolvedValue(null)
      const result = await waveformGenerator.generateWaveformData('/file.mp3', 20)
      expect(result).toBeNull()
    })

    it('devrait retourner null si withTemporaryAudioContext throw', async () => {
      mockWithTempCtx.mockRejectedValue(new Error('decode error'))
      const result = await waveformGenerator.generateWaveformData('/file.mp3', 20)
      expect(result).toBeNull()
    })

    // ─── CACHE ────────────────────────────────────────────────────────

    it('devrait mettre en cache le résultat', async () => {
      await waveformGenerator.generateWaveformData('/file.mp3', 20)
      const beforeCount = mockWithTempCtx.mock.calls.length

      // 2e appel → cache hit
      await waveformGenerator.generateWaveformData('/file.mp3', 20)
      expect(mockWithTempCtx.mock.calls.length).toBe(beforeCount)
    })

    it('devrait utiliser une clé de cache différente pour samples différents', async () => {
      await waveformGenerator.generateWaveformData('/file.mp3', 20)
      await waveformGenerator.generateWaveformData('/file.mp3', 50)

      expect(mockWithTempCtx).toHaveBeenCalledTimes(2)
    })

    it('ne devrait PAS utiliser le cache si useCache=false', async () => {
      await waveformGenerator.generateWaveformData('/file.mp3', 20, 0, null, false)
      await waveformGenerator.generateWaveformData('/file.mp3', 20, 0, null, false)

      expect(mockWithTempCtx).toHaveBeenCalledTimes(2)
    })

    // ─── START OFFSET + SLICE ─────────────────────────────────────────

    it('devrait accepter startOffset', async () => {
      const result = await waveformGenerator.generateWaveformData(
        '/file.mp3', 20, 1.5, null
      )
      expect(Array.isArray(result)).toBe(true)
    })

    it('devrait accepter sliceDuration', async () => {
      const result = await waveformGenerator.generateWaveformData(
        '/file.mp3', 20, 0, 2
      )
      expect(Array.isArray(result)).toBe(true)
    })

    it('startOffset + sliceDuration devraient avoir leurs propres clés de cache', async () => {
      await waveformGenerator.generateWaveformData('/file.mp3', 20, 0, 2)
      await waveformGenerator.generateWaveformData('/file.mp3', 20, 1, 2)
      expect(mockWithTempCtx).toHaveBeenCalledTimes(2)
    })
  })

  // ─── invalidateWaveformCache ─────────────────────────────────────────

  describe('invalidateWaveformCache', () => {
    it('devrait vider le cache pour un filePath', async () => {
      await waveformGenerator.generateWaveformData('/file.mp3', 20)
      const before = mockWithTempCtx.mock.calls.length

      waveformGenerator.invalidateWaveformCache('/file.mp3')

      await waveformGenerator.generateWaveformData('/file.mp3', 20)
      expect(mockWithTempCtx.mock.calls.length).toBe(before + 1)
    })

    it('devrait vider TOUT le cache sans filePath', async () => {
      await waveformGenerator.generateWaveformData('/file1.mp3', 20)
      await waveformGenerator.generateWaveformData('/file2.mp3', 20)
      const before = mockWithTempCtx.mock.calls.length

      waveformGenerator.invalidateWaveformCache()

      await waveformGenerator.generateWaveformData('/file1.mp3', 20)
      await waveformGenerator.generateWaveformData('/file2.mp3', 20)
      expect(mockWithTempCtx.mock.calls.length).toBe(before + 2)
    })

    it('ne devrait vider que le filePath ciblé', async () => {
      await waveformGenerator.generateWaveformData('/file1.mp3', 20)
      await waveformGenerator.generateWaveformData('/file2.mp3', 20)
      const before = mockWithTempCtx.mock.calls.length

      waveformGenerator.invalidateWaveformCache('/file1.mp3')

      // file1 → recalculé
      await waveformGenerator.generateWaveformData('/file1.mp3', 20)
      // file2 → toujours en cache
      await waveformGenerator.generateWaveformData('/file2.mp3', 20)

      expect(mockWithTempCtx.mock.calls.length).toBe(before + 1)
    })
  })
})