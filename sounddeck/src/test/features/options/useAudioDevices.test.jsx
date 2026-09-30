import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudioDevices } from '@features/options/hooks/useAudioDevices'

// ─── Mocks hoistés avec implémentation INCHANGEABLE ─────────────────────
const { mockTestMic, mockEnumerate, MOCK_STOP } = vi.hoisted(() => {
  // ✅ Vraie fonction constante, jamais cassée par clearAllMocks/resetModules
  const MOCK_STOP = function mockStop() {}
  const mockTestMic = vi.fn(async () => ({
    success: true,
    stop: MOCK_STOP,
    stream: {},
    context: {},
  }))
  const mockEnumerate = vi.fn()
  return { mockTestMic, mockEnumerate, MOCK_STOP }
})

vi.mock('@core/i18n/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key) => key,
    currentLang: 'fr',
  })),
}))

vi.mock('@core/services/AudioMixerService', () => ({
  testMicrophoneOnce: mockTestMic,
}))

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('useAudioDevices', () => {
  let store, addToast

  beforeEach(() => {
    // ⚠️ mockClear (pas clearAllMocks) : garde les implémentations intactes
    mockTestMic.mockClear()
    mockEnumerate.mockClear()

    store = {
      virtualDriverInstalled: false,
      microphoneDevice: 'default',
      updateVirtualDriverInstalled: vi.fn(),
    }

    addToast = vi.fn()

    mockEnumerate.mockResolvedValue([
      { kind: 'audiooutput', deviceId: 'out-1', label: 'CABLE Input' },
      { kind: 'audiooutput', deviceId: 'out-2', label: 'Speakers' },
      { kind: 'audioinput', deviceId: 'in-1', label: 'Microphone 1' },
      { kind: 'audioinput', deviceId: 'in-2', label: 'Microphone 2' },
    ])

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { enumerateDevices: mockEnumerate },
      writable: true,
      configurable: true,
    })

    window.electronAPI = {
      installVirtualDriver: vi.fn().mockResolvedValue({ success: true }),
    }
  })

  const renderHookWith = () =>
    renderHook(() => useAudioDevices({ store, addToast }))

  // ─── ÉTAT INITIAL ────────────────────────────────────────────────────

  it('devrait démarrer avec audioDevices vide', () => {
    const { result } = renderHookWith()
    expect(result.current.audioDevices).toEqual([])
  })

  it('devrait démarrer avec microphones vide', () => {
    const { result } = renderHookWith()
    expect(result.current.microphones).toEqual([])
  })

  it('devrait démarrer avec isDetecting=false', () => {
    const { result } = renderHookWith()
    expect(result.current.isDetecting).toBe(false)
  })

  it('devrait démarrer avec isInstallingDriver=false', () => {
    const { result } = renderHookWith()
    expect(result.current.isInstallingDriver).toBe(false)
  })

  it('devrait démarrer avec isMicrophoneTesting=false', () => {
    const { result } = renderHookWith()
    expect(result.current.isMicrophoneTesting).toBe(false)
  })

  // ─── DÉTECTION INITIALE ─────────────────────────────────────────────

  it('devrait peupler audioDevices au mount', async () => {
    const { result } = renderHookWith()
    await waitFor(() => {
      expect(result.current.audioDevices.length).toBe(2)
    })
  })

  it('devrait peupler microphones au mount', async () => {
    const { result } = renderHookWith()
    await waitFor(() => {
      expect(result.current.microphones.length).toBe(2)
    })
  })

  it('devrait marquer virtualDriverInstalled=true si CABLE détecté', async () => {
    renderHookWith()
    await waitFor(() => {
      expect(store.updateVirtualDriverInstalled).toHaveBeenCalledWith(true)
    })
  })

  it('devrait marquer virtualDriverInstalled=false si pas de device virtuel', async () => {
    store.virtualDriverInstalled = true
    mockEnumerate.mockResolvedValue([
      { kind: 'audiooutput', deviceId: 'out-1', label: 'Speakers' },
    ])

    renderHookWith()

    await waitFor(() => {
      expect(store.updateVirtualDriverInstalled).toHaveBeenCalledWith(false)
    })
  })

  it('devrait gérer une erreur d\'énumération sans planter', async () => {
    mockEnumerate.mockRejectedValue(new Error('boom'))

    const { result } = renderHookWith()
    await waitFor(() => {
      expect(result.current.audioDevices).toEqual([])
    })
  })

  // ─── handleDetectDevices ─────────────────────────────────────────────

  it('handleDetectDevices devrait re-énumérer les devices', async () => {
    const { result } = renderHookWith()
    await waitFor(() => {
      expect(result.current.audioDevices.length).toBe(2)
    })

    mockEnumerate.mockResolvedValue([
      { kind: 'audiooutput', deviceId: 'out-1', label: 'New Speaker' },
    ])

    await act(async () => {
      await result.current.handleDetectDevices()
    })

    expect(result.current.audioDevices.length).toBe(1)
  })

  it('handleDetectDevices devrait mettre à jour virtualDriverInstalled', async () => {
    const { result } = renderHookWith()
    await waitFor(() => expect(result.current.audioDevices.length).toBeGreaterThan(0))

    await act(async () => {
      await result.current.handleDetectDevices()
    })

    expect(store.updateVirtualDriverInstalled).toHaveBeenCalledWith(true)
    expect(addToast).toHaveBeenCalledWith('virtualDriverDetected', 'success')
  })

  it('handleDetectDevices devrait toast info si aucun device virtuel', async () => {
    mockEnumerate.mockResolvedValue([
      { kind: 'audiooutput', deviceId: 'out-1', label: 'Speakers' },
    ])
    const { result } = renderHookWith()

    await waitFor(() => expect(result.current.audioDevices.length).toBe(1))

    await act(async () => {
      await result.current.handleDetectDevices()
    })

    expect(addToast).toHaveBeenCalledWith('virtualDriverNotDetected', 'info')
  })

  // ─── handleInstallDriver ─────────────────────────────────────────────

  it('handleInstallDriver devrait appeler installVirtualDriver', async () => {
    const { result } = renderHookWith()
    await waitFor(() => expect(result.current.audioDevices.length).toBeGreaterThan(0))

    await act(async () => {
      await result.current.handleInstallDriver()
    })

    expect(window.electronAPI.installVirtualDriver).toHaveBeenCalled()
  })

  it('handleInstallDriver devrait toast success si install réussie', async () => {
    const { result } = renderHookWith()
    await waitFor(() => expect(result.current.audioDevices.length).toBeGreaterThan(0))

    await act(async () => {
      await result.current.handleInstallDriver()
    })

    const successCalls = addToast.mock.calls.filter(([, type]) => type === 'success')
    expect(successCalls.length).toBeGreaterThan(0)
  })

  it('handleInstallDriver devrait toast error si échec', async () => {
    window.electronAPI.installVirtualDriver.mockResolvedValue({
      success: false,
      error: 'install failed',
    })
    const { result } = renderHookWith()
    await waitFor(() => expect(result.current.audioDevices.length).toBeGreaterThan(0))

    await act(async () => {
      await result.current.handleInstallDriver()
    })

    const errorCalls = addToast.mock.calls.filter(([, type]) => type === 'error')
    expect(errorCalls.length).toBeGreaterThan(0)
  })

  // ─── testMicrophone ──────────────────────────────────────────────────

  it('testMicrophone devrait appeler testMicrophoneOnce', async () => {
    const { result } = renderHookWith()
    await waitFor(() => expect(result.current.audioDevices.length).toBeGreaterThan(0))

    await act(async () => {
      await result.current.testMicrophone()
    })

    expect(mockTestMic).toHaveBeenCalledWith('default')
  })

  it('testMicrophone devrait passer le microphoneDevice du store', async () => {
    store.microphoneDevice = 'mic-42'
    const { result } = renderHookWith()
    await waitFor(() => expect(result.current.audioDevices.length).toBeGreaterThan(0))

    await act(async () => {
      await result.current.testMicrophone()
    })

    expect(mockTestMic).toHaveBeenCalledWith('mic-42')
  })

  it('testMicrophone devrait toast error si échec', async () => {
    mockTestMic.mockImplementationOnce(async () => ({
      success: false,
      error: 'no mic',
      stop: MOCK_STOP,  // ✅ Même référence stable
    }))

    const { result } = renderHookWith()
    await waitFor(() => expect(result.current.audioDevices.length).toBeGreaterThan(0))

    await act(async () => {
      await result.current.testMicrophone()
    })

    const errorCalls = addToast.mock.calls.filter(([, type]) => type === 'error')
    expect(errorCalls.length).toBeGreaterThan(0)
  })

  it('testMicrophone devrait gérer une exception', async () => {
    mockTestMic.mockRejectedValueOnce(new Error('crash'))

    const { result } = renderHookWith()
    await waitFor(() => expect(result.current.audioDevices.length).toBeGreaterThan(0))

    await act(async () => {
      await result.current.testMicrophone()
    })

    const errorCalls = addToast.mock.calls.filter(([, type]) => type === 'error')
    expect(errorCalls.length).toBeGreaterThan(0)
  })
})