import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

// Constantes des modes audio
export const AUDIO_MODES = {
  INTEGRATED: 'integrated',
  SIMPLE: 'simple',
  ADVANCED: 'advanced'
}

// ─── CONFIGURATION PAR DÉFAUT DE LA SIDEBAR ──────────────────────────────

const DEFAULT_SIDEBAR_CONFIG = {
  mode: 'default',
  items: [
    // Navigation principale (sans les profils)
    { id: 'home', group: 'navigation', label: 'Mes sons', icon: 'ti-home', visible: true, pinned: false, order: 0, canHide: true },
    { id: 'discover', group: 'navigation', label: 'Découverte', icon: 'ti-compass', visible: true, pinned: false, order: 1, canHide: true },
    { id: 'editor', group: 'navigation', label: 'Éditeur', icon: 'ti-cut', visible: true, pinned: false, order: 2, canHide: true },
    { id: 'sequencer', group: 'navigation', label: 'Séquenceur', icon: 'ti-playlist', visible: true, pinned: false, order: 3, canHide: true },
    { id: 'youtube', group: 'navigation', label: 'YouTube', icon: 'ti-brand-youtube', visible: true, pinned: false, order: 4, canHide: true },
    // Actions
    { id: 'loop', group: 'actions', label: 'Répétition', icon: 'ti-repeat', visible: true, pinned: false, order: 5, canHide: false },
    { id: 'shortcuts', group: 'actions', label: 'Raccourcis', icon: 'ti-keyboard', visible: true, pinned: false, order: 6, canHide: false },
    { id: 'presentation', group: 'actions', label: 'Présentation', icon: 'ti-layout-grid', visible: true, pinned: false, order: 7, canHide: false },
    // Footer
    { id: 'guide', group: 'footer', label: 'Guide Discord', icon: 'ti-book', visible: true, pinned: false, order: 8, canHide: true },
    { id: 'options', group: 'footer', label: 'Options', icon: 'ti-settings', visible: true, pinned: false, order: 9, canHide: true },
  ]
}

