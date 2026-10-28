/**
 * @file Audio device management hook.
 *
 * Handles:
 * - **Initial enumeration** on mount (audio outputs + microphones).
 * - **Manual detection** (`handleDetectDevices`) after driver install.
 * - **Driver install** (`handleInstallDriver`) with a 3 s re-check.
 * - **Microphone test** (`testMicrophone`) using `testMicrophoneOnce`,
 *   auto-stopping the test stream after 3 s or on cleanup.
 *
 * The hook writes `virtualDriverInstalled` back to the store whenever the
 * presence of a virtual device (CABLE / VoiceMeeter / Scream / VB-Audio)
 * changes.
 *
 * @see @core/services/AudioMixerService.js (`testMicrophoneOnce`)
 * @see @shared/hooks/useConfirm
 */

import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { testMicrophoneOnce } from '@core/services/AudioMixerService'
import { logWarn } from '@shared/utils/logger'

/**
 * Matches the labels that identify a virtual audio device.
 * @type {string[]}
 */
const VIRTUAL_DEVICE_KEYWORDS = [
  'cable',
  'virtual',
  'scream',
  'voicemeeter',
  'vb-audio',
]

/**
 * Returns `true` if the device label looks like a virtual device.
 * @param {string} label
 * @returns {boolean}
 */
function isVirtualDeviceLabel(label) {
  const lower = (label || '').toLowerCase()
  return VIRTUAL_DEVICE_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Audio device management hook.
 *
 * @param {Object} options
 * @param {Object} options.store - App store (needs `updateVirtualDriverInstalled`).
 * @param {(msg: string, type?: string) => void} options.addToast
 * @returns {{
 *   audioDevices: MediaDeviceInfo[],
 *   microphones: MediaDeviceInfo[],
 *   isDetecting: boolean,
 *   isInstallingDriver: boolean,
 *   isMicrophoneTesting: boolean,
 *   handleInstallDriver: () => Promise<void>,
 *   handleDetectDevices: () => Promise<void>,
 *   testMicrophone: () => Promise<void>,
 * }}
 */
export function useAudioDevices({ store, addToast }) {
  const { t } = useLanguage()
  const [audioDevices, setAudioDevices] = useState([])
  const [microphones, setMicrophones] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [isInstallingDriver, setIsInstallingDriver] = useState(false)
  const [isMicrophoneTesting, setIsMicrophoneTesting] = useState(false)
  const micTestRef = useRef(null)

  // ─── INITIAL DETECTION ─────────────────────────────────────────────
  useEffect(() => {
    const detectDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const outputs = devices.filter((d) => d.kind === 'audiooutput')
        const inputs = devices.filter((d) => d.kind === 'audioinput')
        setAudioDevices(outputs)
        setMicrophones(inputs)

        const hasVirtualDevice = outputs.some((d) =>
          isVirtualDeviceLabel(d.label)
        )

        if (hasVirtualDevice && !store.virtualDriverInstalled) {
          store.updateVirtualDriverInstalled?.(true)
          addToast(t('virtualDriverDetected'), 'success')
        } else if (!hasVirtualDevice && store.virtualDriverInstalled) {
          store.updateVirtualDriverInstalled?.(false)
        }
      } catch (e) {
        logWarn('Options', 'Device detection error', e)
      }
    }

    detectDevices()
    // The effect intentionally runs once on mount — subsequent updates are
    // handled by `handleDetectDevices` and `handleInstallDriver`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── CLEANUP MIC TEST ON UNMOUNT ───────────────────────────────────
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

  /**
   * Installs the VB-Cable driver (via the main process), then re-checks the
   * device list after 3 s to detect the newly-installed virtual device.
   * @returns {Promise<void>}
   */
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
          const hasVirtualDevice = outputs.some((d) =>
            isVirtualDeviceLabel(d.label)
          )
          if (hasVirtualDevice) {
            store.updateVirtualDriverInstalled?.(true)
          }
        }, 3000)
      } else {
        addToast(
          `${t('installError')}: ${result.error || t('unknown')}`,
          'error'
        )
      }
    } catch (e) {
      addToast(`${t('error')}: ${e.message}`, 'error')
    }
    setIsInstallingDriver(false)
  }

  /**
   * Re-enumerates devices (user asked to "Detect" manually).
   * @returns {Promise<void>}
   */
  const handleDetectDevices = async () => {
    setIsDetecting(true)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const outputs = devices.filter((d) => d.kind === 'audiooutput')
      setAudioDevices(outputs)

      const hasVirtualDevice = outputs.some((d) =>
        isVirtualDeviceLabel(d.label)
      )

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

  /**
   * Starts/stops a 3-second microphone test.
   *
   * - If already testing → stops the stream.
   * - Else → opens the mic, plays it briefly in the user's headphones, and
   *   auto-stops after 3 s.
   *
   * @returns {Promise<void>}
   */
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