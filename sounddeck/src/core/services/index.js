/**
 * @file Public API surface of the services layer.
 *
 * Re-exports every service (or a curated subset of its functions) so
 * consumers can do:
 *
 *   import { playSound, stopAllSounds } from '@core/services'
 *
 * instead of reaching into individual files. The `as` namespaces are kept
 * for consumers that need the full module (`AudioService.getSoundProgress`,
 * etc.).
 *
 * @see ./AudioService.js
 * @see ./AudioMixerService.js
 */

export * as AudioService from './AudioService'
export * as AudioMixerService from './AudioMixerService'

// ─── AudioService — public functions ────────────────────────────────────
export {
  setStoreRef,
  analyzeGain,
  setNormalizationTarget,
  getNormalizationTarget,
  playSound,
  playSoundAsync,
  stopSound,
  stopAllSounds,
  registerStopSequencerCallback,
  isPlaying,
  getSoundProgress,
  getSoundDuration,
  clearSoundCache,
  analyzeAllGains,
} from './AudioService'

// ─── AudioMixerService — public functions ───────────────────────────────
export {
  initAudioMixer,
  warmupAudioContext,
  connectMixerToOutput,
  setMicrophoneVolume,
  setSoundVolume,
  getMixedStream,
  isMixerActive,
  isMixerOperational,
  resumeAudioContext,
  stopMixer,
  setMonitoring,
  getMonitoringStatus,
  getMicrophoneStatus,
  getMixerStats,
  getMixerFullState,
  repairMixer,
  toggleMicrophoneMute,
  testMicrophoneOnce,
  setNoiseSuppressionMode,
  getNoiseSuppressionStatus,
  mixerState,
  setLowLatencyMode,
  changeMicrophone,
  // Re-exported with an alias to avoid a naming collision with
  // `AudioService.setStoreRef` above.
  setStoreRef as setMixerStoreRef,
} from './AudioMixerService'