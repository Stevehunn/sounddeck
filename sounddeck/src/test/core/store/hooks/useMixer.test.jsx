import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMixer } from '@core/store/hooks/useMixer'

// ─── Mocks ──────────────────────────────────────────────────────────────
const {
  mockInitAudioMixer,
  mockStopMixer,
  mockIsMixerActive,
  mockResumeAudioContext,
  mockConnectMixerToOutput,
  mockSetNoiseSuppressionMode,
  mockSetStoreRef,
  mockSetMonitoring,
} = vi.hoisted(() => ({
  mockInitAudioMixer: vi.fn(),
  mockStopMixer: vi.fn(),
  mockIsMixerActive: vi.fn(),
  mockResumeAudioContext: vi.fn(),
  mockConnectMixerToOutput: vi.fn(),
  mockSetNoiseSuppressionMode: vi.fn(),
  mockSetStoreRef: vi.fn(),
  mockSetMonitoring: vi.fn(),
}))

vi.mock('@core/services/AudioMixerService', () => ({
  initAudioMixer: mockInitAudioMixer,
  stopMixer: mockStopMixer,
  isMixerActive: mockIsMixerActive,
  resumeAudioContext: mockResumeAudioContext,
  connectMixerToOutput: mockConnectMixerToOutput,
  setNoiseSuppressionMode: mockSetNoiseSuppressionMode,
  setStoreRef: mockSetStoreRef,
  setMonitoring: mockSetMonitoring,
  getMixerFullState: vi.fn(),
}))

