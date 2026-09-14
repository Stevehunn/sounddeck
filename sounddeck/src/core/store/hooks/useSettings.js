// src/core/store/hooks/useSettings.js
import { useState, useCallback } from 'react'

export function useSettings(initialState = {}, save) {
  const [theme, setTheme] = useState(initialState.theme || 'dark')
  const [customTheme, setCustomTheme] = useState(initialState.customTheme || null)
  const [lang, setLang] = useState(initialState.lang || 'fr')
  const [audioDevice, setAudioDevice] = useState(initialState.audioDevice || 'default')
  const [localAudioDevice, setLocalAudioDevice] = useState(initialState.localAudioDevice || 'default')
  const [volume, setVolume] = useState(initialState.volume ?? 80)
  const [playLocally, setPlayLocally] = useState(initialState.playLocally ?? true)
  const [previewVolume, setPreviewVolume] = useState(initialState.previewVolume ?? 70)
  const [keyboardLayout, setKeyboardLayout] = useState(initialState.keyboardLayout || 'qwerty')
  const [cardSize, setCardSize] = useState(initialState.cardSize || 'medium')
  const [normalizationEnabled, setNormalizationEnabled] = useState(initialState.normalizationEnabled ?? true)
  const [normalizationTarget, setNormalizationTarget] = useState(initialState.normalizationTarget ?? 0.2)
  const [startMinimized, setStartMinimized] = useState(initialState.startMinimized ?? false)
  const [launchAtStartup, setLaunchAtStartup] = useState(initialState.launchAtStartup ?? false)
  const [virtualDriverInstalled, setVirtualDriverInstalled] = useState(initialState.virtualDriverInstalled ?? false)
  const [virtualDeviceActive, setVirtualDeviceActive] = useState(initialState.virtualDeviceActive ?? false)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(initialState.autoBackupEnabled ?? true)
  const [backupInterval, setBackupInterval] = useState(initialState.backupInterval ?? 5)
  const [lazyLoadingEnabled, setLazyLoadingEnabled] = useState(initialState.lazyLoadingEnabled ?? true)
  const [compressOnImport, setCompressOnImport] = useState(initialState.compressOnImport ?? false)
  const [compressionBitrate, setCompressionBitrate] = useState(initialState.compressionBitrate ?? 128)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(initialState.shortcutsEnabled ?? true)
  const [toggleShortcutsAccelerator, setToggleShortcutsAccelerator] = useState(
    initialState.toggleShortcutsAccelerator || 'CommandOrControl+Shift+K'
  )
  const [toggleWindowShortcut, setToggleWindowShortcut] = useState(
    initialState.toggleWindowShortcut || 'CommandOrControl+Shift+S'
  )
  const [loopShortcut, setLoopShortcut] = useState(initialState.loopShortcut || '')
  const [stopAllShortcut, setStopAllShortcut] = useState(initialState.stopAllShortcut || '')
  const [presentationShortcut, setPresentationShortcut] = useState(initialState.presentationShortcut || '')

  const updateTheme = useCallback(async (newTheme) => {
    setTheme(newTheme)
    try {
      await save('theme', newTheme)
    } catch (e) {
      console.error('Erreur sauvegarde thème:', e)
    }
  }, [save])

  const updateCustomTheme = useCallback(async (colors) => {
    setCustomTheme(colors)
    if (colors) {
      setTheme('custom')
      await save('theme', 'custom')
    }
    await save('customTheme', colors)
  }, [save])

  const updateLang = useCallback(
    async (newLang) => {
      setLang(newLang)
      await save('lang', newLang)
    },
    [save]
  )

  const updateAudioDevice = useCallback(async (deviceId) => {
    setAudioDevice(deviceId)
    await save('audioDevice', deviceId)
  }, [save])

  const updateLocalAudioDevice = useCallback(async (deviceId) => {
    setLocalAudioDevice(deviceId)
    await save('localAudioDevice', deviceId)
  }, [save])

  const updateVolume = useCallback(async (val) => {
    setVolume(val)
    await save('volume', val)
  }, [save])

  const updatePlayLocally = useCallback(async (val) => {
    setPlayLocally(val)
    await save('playLocally', val)
  }, [save])

  const updatePreviewVolume = useCallback(async (val) => {
    setPreviewVolume(val)
    await save('previewVolume', val)
  }, [save])

  const updateKeyboardLayout = useCallback(async (layout) => {
    setKeyboardLayout(layout)
    await save('keyboardLayout', layout)
  }, [save])

  const updateCardSize = useCallback(async (size) => {
    setCardSize(size)
    await save('cardSize', size)
  }, [save])

  const updateNormalizationEnabled = useCallback(async (enabled) => {
    setNormalizationEnabled(enabled)
    await save('normalizationEnabled', enabled)
  }, [save])

  const updateNormalizationTarget = useCallback(async (target) => {
    setNormalizationTarget(target)
    await save('normalizationTarget', target)
  }, [save])

  const updateVirtualDriverInstalled = useCallback(async (installed) => {
    setVirtualDriverInstalled(installed)
    await save('virtualDriverInstalled', installed)
  }, [save])

  const updateVirtualDeviceActive = useCallback(async (active) => {
    setVirtualDeviceActive(active)
    await save('virtualDeviceActive', active)
  }, [save])

  const updateAutoBackupEnabled = useCallback(async (enabled) => {
    setAutoBackupEnabled(enabled)
    await save('autoBackupEnabled', enabled)
  }, [save])

  const updateBackupInterval = useCallback(async (interval) => {
    setBackupInterval(interval)
    await save('backupInterval', interval)
  }, [save])

  const updateLazyLoadingEnabled = useCallback(async (enabled) => {
    setLazyLoadingEnabled(enabled)
    await save('lazyLoadingEnabled', enabled)
  }, [save])

  const updateCompressOnImport = useCallback(async (enabled) => {
    setCompressOnImport(enabled)
    await save('compressOnImport', enabled)
  }, [save])

  const updateCompressionBitrate = useCallback(async (bitrate) => {
    setCompressionBitrate(bitrate)
    await save('compressionBitrate', bitrate)
  }, [save])

  const updateShortcutsEnabled = useCallback(async (enabled) => {
    setShortcutsEnabled(enabled)
    await save('shortcutsEnabled', enabled)
  }, [save])

  const updateToggleShortcutsAccelerator = useCallback(async (accelerator) => {
    setToggleShortcutsAccelerator(accelerator)
    await save('toggleShortcutsAccelerator', accelerator)
    await window.electronAPI.updateToggleShortcutsAccelerator(accelerator)
  }, [save])

  const updateToggleWindowShortcut = useCallback(async (accelerator) => {
    setToggleWindowShortcut(accelerator)
    await save('toggleWindowShortcut', accelerator)
    await window.electronAPI.updateToggleWindowShortcut?.(accelerator)
  }, [save])

  const updateLoopShortcut = useCallback(async (accelerator) => {
    setLoopShortcut(accelerator)
    await save('loopShortcut', accelerator)
    await window.electronAPI.updateLoopShortcut(accelerator)
  }, [save])

  const updateStopAllShortcut = useCallback(async (accelerator) => {
    setStopAllShortcut(accelerator)
    await save('stopAllShortcut', accelerator)
    await window.electronAPI.updateStopAllShortcut(accelerator)
  }, [save])

  const updatePresentationShortcut = useCallback(async (accelerator) => {
    setPresentationShortcut(accelerator)
    await save('presentationShortcut', accelerator)
    await window.electronAPI.updatePresentationShortcut(accelerator)
  }, [save])

  return {
    // États
    theme,
    customTheme,
    lang,
    audioDevice,
    localAudioDevice,
    volume,
    playLocally,
    previewVolume,
    keyboardLayout,
    cardSize,
    normalizationEnabled,
    normalizationTarget,
    startMinimized,
    launchAtStartup,
    virtualDriverInstalled,
    virtualDeviceActive,
    autoBackupEnabled,
    backupInterval,
    lazyLoadingEnabled,
    compressOnImport,
    compressionBitrate,
    shortcutsEnabled,
    toggleShortcutsAccelerator,
    toggleWindowShortcut,
    loopShortcut,
    stopAllShortcut,
    presentationShortcut,

    // Setters
    setStartMinimized: (val) => { setStartMinimized(val); save('startMinimized', val) },
    setLaunchAtStartup: (val) => { setLaunchAtStartup(val); save('launchAtStartup', val) },
    updateTheme,
    updateCustomTheme,
    updateLang,
    updateAudioDevice,
    updateLocalAudioDevice,
    updateVolume,
    updatePlayLocally,
    updatePreviewVolume,
    updateKeyboardLayout,
    updateCardSize,
    updateNormalizationEnabled,
    updateNormalizationTarget,
    updateVirtualDriverInstalled,
    updateVirtualDeviceActive,
    updateAutoBackupEnabled,
    updateBackupInterval,
    updateLazyLoadingEnabled,
    updateCompressOnImport,
    updateCompressionBitrate,
    updateShortcutsEnabled,
    updateToggleShortcutsAccelerator,
    updateToggleWindowShortcut,
    updateLoopShortcut,
    updateStopAllShortcut,
    updatePresentationShortcut,
  }
}