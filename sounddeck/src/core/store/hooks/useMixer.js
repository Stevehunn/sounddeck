/**
 * @file Mixer hook — manages the microphone + sounds mixer state.
 *
 * Wraps `AudioMixerService` and stores every relevant setting in the store
 * (via the `save` callback). Provides:
 * - Reactive state for all mixer settings (device, volumes, noise, latency)
 * - `updateMixerEnabled` — activate / deactivate the mixer (with rollback)
 * - `initMixerOnStartup` — restore mixer state at boot
 * - Various `update*` setters (each persists to the store)
 *
 * A `storeValuesRef` is passed by the parent so we can build a snapshot
 * of the store (audio device, local device, monitoring…) without
 * re-subscribing to the store on every render.
 *
 * The `mixerSoundVolumeRef`, `monitoringEnabledRef`, etc. are aliased via
 * `useLatestRef` so callers can access the current values from stable
 * async callbacks without creating a stale closure.
 *
 * @see @core/services/AudioMixerService.js
 * @see @shared/hooks/useLatestRefs.js
 */

import { useState, useCallback } from 'react'
import { useLatestRef } from '@shared/hooks/useLatestRefs'
import { logWarn, logError } from '@shared/utils/logger'

export function useMixer(save, storeValuesRef) {
  const [mixerEnabled, setMixerEnabled] = useState(false)
  const [microphoneDevice, setMicrophoneDevice] = useState('default')
  const [microphoneVolume, setMicrophoneVolume] = useState(80)
  const [mixerSoundVolume, setMixerSoundVolume] = useState(100)
  const [noiseSuppression, setNoiseSuppression] = useState(false)
  const [noiseSuppressionMode, setNoiseSuppressionMode] = useState('auto')
  const [lowLatencyMode, setLowLatencyMode] = useState(false)
  const [monitoringEnabled, setMonitoringEnabled] = useState(false)

  // Latest-value refs (updated in an effect, safe for async callbacks)
  const mixerSoundVolumeRef = useLatestRef(mixerSoundVolume)
  const monitoringEnabledRef = useLatestRef(monitoringEnabled)
  const microphoneDeviceRef = useLatestRef(microphoneDevice)
  const noiseSuppressionModeRef = useLatestRef(noiseSuppressionMode)

  /**
   * Builds a snapshot of the current store for AudioMixerService.
   *
   * @param {boolean} mixerIsEnabled
   * @returns {Object}
   */
  const buildStoreSnapshot = useCallback(
    (mixerIsEnabled) => {
      const values = storeValuesRef?.current || {}
      return {
        playLocally: values.playLocally ?? true,
        monitoringEnabled: monitoringEnabledRef.current,
        audioDevice: values.audioDevice || 'default',
        localAudioDevice: values.localAudioDevice || 'default',
        mixerSoundVolume: mixerSoundVolumeRef.current,
        mixerEnabled: mixerIsEnabled,
      }
    },
    [storeValuesRef, monitoringEnabledRef, mixerSoundVolumeRef]
  )

  /**
   * Enables or disables the audio mixer.
   *
   * On failure, rolls back `mixerEnabled` to `false` and returns an error.
   *
   * @param {boolean} enabled
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  const updateMixerEnabled = useCallback(
    async (enabled) => {
      setMixerEnabled(enabled)
      await save('mixerEnabled', enabled)

      if (enabled) {
        try {
          const { initAudioMixer, resumeAudioContext, setStoreRef } =
            await import('@core/services/AudioMixerService')

          const storeSnapshot = buildStoreSnapshot(true)
          setStoreRef(storeSnapshot)

          const mixedStream = await initAudioMixer(
            microphoneDeviceRef.current || 'default',
            storeSnapshot.audioDevice || 'default'
          )

          if (mixedStream) {
            resumeAudioContext()
            return { success: true, message: 'mixerActivated' }
          } else {
            setMixerEnabled(false)
            await save('mixerEnabled', false)
            return { success: false, message: 'mixerActivationError' }
          }
        } catch (e) {
          logError('useMixer', 'Mixer activation error', e)
          setMixerEnabled(false)
          await save('mixerEnabled', false)
          return { success: false, message: 'error', error: e.message }
        }
      } else {
        const { stopMixer } = await import('@core/services/AudioMixerService')
        await stopMixer()
        return { success: true, message: 'mixerDeactivated' }
      }
    },
    [save, buildStoreSnapshot, microphoneDeviceRef]
  )

  /**
   * Restores the mixer state at boot (start or stop based on store state).
   * @returns {Promise<boolean>}
   */
  const initMixerOnStartup = useCallback(async () => {
    try {
      const {
        isMixerActive,
        stopMixer,
        initAudioMixer,
        resumeAudioContext,
        connectMixerToOutput,
        setNoiseSuppressionMode,
        setStoreRef,
      } = await import('@core/services/AudioMixerService')

      const storeSnapshot = buildStoreSnapshot(mixerEnabled)
      setStoreRef(storeSnapshot)

      const isActive = isMixerActive()

      if (!mixerEnabled && isActive) {
        await stopMixer()
        return true
      }

      if (mixerEnabled && !isActive) {
        const mixedStream = await initAudioMixer(
          microphoneDeviceRef.current || 'default',
          storeSnapshot.audioDevice || 'default'
        )

        if (mixedStream) {
          resumeAudioContext()
          connectMixerToOutput(storeSnapshot.audioDevice || 'default')

          if (
            noiseSuppressionModeRef.current &&
            noiseSuppressionModeRef.current !== 'off'
          ) {
            try {
              setNoiseSuppressionMode(noiseSuppressionModeRef.current)
            } catch {
              // Silent — noise mode is best-effort.
            }
          }
          return true
        } else {
          setMixerEnabled(false)
          await save('mixerEnabled', false)
          return false
        }
      }
      return true
    } catch (e) {
      logError('useMixer', 'Startup init error', e)
      try {
        const { stopMixer } = await import('@core/services/AudioMixerService')
        await stopMixer()
      } catch {
        // ignore
      }
      setMixerEnabled(false)
      await save('mixerEnabled', false)
      return false
    }
  }, [
    mixerEnabled,
    save,
    buildStoreSnapshot,
    microphoneDeviceRef,
    noiseSuppressionModeRef,
  ])

  /**
   * Changes the microphone device (falls back to 'default' if missing).
   * @param {string} deviceId
   * @returns {Promise<void>}
   */
  const updateMicrophoneDeviceId = useCallback(
    async (deviceId) => {
      if (deviceId && deviceId !== 'default') {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const audioInputs = devices.filter((d) => d.kind === 'audioinput')
          const deviceExists = audioInputs.some((d) => d.deviceId === deviceId)
          if (!deviceExists) {
            deviceId = 'default'
          }
        } catch {
          deviceId = 'default'
        }
      }
      setMicrophoneDevice(deviceId)
      await save('microphoneDevice', deviceId)
    },
    [save]
  )

  const updateMicrophoneVolume = useCallback(
    async (volume) => {
      setMicrophoneVolume(volume)
      await save('microphoneVolume', volume)
    },
    [save]
  )

  const updateMixerSoundVolume = useCallback(
    async (volume) => {
      setMixerSoundVolume(volume)
      await save('mixerSoundVolume', volume)
    },
    [save]
  )

  const updateNoiseSuppression = useCallback(
    async (enabled) => {
      setNoiseSuppression(enabled)
      await save('noiseSuppression', enabled)
    },
    [save]
  )

  const updateNoiseSuppressionMode = useCallback(
    async (mode) => {
      setNoiseSuppressionMode(mode)
      await save('noiseSuppressionMode', mode)
    },
    [save]
  )

  const updateLowLatencyMode = useCallback(
    async (enabled) => {
      setLowLatencyMode(enabled)
      await save('lowLatencyMode', enabled)
    },
    [save]
  )

  /**
   * Toggles self-monitoring (hear yourself in headphones).
   * @param {boolean} [enabled] - If omitted, toggles.
   * @returns {Promise<boolean>} The new state.
   */
  const toggleMonitoring = useCallback(
    async (enabled) => {
      const newState =
        typeof enabled === 'boolean' ? enabled : !monitoringEnabled
      setMonitoringEnabled(newState)
      await save('monitoringEnabled', newState)

      try {
        const { setMonitoring } = await import(
          '@core/services/AudioMixerService'
        )
        setMonitoring(newState)
      } catch (e) {
        logWarn('useMixer', 'Monitoring update error', e)
      }
      return newState
    },
    [monitoringEnabled, save]
  )

  return {
    mixerEnabled,
    setMixerEnabled,
    microphoneDevice,
    setMicrophoneDevice,
    microphoneVolume,
    setMicrophoneVolume,
    mixerSoundVolume,
    setMixerSoundVolume,
    noiseSuppression,
    setNoiseSuppression,
    noiseSuppressionMode,
    setNoiseSuppressionMode,
    lowLatencyMode,
    setLowLatencyMode,
    monitoringEnabled,
    setMonitoringEnabled,
    updateMixerEnabled,
    updateMicrophoneDeviceId,
    updateMicrophoneVolume,
    updateMixerSoundVolume,
    updateNoiseSuppression,
    updateNoiseSuppressionMode,
    updateLowLatencyMode,
    initMixerOnStartup,
    toggleMonitoring,
  }
}