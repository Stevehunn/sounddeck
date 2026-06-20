import { useState, useEffect, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

// Constantes des modes audio
export const AUDIO_MODES = {
  INTEGRATED: 'integrated',
  SIMPLE: 'simple',
  ADVANCED: 'advanced'
}

// Hook principal qui gère tout l'état de l'application
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
  const [soundOrder, setSoundOrder] = useState({})
  const [orderVersion, setOrderVersion] = useState(0)
  // Nouvelle option : normalisation activée/désactivée
  const [normalizationEnabled, setNormalizationEnabled] = useState(true)
  // Seuil de normalisation cible en RMS (0-1)
  const [normalizationTarget, setNormalizationTarget] = useState(0.1) // ~ -20 dB

  const [startMinimized, setStartMinimized] = useState(false)
  const [launchAtStartup, setLaunchAtStartup] = useState(false)

  // Audio modes
  const [audioMode, setAudioMode] = useState(AUDIO_MODES.INTEGRATED)
  const [virtualDriverInstalled, setVirtualDriverInstalled] = useState(false)
  const [virtualDeviceActive, setVirtualDeviceActive] = useState(false)

  // Mixer
  const [mixerEnabled, setMixerEnabled] = useState(false)
  const [microphoneDevice, setMicrophoneDevice] = useState('default')
  const [microphoneVolume, setMicrophoneVolume] = useState(80)
  const [mixerSoundVolume, setMixerSoundVolume] = useState(100)

  // ─── Chargement initial depuis electron-store ────────────────────────────────
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
        const savedLang = await window.electronAPI.storeGet('lang') || 'fr'
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
        const savedNormalizationTarget = await window.electronAPI.storeGet('normalizationTarget') ?? 0.1

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

        setProfiles(allProfiles)
        setSounds(savedSounds)
        setShortcuts(savedShortcuts)
        setProfileShortcut(savedProfileShortcut)
        setTheme(savedTheme)
        if (savedCustomTheme) setCustomTheme(savedCustomTheme)
        setLang(savedLang)
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

  // ─── Profils ──────────────────────────────────────────────────────────────────
  const createProfile = useCallback(async (name) => {
    const newProfile = { id: uuidv4(), name, isDefault: false }
    const updated = [...profiles, newProfile]
    setProfiles(updated)
    const userProfiles = updated.filter(p => p.id !== 'all')
    await save('profiles', userProfiles)
    return newProfile
  }, [profiles, save])

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
  }, [profiles, sounds, currentProfileId, save, soundOrder])

  const renameProfile = useCallback(async (profileId, newName) => {
    const updated = profiles.map(p => p.id === profileId ? { ...p, name: newName } : p)
    setProfiles(updated)
    await save('profiles', updated.filter(p => p.id !== 'all'))
  }, [profiles, save])

  const switchProfile = useCallback(async (profileId) => {
    setCurrentProfileId(profileId)
    await save('currentProfileId', profileId)
  }, [save])

  const switchToNextProfile = useCallback(async () => {
    const idx = profiles.findIndex(p => p.id === currentProfileId)
    const next = profiles[(idx + 1) % profiles.length]
    await switchProfile(next.id)
  }, [profiles, currentProfileId, switchProfile])

  // ─── Sons ─────────────────────────────────────────────────────────────────────
  const normalizePath = (p) => p ? p.replace(/\\/g, '/') : p

  const addSound = useCallback(async (soundData) => {
    const newSound = {
      id: uuidv4(),
      name: soundData.name,
      path: normalizePath(soundData.path),
      image: normalizePath(soundData.image) || null,
      emoji: soundData.emoji || '🔊',
      favorite: false,
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
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, favorite: !s.favorite } : s
    )
    setSounds(updated)
    await save('sounds', updated)
  }, [sounds, save])

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

  const favoriteSounds = orderedSounds.filter(s => s.favorite)

  return {
    // État
    profiles, currentProfileId, sounds, currentSounds: orderedSounds, favoriteSounds,
    shortcuts, profileShortcut, theme, audioDevice, volume, playLocally, loading,
    previewVolume, shortcutsEnabled, toggleShortcutsAccelerator,
    soundOrder,
    // Normalisation
    normalizationEnabled, normalizationTarget,
    // Profils
    createProfile, deleteProfile, renameProfile, switchProfile, switchToNextProfile,
    // Sons
    addSound, deleteSound, updateSound, updateSoundVolume, incrementPlayCount, toggleFavorite, 
    addSoundToProfile, removeSoundFromProfile, reorderSounds,
    // Raccourcis
    setShortcut, clearShortcut, updateProfileShortcut,
    // Options
    loopEnabled, loopShortcut, toggleLoop, updateLoopShortcut,
    stopAllShortcut, updateStopAllShortcut,
    presentationShortcut, updatePresentationShortcut,
    lang, updateLang,
    customTheme, updateTheme, updateCustomTheme, updateAudioDevice, updateVolume, updatePlayLocally,
    updatePreviewVolume,
    // Audio Mode
    audioMode,
    virtualDriverInstalled,
    virtualDeviceActive,
    updateAudioMode,
    updateVirtualDriverInstalled,
    updateVirtualDeviceActive,
    // Raccourcis globaux
    toggleGlobalShortcuts,
    updateToggleShortcutsAccelerator,
    // Normalisation
    updateNormalizationEnabled,
    updateNormalizationTarget,
    // Mixer
    mixerEnabled,
    microphoneDevice,
    microphoneVolume,
    mixerSoundVolume,
    updateMixerEnabled,
    updateMicrophoneDevice,
    updateMicrophoneVolume,
    updateMixerSoundVolume,
    // Démarrage
    startMinimized,
    launchAtStartup,
    setStartMinimized: (val) => { setStartMinimized(val); save('startMinimized', val) },
    setLaunchAtStartup: (val) => { setLaunchAtStartup(val); save('launchAtStartup', val) },
  }
}