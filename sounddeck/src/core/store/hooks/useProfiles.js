// src/core/store/hooks/useProfiles.js
import { useState, useCallback } from 'react'
import { uuid } from '@shared/utils/uuid'

const ALL_PROFILE_NAME_KEY = 'allSounds'
const ALL_PROFILE_FALLBACK_NAME = 'Tous les sons'

export function useProfiles(initialProfiles = [], initialCurrentId = 'all', save) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [currentProfileId, setCurrentProfileId] = useState(initialCurrentId)

  const createProfile = useCallback(async (name) => {
    const newProfile = { id: uuid(), name, isDefault: false }
    const updated = [...profiles, newProfile]
    setProfiles(updated)
    const userProfiles = updated.filter(p => p.id !== 'all')
    await save('profiles', userProfiles)
    return newProfile
  }, [profiles, save])

  const replaceAllProfiles = useCallback(async (newProfiles) => {
    if (!Array.isArray(newProfiles)) return
    setProfiles(newProfiles)
    const userProfiles = newProfiles.filter(p => p.id !== 'all')
    await save('profiles', userProfiles)
  }, [save])

  const deleteProfile = useCallback(async (profileId) => {
    if (profileId === 'all') return

    const updated = profiles.filter(p => p.id !== profileId)
    setProfiles(updated)
    await save('profiles', updated.filter(p => p.id !== 'all'))

    if (currentProfileId === profileId) {
      setCurrentProfileId('all')
      await save('currentProfileId', 'all')
    }

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
    if (!profiles.length) return
    const idx = profiles.findIndex(p => p.id === currentProfileId)
    const nextIdx = idx === -1 ? 0 : (idx + 1) % profiles.length
    const next = profiles[nextIdx]
    if (!next) return
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
    const allProfile = {
      id: 'all',
      name: ALL_PROFILE_FALLBACK_NAME,
      nameKey: ALL_PROFILE_NAME_KEY,
      isDefault: true,
    }
    const userProfiles = profiles.filter(p => p.id !== 'all')
    return [allProfile, ...userProfiles]
  }, [profiles])

  return {
    profiles,
    setProfiles,
    currentProfileId,
    setCurrentProfileId,
    createProfile,
    replaceAllProfiles,
    deleteProfile,
    renameProfile,
    switchProfile,
    switchToNextProfile,
    reorderProfiles,
    getUserProfiles,
    getAllProfiles,
  }
}