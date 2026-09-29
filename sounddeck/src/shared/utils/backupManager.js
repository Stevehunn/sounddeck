// src/shared/utils/backupManager.js
import { logWarn, logError } from './logger'

let backupInterval = null
let backupConfig = {
  enabled: true,
  interval: 5,
  maxBackups: 10,
  autoRestore: false,
}

const STORE_KEY_BACKUPS = 'sounddeckBackups'
const STORE_KEY_LAST_TIME = 'lastBackupTime'
const LEGACY_LS_KEY = 'sounddeck-backups'

async function readBackups() {
  try {
    let data = await window.electronAPI?.storeGet?.(STORE_KEY_BACKUPS)

    if (!Array.isArray(data)) {
      const legacy = localStorage.getItem(LEGACY_LS_KEY)
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy)
          if (Array.isArray(parsed)) {
            data = parsed
            await window.electronAPI?.storeSet?.(STORE_KEY_BACKUPS, parsed)
            localStorage.removeItem(LEGACY_LS_KEY)
          }
        } catch (e) {}
      }
    }

    return Array.isArray(data) ? data : []
  } catch (e) {
    logWarn('backupManager', 'Erreur lecture backups', e)
    return []
  }
}

async function writeBackups(list) {
  try {
    await window.electronAPI?.storeSet?.(STORE_KEY_BACKUPS, list)
  } catch (e) {
    logWarn('backupManager', 'Erreur écriture backups', e)
  }
}

export function initBackupManager(store, config = {}) {
  backupConfig = { ...backupConfig, ...config }
  if (!backupConfig.enabled) return

  startAutoBackup(store)

  if (backupConfig.autoRestore) {
    checkAndRestoreBackup(store)
  }
}

let initialTimeout = null

export function startAutoBackup(store) {
  if (backupInterval) clearInterval(backupInterval)
  if (initialTimeout) clearTimeout(initialTimeout)

  const intervalMs = backupConfig.interval * 60 * 1000
  backupInterval = setInterval(() => {
    performBackup(store)
  }, intervalMs)

  initialTimeout = setTimeout(() => {
    initialTimeout = null
    performBackup(store)
  }, 5000)
}

export function stopAutoBackup() {
  if (backupInterval) {
    clearInterval(backupInterval)
    backupInterval = null
  }
  if (initialTimeout) {
    clearTimeout(initialTimeout)
    initialTimeout = null
  }
}

export async function performBackup(store) {
  try {
    const backupData = {
      timestamp: Date.now(),
      version: '1.1',
      profiles: store.profiles,
      sounds: store.sounds,
      shortcuts: store.shortcuts,
      soundOrder: store.soundOrder,
      tags: store.tags,
      theme: store.theme,
      customTheme: store.customTheme,
      audioDevice: store.audioDevice,
      localAudioDevice: store.localAudioDevice,
      volume: store.volume,
      playLocally: store.playLocally,
      normalizationEnabled: store.normalizationEnabled,
      normalizationTarget: store.normalizationTarget,
    }

    const backups = await readBackups()
    backups.push(backupData)

    while (backups.length > backupConfig.maxBackups) {
      backups.shift()
    }

    await writeBackups(backups)
    await window.electronAPI?.storeSet?.(STORE_KEY_LAST_TIME, Date.now())

    return { success: true, timestamp: backupData.timestamp }
  } catch (e) {
    logError('backupManager', 'Erreur sauvegarde automatique', e)
    return { success: false, error: e.message }
  }
}

export async function getBackupList() {
  return await readBackups()
}

export async function getBackup(index) {
  const backups = await readBackups()
  return backups[index] || null
}

