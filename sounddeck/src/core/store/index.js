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
// ✅ NOUVEAU : imports pour la migration des items core (emoji, etc.)
import {
  DEFAULT_GROUPS,
  DEFAULT_ICONS,
  ACTION_IDS,
} from '@shared/constants/navigation'

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
    // ─── CHARGEMENT INITIAL ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedProfiles,
          rawSounds,
          savedShortcuts,
          savedProfileShortcut,
          savedCurrentProfileId,
          savedSoundOrder,
          savedTags,
          savedSidebarConfig,
          savedTheme,
          savedCustomTheme,
          savedLang,
          savedAudioDevice,
          savedLocalAudioDevice,
          savedVolume,
          savedPlayLocally,
          savedPreviewVolume,
          savedKeyboardLayout,
          savedCardSize,
          savedNormalizationEnabled,
          savedNormalizationTarget,
          savedStartMinimized,
          savedLaunchAtStartup,
          savedVirtualDriverInstalled,
          savedVirtualDeviceActive,
          savedAutoBackup,
          savedBackupInterval,
          savedLazyLoading,
          savedCompressOnImport,
          savedCompressionBitrate,
          savedShortcutsEnabled,
          savedToggleShortcutsAccelerator,
          savedToggleWindowShortcut,
          savedLoopShortcut,
          savedStopAllShortcut,
          savedPresentationShortcut,
          savedMixerEnabled,
          savedMicrophoneDevice,
          savedMicrophoneVolume,
          savedMixerSoundVolume,
          savedNoiseSuppression,
          savedNoiseSuppressionMode,
          savedLowLatencyMode,
          savedMonitoringEnabled,
        ] = await Promise.all([
          window.electronAPI.storeGet('profiles'),
          window.electronAPI.storeGet('sounds'),
          window.electronAPI.storeGet('shortcuts'),
          window.electronAPI.storeGet('profileShortcut'),
          window.electronAPI.storeGet('currentProfileId'),
          window.electronAPI.storeGet('soundOrder'),
          window.electronAPI.storeGet('tags'),
          window.electronAPI.storeGet('sidebarConfig'),
          window.electronAPI.storeGet('theme'),
          window.electronAPI.storeGet('customTheme'),
          window.electronAPI.storeGet('lang'),
          window.electronAPI.storeGet('audioDevice'),
          window.electronAPI.storeGet('localAudioDevice'),
          window.electronAPI.storeGet('volume'),
          window.electronAPI.storeGet('playLocally'),
          window.electronAPI.storeGet('previewVolume'),
          window.electronAPI.storeGet('keyboardLayout'),
          window.electronAPI.storeGet('cardSize'),
          window.electronAPI.storeGet('normalizationEnabled'),
          window.electronAPI.storeGet('normalizationTarget'),
          window.electronAPI.getStartMinimized?.() ?? Promise.resolve(null),
          window.electronAPI.getLaunchAtStartup?.() ?? Promise.resolve(null),
          window.electronAPI.storeGet('virtualDriverInstalled'),
          window.electronAPI.storeGet('virtualDeviceActive'),
          window.electronAPI.storeGet('autoBackupEnabled'),
          window.electronAPI.storeGet('backupInterval'),
          window.electronAPI.storeGet('lazyLoadingEnabled'),
          window.electronAPI.storeGet('compressOnImport'),
          window.electronAPI.storeGet('compressionBitrate'),
          window.electronAPI.storeGet('shortcutsEnabled'),
          window.electronAPI.storeGet('toggleShortcutsAccelerator'),
          window.electronAPI.storeGet('toggleWindowShortcut'),
          window.electronAPI.storeGet('loopShortcut'),
          window.electronAPI.storeGet('stopAllShortcut'),
          window.electronAPI.storeGet('presentationShortcut'),
          window.electronAPI.storeGet('mixerEnabled'),
          window.electronAPI.storeGet('microphoneDevice'),
          window.electronAPI.storeGet('microphoneVolume'),
          window.electronAPI.storeGet('mixerSoundVolume'),
          window.electronAPI.storeGet('noiseSuppression'),
          window.electronAPI.storeGet('noiseSuppressionMode'),
          window.electronAPI.storeGet('lowLatencyMode'),
          window.electronAPI.storeGet('monitoringEnabled'),
        ])

        // ✅ Normalisation des valeurs (mêmes règles qu'avant, juste regroupées)
        const savedSounds = (rawSounds || []).map((s) => {
          if (s.volumeDb !== undefined) return s
          const oldVolume = s.volume ?? 100
          const newDb = Math.round(((oldVolume - 50) / 50) * 24 * 10) / 10
          return { ...s, volume: newDb, volumeDb: newDb }
        })

        const allProfile = { id: 'all', name: 'Tous les sons', isDefault: true }
        const userProfiles = (savedProfiles || []).filter((p) => p.id !== 'all')
        const allProfiles = [allProfile, ...userProfiles]

        soundsHook.setSounds(savedSounds)
        soundsHook.setSoundOrder(savedSoundOrder || {})
        soundsHook.setTags(savedTags || {})

        profilesHook.setProfiles(allProfiles)
        profilesHook.setCurrentProfileId(savedCurrentProfileId || 'all')

        shortcutsHook.setShortcuts(savedShortcuts || {})
        shortcutsHook.setProfileShortcut(savedProfileShortcut || 'CommandOrControl+Tab')

        settingsHook.updateTheme(savedTheme || 'dark')
        settingsHook.updateCustomTheme(savedCustomTheme || null)
        settingsHook.updateLang(savedLang || 'fr')
        settingsHook.updateAudioDevice(savedAudioDevice || 'default')
        settingsHook.updateLocalAudioDevice(savedLocalAudioDevice || 'default')
        settingsHook.updateVolume(savedVolume ?? 80)
        settingsHook.updatePlayLocally(savedPlayLocally ?? true)
        settingsHook.updatePreviewVolume(savedPreviewVolume ?? 70)
        settingsHook.updateKeyboardLayout(savedKeyboardLayout || 'qwerty')
        settingsHook.updateCardSize(savedCardSize || 'medium')
        settingsHook.updateNormalizationEnabled(savedNormalizationEnabled ?? true)
        settingsHook.updateNormalizationTarget(savedNormalizationTarget ?? 0.2)
        settingsHook.setStartMinimized(savedStartMinimized ?? false)
        settingsHook.setLaunchAtStartup(savedLaunchAtStartup ?? false)
        settingsHook.updateVirtualDriverInstalled(savedVirtualDriverInstalled || false)
        settingsHook.updateVirtualDeviceActive(savedVirtualDeviceActive ?? false)
        settingsHook.updateAutoBackupEnabled(savedAutoBackup ?? true)
        settingsHook.updateBackupInterval(savedBackupInterval ?? 5)
        settingsHook.updateLazyLoadingEnabled(savedLazyLoading ?? true)
        settingsHook.updateCompressOnImport(savedCompressOnImport ?? false)
        settingsHook.updateCompressionBitrate(savedCompressionBitrate ?? 128)
        settingsHook.updateShortcutsEnabled(savedShortcutsEnabled ?? true)
        settingsHook.updateToggleShortcutsAccelerator(
          savedToggleShortcutsAccelerator || 'CommandOrControl+Shift+K'
        )
        settingsHook.updateToggleWindowShortcut(
          savedToggleWindowShortcut || 'CommandOrControl+Shift+S'
        )
        settingsHook.updateLoopShortcut(savedLoopShortcut || '')
        settingsHook.updateStopAllShortcut(savedStopAllShortcut || '')
        settingsHook.updatePresentationShortcut(savedPresentationShortcut || '')

        mixerHook.setMixerEnabled(savedMixerEnabled ?? false)
        mixerHook.setMicrophoneDevice(savedMicrophoneDevice || 'default')
        mixerHook.setMicrophoneVolume(savedMicrophoneVolume ?? 80)
        mixerHook.setMixerSoundVolume(savedMixerSoundVolume ?? 100)
        mixerHook.setNoiseSuppression(savedNoiseSuppression ?? false)
        mixerHook.setNoiseSuppressionMode(savedNoiseSuppressionMode || 'auto')
        mixerHook.setLowLatencyMode(savedLowLatencyMode ?? false)
        mixerHook.setMonitoringEnabled(savedMonitoringEnabled ?? false)

        // Projets éditeur (parallélisables entre eux)
        await Promise.all([
          editorHook.loadRecentEditorProjects?.(),
          editorHook.loadAllEditorProjects?.(),
        ])

        // Sidebar
        if (savedSidebarConfig) {
          let items = [...(savedSidebarConfig.items || [])]

          allProfiles.forEach((profile) => {
            const profileId = `profile-${profile.id}`
            const existingIndex = items.findIndex((item) => item.id === profileId)

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

          const currentProfileIds = new Set(allProfiles.map((p) => `profile-${p.id}`))
          items = items.filter((item) => {
            if (item.id.startsWith('profile-')) {
              return currentProfileIds.has(item.id)
            }
            return true
          })

          const KNOWN_CORE_IDS = [
            'home', 'discover', 'trimmer', 'editor', 'sequencer', 'youtube',
            'stats', 'emoji', 'loop', 'shortcuts', 'presentation', 'guide', 'options',
          ]

          KNOWN_CORE_IDS.forEach((id) => {
            if (!items.find((i) => i.id === id)) {
              items.push({
                id,
                group: DEFAULT_GROUPS[id] || 'navigation',
                label: id,
                icon: DEFAULT_ICONS[id] || 'ti-circle',
                visible: true,
                pinned: false,
                order: items.length,
                canHide: !ACTION_IDS.includes(id),
              })
            }
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