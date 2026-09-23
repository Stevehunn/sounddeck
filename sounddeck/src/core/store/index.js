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
import { migrateSoundVolume } from './utils/volumeUtils'
import {
  DEFAULT_GROUPS,
  DEFAULT_ICONS,
  ACTION_IDS,
} from '@shared/constants/navigation'

let isHydrating = false

const save = async (key, value) => {
  if (isHydrating) return
  await window.electronAPI.storeSet(key, value)
}

async function hydrateStore(keysWithDefaults, ipcExtraGetters = {}) {
  const keys = Object.keys(keysWithDefaults)
  const results = {}

  const promises = keys.map(async (key) => {
    try {
      // Priorité aux getters IPC personnalisés (ex: getStartMinimized)
      const getter = ipcExtraGetters[key]
      const value = getter
        ? await getter()
        : await window.electronAPI.storeGet(key)

      // Fallback sur le défaut si la valeur est null/undefined
      results[key] =
        value !== undefined && value !== null
          ? value
          : keysWithDefaults[key]
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn(`⚠️ [store] storeGet(${key}) a échoué:`, e?.message || e)
      }
      results[key] = keysWithDefaults[key]
    }
  })

  await Promise.all(promises)
  return results
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
        isHydrating = true

        const KEYS_WITH_DEFAULTS = {
          // Sounds / profiles / shortcuts
          profiles: null,
          sounds: null,
          shortcuts: null,
          profileShortcut: null,
          currentProfileId: null,
          soundOrder: null,
          tags: null,
          sidebarConfig: null,

          // Settings
          theme: null,
          customTheme: null,
          lang: null,
          audioDevice: null,
          localAudioDevice: null,
          volume: null,
          playLocally: null,
          previewVolume: null,
          keyboardLayout: null,
          cardSize: null,
          normalizationEnabled: null,
          normalizationTarget: null,
          virtualDriverInstalled: null,
          virtualDeviceActive: null,
          autoBackupEnabled: null,
          backupInterval: null,
          lazyLoadingEnabled: null,
          compressOnImport: null,
          compressionBitrate: null,
          shortcutsEnabled: null,
          toggleShortcutsAccelerator: null,
          toggleWindowShortcut: null,
          loopShortcut: null,
          stopAllShortcut: null,
          presentationShortcut: null,

          // Mixer
          mixerEnabled: null,
          microphoneDevice: null,
          microphoneVolume: null,
          mixerSoundVolume: null,
          noiseSuppression: null,
          noiseSuppressionMode: null,
          lowLatencyMode: null,
          monitoringEnabled: null,

          // Start (avec getters IPC dédiés)
          startMinimized: null,
          launchAtStartup: null,
        }

        const IPC_EXTRA_GETTERS = {
          startMinimized: () =>
            window.electronAPI.getStartMinimized?.() ?? Promise.resolve(null),
          launchAtStartup: () =>
            window.electronAPI.getLaunchAtStartup?.() ?? Promise.resolve(null),
        }

        const data = await hydrateStore(KEYS_WITH_DEFAULTS, IPC_EXTRA_GETTERS)

        const savedSounds = (data.sounds || []).map(migrateSoundVolume)
        const allProfile = {
          id: 'all',
          name: 'Tous les sons',
          nameKey: 'allSounds',
          isDefault: true,
        }
        const userProfiles = (data.profiles || []).filter((p) => p.id !== 'all')
        const allProfiles = [allProfile, ...userProfiles]

        soundsHook.setSounds(savedSounds)
        soundsHook.setSoundOrder(data.soundOrder || {})
        soundsHook.setTags(data.tags || {})

        profilesHook.setProfiles(allProfiles)
        profilesHook.setCurrentProfileId(data.currentProfileId || 'all')

        shortcutsHook.setShortcuts(data.shortcuts || {})
        shortcutsHook.setProfileShortcut(
          data.profileShortcut || 'CommandOrControl+Tab'
        )

        settingsHook.updateTheme(data.theme || 'dark')
        settingsHook.updateCustomTheme(data.customTheme || null)
        settingsHook.updateLang(data.lang || 'fr')
        settingsHook.updateAudioDevice(data.audioDevice || 'default')
        settingsHook.updateLocalAudioDevice(data.localAudioDevice || 'default')
        settingsHook.updateVolume(data.volume ?? 80)
        settingsHook.updatePlayLocally(data.playLocally ?? true)
        settingsHook.updatePreviewVolume(data.previewVolume ?? 70)
        settingsHook.updateKeyboardLayout(data.keyboardLayout || 'qwerty')
        settingsHook.updateCardSize(data.cardSize || 'medium')
        settingsHook.updateNormalizationEnabled(data.normalizationEnabled ?? true)
        settingsHook.updateNormalizationTarget(data.normalizationTarget ?? 0.2)
        settingsHook.setStartMinimized(data.startMinimized ?? false)
        settingsHook.setLaunchAtStartup(data.launchAtStartup ?? false)
        settingsHook.updateVirtualDriverInstalled(
          data.virtualDriverInstalled || false
        )
        settingsHook.updateVirtualDeviceActive(data.virtualDeviceActive ?? false)
        settingsHook.updateAutoBackupEnabled(data.autoBackupEnabled ?? true)
        settingsHook.updateBackupInterval(data.backupInterval ?? 5)
        settingsHook.updateLazyLoadingEnabled(data.lazyLoadingEnabled ?? true)
        settingsHook.updateCompressOnImport(data.compressOnImport ?? false)
        settingsHook.updateCompressionBitrate(data.compressionBitrate ?? 128)
        settingsHook.updateShortcutsEnabled(data.shortcutsEnabled ?? true)
        settingsHook.updateToggleShortcutsAccelerator(
          data.toggleShortcutsAccelerator || 'CommandOrControl+Shift+K'
        )
        settingsHook.updateToggleWindowShortcut(
          data.toggleWindowShortcut || 'CommandOrControl+Shift+S'
        )
        settingsHook.updateLoopShortcut(data.loopShortcut || '')
        settingsHook.updateStopAllShortcut(data.stopAllShortcut || '')
        settingsHook.updatePresentationShortcut(data.presentationShortcut || '')

        mixerHook.setMixerEnabled(data.mixerEnabled ?? false)
        mixerHook.setMicrophoneDevice(data.microphoneDevice || 'default')
        mixerHook.setMicrophoneVolume(data.microphoneVolume ?? 80)
        mixerHook.setMixerSoundVolume(data.mixerSoundVolume ?? 100)
        mixerHook.setNoiseSuppression(data.noiseSuppression ?? false)
        mixerHook.setNoiseSuppressionMode(data.noiseSuppressionMode || 'auto')
        mixerHook.setLowLatencyMode(data.lowLatencyMode ?? false)
        mixerHook.setMonitoringEnabled(data.monitoringEnabled ?? false)

        // Projets éditeur (parallélisables entre eux)
        await Promise.all([
          editorHook.loadRecentEditorProjects?.(),
          editorHook.loadAllEditorProjects?.(),
        ])

        // Sidebar
        if (data.sidebarConfig) {
          let items = [...(data.sidebarConfig.items || [])]

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

          const KNOWN_CORE_IDS = [
            'home', 'discover', 'trimmer', 'editor', 'sequencer', 'youtube',
            'stats', 'emoji', 'loop', 'shortcuts', 'presentation', 'guide', 'options',
          ]

          const currentProfileIds = new Set(
            allProfiles.map((p) => `profile-${p.id}`)
          )

          const allowedIds = new Set([...KNOWN_CORE_IDS, ...ACTION_IDS])

          items = items.filter((item) => {
            if (item.id.startsWith('profile-')) {
              return currentProfileIds.has(item.id)
            }
            return allowedIds.has(item.id)
          })

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

          setSidebarConfig({ ...data.sidebarConfig, items })
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
        isHydrating = false
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const syncProfilesToSidebar = useCallback(
    async (profileList) => {
      const currentConfig = sidebarConfig || DEFAULT_SIDEBAR_CONFIG
      const allProfiles = [
        {
          id: 'all',
          name: 'Tous les sons',
          nameKey: 'allSounds',
          isDefault: true,
        },
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

    // Gestion multi-projets de l'éditeur
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