export async function restoreBackup(store, index) {
  const backup = await getBackup(index)
  if (!backup) {
    return { success: false, error: 'Sauvegarde introuvable' }
  }

  try {
    // ─── PROFILS ─────────────────────────────────────────────────────
    if (backup.profiles && typeof store.replaceAllProfiles === 'function') {
      const allProfile = {
        id: 'all',
        name: 'Tous les sons',
        nameKey: 'allSounds',
        isDefault: true,
      }
      const userProfiles = backup.profiles.filter((p) => p.id !== 'all')
      await store.replaceAllProfiles([allProfile, ...userProfiles])
    }

    // ─── SONS ────────────────────────────────────────────────────────
    if (backup.sounds && typeof store.restoreSounds === 'function') {
      await store.restoreSounds(backup.sounds)
    }

    // ─── RACCOURCIS ✅ FIX ─────────────────────────────────────────
    if (backup.shortcuts) {
      if (typeof store.setShortcuts === 'function') {
        await store.setShortcuts(backup.shortcuts)
      }
      // Re-register dans le main process
      try {
        await window.electronAPI?.updateShortcuts?.(backup.shortcuts)
      } catch (e) {
        logWarn('backupManager', 'Erreur réenregistrement shortcuts', e)
      }
    }

    // ─── ORDRE DES SONS ✅ FIX ─────────────────────────────────────
    if (backup.soundOrder && typeof store.setSoundOrder === 'function') {
      await store.setSoundOrder(backup.soundOrder)
      try {
        await window.electronAPI?.storeSet?.('soundOrder', backup.soundOrder)
      } catch (e) {}
    }

    // ─── TAGS ────────────────────────────────────────────────────────
    if (backup.tags) {
      if (typeof store.setTags === 'function') {
        await store.setTags(backup.tags)
      } else if (typeof store.addTagToSound === 'function') {
        // Fallback : ajout tag par tag
        for (const [soundId, tags] of Object.entries(backup.tags)) {
          for (const tag of tags) {
            await store.addTagToSound(soundId, tag)
          }
        }
      }
    }

    // ─── SETTINGS ────────────────────────────────────────────────────
    if (backup.theme !== undefined) await store.updateTheme(backup.theme)
    if (backup.customTheme !== undefined) await store.updateCustomTheme(backup.customTheme)
    if (backup.audioDevice !== undefined) await store.updateAudioDevice(backup.audioDevice)
    if (backup.localAudioDevice !== undefined) {
      await store.updateLocalAudioDevice?.(backup.localAudioDevice)
    }
    if (backup.volume !== undefined) await store.updateVolume(backup.volume)
    if (backup.playLocally !== undefined) await store.updatePlayLocally(backup.playLocally)

    // Normalisation restaurée
    if (backup.normalizationEnabled !== undefined) {
      await store.updateNormalizationEnabled?.(backup.normalizationEnabled)
    }
    if (backup.normalizationTarget !== undefined) {
      await store.updateNormalizationTarget?.(backup.normalizationTarget)
    }

    return { success: true, timestamp: backup.timestamp }
  } catch (e) {
    logError('backupManager', 'Erreur restauration', e)
    return { success: false, error: e.message }
  }
}

export async function deleteBackup(index) {
  try {
    const backups = await readBackups()

    if (index < 0 || index >= backups.length) {
      return { success: false, error: 'Index invalide' }
    }

    backups.splice(index, 1)
    await writeBackups(backups)

    return { success: true }
  } catch (e) {
    logError('backupManager', 'Erreur deleteBackup', e)
    return { success: false, error: e.message }
  }
}

async function checkAndRestoreBackup(store) {
  try {
    const lastBackupTime = await window.electronAPI?.storeGet?.(STORE_KEY_LAST_TIME)
    if (lastBackupTime) {
      const backups = await readBackups()
      const lastIndex = backups.length - 1
      if (lastIndex >= 0) {
        await restoreBackup(store, lastIndex)
      }
    }
  } catch (e) {
    logWarn('backupManager', 'Erreur restauration automatique', e)
  }
}

export async function exportBackups() {
  try {
    const backups = await readBackups()

    if (backups.length === 0) {
      return { success: false, error: 'Aucune sauvegarde à exporter' }
    }

    const json = JSON.stringify(backups, null, 2)
    const defaultName = `sounddeck-backups-${new Date().toISOString().slice(0, 10)}.json`

    const r = await window.electronAPI.exportJsonFile(
      json,
      defaultName,
      'Exporter les sauvegardes'
    )

    if (r?.success) {
      return { success: true, path: r.path }
    } else if (r?.canceled) {
      return { success: false, canceled: true }
    } else {
      return { success: false, error: r?.error || 'Erreur inconnue' }
    }
  } catch (e) {
    logError('backupManager', 'exportBackups error', e)
    return { success: false, error: e.message }
  }
}

export function importBackups(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (Array.isArray(data)) {
          await writeBackups(data)
          resolve({ success: true, count: data.length })
        } else {
          reject(new Error('Format invalide'))
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export default {
  initBackupManager,
  startAutoBackup,
  stopAutoBackup,
  performBackup,
  getBackupList,
  getBackup,
  restoreBackup,
  deleteBackup,
  exportBackups,
  importBackups,
}