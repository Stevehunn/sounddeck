// src/core/store/hooks/useProfiles.js
import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

export function useProfiles(initialProfiles = [], initialCurrentId = 'all', save) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [currentProfileId, setCurrentProfileId] = useState(initialCurrentId)

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
    await save('profiles', updated.filter(p => p.id !== 'all'))
    if (currentProfileId === profileId) setCurrentProfileId('all')
    return true
  }, [profiles, currentProfileId, save])

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

  const reorderProfiles = useCallback(async (startIndex, endIndex) => {
    const userProfiles = profiles.filter(p => p.id !== 'all')

    if (startIndex < 0 || startIndex >= userProfiles.length ||
        endIndex < 0 || endIndex >= userProfiles.length) {
      return false
    }

    const reordered = [...userProfiles]
    const [removed] = reordered.splice(startIndex, 1)
    reordered.splice(endIndex, 0, removed)

    const allProfile = profiles.find(p => p.id === 'all')
    const newProfiles = [allProfile, ...reordered]

    setProfiles(newProfiles)
    await save('profiles', reordered)
    return true
  }, [profiles, save])

  const getUserProfiles = useCallback(() => {
    return profiles.filter(p => p.id !== 'all')
  }, [profiles])

  const getAllProfiles = useCallback(() => {
    const allProfile = { id: 'all', name: 'Tous les sons', isDefault: true }
    const userProfiles = profiles.filter(p => p.id !== 'all')
    return [allProfile, ...userProfiles]
  }, [profiles])

  return {
    profiles,
    setProfiles,
    currentProfileId,
    setCurrentProfileId,
    createProfile,
    deleteProfile,
    renameProfile,
    switchProfile,
    switchToNextProfile,
    reorderProfiles,
    getUserProfiles,
    getAllProfiles,
  }
}