vi.mock('@shared/utils/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('useMixer', () => {
  let save
  let storeValuesRef

  beforeEach(() => {
    vi.clearAllMocks()
    save = vi.fn().mockResolvedValue()
    storeValuesRef = {
      current: {
        playLocally: true,
        audioDevice: 'default',
        localAudioDevice: 'default',
        mixerSoundVolume: 100,
      },
    }

    mockInitAudioMixer.mockResolvedValue({ id: 'fake-stream' })
    mockStopMixer.mockResolvedValue()
    mockIsMixerActive.mockReturnValue(false)
    mockResumeAudioContext.mockReturnValue()
    mockConnectMixerToOutput.mockReturnValue()
    mockSetNoiseSuppressionMode.mockReturnValue()
    mockSetStoreRef.mockReturnValue()
    mockSetMonitoring.mockReturnValue()
  })

  const render = () => renderHook(() => useMixer(save, storeValuesRef))

  // ════════════════════════════════════════════════════════════════════
  // ÉTAT INITIAL
  // ════════════════════════════════════════════════════════════════════

  describe('état initial', () => {
    it('devrait démarrer avec les valeurs par défaut', () => {
      const { result } = render()
      expect(result.current.mixerEnabled).toBe(false)
      expect(result.current.microphoneDevice).toBe('default')
      expect(result.current.microphoneVolume).toBe(80)
      expect(result.current.mixerSoundVolume).toBe(100)
      expect(result.current.noiseSuppression).toBe(false)
      expect(result.current.noiseSuppressionMode).toBe('auto')
      expect(result.current.lowLatencyMode).toBe(false)
      expect(result.current.monitoringEnabled).toBe(false)
    })

    it('devrait exposer tous les setters', () => {
      const { result } = render()
      expect(typeof result.current.updateMixerEnabled).toBe('function')
      expect(typeof result.current.updateMicrophoneDeviceId).toBe('function')
      expect(typeof result.current.updateMicrophoneVolume).toBe('function')
      expect(typeof result.current.updateMixerSoundVolume).toBe('function')
      expect(typeof result.current.updateNoiseSuppression).toBe('function')
      expect(typeof result.current.updateNoiseSuppressionMode).toBe('function')
      expect(typeof result.current.updateLowLatencyMode).toBe('function')
      expect(typeof result.current.initMixerOnStartup).toBe('function')
      expect(typeof result.current.toggleMonitoring).toBe('function')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // updateMixerEnabled (activation)
  // ════════════════════════════════════════════════════════════════════

  describe('updateMixerEnabled (activation)', () => {
    it('devrait activer le mixeur', async () => {
      const { result } = render()

      let res
      await act(async () => {
        res = await result.current.updateMixerEnabled(true)
      })

      expect(res.success).toBe(true)
      expect(res.message).toBe('mixerActivated')
      expect(result.current.mixerEnabled).toBe(true)
    })

    it('devrait appeler initAudioMixer', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateMixerEnabled(true)
      })

      expect(mockInitAudioMixer).toHaveBeenCalledWith('default', 'default')
    })

    it('devrait persister mixerEnabled', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateMixerEnabled(true)
      })

      expect(save).toHaveBeenCalledWith('mixerEnabled', true)
    })

    it('devrait échouer si initAudioMixer retourne null', async () => {
      mockInitAudioMixer.mockResolvedValue(null)
      const { result } = render()

      let res
      await act(async () => {
        res = await result.current.updateMixerEnabled(true)
      })

      expect(res.success).toBe(false)
      expect(result.current.mixerEnabled).toBe(false)
      expect(save).toHaveBeenCalledWith('mixerEnabled', false)
    })

    it('devrait gérer une exception d\'initAudioMixer', async () => {
      mockInitAudioMixer.mockRejectedValue(new Error('boom'))
      const { result } = render()

      let res
      await act(async () => {
        res = await result.current.updateMixerEnabled(true)
      })

      expect(res.success).toBe(false)
      expect(res.error).toBe('boom')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // updateMixerEnabled (désactivation)
  // ════════════════════════════════════════════════════════════════════

  describe('updateMixerEnabled (désactivation)', () => {
    it('devrait désactiver le mixeur', async () => {
      const { result } = render()

      let res
      await act(async () => {
        res = await result.current.updateMixerEnabled(false)
      })

      expect(res.success).toBe(true)
      expect(res.message).toBe('mixerDeactivated')
      expect(result.current.mixerEnabled).toBe(false)
    })

    it('devrait appeler stopMixer', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateMixerEnabled(false)
      })

      expect(mockStopMixer).toHaveBeenCalled()
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // initMixerOnStartup
  // ════════════════════════════════════════════════════════════════════

  describe('initMixerOnStartup', () => {
    it('devrait arrêter le mixeur si désactivé mais actif', async () => {
      mockIsMixerActive.mockReturnValue(true)
      const { result } = render()

      let ok
      await act(async () => {
        ok = await result.current.initMixerOnStartup()
      })

      expect(ok).toBe(true)
      expect(mockStopMixer).toHaveBeenCalled()
    })

    it('devrait démarrer le mixeur si activé mais inactif', async () => {
      mockIsMixerActive.mockReturnValue(false)
      const { result } = render()

      await act(async () => {
        await result.current.setMixerEnabled(true)
      })

      let ok
      await act(async () => {
        ok = await result.current.initMixerOnStartup()
      })

      expect(ok).toBe(true)
      expect(mockInitAudioMixer).toHaveBeenCalled()
    })

    it('devrait échouer si initAudioMixer retourne null', async () => {
      mockInitAudioMixer.mockResolvedValue(null)
      const { result } = render()

      await act(async () => {
        await result.current.setMixerEnabled(true)
      })

      let ok
      await act(async () => {
        ok = await result.current.initMixerOnStartup()
      })

      expect(ok).toBe(false)
    })

    it('devrait gérer une exception globale', async () => {
      mockIsMixerActive.mockImplementation(() => {
        throw new Error('boom')
      })
      const { result } = render()

      let ok
      await act(async () => {
        ok = await result.current.initMixerOnStartup()
      })

      expect(ok).toBe(false)
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // MICROPHONE
  // ════════════════════════════════════════════════════════════════════

  describe('microphone', () => {
    it('updateMicrophoneDeviceId devrait mettre à jour', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateMicrophoneDeviceId('mic-1')
      })

      expect(result.current.microphoneDevice).toBe('mic-1')
      expect(save).toHaveBeenCalledWith('microphoneDevice', 'mic-1')
    })

    it('updateMicrophoneVolume devrait mettre à jour', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateMicrophoneVolume(50)
      })

      expect(result.current.microphoneVolume).toBe(50)
      expect(save).toHaveBeenCalledWith('microphoneVolume', 50)
    })

    it('updateMixerSoundVolume devrait mettre à jour', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateMixerSoundVolume(75)
      })

      expect(result.current.mixerSoundVolume).toBe(75)
      expect(save).toHaveBeenCalledWith('mixerSoundVolume', 75)
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // NOISE SUPPRESSION
  // ════════════════════════════════════════════════════════════════════

  describe('noise suppression', () => {
    it('updateNoiseSuppression devrait basculer', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateNoiseSuppression(true)
      })

      expect(result.current.noiseSuppression).toBe(true)
      expect(save).toHaveBeenCalledWith('noiseSuppression', true)
    })

    it('updateNoiseSuppressionMode devrait changer le mode', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateNoiseSuppressionMode('filter')
      })

      expect(result.current.noiseSuppressionMode).toBe('filter')
      expect(save).toHaveBeenCalledWith('noiseSuppressionMode', 'filter')
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // LOW LATENCY
  // ════════════════════════════════════════════════════════════════════

  describe('updateLowLatencyMode', () => {
    it('devrait basculer lowLatencyMode', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.updateLowLatencyMode(true)
      })

      expect(result.current.lowLatencyMode).toBe(true)
      expect(save).toHaveBeenCalledWith('lowLatencyMode', true)
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // MONITORING
  // ════════════════════════════════════════════════════════════════════

  describe('toggleMonitoring', () => {
    it('devrait activer le monitoring', async () => {
      const { result } = render()

      let state
      await act(async () => {
        state = await result.current.toggleMonitoring(true)
      })

      expect(state).toBe(true)
      expect(result.current.monitoringEnabled).toBe(true)
      expect(save).toHaveBeenCalledWith('monitoringEnabled', true)
      expect(mockSetMonitoring).toHaveBeenCalledWith(true)
    })

    it('devrait désactiver le monitoring', async () => {
      const { result } = render()

      await act(async () => {
        await result.current.toggleMonitoring(true)
      })
      await act(async () => {
        await result.current.toggleMonitoring(false)
      })

      expect(result.current.monitoringEnabled).toBe(false)
    })

    it('devrait basculer si enabled non fourni', async () => {
      const { result } = render()

      let state
      await act(async () => {
        state = await result.current.toggleMonitoring()
      })

      // false → true
      expect(state).toBe(true)
    })

    it('ne devrait pas planter si setMonitoring throw', async () => {
      mockSetMonitoring.mockImplementation(() => {
        throw new Error('boom')
      })
      const { result } = render()

      await expect(
        act(async () => {
          await result.current.toggleMonitoring(true)
        })
      ).resolves.not.toThrow()

      // State quand même mis à jour
      expect(result.current.monitoringEnabled).toBe(true)
    })
  })

  // ════════════════════════════════════════════════════════════════════
  // SETTERS DIRECTS
  // ════════════════════════════════════════════════════════════════════

  describe('setters directs', () => {
    it('setMixerEnabled devrait mettre à jour sans persister', () => {
      const { result } = render()

      act(() => {
        result.current.setMixerEnabled(true)
      })

      expect(result.current.mixerEnabled).toBe(true)
      // Pas d'appel save → c'est un setter bas niveau
      expect(save).not.toHaveBeenCalled()
    })

    it('setMicrophoneDevice devrait mettre à jour', () => {
      const { result } = render()

      act(() => {
        result.current.setMicrophoneDevice('mic-x')
      })

      expect(result.current.microphoneDevice).toBe('mic-x')
    })

    it('setNoiseSuppressionMode devrait mettre à jour', () => {
      const { result } = render()

      act(() => {
        result.current.setNoiseSuppressionMode('worklet')
      })

      expect(result.current.noiseSuppressionMode).toBe('worklet')
    })
  })
})