// src/core/store/hooks/useShortcuts.js
import { useState, useCallback } from 'react'

export function useShortcuts(initialShortcuts = {}, initialProfileShortcut = 'CommandOrControl+Tab', save) {
  const [shortcuts, setShortcuts] = useState(initialShortcuts)
  const [profileShortcut, setProfileShortcut] = useState(initialProfileShortcut)

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

  const cleanupOrphanShortcuts = useCallback(async (soundIds) => {
    const updatedShortcuts = { ...shortcuts }
    let hasChanges = false

    Object.keys(updatedShortcuts).forEach(id => {
      if (!soundIds.has(id)) {
        delete updatedShortcuts[id]
        hasChanges = true
      }
    })

    if (hasChanges) {
      setShortcuts(updatedShortcuts)
      await save('shortcuts', updatedShortcuts)
      await window.electronAPI.updateShortcuts(updatedShortcuts)
    }
    return hasChanges
  }, [shortcuts, save])

  return {
    shortcuts,
    setShortcuts,
    profileShortcut,
    setProfileShortcut,
    setShortcut,
    clearShortcut,
    updateProfileShortcut,
    cleanupOrphanShortcuts,
  }
}