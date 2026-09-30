// src/features/options/hooks/useAudioDevices.js
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { testMicrophoneOnce } from '@core/services/AudioMixerService'
import { logWarn } from '@shared/utils/logger'

export function useAudioDevices({ store, addToast }) {
  const { t } = useLanguage()
  const [audioDevices, setAudioDevices] = useState([])
  const [microphones, setMicrophones] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [isInstallingDriver, setIsInstallingDriver] = useState(false)
  const [isMicrophoneTesting, setIsMicrophoneTesting] = useState(false)
  const micTestRef = useRef(null)

  // Détection initiale
  useEffect(() => {
    const detectDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const outputs = devices.filter((d) => d.kind === 'audiooutput')
        const inputs = devices.filter((d) => d.kind === 'audioinput')
        setAudioDevices(outputs)
        setMicrophones(inputs)

        const hasVirtualDevice = outputs.some((d) => {
          const label = d.label.toLowerCase()
          return (
            label.includes('cable') ||
            label.includes('virtual') ||
            label.includes('scream') ||
            label.includes('voicemeeter') ||
            label.includes('vb-audio')
          )
        })

        if (hasVirtualDevice && !store.virtualDriverInstalled) {
          store.updateVirtualDriverInstalled?.(true)
          addToast(t('virtualDriverDetected'), 'success')
        } else if (!hasVirtualDevice && store.virtualDriverInstalled) {
          store.updateVirtualDriverInstalled?.(false)
        }
      } catch (e) {
        logWarn('Options', 'Erreur détection périphériques', e)
      }
    }

    detectDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup du test micro à l'unmount
  useEffect(() => {
    return () => {
      if (micTestRef.current) {
        if (typeof micTestRef.current.stop === 'function') {
          micTestRef.current.stop()
        }
        micTestRef.current = null
      }
    }
  }, [])

  const handleInstallDriver = async () => {
    setIsInstallingDriver(true)
    try {
      addToast(t('downloadingDriver'), 'info')
      const result = await window.electronAPI.installVirtualDriver()
      if (result.success) {
        if (result.warning) {
          addToast(result.warning, 'info')
        } else {
          addToast(t('driverInstalled'), 'success')
        }
        setTimeout(async () => {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const outputs = devices.filter((d) => d.kind === 'audiooutput')
          setAudioDevices(outputs)
          const hasVirtualDevice = outputs.some((d) => {
            const label = d.label.toLowerCase()
            return label.includes('cable') || label.includes('vb-audio')
          })
          if (hasVirtualDevice) {
            store.updateVirtualDriverInstalled?.(true)
          }
        }, 3000)
      } else {
        addToast(`${t('installError')}: ${result.error || t('unknown')}`, 'error')
      }
    } catch (e) {
      addToast(`${t('error')}: ${e.message}`, 'error')
    }
    setIsInstallingDriver(false)
  }

  const handleDetectDevices = async () => {
    setIsDetecting(true)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const outputs = devices.filter((d) => d.kind === 'audiooutput')
      setAudioDevices(outputs)

      const hasVirtualDevice = outputs.some((d) => {
        const label = d.label.toLowerCase()
        return (
          label.includes('cable') ||
          label.includes('virtual') ||
          label.includes('scream') ||
          label.includes('voicemeeter') ||
          label.includes('vb-audio')
        )
      })

      if (hasVirtualDevice) {
        store.updateVirtualDriverInstalled?.(true)
        addToast(t('virtualDriverDetected'), 'success')
      } else {
        store.updateVirtualDriverInstalled?.(false)
        addToast(t('virtualDriverNotDetected'), 'info')
      }
    } catch (e) {
      addToast(t('detectError'), 'error')
    }
    setIsDetecting(false)
  }

    const testMicrophone = async () => {
    if (micTestRef.current) {
      if (typeof micTestRef.current.stop === 'function') {
        micTestRef.current.stop()
      }
      micTestRef.current = null
      setIsMicrophoneTesting(false)
      addToast(t('micTestStopped'), 'info')
      return
    }

    try {
      setIsMicrophoneTesting(true)
      addToast(t('micTestInProgress'), 'info')

      const deviceId = store.microphoneDevice || 'default'
      const result = await testMicrophoneOnce(deviceId)

      if (result.success) {
        micTestRef.current = {
          stop: result.stop,
          stream: result.stream,
          context: result.context,
        }

        addToast(t('microphoneConnected'), 'success')

        setTimeout(() => {
          if (micTestRef.current) {
            if (typeof micTestRef.current.stop === 'function') {
              micTestRef.current.stop()
            }
            micTestRef.current = null
            setIsMicrophoneTesting(false)
            addToast(t('micTestFinished'), 'info')
          }
        }, 3000)
      } else {
        setIsMicrophoneTesting(false)
        addToast(
          `${t('microphoneTestError')}: ${result.error || t('microphoneNotConnected')}`,
          'error'
        )
      }
    } catch (e) {
      setIsMicrophoneTesting(false)
      addToast(`${t('error')}: ${e.message}`, 'error')
    }
  }

  return {
    audioDevices,
    microphones,
    isDetecting,
    isInstallingDriver,
    isMicrophoneTesting,
    handleInstallDriver,
    handleDetectDevices,
    testMicrophone,
  }
}