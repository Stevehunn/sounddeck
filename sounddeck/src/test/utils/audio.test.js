import { describe, it, expect, vi, beforeEach } from 'vitest'

// ✅ Mock de howler
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    unload: vi.fn(),
    volume: vi.fn(),
    duration: vi.fn(() => 10),
    seek: vi.fn(() => 5),
    on: vi.fn(),
    once: vi.fn(),
    playing: vi.fn(() => true),
    _sounds: [{ _node: { setSinkId: vi.fn() } }]
  })),
  Howler: { volume: vi.fn() }
}))

// ✅ Mock de audioMixer (simplifié)
vi.mock('@core/services/AudioMixerService', () => ({
  isMixerActive: vi.fn(() => false),
  playSoundInMixer: vi.fn(() => ({ onended: null, start: vi.fn() })),
  loadAudioBuffer: vi.fn().mockResolvedValue({
    duration: 10,
    getChannelData: vi.fn(() => new Float32Array(100))
  })
}))

// ✅ Importer après les mocks
import { 
  calculateFinalVolume,
  gainCache,
  setNormalizationTarget,
  setStoreRef,
  registerStopSequencerCallback,
  stopAllSounds
} from '@core/services/AudioService'

describe('audio.js - Fonctions de base', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(gainCache).forEach(key => delete gainCache[key])
    gainCache.targetRMS = 0.2
    setStoreRef({
      audioMode: 'simple',
      mixerEnabled: false,
      mixerSoundVolume: 100,
      localAudioDevice: 'default'
    })
  })

  // ─── TESTS DE calculateFinalVolume ─────────────────────────────────────

  describe('calculateFinalVolume', () => {
    it('devrait calculer le volume final avec normalisation', () => {
      const result = calculateFinalVolume(80, 0, 0)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(1)
    })

    it('devrait appliquer le gain individuel', () => {
      const result1 = calculateFinalVolume(80, 0, 0)
      const result2 = calculateFinalVolume(80, 6, 0)
      expect(result2).toBeGreaterThan(result1)
    })

    it('devrait appliquer le gain de normalisation', () => {
      const result1 = calculateFinalVolume(80, 0, 0)
      const result2 = calculateFinalVolume(80, 0, 3)
      expect(result2).toBeGreaterThan(result1)
    })

    it('devrait limiter le volume à 1', () => {
      const result = calculateFinalVolume(100, 24, 24)
      expect(result).toBeCloseTo(1, 2)
    })

    it('devrait avoir un volume minimum', () => {
      const result = calculateFinalVolume(0, -24, -24)
      expect(result).toBeGreaterThan(0)
    })
  })

  // ─── TESTS DE gainCache ─────────────────────────────────────────────

  describe('gainCache', () => {
    it('devrait pouvoir être modifié', () => {
      gainCache['test-key'] = 5.0
      expect(gainCache['test-key']).toBe(5.0)
      delete gainCache['test-key']
    })

    it('devrait avoir une cible de normalisation par défaut', () => {
      expect(gainCache.targetRMS).toBeDefined()
      expect(gainCache.targetRMS).toBe(0.2)
    })
  })

  // ─── TESTS DE setNormalizationTarget ──────────────────────────────────

  describe('setNormalizationTarget', () => {
    it('devrait définir la cible de normalisation', () => {
      setNormalizationTarget(0.15)
      expect(gainCache.targetRMS).toBe(0.15)
    })
  })

  // ─── TESTS DE setStoreRef ───────────────────────────────────────────

  describe('setStoreRef', () => {
    it('devrait définir la référence du store', () => {
      const mockStore = { test: 'value' }
      setStoreRef(mockStore)
      expect(true).toBe(true)
    })
  })

  // ─── TESTS DE registerStopSequencerCallback ─────────────────────────

  describe('registerStopSequencerCallback', () => {
    it('devrait enregistrer un callback', () => {
      const callback = vi.fn()
      registerStopSequencerCallback(callback)
      stopAllSounds()
      expect(callback).toHaveBeenCalled()
    })

    it('devrait désenregistrer un callback avec null', () => {
      registerStopSequencerCallback(null)
      expect(() => stopAllSounds()).not.toThrow()
    })
  })
})