// src/core/services/index.js
export * as AudioService from './AudioService'
export * as AudioMixerService from './AudioMixerService'

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
  setStoreRef as setMixerStoreRef,
} from './AudioMixerService'