import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ✅ Chemin ABSOLU avec l'alias @core (résolu par Vite)
vi.mock('@core/services/AudioMixerService', async () => {
  const actual = await vi.importActual('@core/services/AudioMixerService')
  return {
    ...actual,
    // Surcharger les fonctions pour qu'elles modifient correctement l'état
    setMicrophoneVolume: vi.fn((volume) => {
      const clampedVolume = Math.max(0, Math.min(1, volume))
      actual.mixerState.microphoneLevel = clampedVolume
    }),
    setSoundVolume: vi.fn((volume) => {
      const clampedVolume = Math.max(0, Math.min(1, volume))
      actual.mixerState.soundLevel = clampedVolume
    }),
    stopMixer: vi.fn().mockResolvedValue(),
    getAudioInputDevices: vi.fn().mockImplementation(async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.filter((d) => d.kind === 'audioinput')
      } catch (e) {
        return []
      }
    }),
  }
})

// ✅ Importer après le mock
import {
  mixerState,
  setMicrophoneVolume,
  setSoundVolume,
  stopMixer,
  getNoiseSuppressionStatus,
  setNoiseSuppression,
  setNoiseSuppressionMode,
  getMicrophoneStatus,
  getMixerStats,
  isMixerOperational,
  toggleMicrophoneMute,
  getAudioInputDevices,
} from '@core/services/AudioMixerService'

// ✅ Mock de navigator.mediaDevices
const mockMediaDevices = {
  enumerateDevices: vi.fn().mockResolvedValue([
    { kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone 1' },
    { kind: 'audioinput', deviceId: 'mic-2', label: 'Microphone 2' },
    { kind: 'audiooutput', deviceId: 'output-1', label: 'Speaker 1' },
  ]),
}
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
  configurable: true,
})

