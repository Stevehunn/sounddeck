import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useHomeImport } from '@features/home/useHomeImport'

// ─── Mocks hoistés ──────────────────────────────────────────────────────
const { mockCompress } = vi.hoisted(() => ({
  mockCompress: vi.fn(),
}))

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => key,
    currentLang: 'fr',
  })),
}))

vi.mock('@shared/utils/fileCompression', () => ({
  compressFileIfNeeded: mockCompress,
}))

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('useHomeImport', () => {
  let store, addToast, t, electronMock

  beforeEach(() => {
    vi.clearAllMocks()

    store = {
      addSound: vi.fn().mockResolvedValue(),
      compressOnImport: false,
      compressionBitrate: 128,
    }

    addToast = vi.fn()

    t = vi.fn((key, params) => {
      if (params && typeof params === 'object') {
        let result = String(key)
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
        return result
      }
      return key
    })

    electronMock = {
      importSoundFile: vi.fn().mockResolvedValue({
        success: true,
        path: '/fake/sound.mp3',
        name: 'test-sound',
      }),
      writeDroppedFile: vi.fn().mockResolvedValue({
        success: true,
        path: '/fake/dropped.mp3',
        name: 'dropped',
      }),
    }
    window.electronAPI = electronMock

    mockCompress.mockResolvedValue({
      path: '/fake/sound.mp3',
      compressed: false,
    })
  })

  const renderImport = (props = {}) => {
    return renderHook(() =>
      useHomeImport({
        store,
        addToast,
        currentProfileId: 'profile-1',
        t,
        ...props,
      })
    )
  }

  // ─── ÉTAT INITIAL ────────────────────────────────────────────────────

  describe('état initial', () => {
    it('devrait démarrer avec isImporting=false', () => {
      const { result } = renderImport()
      expect(result.current.isImporting).toBe(false)
    })

    it('devrait démarrer avec importProgress=0', () => {
      const { result } = renderImport()
      expect(result.current.importProgress).toBe(0)
    })

    it('devrait démarrer avec totalFiles=0', () => {
      const { result } = renderImport()
      expect(result.current.totalFiles).toBe(0)
    })

    it('devrait démarrer avec importSuccess=0', () => {
      const { result } = renderImport()
      expect(result.current.importSuccess).toBe(0)
    })

    it('devrait exposer les 2 fonctions d\'import', () => {
      const { result } = renderImport()
      expect(typeof result.current.importFromPaths).toBe('function')
      expect(typeof result.current.importFromDrop).toBe('function')
    })
  })

  // ─── importFromPaths ─────────────────────────────────────────────────

  describe('importFromPaths', () => {
    it('devrait retourner early si filePaths est vide', async () => {
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths([])
      })

      expect(electronMock.importSoundFile).not.toHaveBeenCalled()
      expect(store.addSound).not.toHaveBeenCalled()
    })

    it('devrait retourner early si filePaths est null', async () => {
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(null)
      })

      expect(electronMock.importSoundFile).not.toHaveBeenCalled()
    })

    it('devrait appeler importSoundFile pour chaque path', async () => {
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/a.mp3', '/b.wav'])
      })

      expect(electronMock.importSoundFile).toHaveBeenCalledTimes(2)
      expect(electronMock.importSoundFile).toHaveBeenCalledWith('/a.mp3')
      expect(electronMock.importSoundFile).toHaveBeenCalledWith('/b.wav')
    })

    it('devrait appeler addSound pour chaque import réussi', async () => {
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/a.mp3', '/b.wav'])
      })

      expect(store.addSound).toHaveBeenCalledTimes(2)
      // Vérifie la shape
      const call = store.addSound.mock.calls[0][0]
      expect(call.name).toBe('test-sound')
      expect(call.path).toBe('/fake/sound.mp3')
      expect(call.profiles).toEqual(['profile-1'])
      expect(call.emoji).toBeDefined()
    })

    it('devrait ne PAS appeler addSound si import échoue', async () => {
      electronMock.importSoundFile.mockResolvedValue({
        success: false,
        error: 'boom',
      })
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/bad.mp3'])
      })

      expect(store.addSound).not.toHaveBeenCalled()
    })

    it('devrait retourner le nombre d\'imports réussis', async () => {
      const { result } = renderImport()

      let count
      await act(async () => {
        count = await result.current.importFromPaths(['/a.mp3', '/b.wav'])
      })

      expect(count).toBe(2)
    })

    it('devrait appeler addToast success si count > 0', async () => {
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/a.mp3'])
      })

      const successCalls = addToast.mock.calls.filter(([, type]) => type === 'success')
      expect(successCalls.length).toBeGreaterThan(0)
    })

    it('devrait appeler addToast warning si des échecs', async () => {
      electronMock.importSoundFile
        .mockResolvedValueOnce({ success: true, path: '/ok.mp3', name: 'ok' })
        .mockResolvedValueOnce({ success: false, error: 'fail' })

      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/a.mp3', '/b.mp3'])
      })

      const warningCalls = addToast.mock.calls.filter(([, type]) => type === 'warning')
      expect(warningCalls.length).toBeGreaterThan(0)
    })

    it('devrait utiliser compressFileIfNeeded si compressOnImport=true', async () => {
      store.compressOnImport = true
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/a.mp3'])
      })

      expect(mockCompress).toHaveBeenCalled()
      const opts = mockCompress.mock.calls[0][1]
      expect(opts.enabled).toBe(true)
      expect(opts.bitrate).toBe(128)
    })

    it('devrait passer compressOnImport=false à compressFileIfNeeded par défaut', async () => {
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/a.mp3'])
      })

      const opts = mockCompress.mock.calls[0][1]
      expect(opts.enabled).toBe(false)
    })

    it('devrait utiliser le path compressé résultant', async () => {
      mockCompress.mockResolvedValue({
        path: '/compressed/result.mp3',
        compressed: true,
      })
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/a.mp3'])
      })

      const call = store.addSound.mock.calls[0][0]
      expect(call.path).toBe('/compressed/result.mp3')
      expect(call.compressed).toBe(true)
    })

    it('devrait réinitialiser totalFiles à la fin', async () => {
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromPaths(['/a.mp3'])
      })

      expect(result.current.totalFiles).toBe(0)
      expect(result.current.importProgress).toBe(0)
    })
  })

  // ─── importFromDrop ──────────────────────────────────────────────────

  describe('importFromDrop', () => {
    // ✅ Default path non-null pour éviter FileReader (jsdom support limité)
    const createMockFile = (name, type = 'audio/mpeg', path = `/fake/${name}`) => ({
      name,
      type,
      path,
    })

    const createDataTransfer = (files = [], items = []) => ({
      files,
      items,
    })

    it('devrait retourner 0 si aucun fichier', async () => {
      const { result } = renderImport()

      let count
      await act(async () => {
        count = await result.current.importFromDrop(createDataTransfer([], []))
      })

      expect(count).toBe(0)
      expect(store.addSound).not.toHaveBeenCalled()
    })

    it('devrait afficher une erreur si items non-audio', async () => {
      const items = [{ kind: 'file', getAsFile: () => createMockFile('doc.pdf', 'application/pdf') }]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer([], items))
      })

      const errorCalls = addToast.mock.calls.filter(([, type]) => type === 'error')
      expect(errorCalls.length).toBeGreaterThan(0)
    })

    it('devrait filtrer par extension audio', async () => {
      const files = [
        createMockFile('song.mp3', ''),
        createMockFile('doc.pdf', ''),
        createMockFile('track.wav', ''),
      ]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      // Seulement mp3 et wav → 2 imports
      expect(electronMock.importSoundFile).toHaveBeenCalledTimes(2)
    })

    it('devrait filtrer par type audio/*', async () => {
      const files = [
        createMockFile('unknown', 'audio/mpeg'),
        createMockFile('doc', 'application/pdf'),
      ]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(electronMock.importSoundFile).toHaveBeenCalledTimes(1)
    })

    it('devrait utiliser file.path si disponible', async () => {
      const files = [createMockFile('song.mp3', 'audio/mpeg', '/real/path/song.mp3')]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(electronMock.importSoundFile).toHaveBeenCalledWith('/real/path/song.mp3')
    })

    it('devrait utiliser writeDroppedFile si file.path absent', async () => {
      // File jsdom réel (pas un objet mock) → FileReader peut le lire
      const realFile = new File(['fake-audio-data'], 'song.mp3', {
        type: 'audio/mpeg',
      })
      // Force l'absence de path → branche writeDroppedFile
      Object.defineProperty(realFile, 'path', {
        value: undefined,
        configurable: true,
      })

      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer([realFile]))
      })

      // FileReader lit → writeDroppedFile appelé
      await waitFor(() => {
        expect(electronMock.writeDroppedFile).toHaveBeenCalled()
      })
      expect(electronMock.writeDroppedFile.mock.calls[0][0]).toBe('song.mp3')
    })

    it('devrait retourner le nombre de fichiers importés', async () => {
      const files = [
        createMockFile('a.mp3', 'audio/mpeg', '/a.mp3'),
        createMockFile('b.mp3', 'audio/mpeg', '/b.mp3'),
      ]
      const { result } = renderImport()

      let count
      await act(async () => {
        count = await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(count).toBe(2)
    })

    it('devrait appeler addSound pour chaque fichier réussi', async () => {
      const files = [createMockFile('a.mp3', 'audio/mpeg', '/a.mp3')]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(store.addSound).toHaveBeenCalledTimes(1)
    })

    it('devrait appeler addToast success si import réussi', async () => {
      const files = [createMockFile('a.mp3', 'audio/mpeg', '/a.mp3')]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      const successCalls = addToast.mock.calls.filter(([, type]) => type === 'success')
      expect(successCalls.length).toBeGreaterThan(0)
    })

    it('devrait retourner 0 si aucun fichier audio valide', async () => {
      const files = [createMockFile('doc.pdf', 'application/pdf', '/doc.pdf')]
      const { result } = renderImport()

      let count
      await act(async () => {
        count = await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(count).toBe(0)
      expect(electronMock.importSoundFile).not.toHaveBeenCalled()
    })

    it('devrait gérer une erreur d\'import sans planter', async () => {
      electronMock.importSoundFile.mockRejectedValue(new Error('boom'))
      const files = [createMockFile('a.mp3', 'audio/mpeg', '/a.mp3')]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      // L'erreur doit être catchée et addToast appelé
      const errorCalls = addToast.mock.calls.filter(([, type]) => type === 'error')
      expect(errorCalls.length).toBeGreaterThan(0)
    })

    it('devrait gérer result.success=false sans planter', async () => {
      electronMock.importSoundFile.mockResolvedValue({
        success: false,
        error: 'server error',
      })
      const files = [createMockFile('a.mp3', 'audio/mpeg', '/a.mp3')]
      const { result } = renderImport()

      let count
      await act(async () => {
        count = await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(count).toBe(0)
    })

    it('ne devrait PAS appeler addSound si tout échoue', async () => {
      electronMock.importSoundFile.mockResolvedValue({ success: false })
      const files = [createMockFile('a.mp3', 'audio/mpeg', '/a.mp3')]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(store.addSound).not.toHaveBeenCalled()
    })

    it('devrait passer compressOnImport aux options de compression', async () => {
      store.compressOnImport = true
      const files = [createMockFile('a.mp3', 'audio/mpeg', '/a.mp3')]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(mockCompress).toHaveBeenCalled()
      const opts = mockCompress.mock.calls[0][1]
      expect(opts.enabled).toBe(true)
    })

    it('devrait exposer importSuccess > 0 après import réussi', async () => {
      const files = [createMockFile('a.mp3', 'audio/mpeg', '/a.mp3')]
      const { result } = renderImport()

      await act(async () => {
        await result.current.importFromDrop(createDataTransfer(files))
      })

      expect(result.current.importSuccess).toBeGreaterThan(0)
    })
  })
})