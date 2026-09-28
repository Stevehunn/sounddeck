// src/core/store/hooks/useSounds.js
import { useState, useCallback, useRef, useEffect } from 'react'
import { uuid } from '@shared/utils/uuid'
import { normalizePath } from '../utils/normalizePath'

export function useSounds(initialSounds = [], initialSoundOrder = {}, initialTags = {}, save) {
  const [sounds, setSounds] = useState(initialSounds)
  const [soundOrder, setSoundOrder] = useState(initialSoundOrder)
  const [tags, setTags] = useState(initialTags)
  const soundsRef = useRef(sounds)
  const saveRef = useRef(save)
  const pendingPlayCountSaveRef = useRef(null)

  useEffect(() => { soundsRef.current = sounds }, [sounds])
  useEffect(() => { saveRef.current = save }, [save])

  useEffect(() => {
    return () => {
      if (pendingPlayCountSaveRef.current) {
        clearTimeout(pendingPlayCountSaveRef.current)
        pendingPlayCountSaveRef.current = null
      }
    }
  }, [])

  const addSound = useCallback(async (soundData) => {
    const newSound = {
      id: uuid(),
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
      if (!updatedOrder[pid]) updatedOrder[pid] = []
      if (!updatedOrder[pid].includes(newSound.id)) {
        updatedOrder[pid].push(newSound.id)
      }
    })
    setSoundOrder(updatedOrder)
    await save('soundOrder', updatedOrder)
    return newSound
  }, [sounds, soundOrder, save])

  const restoreSounds = useCallback(async (soundList) => {
    if (!Array.isArray(soundList) || soundList.length === 0) return 0

    const existingIds = new Set(soundsRef.current.map((s) => s.id))
    const toRestore = soundList
      .filter((s) => s && s.id && !existingIds.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name || 'Son restauré',
        path: normalizePath(s.path),
        image: normalizePath(s.image) || null,
        emoji: s.emoji || '🔊',
        favorites: Array.isArray(s.favorites) ? s.favorites : [],
        profiles: Array.isArray(s.profiles) ? s.profiles : ['all'],
        volume: s.volume ?? 0,
        volumeDb: s.volumeDb ?? 0,
        createdAt: s.createdAt || Date.now(),
        playCount: s.playCount || 0,
        lastPlayed: s.lastPlayed || null,
      }))

    if (toRestore.length === 0) return 0

    const updated = [...soundsRef.current, ...toRestore]
    setSounds(updated)
    soundsRef.current = updated
    await save('sounds', updated)
    return toRestore.length
  }, [save])

  const deleteSound = useCallback(async (soundId) => {
    const sound = sounds.find(s => s.id === soundId)
    if (!sound) return false

    const updated = sounds.filter(s => s.id !== soundId)
    setSounds(updated)

    const updatedOrder = { ...soundOrder }
    Object.keys(updatedOrder).forEach(profileId => {
      if (updatedOrder[profileId]) {
        updatedOrder[profileId] = updatedOrder[profileId].filter(id => id !== soundId)
      }
    })
    setSoundOrder(updatedOrder)

    try {
      await save('sounds', updated)
      await save('soundOrder', updatedOrder)
    } catch (e) {
      console.warn('⚠️ [useSounds] échec save lors de la suppression:', e)
      return false
    }

    if (sound?.path) {
      const normalizedPath = normalizePath(sound.path)

      const pathStillUsed = updated.some(
        (s) => s.path && normalizePath(s.path) === normalizedPath
      )

      if (pathStillUsed) {
        console.info(
          'ℹ️ [useSounds] Fichier conservé (encore utilisé par un autre son):',
          normalizedPath
        )
      } else {
        try {
          await window.electronAPI.deleteSoundFile(normalizedPath)
        } catch (e) {
          console.warn('⚠️ [useSounds] échec suppression fichier:', e)
        }
      }
    }

    return true
  }, [sounds, soundOrder, save])

  const updateSound = useCallback(async (soundId, changes) => {
    const updated = sounds.map(s =>
      s.id === soundId ? { ...s, ...changes } : s
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

  const incrementPlayCount = useCallback(async (soundId) => {
    const updated = soundsRef.current.map(s =>
      s.id === soundId
        ? { ...s, playCount: (s.playCount || 0) + 1, lastPlayed: Date.now() }
        : s
    )
    soundsRef.current = updated
    setSounds(updated)

    if (pendingPlayCountSaveRef.current) {
      clearTimeout(pendingPlayCountSaveRef.current)
    }
    pendingPlayCountSaveRef.current = setTimeout(async () => {
      pendingPlayCountSaveRef.current = null
      try {
        await saveRef.current('sounds', soundsRef.current)
      } catch (e) {
        console.warn('⚠️ [useSounds] save playCount échoué:', e)
      }
    }, 1500)
  }, [])

  const toggleFavorite = useCallback(async (soundId, currentProfileId) => {
    const updated = sounds.map(s => {
      if (s.id !== soundId) return s
      const isFav = s.favorites?.includes(currentProfileId) || false
      return {
        ...s,
        favorites: isFav
          ? s.favorites.filter(id => id !== currentProfileId)
          : [...(s.favorites || []), currentProfileId]
      }
    })
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
    if (!updatedOrder[profileId]) updatedOrder[profileId] = []
    if (!updatedOrder[profileId].includes(soundId)) {
      updatedOrder[profileId].push(soundId)
    }
    setSoundOrder(updatedOrder)
    await save('sounds', updated)
    await save('soundOrder', updatedOrder)
  }, [sounds, soundOrder, save])

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
  }, [sounds, soundOrder, save])

  const reorderSounds = useCallback(async (startIndex, endIndex, currentProfileId) => {
    const currentOrder = soundOrder[currentProfileId] || []
    const profileSounds = currentProfileId === 'all'
      ? sounds
      : sounds.filter(s => s.profiles.includes(currentProfileId))

    let orderedIds = currentOrder.length === profileSounds.length
      ? currentOrder
      : profileSounds.map(s => s.id)

    if (startIndex < 0 || startIndex >= orderedIds.length ||
        endIndex < 0 || endIndex >= orderedIds.length) {
      return false
    }

    const [removed] = orderedIds.splice(startIndex, 1)
    orderedIds.splice(endIndex, 0, removed)

    const updatedOrder = { ...soundOrder, [currentProfileId]: orderedIds }
    setSoundOrder(updatedOrder)
    await save('soundOrder', updatedOrder)
    return true
  }, [sounds, soundOrder, save])

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

  const addTagToSound = useCallback(async (soundId, tag) => {
    const currentTags = tags[soundId] || []
    if (currentTags.includes(tag)) return
    const updated = { ...tags, [soundId]: [...currentTags, tag] }
    setTags(updated)
    await save('tags', updated)
  }, [tags, save])

  const removeTagFromSound = useCallback(async (soundId, tag) => {
    const currentTags = tags[soundId] || []
    const updated = { ...tags, [soundId]: currentTags.filter(t => t !== tag) }
    if (updated[soundId].length === 0) delete updated[soundId]
    setTags(updated)
    await save('tags', updated)
  }, [tags, save])

  const getSoundTags = useCallback((soundId) => {
    return tags[soundId] || []
  }, [tags])

  const getOrderedSounds = useCallback((profileId) => {
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
  }, [sounds, soundOrder])

  const getFavoriteSounds = useCallback((profileId) => {
    const ordered = getOrderedSounds(profileId)
    return ordered.filter(s => s.favorites?.includes(profileId) || false)
  }, [getOrderedSounds])

  return {
    sounds,
    setSounds,
    soundOrder,
    setSoundOrder,
    tags,
    setTags,
    addSound,
    restoreSounds,
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
    addTagToSound,
    removeTagFromSound,
    getSoundTags,
    getOrderedSounds,
    getFavoriteSounds,
  }
}