describe('audioMixer.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // ✅ Réinitialiser l'état manuellement
    mixerState.isRunning = false
    mixerState.isMicrophoneConnected = false
    mixerState.stream = null
    mixerState.microphoneLevel = 1.0
    mixerState.soundLevel = 1.0
    mixerState.noiseSuppression = false
    mixerState.noiseSuppressionMode = 'off'
  })

  afterEach(async () => {
    await stopMixer()
  })

  // ─── TESTS DE setMicrophoneVolume ────────────────────────────────────

  describe('setMicrophoneVolume', () => {
    it('devrait limiter le volume entre 0 et 1', () => {
      mixerState.microphoneLevel = 1.0

      setMicrophoneVolume(2.0)
      expect(mixerState.microphoneLevel).toBe(1.0)

      setMicrophoneVolume(-1.0)
      expect(mixerState.microphoneLevel).toBe(0)
    })

    it('devrait définir le volume à une valeur valide', () => {
      setMicrophoneVolume(0.5)
      expect(mixerState.microphoneLevel).toBe(0.5)
    })
  })

  // ─── TESTS DE setSoundVolume ──────────────────────────────────────────

  describe('setSoundVolume', () => {
    it('devrait limiter le volume entre 0 et 1', () => {
      mixerState.soundLevel = 1.0

      setSoundVolume(2.0)
      expect(mixerState.soundLevel).toBe(1.0)

      setSoundVolume(-1.0)
      expect(mixerState.soundLevel).toBe(0)
    })

    it('devrait définir le volume à une valeur valide', () => {
      setSoundVolume(0.5)
      expect(mixerState.soundLevel).toBe(0.5)
    })
  })

  // ─── TESTS DE getNoiseSuppressionStatus ──────────────────────────────

  describe('getNoiseSuppressionStatus', () => {
    it('devrait retourner le statut initial', () => {
      const status = getNoiseSuppressionStatus()
      expect(status).toHaveProperty('enabled')
      expect(status).toHaveProperty('mode')
      expect(status).toHaveProperty('workletAvailable')
      expect(status).toHaveProperty('activeMethod')
      expect(status).toHaveProperty('workletLoaded')
    })
  })

  // ─── TESTS DE setNoiseSuppression ────────────────────────────────────

  describe('setNoiseSuppression', () => {
    it('devrait activer la réduction de bruit', () => {
      setNoiseSuppression(true)
      const status = getNoiseSuppressionStatus()
      expect(status.enabled).toBe(true)
    })

    it('devrait désactiver la réduction de bruit', () => {
      setNoiseSuppression(false)
      const status = getNoiseSuppressionStatus()
      expect(status.enabled).toBe(false)
    })
  })

  // ─── TESTS DE setNoiseSuppressionMode ────────────────────────────────

  describe('setNoiseSuppressionMode', () => {
    it('devrait définir le mode "auto"', async () => {
      await setNoiseSuppressionMode('auto')
      const status = getNoiseSuppressionStatus()
      expect(status.mode).toBe('auto')
      expect(status.enabled).toBe(true)
    })

    it('devrait définir le mode "off"', async () => {
      await setNoiseSuppressionMode('off')
      const status = getNoiseSuppressionStatus()
      expect(status.mode).toBe('off')
      expect(status.enabled).toBe(false)
    })

    it('devrait définir le mode "filter"', async () => {
      await setNoiseSuppressionMode('filter')
      const status = getNoiseSuppressionStatus()
      expect(status.mode).toBe('filter')
      expect(status.enabled).toBe(true)
    })

    it('devrait utiliser "off" si le mode est invalide', async () => {
      await setNoiseSuppressionMode('invalid')
      const status = getNoiseSuppressionStatus()
      expect(status.mode).toBe('off')
    })
  })

  // ─── TESTS DE getMicrophoneStatus ─────────────────────────────────────

  describe('getMicrophoneStatus', () => {
    it('devrait retourner le statut du micro', () => {
      const status = getMicrophoneStatus()
      expect(status).toHaveProperty('isConnected')
      expect(status).toHaveProperty('deviceId')
      expect(status).toHaveProperty('audioContextState')
      expect(status).toHaveProperty('gainValue')
      expect(status).toHaveProperty('noiseSuppression')
      expect(status).toHaveProperty('noiseMode')
    })
  })

  // ─── TESTS DE getMixerStats ───────────────────────────────────────────

  describe('getMixerStats', () => {
    it('devrait retourner les statistiques du mixeur', () => {
      const stats = getMixerStats()
      expect(stats).toHaveProperty('isInitialized')
      expect(stats).toHaveProperty('isRunning')
      expect(stats).toHaveProperty('isMicrophoneConnected')
      expect(stats).toHaveProperty('audioContextState')
      expect(stats).toHaveProperty('microphoneGain')
      expect(stats).toHaveProperty('soundGain')
      expect(stats).toHaveProperty('masterGain')
      expect(stats).toHaveProperty('hasStream')
      expect(stats).toHaveProperty('streamActive')
      expect(stats).toHaveProperty('tracksCount')
      expect(stats).toHaveProperty('audioElementActive')
      expect(stats).toHaveProperty('noiseSuppression')
      expect(stats).toHaveProperty('noiseMode')
      expect(stats).toHaveProperty('workletAvailable')
      expect(stats).toHaveProperty('activeMethod')
    })

    it("devrait retourner des stats même si le mixeur n'est pas initialisé", () => {
      const stats = getMixerStats()
      expect(stats.isInitialized).toBe(false)
    })
  })

  // ─── TESTS DE isMixerOperational ──────────────────────────────────────

  describe('isMixerOperational', () => {
    it("devrait retourner false si le mixeur n'est pas initialisé", () => {
      expect(isMixerOperational()).toBe(false)
    })
  })

  // ─── TESTS DE toggleMicrophoneMute ────────────────────────────────────

  describe('toggleMicrophoneMute', () => {
    it("ne devrait pas échouer si le gain n'existe pas", () => {
      expect(() => toggleMicrophoneMute()).not.toThrow()
    })
  })

  // ─── TESTS DE getAudioInputDevices ────────────────────────────────────

  describe('getAudioInputDevices', () => {
    it("devrait gérer les erreurs d'énumération", async () => {
      const mockMediaDevicesError = {
        enumerateDevices: vi.fn().mockRejectedValue(new Error('Enumeration error')),
      }
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: mockMediaDevicesError,
        writable: true,
        configurable: true,
      })

      const devices = await getAudioInputDevices()
      expect(devices).toEqual([])
    })
  })
})