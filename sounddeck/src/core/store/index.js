// src/core/store/index.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSounds } from './hooks/useSounds'
import { useProfiles } from './hooks/useProfiles'
import { useShortcuts } from './hooks/useShortcuts'
import { useSettings } from './hooks/useSettings'
import { useEditor } from './hooks/useEditor'
import { useMixer } from './hooks/useMixer'
import { DEFAULT_SIDEBAR_CONFIG } from './utils/constants'
import { normalizePath } from './utils/normalizePath'

const save = async (key, value) => {
  await window.electronAPI.storeSet(key, value)
}

export function useStore() {
  const [loading, setLoading] = useState(true)
  const [sidebarConfig, setSidebarConfig] = useState(null)
  const [sidebarEditMode, setSidebarEditMode] = useState(false)
  const [sidebarVersion, setSidebarVersion] = useState(0)
  const [loopEnabled, setLoopEnabled] = useState(false)

  const soundsHook = useSounds([], {}, {}, save)
  const profilesHook = useProfiles([], 'all', save)
  const shortcutsHook = useShortcuts({}, 'CommandOrControl+Tab', save)
  const settingsHook = useSettings({}, save)

  const storeValuesRef = useRef({})

  const mixerHook = useMixer(save, storeValuesRef)
  const editorHook = useEditor(save)

  storeValuesRef.current = {
    playLocally: settingsHook.playLocally,
    audioDevice: settingsHook.audioDevice,
    localAudioDevice: settingsHook.localAudioDevice,
    mixerSoundVolume: mixerHook.mixerSoundVolume,
    monitoringEnabled: mixerHook.monitoringEnabled,
    mixerEnabled: mixerHook.mixerEnabled,
  }

  // ─── CHARGEMENT INITIAL ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const savedProfiles = (await window.electronAPI.storeGet('profiles')) || []
        const savedSounds = (
          (await window.electronAPI.storeGet('sounds')) || []
        ).map((s) => {
          if (s.volumeDb !== undefined) return s
          const oldVolume = s.volume ?? 100
          const newDb = Math.round(((oldVolume - 50) / 50) * 24 * 10) / 10
          return { ...s, volume: newDb, volumeDb: newDb }
        })
        const savedShortcuts =
          (await window.electronAPI.storeGet('shortcuts')) || {}
        const savedProfileShortcut =
          (await window.electronAPI.storeGet('profileShortcut')) ||
          'CommandOrControl+Tab'
        const savedCurrentProfileId =
          (await window.electronAPI.storeGet('currentProfileId')) || 'all'
        const savedSoundOrder =
          (await window.electronAPI.storeGet('soundOrder')) || {}
        const savedTags = (await window.electronAPI.storeGet('tags')) || {}
        const savedSidebarConfig = await window.electronAPI.storeGet(
          'sidebarConfig'
        )

        const savedTheme = (await window.electronAPI.storeGet('theme')) || 'dark'
        const savedCustomTheme =
          (await window.electronAPI.storeGet('customTheme')) || null
        const savedLang = (await window.electronAPI.storeGet('lang')) || 'fr'
        const savedAudioDevice =
          (await window.electronAPI.storeGet('audioDevice')) || 'default'
        const savedLocalAudioDevice =
          (await window.electronAPI.storeGet('localAudioDevice')) || 'default'
        const savedVolume = (await window.electronAPI.storeGet('volume')) ?? 80
        const savedPlayLocally =
          (await window.electronAPI.storeGet('playLocally')) ?? true
        const savedPreviewVolume =
          (await window.electronAPI.storeGet('previewVolume')) ?? 70
        const savedKeyboardLayout =
          (await window.electronAPI.storeGet('keyboardLayout')) || 'qwerty'
        const savedCardSize =
          (await window.electronAPI.storeGet('cardSize')) || 'medium'
        const savedNormalizationEnabled =
          (await window.electronAPI.storeGet('normalizationEnabled')) ?? true
        const savedNormalizationTarget =
          (await window.electronAPI.storeGet('normalizationTarget')) ?? 0.2
        const savedStartMinimized =
          (await window.electronAPI.getStartMinimized?.()) ?? false
        const savedLaunchAtStartup =
          (await window.electronAPI.getLaunchAtStartup?.()) ?? false
        const savedVirtualDriverInstalled =
          (await window.electronAPI.storeGet('virtualDriverInstalled')) || false
        const savedVirtualDeviceActive =
          (await window.electronAPI.storeGet('virtualDeviceActive')) ?? false
        const savedAutoBackup =
          (await window.electronAPI.storeGet('autoBackupEnabled')) ?? true
        const savedBackupInterval =
          (await window.electronAPI.storeGet('backupInterval')) ?? 5
        const savedLazyLoading =
          (await window.electronAPI.storeGet('lazyLoadingEnabled')) ?? true
        const savedCompressOnImport =
          (await window.electronAPI.storeGet('compressOnImport')) ?? false
        const savedCompressionBitrate =
          (await window.electronAPI.storeGet('compressionBitrate')) ?? 128
        const savedShortcutsEnabled =
          (await window.electronAPI.storeGet('shortcutsEnabled')) ?? true
        const savedToggleShortcutsAccelerator =
          (await window.electronAPI.storeGet('toggleShortcutsAccelerator')) ||
          'CommandOrControl+Shift+K'
        const savedToggleWindowShortcut =
          (await window.electronAPI.storeGet('toggleWindowShortcut')) ||
          'CommandOrControl+Shift+S'
        const savedLoopShortcut =
          (await window.electronAPI.storeGet('loopShortcut')) || ''
        const savedStopAllShortcut =
          (await window.electronAPI.storeGet('stopAllShortcut')) || ''
        const savedPresentationShortcut =
          (await window.electronAPI.storeGet('presentationShortcut')) || ''

        const savedMixerEnabled =
          (await window.electronAPI.storeGet('mixerEnabled')) ?? false
        const savedMicrophoneDevice =
          (await window.electronAPI.storeGet('microphoneDevice')) || 'default'
        const savedMicrophoneVolume =
          (await window.electronAPI.storeGet('microphoneVolume')) ?? 80
        const savedMixerSoundVolume =
          (await window.electronAPI.storeGet('mixerSoundVolume')) ?? 100
        const savedNoiseSuppression =
          (await window.electronAPI.storeGet('noiseSuppression')) ?? false
        const savedNoiseSuppressionMode =
          (await window.electronAPI.storeGet('noiseSuppressionMode')) || 'auto'
        const savedLowLatencyMode =
          (await window.electronAPI.storeGet('lowLatencyMode')) ?? false
        const savedMonitoringEnabled =
          (await window.electronAPI.storeGet('monitoringEnabled')) ?? false

        const allProfile = { id: 'all', name: 'Tous les sons', isDefault: true }
        const userProfiles = savedProfiles.filter((p) => p.id !== 'all')
        const allProfiles = [allProfile, ...userProfiles]

        soundsHook.setSounds(savedSounds)
        soundsHook.setSoundOrder(savedSoundOrder)
        soundsHook.setTags(savedTags)

        profilesHook.setProfiles(allProfiles)
        profilesHook.setCurrentProfileId(savedCurrentProfileId)

        shortcutsHook.setShortcuts(savedShortcuts)
        shortcutsHook.setProfileShortcut(savedProfileShortcut)

        settingsHook.updateTheme(savedTheme)
        settingsHook.updateCustomTheme(savedCustomTheme)
        settingsHook.updateLang(savedLang)
        settingsHook.updateAudioDevice(savedAudioDevice)
        settingsHook.updateLocalAudioDevice(savedLocalAudioDevice)
        settingsHook.updateVolume(savedVolume)
        settingsHook.updatePlayLocally(savedPlayLocally)
        settingsHook.updatePreviewVolume(savedPreviewVolume)
        settingsHook.updateKeyboardLayout(savedKeyboardLayout)
        settingsHook.updateCardSize(savedCardSize)
        settingsHook.updateNormalizationEnabled(savedNormalizationEnabled)
        settingsHook.updateNormalizationTarget(savedNormalizationTarget)
        settingsHook.setStartMinimized(savedStartMinimized)
        settingsHook.setLaunchAtStartup(savedLaunchAtStartup)
        settingsHook.updateVirtualDriverInstalled(savedVirtualDriverInstalled)
        settingsHook.updateVirtualDeviceActive(savedVirtualDeviceActive)
        settingsHook.updateAutoBackupEnabled(savedAutoBackup)
        settingsHook.updateBackupInterval(savedBackupInterval)
        settingsHook.updateLazyLoadingEnabled(savedLazyLoading)
        settingsHook.updateCompressOnImport(savedCompressOnImport)
        settingsHook.updateCompressionBitrate(savedCompressionBitrate)
        settingsHook.updateShortcutsEnabled(savedShortcutsEnabled)
        settingsHook.updateToggleShortcutsAccelerator(
          savedToggleShortcutsAccelerator
        )
        settingsHook.updateToggleWindowShortcut(savedToggleWindowShortcut)
        settingsHook.updateLoopShortcut(savedLoopShortcut)
        settingsHook.updateStopAllShortcut(savedStopAllShortcut)
        settingsHook.updatePresentationShortcut(savedPresentationShortcut)

        mixerHook.setMixerEnabled(savedMixerEnabled)
        mixerHook.setMicrophoneDevice(savedMicrophoneDevice)
        mixerHook.setMicrophoneVolume(savedMicrophoneVolume)
        mixerHook.setMixerSoundVolume(savedMixerSoundVolume)
        mixerHook.setNoiseSuppression(savedNoiseSuppression)
        mixerHook.setNoiseSuppressionMode(savedNoiseSuppressionMode)
        mixerHook.setLowLatencyMode(savedLowLatencyMode)
        mixerHook.setMonitoringEnabled(savedMonitoringEnabled)

        // ✅ S3c : charger la liste des projets + récents
        await editorHook.loadRecentEditorProjects?.()
        await editorHook.loadAllEditorProjects?.()

        if (savedSidebarConfig) {
          let items = [...(savedSidebarConfig.items || [])]

          allProfiles.forEach((profile) => {
            const profileId = `profile-${profile.id}`
            const existingIndex = items.findIndex(
              (item) => item.id === profileId
            )

            if (existingIndex === -1) {
              items.push({
                id: profileId,
                group: 'profiles',
                label: profile.name,
                icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
                visible: true,
                pinned: false,
                order: items.length,
                canHide: profile.id !== 'all',
                isProfile: true,
                isDefaultProfile: profile.id === 'all',
              })
            } else {
              items[existingIndex].label = profile.name
            }
          })

          const currentProfileIds = new Set(
            allProfiles.map((p) => `profile-${p.id}`)
          )
          items = items.filter((item) => {
            if (item.id.startsWith('profile-')) {
              return currentProfileIds.has(item.id)
            }
            return true
          })

          setSidebarConfig({ ...savedSidebarConfig, items })
        } else {
          const defaultItems = [...DEFAULT_SIDEBAR_CONFIG.items]
          allProfiles.forEach((profile) => {
            defaultItems.push({
              id: `profile-${profile.id}`,
              group: 'profiles',
              label: profile.name,
              icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
              visible: true,
              pinned: false,
              order: defaultItems.length,
              canHide: profile.id !== 'all',
              isProfile: true,
              isDefaultProfile: profile.id === 'all',
            })
          })
          const defaultConfig = {
            mode: 'default',
            items: defaultItems,
            sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer'],
          }
          setSidebarConfig(defaultConfig)
          await save('sidebarConfig', defaultConfig)
        }
        setSidebarVersion((prev) => prev + 1)
      } catch (e) {
        console.error('Erreur chargement store:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const syncProfilesToSidebar = useCallback(
    async (profileList) => {
      const currentConfig = sidebarConfig || DEFAULT_SIDEBAR_CONFIG
      const allProfiles = [
        { id: 'all', name: 'Tous les sons', isDefault: true },
        ...(profileList || []),
      ]

      let newItems = [...(currentConfig.items || [])]

      allProfiles.forEach((profile) => {
        const profileId = `profile-${profile.id}`
        const existingIndex = newItems.findIndex((item) => item.id === profileId)

        if (existingIndex === -1) {
          newItems.push({
            id: profileId,
            group: 'profiles',
            label: profile.name,
            icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
            visible: true,
            pinned: false,
            order: newItems.length,
            canHide: profile.id !== 'all',
            isProfile: true,
            isDefaultProfile: profile.id === 'all',
          })
        } else {
          newItems[existingIndex].label = profile.name
        }
      })

      const currentProfileIds = new Set(
        allProfiles.map((p) => `profile-${p.id}`)
      )
      newItems = newItems.filter((item) => {
        if (item.id.startsWith('profile-')) {
          return currentProfileIds.has(item.id)
        }
        return true
      })

      const updatedConfig = { ...currentConfig, items: newItems }
      setSidebarConfig(updatedConfig)
      setSidebarVersion((prev) => prev + 1)
      await save('sidebarConfig', updatedConfig)
      return updatedConfig
    },
    [sidebarConfig]
  )

  const resetSidebarConfig = useCallback(async () => {
    const allProfiles = profilesHook.getAllProfiles()
    const defaultItems = [...DEFAULT_SIDEBAR_CONFIG.items]

    allProfiles.forEach((profile) => {
      defaultItems.push({
        id: `profile-${profile.id}`,
        group: 'profiles',
        label: profile.name,
        icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
        visible: true,
        pinned: false,
        order: defaultItems.length,
        canHide: profile.id !== 'all',
        isProfile: true,
        isDefaultProfile: profile.id === 'all',
      })
    })

    const defaultConfig = {
      mode: 'default',
      items: defaultItems,
      sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer'],
    }

    setSidebarConfig(defaultConfig)
    setSidebarVersion((prev) => prev + 1)
    await save('sidebarConfig', defaultConfig)
  }, [profilesHook])

  const updateSidebarConfig = useCallback(async (newConfig) => {
    setSidebarConfig(newConfig)
    setSidebarVersion((prev) => prev + 1)
    await save('sidebarConfig', newConfig)
  }, [])

  const toggleSidebarEditMode = useCallback(() => {
    setSidebarEditMode((prev) => !prev)
  }, [])

  const toggleLoop = useCallback(() => {
    setLoopEnabled((prev) => !prev)
  }, [])

  const currentSounds = useMemo(() => {
    return soundsHook.getOrderedSounds(profilesHook.currentProfileId)
  }, [soundsHook.sounds, soundsHook.soundOrder, profilesHook.currentProfileId])

  const favoriteSounds = useMemo(() => {
    return soundsHook.getFavoriteSounds(profilesHook.currentProfileId)
  }, [
    soundsHook.sounds,
    soundsHook.soundOrder,
    profilesHook.currentProfileId,
  ])

  return {
    loading,

    sounds: soundsHook.sounds,
    setSounds: soundsHook.setSounds,
    soundOrder: soundsHook.soundOrder,
    setSoundOrder: soundsHook.setSoundOrder,
    tags: soundsHook.tags,
    setTags: soundsHook.setTags,
    currentSounds,
    favoriteSounds,
    addSound: soundsHook.addSound,
    deleteSound: soundsHook.deleteSound,
    updateSound: soundsHook.updateSound,
    updateSoundVolume: soundsHook.updateSoundVolume,
    incrementPlayCount: soundsHook.incrementPlayCount,
    toggleFavorite: (soundId) =>
      soundsHook.toggleFavorite(soundId, profilesHook.currentProfileId),
    addSoundToProfile: soundsHook.addSoundToProfile,
    removeSoundFromProfile: soundsHook.removeSoundFromProfile,
    reorderSounds: (start, end) =>
      soundsHook.reorderSounds(start, end, profilesHook.currentProfileId),
    updateSoundImage: soundsHook.updateSoundImage,
    updateSoundEmoji: soundsHook.updateSoundEmoji,
    addTagToSound: soundsHook.addTagToSound,
    removeTagFromSound: soundsHook.removeTagFromSound,
    getSoundTags: soundsHook.getSoundTags,

    profiles: profilesHook.profiles,
    setProfiles: profilesHook.setProfiles,
    currentProfileId: profilesHook.currentProfileId,
    setCurrentProfileId: profilesHook.setCurrentProfileId,
    createProfile: profilesHook.createProfile,
    deleteProfile: profilesHook.deleteProfile,
    renameProfile: profilesHook.renameProfile,
    switchProfile: profilesHook.switchProfile,
    switchToNextProfile: profilesHook.switchToNextProfile,
    reorderProfiles: profilesHook.reorderProfiles,

    shortcuts: shortcutsHook.shortcuts,
    setShortcuts: shortcutsHook.setShortcuts,
    profileShortcut: shortcutsHook.profileShortcut,
    setProfileShortcut: shortcutsHook.setProfileShortcut,
    setShortcut: shortcutsHook.setShortcut,
    clearShortcut: shortcutsHook.clearShortcut,
    updateProfileShortcut: shortcutsHook.updateProfileShortcut,
    cleanupOrphanShortcuts: () => {
      const soundIds = new Set(soundsHook.sounds.map((s) => s.id))
      return shortcutsHook.cleanupOrphanShortcuts(soundIds)
    },

    theme: settingsHook.theme,
    customTheme: settingsHook.customTheme,
    lang: settingsHook.lang,
    audioDevice: settingsHook.audioDevice,
    localAudioDevice: settingsHook.localAudioDevice,
    volume: settingsHook.volume,
    playLocally: settingsHook.playLocally,
    previewVolume: settingsHook.previewVolume,
    keyboardLayout: settingsHook.keyboardLayout,
    cardSize: settingsHook.cardSize,
    normalizationEnabled: settingsHook.normalizationEnabled,
    normalizationTarget: settingsHook.normalizationTarget,
    startMinimized: settingsHook.startMinimized,
    launchAtStartup: settingsHook.launchAtStartup,
    virtualDriverInstalled: settingsHook.virtualDriverInstalled,
    virtualDeviceActive: settingsHook.virtualDeviceActive,
    autoBackupEnabled: settingsHook.autoBackupEnabled,
    backupInterval: settingsHook.backupInterval,
    lazyLoadingEnabled: settingsHook.lazyLoadingEnabled,
    compressOnImport: settingsHook.compressOnImport,
    compressionBitrate: settingsHook.compressionBitrate,
    shortcutsEnabled: settingsHook.shortcutsEnabled,
    toggleShortcutsAccelerator: settingsHook.toggleShortcutsAccelerator,
    toggleWindowShortcut: settingsHook.toggleWindowShortcut,
    loopShortcut: settingsHook.loopShortcut,
    stopAllShortcut: settingsHook.stopAllShortcut,
    presentationShortcut: settingsHook.presentationShortcut,
    setStartMinimized: settingsHook.setStartMinimized,
    setLaunchAtStartup: settingsHook.setLaunchAtStartup,
    updateTheme: settingsHook.updateTheme,
    updateCustomTheme: settingsHook.updateCustomTheme,
    updateLang: settingsHook.updateLang,
    updateAudioDevice: settingsHook.updateAudioDevice,
    updateLocalAudioDevice: settingsHook.updateLocalAudioDevice,
    updateVolume: settingsHook.updateVolume,
    updatePlayLocally: settingsHook.updatePlayLocally,
    updatePreviewVolume: settingsHook.updatePreviewVolume,
    updateKeyboardLayout: settingsHook.updateKeyboardLayout,
    updateCardSize: settingsHook.updateCardSize,
    updateNormalizationEnabled: settingsHook.updateNormalizationEnabled,
    updateNormalizationTarget: settingsHook.updateNormalizationTarget,
    updateVirtualDriverInstalled: settingsHook.updateVirtualDriverInstalled,
    updateVirtualDeviceActive: settingsHook.updateVirtualDeviceActive,
    updateAutoBackupEnabled: settingsHook.updateAutoBackupEnabled,
    updateBackupInterval: settingsHook.updateBackupInterval,
    updateLazyLoadingEnabled: settingsHook.updateLazyLoadingEnabled,
    updateCompressOnImport: settingsHook.updateCompressOnImport,
    updateCompressionBitrate: settingsHook.updateCompressionBitrate,
    updateShortcutsEnabled: settingsHook.updateShortcutsEnabled,
    updateToggleShortcutsAccelerator:
      settingsHook.updateToggleShortcutsAccelerator,
    updateToggleWindowShortcut: settingsHook.updateToggleWindowShortcut,
    updateLoopShortcut: settingsHook.updateLoopShortcut,
    updateStopAllShortcut: settingsHook.updateStopAllShortcut,
    updatePresentationShortcut: settingsHook.updatePresentationShortcut,

    mixerEnabled: mixerHook.mixerEnabled,
    microphoneDevice: mixerHook.microphoneDevice,
    microphoneVolume: mixerHook.microphoneVolume,
    mixerSoundVolume: mixerHook.mixerSoundVolume,
    noiseSuppression: mixerHook.noiseSuppression,
    noiseSuppressionMode: mixerHook.noiseSuppressionMode,
    lowLatencyMode: mixerHook.lowLatencyMode,
    monitoringEnabled: mixerHook.monitoringEnabled,
    updateMixerEnabled: mixerHook.updateMixerEnabled,
    updateMicrophoneDeviceId: mixerHook.updateMicrophoneDeviceId,
    updateMicrophoneVolume: mixerHook.updateMicrophoneVolume,
    updateMixerSoundVolume: mixerHook.updateMixerSoundVolume,
    updateNoiseSuppression: mixerHook.updateNoiseSuppression,
    updateNoiseSuppressionMode: mixerHook.updateNoiseSuppressionMode,
    updateLowLatencyMode: mixerHook.updateLowLatencyMode,
    initMixerOnStartup: mixerHook.initMixerOnStartup,
    toggleMonitoring: mixerHook.toggleMonitoring,

    // ✅ S3c : uniquement la gestion multi-projets de l'éditeur
    editorProjects: editorHook.editorProjects,
    recentEditorProjects: editorHook.recentEditorProjects,
    loadAllEditorProjects: editorHook.loadAllEditorProjects,
    loadRecentEditorProjects: editorHook.loadRecentEditorProjects,
    saveEditorProject: editorHook.saveEditorProject,
    loadEditorProject: editorHook.loadEditorProject,
    deleteEditorProject: editorHook.deleteEditorProject,
    exportEditorProject: editorHook.exportEditorProject,
    importEditorProject: editorHook.importEditorProject,
    renameEditorProject: editorHook.renameEditorProject,
    duplicateEditorProject: editorHook.duplicateEditorProject,

    sidebarConfig,
    sidebarEditMode,
    sidebarVersion,
    DEFAULT_SIDEBAR_CONFIG,
    resetSidebarConfig,
    updateSidebarConfig,
    toggleSidebarEditMode,
    syncProfilesToSidebar,

    loopEnabled,
    toggleLoop,

    resetGainCache: async () => {
      const { gainCache } = await import('@core/services/AudioService')
      Object.keys(gainCache).forEach((key) => delete gainCache[key])
    },
    toggleGlobalShortcuts: async () => {
      const newState = await window.electronAPI.toggleGlobalShortcuts()
      settingsHook.updateShortcutsEnabled(newState)
      return newState
    },
  }
}

export default useStore