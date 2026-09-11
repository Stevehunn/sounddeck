// src/core/store/hooks/useMixer.js
import { useState, useCallback } from 'react'

export function useMixer(save) {
  const [mixerEnabled, setMixerEnabled] = useState(false)
  const [microphoneDevice, setMicrophoneDevice] = useState('default')
  const [microphoneVolume, setMicrophoneVolume] = useState(80)
  const [mixerSoundVolume, setMixerSoundVolume] = useState(100)
  const [noiseSuppression, setNoiseSuppression] = useState(false)
  const [noiseSuppressionMode, setNoiseSuppressionMode] = useState('auto')
  const [lowLatencyMode, setLowLatencyMode] = useState(false)
  const [monitoringEnabled, setMonitoringEnabled] = useState(false)

  const updateMixerEnabled = useCallback(async (enabled) => {
    setMixerEnabled(enabled)
    await save('mixerEnabled', enabled)

    if (enabled) {
      try {
        const { initAudioMixer, resumeAudioContext, setStoreRef } = await import('@core/services/AudioMixerService')

        const store = {
          playLocally: true,
          monitoringEnabled: monitoringEnabled,
          audioDevice: 'default',
          mixerSoundVolume: mixerSoundVolume,
          localAudioDevice: 'default',
          mixerEnabled: true
        }

        setStoreRef(store)
        const mixedStream = await initAudioMixer(microphoneDevice || 'default', 'default')

        if (mixedStream) {
          resumeAudioContext()
          return { success: true, message: 'mixerActivated' }
        } else {
          setMixerEnabled(false)
          await save('mixerEnabled', false)
          return { success: false, message: 'mixerActivationError' }
        }
      } catch (e) {
        console.error('Erreur activation mixeur:', e)
        setMixerEnabled(false)
        await save('mixerEnabled', false)
        return { success: false, message: 'error', error: e.message }
      }
    } else {
      const { stopMixer } = await import('@core/services/AudioMixerService')
      await stopMixer()
      return { success: true, message: 'mixerDeactivated' }
    }
  }, [save, microphoneDevice, monitoringEnabled, mixerSoundVolume])

  const initMixerOnStartup = useCallback(async () => {
    try {
      const {
        getMixerFullState,
        isMixerActive,
        stopMixer,
        initAudioMixer,
        resumeAudioContext,
        connectMixerToOutput,
        setNoiseSuppressionMode,
        setStoreRef
      } = await import('@core/services/AudioMixerService')

      const store = {
        playLocally: true,
        monitoringEnabled: monitoringEnabled,
        audioDevice: 'default',
        mixerSoundVolume: mixerSoundVolume,
        localAudioDevice: 'default',
        mixerEnabled: mixerEnabled
      }

      setStoreRef(store)
      const fullState = getMixerFullState()
      const isActive = isMixerActive()

      if (!mixerEnabled && isActive) {
        await stopMixer()
        return true
      }

      if (mixerEnabled && !isActive) {
        const mixedStream = await initAudioMixer(microphoneDevice || 'default', 'default')

        if (mixedStream) {
          resumeAudioContext()
          connectMixerToOutput('default')

          if (noiseSuppressionMode && noiseSuppressionMode !== 'off') {
            try { setNoiseSuppressionMode(noiseSuppressionMode) } catch (e) {}
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
      try {
        const { stopMixer } = await import('@core/services/AudioMixerService')
        await stopMixer()
      } catch (_) {}
      setMixerEnabled(false)
      await save('mixerEnabled', false)
      return false
    }
  }, [mixerEnabled, microphoneDevice, noiseSuppressionMode, save, monitoringEnabled, mixerSoundVolume])

  const updateMicrophoneDeviceId = useCallback(async (deviceId) => {
    if (deviceId && deviceId !== 'default') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(d => d.kind === 'audioinput')
        const deviceExists = audioInputs.some(d => d.deviceId === deviceId)
        if (!deviceExists) {
          deviceId = 'default'
        }
      } catch (e) {
        deviceId = 'default'
      }
    }
    setMicrophoneDevice(deviceId)
    await save('microphoneDevice', deviceId)
  }, [save])

  const updateMicrophoneVolume = useCallback(async (volume) => {
    setMicrophoneVolume(volume)
    await save('microphoneVolume', volume)
  }, [save])

  const updateMixerSoundVolume = useCallback(async (volume) => {
    setMixerSoundVolume(volume)
    await save('mixerSoundVolume', volume)
  }, [save])

  const updateNoiseSuppression = useCallback(async (enabled) => {
    setNoiseSuppression(enabled)
    await save('noiseSuppression', enabled)
  }, [save])

  const updateNoiseSuppressionMode = useCallback(async (mode) => {
    setNoiseSuppressionMode(mode)
    await save('noiseSuppressionMode', mode)
  }, [save])

  const updateLowLatencyMode = useCallback(async (enabled) => {
    setLowLatencyMode(enabled)
    await save('lowLatencyMode', enabled)
  }, [save])

  const toggleMonitoring = useCallback(async () => {
    const newState = !monitoringEnabled
    setMonitoringEnabled(newState)
    await save('monitoringEnabled', newState)

    try {
      const { setMonitoring } = await import('@core/services/AudioMixerService')
      setMonitoring(newState)
    } catch (e) {
      console.warn('Erreur mise à jour monitoring:', e)
    }
    return newState
  }, [monitoringEnabled, save])

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