export function useStore() {
  const [profiles, setProfiles] = useState([])
  const [currentProfileId, setCurrentProfileId] = useState(null)
  const [sounds, setSounds] = useState([])
  const [shortcuts, setShortcuts] = useState({})
  const [profileShortcut, setProfileShortcut] = useState('CommandOrControl+Tab')
  const [theme, setTheme] = useState('dark')
  const [customTheme, setCustomTheme] = useState(null)
  const [lang, setLang] = useState('fr')
  const [audioDevice, setAudioDevice] = useState('default')
  const [volume, setVolume] = useState(80)
  const [playLocally, setPlayLocally] = useState(true)
  const [loopEnabled, setLoopEnabled] = useState(false)
  const [loopShortcut, setLoopShortcut] = useState('')
  const [stopAllShortcut, setStopAllShortcut] = useState('')
  const [presentationShortcut, setPresentationShortcut] = useState('')
  const [loading, setLoading] = useState(true)
  const [previewVolume, setPreviewVolume] = useState(70)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const [toggleShortcutsAccelerator, setToggleShortcutsAccelerator] = useState('CommandOrControl+Shift+K')
  const [toggleWindowShortcut, setToggleWindowShortcut] = useState('CommandOrControl+Shift+S')
  const [soundOrder, setSoundOrder] = useState({})
  const [orderVersion, setOrderVersion] = useState(0)
  const [normalizationEnabled, setNormalizationEnabled] = useState(true)
  const [normalizationTarget, setNormalizationTarget] = useState(0.1)
  const [startMinimized, setStartMinimized] = useState(false)
  const [launchAtStartup, setLaunchAtStartup] = useState(false)
  const [audioMode, setAudioMode] = useState(AUDIO_MODES.INTEGRATED)
  const [virtualDriverInstalled, setVirtualDriverInstalled] = useState(false)
  const [virtualDeviceActive, setVirtualDeviceActive] = useState(false)
  const [mixerEnabled, setMixerEnabled] = useState(false)
  const [microphoneDevice, setMicrophoneDevice] = useState('default')
  const [microphoneVolume, setMicrophoneVolume] = useState(80)
  const [mixerSoundVolume, setMixerSoundVolume] = useState(100)
  const [localAudioDevice, setLocalAudioDevice] = useState('default')
  const [noiseSuppression, setNoiseSuppression] = useState(false)
  const [noiseSuppressionMode, setNoiseSuppressionMode] = useState('auto')
  const [keyboardLayout, setKeyboardLayout] = useState('qwerty')

  // ─── SIDEBAR CONFIG ──────────────────────────────────────────────────────────
  const [sidebarConfig, setSidebarConfig] = useState(null)
  const [sidebarEditMode, setSidebarEditMode] = useState(false)
  const [sidebarVersion, setSidebarVersion] = useState(0)

  // ─── CHARGEMENT INITIAL ──────────────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      try {
        const savedProfiles = await window.electronAPI.storeGet('profiles') || []
        const savedSounds = (await window.electronAPI.storeGet('sounds') || []).map(s => {
          if (s.volumeDb !== undefined) return s
          const oldVolume = s.volume ?? 100
          const newDb = Math.round(((oldVolume - 50) / 50) * 24 * 10) / 10
          return { ...s, volume: newDb, volumeDb: newDb }
        })
        const savedShortcuts = await window.electronAPI.storeGet('shortcuts') || {}
        const savedProfileShortcut = await window.electronAPI.storeGet('profileShortcut') || 'CommandOrControl+Tab'
        const savedTheme = await window.electronAPI.storeGet('theme') || 'dark'
        const savedCustomTheme = await window.electronAPI.storeGet('customTheme') || null
        const savedAudioDevice = await window.electronAPI.storeGet('audioDevice') || 'default'
        const savedVolume = await window.electronAPI.storeGet('volume') ?? 80
        const savedPlayLocally = await window.electronAPI.storeGet('playLocally') ?? true
        const savedLoopShortcut = await window.electronAPI.storeGet('loopShortcut') || ''
        const savedStopAllShortcut = await window.electronAPI.storeGet('stopAllShortcut') || ''
        const savedPresentationShortcut = await window.electronAPI.storeGet('presentationShortcut') || ''
        const savedCurrentProfileId = await window.electronAPI.storeGet('currentProfileId')
        const savedPreviewVolume = await window.electronAPI.storeGet('previewVolume') ?? 70
        const savedShortcutsEnabled = await window.electronAPI.storeGet('shortcutsEnabled') ?? true
        const savedToggleShortcutsAccelerator = await window.electronAPI.storeGet('toggleShortcutsAccelerator') || 'CommandOrControl+Shift+K'
        const savedSoundOrder = await window.electronAPI.storeGet('soundOrder') || {}
        const savedNormalizationEnabled = await window.electronAPI.storeGet('normalizationEnabled') ?? true
        const savedNormalizationTarget = await window.electronAPI.storeGet('normalizationTarget') ?? 0.2
        const savedNoiseSuppression = await window.electronAPI.storeGet('noiseSuppression') ?? false
        const savedNoiseSuppressionMode = await window.electronAPI.storeGet('noiseSuppressionMode') || 'auto'

        const allProfile = { id: 'all', name: 'Tous les sons', isDefault: true }
        const userProfiles = savedProfiles.filter(p => p.id !== 'all')
        const allProfiles = [allProfile, ...userProfiles]

        const savedStartMinimized = await window.electronAPI.getStartMinimized?.() ?? false
        const savedLaunchAtStartup = await window.electronAPI.getLaunchAtStartup?.() ?? false
        setStartMinimized(savedStartMinimized)
        setLaunchAtStartup(savedLaunchAtStartup)

        const savedAudioMode = await window.electronAPI.storeGet('audioMode') || AUDIO_MODES.INTEGRATED
        const savedVirtualDriverInstalled = await window.electronAPI.storeGet('virtualDriverInstalled') || false
        const savedVirtualDeviceActive = await window.electronAPI.storeGet('virtualDeviceActive') ?? false
        setAudioMode(savedAudioMode)
        setVirtualDriverInstalled(savedVirtualDriverInstalled)
        setVirtualDeviceActive(savedVirtualDeviceActive)

        const savedMixerEnabled = await window.electronAPI.storeGet('mixerEnabled') ?? false
        const savedMicrophoneDevice = await window.electronAPI.storeGet('microphoneDevice') || 'default'
        const savedMicrophoneVolume = await window.electronAPI.storeGet('microphoneVolume') ?? 80
        const savedMixerSoundVolume = await window.electronAPI.storeGet('mixerSoundVolume') ?? 100
        setMixerEnabled(savedMixerEnabled)
        setMicrophoneDevice(savedMicrophoneDevice)
        setMicrophoneVolume(savedMicrophoneVolume)
        setMixerSoundVolume(savedMixerSoundVolume)

        setNoiseSuppression(savedNoiseSuppression)
        setNoiseSuppressionMode(savedNoiseSuppressionMode)

        const savedLocalAudioDevice = await window.electronAPI.storeGet('localAudioDevice') || 'default'
        setLocalAudioDevice(savedLocalAudioDevice)

        // ─── LANGUE ────────────────────────────────────────────────────────────
        const savedLang = await window.electronAPI.storeGet('lang')
        let defaultLang = savedLang || 'fr'

        if (!savedLang) {
          try {
            const systemLang = await window.electronAPI.getSystemLanguage?.()
            if (systemLang) {
              defaultLang = systemLang
              console.log(`🌐 Langue système détectée: ${defaultLang}`)
              await window.electronAPI.storeSet('lang', defaultLang)
            }
          } catch (e) {
            console.warn('⚠️ Erreur récupération langue système:', e)
          }
        }
        setLang(defaultLang)

        // ─── LAYOUT CLAVIER ──────────────────────────────────────────────────
        const savedKeyboardLayout = await window.electronAPI.storeGet('keyboardLayout')
        let defaultLayout = savedKeyboardLayout || 'qwerty'

        if (!savedKeyboardLayout) {
          try {
            const systemLayout = await window.electronAPI.getSystemKeyboardLayout?.()
            if (systemLayout) {
              defaultLayout = systemLayout
              console.log(`⌨️ Layout clavier système détecté: ${defaultLayout}`)
              await window.electronAPI.storeSet('keyboardLayout', defaultLayout)
            }
          } catch (e) {
            console.warn('⚠️ Erreur récupération layout clavier:', e)
          }
        }
        setKeyboardLayout(defaultLayout)

        setProfiles(allProfiles)
        setSounds(savedSounds)
        setShortcuts(savedShortcuts)

        // ═════════Nettoyage des raccourcis orphelins════════════════════════════
        const soundIds = new Set(savedSounds.map(s => s.id))
        const cleanedShortcuts = { ...savedShortcuts }
        let hasChanges = false
        Object.keys(cleanedShortcuts).forEach(id => {
          if (!soundIds.has(id)) {
            delete cleanedShortcuts[id]
            hasChanges = true
          }
        })
        if (hasChanges) {
          setShortcuts(cleanedShortcuts)
          await window.electronAPI.storeSet('shortcuts', cleanedShortcuts)
          await window.electronAPI.updateShortcuts(cleanedShortcuts)
          console.log('✅ Raccourcis orphelins nettoyés au chargement')
        }
        // ═══════════════════════════════════════════════════════════════════════

        setProfileShortcut(savedProfileShortcut)
        setTheme(savedTheme)
        if (savedCustomTheme) setCustomTheme(savedCustomTheme)
        setAudioDevice(savedAudioDevice)
        setVolume(savedVolume)
        setPlayLocally(savedPlayLocally)
        setLoopShortcut(savedLoopShortcut)
        setStopAllShortcut(savedStopAllShortcut)
        setPresentationShortcut(savedPresentationShortcut)
        setCurrentProfileId(savedCurrentProfileId || 'all')
        setPreviewVolume(savedPreviewVolume)
        setShortcutsEnabled(savedShortcutsEnabled)
        setToggleShortcutsAccelerator(savedToggleShortcutsAccelerator)
        setSoundOrder(savedSoundOrder)
        setNormalizationEnabled(savedNormalizationEnabled)
        setNormalizationTarget(savedNormalizationTarget)

        const savedToggleWindowShortcut = await window.electronAPI.storeGet('toggleWindowShortcut') || 'CommandOrControl+Shift+S'
        setToggleWindowShortcut(savedToggleWindowShortcut)

        // ─── SIDEBAR CONFIG ──────────────────────────────────────────────────
        let savedSidebarConfig = await window.electronAPI.storeGet('sidebarConfig')
        
        if (savedSidebarConfig) {
          // ✅ Synchroniser les profils avec la config sauvegardée
          const existingProfileIds = (savedSidebarConfig.items || [])
            .filter(item => item.id && item.id.startsWith('profile-'))
            .map(item => item.id.replace('profile-', ''))
          
          // Ajouter les profils manquants
          let items = [...(savedSidebarConfig.items || [])]
          
          allProfiles.forEach(profile => {
            const profileId = `profile-${profile.id}`
            const existingIndex = items.findIndex(item => item.id === profileId)
            
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
                isDefaultProfile: profile.id === 'all'
              })
            } else {
              items[existingIndex].label = profile.name
            }
          })
          
          // Supprimer les profils qui n'existent plus
          const currentProfileIds = new Set(allProfiles.map(p => `profile-${p.id}`))
          items = items.filter(item => {
            if (item.id.startsWith('profile-')) {
              return currentProfileIds.has(item.id)
            }
            return true
          })
          
          savedSidebarConfig = {
            ...savedSidebarConfig,
            items
          }
          
          setSidebarConfig(savedSidebarConfig)
        } else {
          // ✅ Créer la config par défaut avec les profils
          const defaultItems = [...DEFAULT_SIDEBAR_CONFIG.items]
          
          // Ajouter les profils
          allProfiles.forEach(profile => {
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
              isDefaultProfile: profile.id === 'all'
            })
          })
          
          const defaultConfig = {
            mode: 'default',
            items: defaultItems,
            sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer'] // ← Modifier l'ordre
          }
          
          setSidebarConfig(defaultConfig)
          await window.electronAPI.storeSet('sidebarConfig', defaultConfig)
        }
        
        setSidebarVersion(prev => prev + 1)

      } catch (e) {
        console.error('Erreur chargement store:', e)
        setProfiles([{ id: 'all', name: 'Tous les sons', isDefault: true }])
        setCurrentProfileId('all')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ─── Sauvegarde automatique ───────────────────────────────────────────────────
  const save = useCallback(async (key, value) => {
    await window.electronAPI.storeSet(key, value)
  }, [])

  // ─── SYNC PROFILS VERS SIDEBAR ──────────────────────────────────────────────
  // ✅ DÉCLARER syncProfilesToSidebar AVANT de l'utiliser dans les autres fonctions

  const syncProfilesToSidebar = useCallback(async (profileList) => {
    const currentConfig = sidebarConfig || DEFAULT_SIDEBAR_CONFIG
    
    // Récupérer tous les profils (y compris "all")
    const allProfiles = [{ id: 'all', name: 'Tous les sons', isDefault: true }, ...(profileList || [])]
    
    // Créer la nouvelle liste d'items
    let newItems = [...(currentConfig.items || [])]
    
    // Ajouter ou mettre à jour les profils
    allProfiles.forEach(profile => {
      const profileId = `profile-${profile.id}`
      const existingIndex = newItems.findIndex(item => item.id === profileId)
      
      if (existingIndex === -1) {
        // Profil manquant, l'ajouter
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
          isDefaultProfile: profile.id === 'all'
        })
      } else {
        // Profil existant, mettre à jour le nom
        newItems[existingIndex].label = profile.name
      }
    })
    
    // Supprimer les profils qui n'existent plus
    const currentProfileIds = new Set(allProfiles.map(p => `profile-${p.id}`))
    newItems = newItems.filter(item => {
      if (item.id.startsWith('profile-')) {
        return currentProfileIds.has(item.id)
      }
      return true
    })
    
    // Mettre à jour la config
    const updatedConfig = {
      ...currentConfig,
      items: newItems
    }
    
    setSidebarConfig(updatedConfig)
    setSidebarVersion(prev => prev + 1)
    await save('sidebarConfig', updatedConfig)
    
    return updatedConfig
  }, [sidebarConfig, save])

  // ─── Sauvegarde périphérique audio local ──────────────────────────────────────────────────────────────────
  const updateLocalAudioDevice = useCallback(async (deviceId) => {
    setLocalAudioDevice(deviceId)
    await save('localAudioDevice', deviceId)
  }, [save])

  // ─── Profils ──────────────────────────────────────────────────────────────────
  const createProfile = useCallback(async (name) => {
    const newProfile = { id: uuidv4(), name, isDefault: false }
    const updated = [...profiles, newProfile]
    setProfiles(updated)
    const userProfiles = updated.filter(p => p.id !== 'all')
    await save('profiles', userProfiles)
    
    // ✅ Ajouter le nouveau profil à la sidebar
    await syncProfilesToSidebar(updated.filter(p => p.id !== 'all'))
    
    return newProfile
  }, [profiles, save, syncProfilesToSidebar])

  const deleteProfile = useCallback(async (profileId) => {
    if (profileId === 'all') return
    const updated = profiles.filter(p => p.id !== profileId)
    setProfiles(updated)
    const updatedSounds = sounds.map(s => ({
      ...s,
      profiles: s.profiles.filter(pid => pid !== profileId)
    }))
    setSounds(updatedSounds)
    const updatedOrder = { ...soundOrder }
    delete updatedOrder[profileId]
    setSoundOrder(updatedOrder)
    await save('profiles', updated.filter(p => p.id !== 'all'))
    await save('sounds', updatedSounds)
    await save('soundOrder', updatedOrder)
    if (currentProfileId === profileId) setCurrentProfileId('all')
    
    // ✅ Supprimer le profil de la sidebar
    await syncProfilesToSidebar(updated.filter(p => p.id !== 'all'))
  }, [profiles, sounds, currentProfileId, save, soundOrder, syncProfilesToSidebar])

  const renameProfile = useCallback(async (profileId, newName) => {
    const updated = profiles.map(p => p.id === profileId ? { ...p, name: newName } : p)
    setProfiles(updated)
    await save('profiles', updated.filter(p => p.id !== 'all'))
    
    // ✅ Mettre à jour le nom du profil dans la sidebar
    await syncProfilesToSidebar(updated.filter(p => p.id !== 'all'))
  }, [profiles, save, syncProfilesToSidebar])

  const switchProfile = useCallback(async (profileId) => {
    setCurrentProfileId(profileId)
    await save('currentProfileId', profileId)
  }, [save])

  const switchToNextProfile = useCallback(async () => {
    const idx = profiles.findIndex(p => p.id === currentProfileId)
    const next = profiles[(idx + 1) % profiles.length]
    await switchProfile(next.id)
  }, [profiles, currentProfileId, switchProfile])

  // ─── Réorganisation des profils ──────────────────────────────────────────────
  const reorderProfiles = useCallback(async (startIndex, endIndex) => {
    const userProfiles = profiles.filter(p => p.id !== 'all')

    if (startIndex < 0 || startIndex >= userProfiles.length ||
        endIndex < 0 || endIndex >= userProfiles.length) {
      console.warn('Indices invalides pour reorderProfiles:', startIndex, endIndex)
      return false
    }

    const reordered = [...userProfiles]
    const [removed] = reordered.splice(startIndex, 1)
    reordered.splice(endIndex, 0, removed)

    const allProfile = profiles.find(p => p.id === 'all')
    const newProfiles = [allProfile, ...reordered]

    setProfiles(newProfiles)
    await save('profiles', reordered)
    
    // ✅ Mettre à jour l'ordre des profils dans la sidebar
    await syncProfilesToSidebar(reordered)
    
    return true
  }, [profiles, save, syncProfilesToSidebar])

  // ─── Sons ─────────────────────────────────────────────────────────────────────
  const normalizePath = (p) => p ? p.replace(/\\/g, '/') : p

  const addSound = useCallback(async (soundData) => {
    const newSound = {
      id: uuidv4(),
      name: soundData.name,
      path: normalizePath(soundData.path),
      image: normalizePath(soundData.image) || null,
      emoji: soundData.emoji || '🔊',
      favorites: [],
      profiles: soundData.profiles || ['all'],
      volume: 0,
      volumeDb: 0,
      createdAt: Date.now()
    }
    const updated = [...sounds, newSound]
    setSounds(updated)
    await save('sounds', updated)
    const updatedOrder = { ...soundOrder }
    const targetProfiles = newSound.profiles || ['all']
    targetProfiles.forEach(pid => {
      if (!updatedOrder[pid]) {
        updatedOrder[pid] = []
      }
      if (!updatedOrder[pid].includes(newSound.id)) {
        updatedOrder[pid].push(newSound.id)
      }
    })
    setSoundOrder(updatedOrder)
    await save('soundOrder', updatedOrder)
    setOrderVersion(prev => prev + 1)
    return newSound
  }, [sounds, save, soundOrder])

  const deleteSound = useCallback(async (soundId) => {
    const sound = sounds.find(s => s.id === soundId)
    if (sound) {
      await window.electronAPI.deleteSoundFile(sound.path)
    }
    const updated = sounds.filter(s => s.id !== soundId)
    setSounds(updated)
    const updatedOrder = { ...soundOrder }
    Object.keys(updatedOrder).forEach(profileId => {
      if (updatedOrder[profileId]) {
        updatedOrder[profileId] = updatedOrder[profileId].filter(id => id !== soundId)
      }
    })
    setSoundOrder(updatedOrder)
    await save('sounds', updated)
    await save('soundOrder', updatedOrder)
    const updatedShortcuts = { ...shortcuts }
    delete updatedShortcuts[soundId]
    setShortcuts(updatedShortcuts)
    await save('shortcuts', updatedShortcuts)
    await window.electronAPI.updateShortcuts(updatedShortcuts)
    setOrderVersion(prev => prev + 1)
  }, [sounds, shortcuts, save, soundOrder])

  const updateSound = useCallback(async (soundId, changes) => {
    const updated = sounds.map(s => s.id === soundId ? { ...s, ...changes } : s)
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  const incrementPlayCount = useCallback(async (soundId) => {
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, playCount: (s.playCount || 0) + 1, lastPlayed: Date.now() } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  const updateSoundVolume = useCallback(async (soundId, volumeDb) => {
    const clampedDb = Math.max(-24, Math.min(24, volumeDb))
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, volume: clampedDb, volumeDb: clampedDb } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  const toggleFavorite = useCallback(async (soundId) => {
    const profileId = currentProfileId || 'all'
    const updated = sounds.map(s => {
      if (s.id !== soundId) return s
      const isFav = s.favorites?.includes(profileId) || false
      return {
        ...s,
        favorites: isFav
          ? s.favorites.filter(id => id !== profileId)
          : [...(s.favorites || []), profileId]
      }
    })
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, currentProfileId, save])

  const addSoundToProfile = useCallback(async (soundId, profileId) => {
    const updated = sounds.map(s => {
      if (s.id !== soundId) return s
      const profiles = s.profiles.includes(profileId)
        ? s.profiles
        : [...s.profiles, profileId]
      return { ...s, profiles }
    })
    setSounds(updated)
    const updatedOrder = { ...soundOrder }
    if (!updatedOrder[profileId]) {
      updatedOrder[profileId] = []
    }
    if (!updatedOrder[profileId].includes(soundId)) {
      updatedOrder[profileId].push(soundId)
    }
    setSoundOrder(updatedOrder)
    await save('sounds', updated)
    await save('soundOrder', updatedOrder)
    setOrderVersion(prev => prev + 1)
  }, [sounds, save, soundOrder])

  const removeSoundFromProfile = useCallback(async (soundId, profileId) => {
    const updated = sounds.map(s => {
      if (s.id !== soundId) return s
      return { ...s, profiles: s.profiles.filter(pid => pid !== profileId) }
    })
    setSounds(updated)
    const updatedOrder = { ...soundOrder }
    if (updatedOrder[profileId]) {
      updatedOrder[profileId] = updatedOrder[profileId].filter(id => id !== soundId)
    }
    setSoundOrder(updatedOrder)
    await save('sounds', updated)
    await save('soundOrder', updatedOrder)
    setOrderVersion(prev => prev + 1)
  }, [sounds, save, soundOrder])

  // ─── Réorganisation des sons ──────────────────────────────────────────────
  const reorderSounds = useCallback(async (startIndex, endIndex) => {
    const profileId = currentProfileId || 'all'
    const currentOrder = soundOrder[profileId] || []

    const profileSounds = profileId === 'all'
      ? sounds
      : sounds.filter(s => s.profiles.includes(profileId))

    let orderedIds = currentOrder.length === profileSounds.length
      ? currentOrder
      : profileSounds.map(s => s.id)

    if (startIndex < 0 || startIndex >= orderedIds.length ||
        endIndex < 0 || endIndex >= orderedIds.length) {
      console.warn('Indices invalides pour reorderSounds:', startIndex, endIndex)
      return false
    }

    const [removed] = orderedIds.splice(startIndex, 1)
    orderedIds.splice(endIndex, 0, removed)

    const updatedOrder = { ...soundOrder, [profileId]: orderedIds }
    setSoundOrder(updatedOrder)
    await save('soundOrder', updatedOrder)
    setOrderVersion(prev => prev + 1)
    return true
  }, [sounds, currentProfileId, soundOrder, save])

  // ─── Raccourcis ───────────────────────────────────────────────────────────────
  const setShortcut = useCallback(async (soundId, accelerator) => {
    const updated = { ...shortcuts, [soundId]: accelerator }
    setShortcuts(updated)
    await save('shortcuts', updated)
    await window.electronAPI.updateShortcuts(updated)
  }, [shortcuts, save])

  const clearShortcut = useCallback(async (soundId) => {
    const updated = { ...shortcuts }
    delete updated[soundId]
    setShortcuts(updated)
    await save('shortcuts', updated)
    await window.electronAPI.updateShortcuts(updated)
  }, [shortcuts, save])

  const updateProfileShortcut = useCallback(async (accelerator) => {
    setProfileShortcut(accelerator)
    await save('profileShortcut', accelerator)
    await window.electronAPI.updateProfileShortcut(accelerator)
  }, [save])

  const toggleLoop = useCallback(() => {
    setLoopEnabled(prev => !prev)
  }, [])

  const updatePresentationShortcut = useCallback(async (accelerator) => {
    setPresentationShortcut(accelerator)
    await save('presentationShortcut', accelerator)
    await window.electronAPI.updatePresentationShortcut(accelerator)
  }, [save])

  const updateStopAllShortcut = useCallback(async (accelerator) => {
    setStopAllShortcut(accelerator)
    await save('stopAllShortcut', accelerator)
    await window.electronAPI.updateStopAllShortcut(accelerator)
  }, [save])

  const updateLoopShortcut = useCallback(async (accelerator) => {
    setLoopShortcut(accelerator)
    await save('loopShortcut', accelerator)
    await window.electronAPI.updateLoopShortcut(accelerator)
  }, [save])

  // ─── Raccourcis globaux (toggle) ──────────────────────────────────────────
  const toggleGlobalShortcuts = useCallback(async () => {
    const newState = await window.electronAPI.toggleGlobalShortcuts()
    setShortcutsEnabled(newState)
    return newState
  }, [])

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

  // ─── Nettoyage des raccourcis orphelins ──────────────────────────────────────
  const cleanupOrphanShortcuts = useCallback(async () => {
    const soundIds = new Set(sounds.map(s => s.id))
    const updatedShortcuts = { ...shortcuts }
    let hasChanges = false

    Object.keys(updatedShortcuts).forEach(id => {
      if (!soundIds.has(id)) {
        console.log(`🗑️ Suppression du raccourci orphelin pour l'ID: ${id}`)
        delete updatedShortcuts[id]
        hasChanges = true
      }
    })

    if (hasChanges) {
      setShortcuts(updatedShortcuts)
      await save('shortcuts', updatedShortcuts)
      await window.electronAPI.updateShortcuts(updatedShortcuts)
      console.log('✅ Raccourcis orphelins nettoyés')
    }
    return hasChanges
  }, [sounds, shortcuts, save])

  // ─── Options ──────────────────────────────────────────────────────────────────
  const updateLang = useCallback(async (newLang) => {
    setLang(newLang)
    await save('lang', newLang)
    await window.electronAPI.storeSetLang?.(newLang)
  }, [save])

  const updateTheme = useCallback(async (newTheme) => {
    setTheme(newTheme)
    await save('theme', newTheme)
  }, [save])

  const updateCustomTheme = useCallback(async (colors) => {
    setCustomTheme(colors)
    setTheme('custom')
    await save('customTheme', colors)
    await save('theme', 'custom')
  }, [save])

  const updateAudioDevice = useCallback(async (deviceId) => {
    setAudioDevice(deviceId)
    await save('audioDevice', deviceId)
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

  // ─── Audio Mode ──────────────────────────────────────────────────────────────
  const updateAudioMode = useCallback(async (mode) => {
    setAudioMode(mode)
    await save('audioMode', mode)
  }, [save])

  const updateVirtualDriverInstalled = useCallback(async (installed) => {
    setVirtualDriverInstalled(installed)
    await save('virtualDriverInstalled', installed)
  }, [save])

  const updateVirtualDeviceActive = useCallback(async (active) => {
    setVirtualDeviceActive(active)
    await save('virtualDeviceActive', active)
  }, [save])

  // ─── Normalisation ──────────────────────────────────────────────────────────
  const updateNormalizationEnabled = useCallback(async (enabled) => {
    setNormalizationEnabled(enabled)
    await save('normalizationEnabled', enabled)
  }, [save])

  const updateNormalizationTarget = useCallback(async (target) => {
    setNormalizationTarget(target)
    await save('normalizationTarget', target)
  }, [save])

  const resetGainCache = useCallback(async () => {
    const { gainCache } = await import('../utils/audio')
    Object.keys(gainCache).forEach(key => delete gainCache[key])
    console.log('🧹 Cache des gains vidé')
  }, [])

  // ─── Mixer ──────────────────────────────────────────────────────────────────
  const updateMixerEnabled = useCallback(async (enabled) => {
    console.log('💾 Sauvegarde mixerEnabled:', enabled)
    setMixerEnabled(enabled)
    await save('mixerEnabled', enabled)
  }, [save])

  const updateMicrophoneDevice = useCallback(async (deviceId) => {
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

  // ─── Noise Suppression ──────────────────────────────────────────────────────
  const updateNoiseSuppression = useCallback(async (enabled) => {
    setNoiseSuppression(enabled)
    await save('noiseSuppression', enabled)
  }, [save])

  const updateNoiseSuppressionMode = useCallback(async (mode) => {
    setNoiseSuppressionMode(mode)
    await save('noiseSuppressionMode', mode)
  }, [save])

  // ─── Initialisation du mixeur au démarrage ──────────────────────────────────
  const initMixerOnStartup = useCallback(async () => {
    if (!mixerEnabled) {
      console.log('ℹ️ Mixeur désactivé, pas d\'initialisation automatique')
      return true
    }

    try {
      console.log('🎛️ Initialisation automatique du mixeur au démarrage...')
      console.log('📊 État du mixeur au démarrage:', {
        mixerEnabled,
        microphoneDevice,
        audioDevice,
        noiseSuppressionMode
      })

      const {
        initAudioMixer,
        resumeAudioContext,
        connectMixerToOutput,
        setNoiseSuppressionMode,
        isMixerOperational,
        repairMixer
      } = await import('../utils/audioMixer')

      if (isMixerOperational()) {
        console.log('✅ Mixeur déjà opérationnel')
        return true
      }

      const repaired = repairMixer()
      if (repaired && isMixerOperational()) {
        console.log('✅ Mixeur réparé avec succès')
        return true
      }

      const mixedStream = await initAudioMixer(microphoneDevice || 'default')

      if (mixedStream) {
        resumeAudioContext()
        connectMixerToOutput(audioDevice || 'default')

        if (noiseSuppressionMode && noiseSuppressionMode !== 'off') {
          try {
            setNoiseSuppressionMode(noiseSuppressionMode)
            console.log(`🔇 Mode réduction de bruit appliqué: ${noiseSuppressionMode}`)
          } catch (e) {
            console.warn('⚠️ Erreur lors de l\'application du mode de réduction de bruit:', e)
          }
        }

        console.log('✅ Mixeur initialisé automatiquement avec succès')
        return true
      } else {
        console.warn('⚠️ Échec de l\'initialisation automatique du mixeur')
        setMixerEnabled(false)
        await save('mixerEnabled', false)
        return false
      }
    } catch (e) {
      console.error('❌ Erreur lors de l\'initialisation automatique du mixeur:', e)
      setMixerEnabled(false)
      await save('mixerEnabled', false)
      return false
    }
  }, [mixerEnabled, microphoneDevice, audioDevice, noiseSuppressionMode, save])

  const updateMicrophoneDeviceId = useCallback(async (deviceId) => {
    if (deviceId && deviceId !== 'default') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices.filter(d => d.kind === 'audioinput')
        const deviceExists = audioInputs.some(d => d.deviceId === deviceId)

        if (!deviceExists) {
          console.warn(`⚠️ Périphérique ${deviceId} non trouvé, utilisation du périphérique par défaut`)
          deviceId = 'default'
        }
      } catch (e) {
        console.warn('⚠️ Erreur lors de l\'énumération des périphériques:', e)
        deviceId = 'default'
      }
    }

    setMicrophoneDevice(deviceId)
    await save('microphoneDevice', deviceId)
  }, [save])

  // ─── Image et Emoji des sons ──────────────────────────────────────────────
  const updateSoundImage = useCallback(async (soundId, imagePath) => {
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, image: normalizePath(imagePath) } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  const updateSoundEmoji = useCallback(async (soundId, emoji) => {
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, emoji } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

  // ─── SIDEBAR CONFIG ──────────────────────────────────────────────────────────

  const resetSidebarConfig = useCallback(async () => {
    // ✅ Réinitialiser avec les profils actuels
    const allProfiles = profiles || []
    const defaultItems = [...DEFAULT_SIDEBAR_CONFIG.items]
    
    // Ajouter les profils
    allProfiles.forEach(profile => {
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
        isDefaultProfile: profile.id === 'all'
      })
    })
    
    const defaultConfig = {
      mode: 'default',
      items: defaultItems,
      sectionOrder: ['pinned', 'profiles', 'navigation', 'actions', 'footer'] // ← Modifier l'ordre
    }
    
    setSidebarConfig(defaultConfig)
    setSidebarVersion(prev => prev + 1)
    await save('sidebarConfig', defaultConfig)
  }, [profiles, save])

  const updateSidebarConfig = useCallback(async (newConfig) => {
    setSidebarConfig(newConfig)
    setSidebarVersion(prev => prev + 1)
    await save('sidebarConfig', newConfig)
  }, [save])

  const toggleSidebarEditMode = useCallback(() => {
    setSidebarEditMode(prev => !prev)
  }, [])

  // ─── Sons ordonnés selon le profil ──────────────────────────────────────────
  const orderedSounds = useMemo(() => {
    const profileId = currentProfileId || 'all'
    const profileSounds = profileId === 'all'
      ? sounds
      : sounds.filter(s => s.profiles.includes(profileId))

    const order = soundOrder[profileId] || []

    if (order.length === 0 || order.length !== profileSounds.length) {
      return profileSounds
    }

    const soundMap = {}
    profileSounds.forEach(s => { soundMap[s.id] = s })

    const ordered = order
      .filter(id => soundMap[id])
      .map(id => soundMap[id])

    const missing = profileSounds.filter(s => !order.includes(s.id))
    return [...ordered, ...missing]
  }, [sounds, soundOrder, currentProfileId, orderVersion])

  // favoriteSounds dynamique par profil
  const favoriteSounds = useMemo(() => {
    return orderedSounds.filter(s => s.favorites?.includes(currentProfileId) || false)
  }, [orderedSounds, currentProfileId])

  return {
    // ─── État ──────────────────────────────────────────────────────────────────
    profiles,
    currentProfileId,
    sounds,
    currentSounds: orderedSounds,
    favoriteSounds,
    shortcuts,
    profileShortcut,
    theme,
    customTheme,
    lang,
    audioDevice,
    volume,
    playLocally,
    loading,
    previewVolume,
    shortcutsEnabled,
    toggleShortcutsAccelerator,
    toggleWindowShortcut,
    soundOrder,
    normalizationEnabled,
    normalizationTarget,
    audioMode,
    virtualDriverInstalled,
    virtualDeviceActive,
    mixerEnabled,
    microphoneDevice,
    microphoneVolume,
    mixerSoundVolume,
    localAudioDevice,
    noiseSuppression,
    noiseSuppressionMode,
    keyboardLayout,
    loopEnabled,
    loopShortcut,
    stopAllShortcut,
    presentationShortcut,
    startMinimized,
    launchAtStartup,

    // ─── Sidebar ──────────────────────────────────────────────────────────────
    sidebarConfig,
    sidebarEditMode,
    sidebarVersion,
    DEFAULT_SIDEBAR_CONFIG,
    resetSidebarConfig,
    updateSidebarConfig,
    toggleSidebarEditMode,
    syncProfilesToSidebar,

    // ─── Profils ──────────────────────────────────────────────────────────────
    createProfile,
    deleteProfile,
    renameProfile,
    switchProfile,
    switchToNextProfile,
    reorderProfiles,

    // ─── Sons ─────────────────────────────────────────────────────────────────
    addSound,
    deleteSound,
    updateSound,
    updateSoundVolume,
    incrementPlayCount,
    toggleFavorite,
    addSoundToProfile,
    removeSoundFromProfile,
    reorderSounds,
    updateSoundImage,
    updateSoundEmoji,

    // ─── Raccourcis ──────────────────────────────────────────────────────────
    setShortcut,
    clearShortcut,
    updateProfileShortcut,
    toggleLoop,
    updateLoopShortcut,
    updateStopAllShortcut,
    updatePresentationShortcut,
    toggleGlobalShortcuts,
    updateToggleShortcutsAccelerator,
    updateToggleWindowShortcut,
    cleanupOrphanShortcuts,

    // ─── Options ──────────────────────────────────────────────────────────────
    updateLang,
    updateTheme,
    updateCustomTheme,
    updateAudioDevice,
    updateVolume,
    updatePlayLocally,
    updatePreviewVolume,
    updateKeyboardLayout,
    updateAudioMode,
    updateVirtualDriverInstalled,
    updateVirtualDeviceActive,

    // ─── Normalisation ────────────────────────────────────────────────────────
    updateNormalizationEnabled,
    updateNormalizationTarget,
    resetGainCache,

    // ─── Mixer ────────────────────────────────────────────────────────────────
    updateMixerEnabled,
    updateMicrophoneDeviceId,
    updateMicrophoneVolume,
    updateMixerSoundVolume,
    updateNoiseSuppression,
    updateNoiseSuppressionMode,
    initMixerOnStartup,

    // ─── Démarrage ────────────────────────────────────────────────────────────
    setStartMinimized: (val) => { setStartMinimized(val); save('startMinimized', val) },
    setLaunchAtStartup: (val) => { setLaunchAtStartup(val); save('launchAtStartup', val) },

    // ─── Périphérique audio local ────────────────────────────────────────────
    updateLocalAudioDevice,
  }
}