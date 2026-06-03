import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

// Hook principal qui gère tout l'état de l'application
export function useStore() {
  const [profiles, setProfiles] = useState([])
  const [currentProfileId, setCurrentProfileId] = useState(null)
  const [sounds, setSounds] = useState([])
  const [shortcuts, setShortcuts] = useState({})
  const [profileShortcut, setProfileShortcut] = useState('CommandOrControl+Tab')
  const [theme, setTheme] = useState('dark')
  const [audioDevice, setAudioDevice] = useState('default')
  const [volume, setVolume] = useState(80)
  const [playLocally, setPlayLocally] = useState(true)
  const [loading, setLoading] = useState(true)

  // ─── Chargement initial depuis electron-store ────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const savedProfiles = await window.electronAPI.storeGet('profiles') || []
        const savedSounds = await window.electronAPI.storeGet('sounds') || []
        const savedShortcuts = await window.electronAPI.storeGet('shortcuts') || {}
        const savedProfileShortcut = await window.electronAPI.storeGet('profileShortcut') || 'CommandOrControl+Tab'
        const savedTheme = await window.electronAPI.storeGet('theme') || 'dark'
        const savedAudioDevice = await window.electronAPI.storeGet('audioDevice') || 'default'
        const savedVolume = await window.electronAPI.storeGet('volume') ?? 80
        const savedPlayLocally = await window.electronAPI.storeGet('playLocally') ?? true
        const savedCurrentProfileId = await window.electronAPI.storeGet('currentProfileId')

        // Profil "Tous les sons" toujours présent
        const allProfile = { id: 'all', name: 'Tous les sons', isDefault: true }
        const userProfiles = savedProfiles.filter(p => p.id !== 'all')
        const allProfiles = [allProfile, ...userProfiles]

        setProfiles(allProfiles)
        setSounds(savedSounds)
        setShortcuts(savedShortcuts)
        setProfileShortcut(savedProfileShortcut)
        setTheme(savedTheme)
        setAudioDevice(savedAudioDevice)
        setVolume(savedVolume)
        setPlayLocally(savedPlayLocally)
        setCurrentProfileId(savedCurrentProfileId || 'all')
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
    // Retirer les sons de ce profil (mais garder les sons eux-mêmes)
    const updatedSounds = sounds.map(s => ({
      ...s,
      profiles: s.profiles.filter(pid => pid !== profileId)
    }))
    setSounds(updatedSounds)
    await save('profiles', updated.filter(p => p.id !== 'all'))
    await save('sounds', updatedSounds)
    if (currentProfileId === profileId) setCurrentProfileId('all')
  }, [profiles, sounds, currentProfileId, save])

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
  const addSound = useCallback(async (soundData) => {
    const newSound = {
      id: uuidv4(),
      name: soundData.name,
      path: soundData.path,
      emoji: soundData.emoji || '🔊',
      favorite: false,
      profiles: soundData.profiles || ['all'],
      volume: 100,
      createdAt: Date.now()
    }
    const updated = [...sounds, newSound]
    setSounds(updated)
    await save('sounds', updated)
    return newSound
  }, [sounds, save])

  const deleteSound = useCallback(async (soundId) => {
    const sound = sounds.find(s => s.id === soundId)
    if (sound) {
      await window.electronAPI.deleteSoundFile(sound.path)
    }
    const updated = sounds.filter(s => s.id !== soundId)
    setSounds(updated)
    // Nettoyer les raccourcis
    const updatedShortcuts = { ...shortcuts }
    delete updatedShortcuts[soundId]
    setShortcuts(updatedShortcuts)
    await save('sounds', updated)
    await save('shortcuts', updatedShortcuts)
    await window.electronAPI.updateShortcuts(updatedShortcuts)
  }, [sounds, shortcuts, save])

  const updateSound = useCallback(async (soundId, changes) => {
    const updated = sounds.map(s => s.id === soundId ? { ...s, ...changes } : s)
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
    await save('sounds', updated)
  }, [sounds, save])

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

  // ─── Options ──────────────────────────────────────────────────────────────────
  const updateTheme = useCallback(async (newTheme) => {
    setTheme(newTheme)
    await save('theme', newTheme)
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

  // ─── Sons filtrés selon profil actuel ────────────────────────────────────────
  const currentSounds = currentProfileId === 'all'
    ? sounds
    : sounds.filter(s => s.profiles.includes(currentProfileId))

  const favoriteSounds = currentSounds.filter(s => s.favorite)

  return {
    // État
    profiles, currentProfileId, sounds, currentSounds, favoriteSounds,
    shortcuts, profileShortcut, theme, audioDevice, volume, playLocally, loading,
    // Profils
    createProfile, deleteProfile, renameProfile, switchProfile, switchToNextProfile,
    // Sons
    addSound, deleteSound, updateSound, toggleFavorite, addSoundToProfile,
    // Raccourcis
    setShortcut, clearShortcut, updateProfileShortcut,
    // Options
    updateTheme, updateAudioDevice, updateVolume, updatePlayLocally
  }
}