/**
 * @file Auto-backup system for the whole store.
 *
 * Persists a rotating list of backups in the electron-store under
 * `sounddeckBackups`. Each backup contains the full app state:
 * profiles, sounds, shortcuts, sound order, tags, theme, audio devices,
 * volume, play-locally, and normalization settings.
 *
 * Two ways to use it:
 * - **`initBackupManager(store, config)`** — sets up the auto-backup
 *   interval (default: 5 min) and optionally auto-restores the last backup
 *   on startup. Only starts once per process.
 * - **Manual calls** — `performBackup(store)`, `restoreBackup(store, i)`,
 *   `deleteBackup(i)`, `exportBackups()`, `importBackups(file)`.
 *
 * The list is capped at `backupConfig.maxBackups` (default 10). The oldest
 * backup is dropped when the cap is exceeded (FIFO).
 *
 * @see src/shared/components/settings/BackupSettings.jsx
 * @see electron/store.js
 */

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

/**
 * Reads the backup list from the store, migrating from `localStorage` if
 * the store entry is empty (one-time, legacy installations).
 *
 * @returns {Promise<Array<Object>>}
 */
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
        } catch {
          // ignore
        }
      }
    }

    return Array.isArray(data) ? data : []
  } catch (e) {
    logWarn('backupManager', 'Error reading backups', e)
    return []
  }
}

/**
 * Persists the full backup list to the store.
 *
 * @param {Array<Object>} list
 * @returns {Promise<void>}
 */
async function writeBackups(list) {
  try {
    await window.electronAPI?.storeSet?.(STORE_KEY_BACKUPS, list)
  } catch (e) {
    logWarn('backupManager', 'Error writing backups', e)
  }
}

/**
 * Initializes the backup system (interval + optional auto-restore).
 *
 * @param {Object} store - App store (provides the state to snapshot).
 * @param {Object} [config] - Overrides for `backupConfig`.
 * @param {boolean} [config.enabled=true]
 * @param {number} [config.interval=5] - Interval in minutes.
 * @param {number} [config.maxBackups=10]
 * @param {boolean} [config.autoRestore=false] - Restore the last backup at startup.
 * @returns {void}
 */
export function initBackupManager(store, config = {}) {
  backupConfig = { ...backupConfig, ...config }
  if (!backupConfig.enabled) return

  startAutoBackup(store)

  if (backupConfig.autoRestore) {
    checkAndRestoreBackup(store)
  }
}

let initialTimeout = null

/**
 * Starts the periodic backup timer (idempotent — restarts if already running).
 *
 * Fires an immediate backup 5 seconds after startup (to catch crashes very
 * early in the session), then every `backupConfig.interval` minutes.
 *
 * @param {Object} store
 * @returns {void}
 */
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

/**
 * Stops the periodic backup timer.
 * @returns {void}
 */
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

/**
 * Takes a backup of the current store state and appends it to the list.
 *
 * @param {Object} store
 * @returns {Promise<{success: boolean, timestamp?: number, error?: string}>}
 */
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
    logError('backupManager', 'Auto-backup error', e)
    return { success: false, error: e.message }
  }
}

/**
 * Returns the full backup list (oldest first).
 *
 * @returns {Promise<Array<Object>>}
 */
export async function getBackupList() {
  return await readBackups()
}

/**
 * Returns one backup by index (oldest-first ordering).
 *
 * @param {number} index
 * @returns {Promise<Object|null>}
 */
export async function getBackup(index) {
  const backups = await readBackups()
  return backups[index] || null
}

/**
 * Restores a backup into the store.
 *
 * Restores: profiles, sounds, shortcuts (and re-registers them with the
 * main process), sound order, tags, and settings. Missing fields are
 * skipped — partial backups are OK.
 *
 * @param {Object} store
 * @param {number} index
 * @returns {Promise<{success: boolean, timestamp?: number, error?: string}>}
 */
export async function restoreBackup(store, index) {
  const backup = await getBackup(index)
  if (!backup) {
    return { success: false, error: 'Backup not found' }
  }

  try {
    // ─── PROFILES ─────────────────────────────────────────────────────
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

    // ─── SOUNDS ───────────────────────────────────────────────────────
    if (backup.sounds && typeof store.restoreSounds === 'function') {
      await store.restoreSounds(backup.sounds)
    }

    // ─── SHORTCUTS ────────────────────────────────────────────────────
    if (backup.shortcuts) {
      if (typeof store.setShortcuts === 'function') {
        await store.setShortcuts(backup.shortcuts)
      }
      // Re-register with the main process
      try {
        await window.electronAPI?.updateShortcuts?.(backup.shortcuts)
      } catch (e) {
        logWarn('backupManager', 'Error re-registering shortcuts', e)
      }
    }

    // ─── SOUND ORDER ──────────────────────────────────────────────────
    if (backup.soundOrder && typeof store.setSoundOrder === 'function') {
      await store.setSoundOrder(backup.soundOrder)
      try {
        await window.electronAPI?.storeSet?.('soundOrder', backup.soundOrder)
      } catch {
        // ignore
      }
    }

    // ─── TAGS ─────────────────────────────────────────────────────────
    if (backup.tags) {
      if (typeof store.setTags === 'function') {
        await store.setTags(backup.tags)
      } else if (typeof store.addTagToSound === 'function') {
        // Fallback: add tags one by one
        for (const [soundId, tags] of Object.entries(backup.tags)) {
          for (const tag of tags) {
            await store.addTagToSound(soundId, tag)
          }
        }
      }
    }

    // ─── SETTINGS ─────────────────────────────────────────────────────
    if (backup.theme !== undefined) await store.updateTheme(backup.theme)
    if (backup.customTheme !== undefined)
      await store.updateCustomTheme(backup.customTheme)
    if (backup.audioDevice !== undefined)
      await store.updateAudioDevice(backup.audioDevice)
    if (backup.localAudioDevice !== undefined) {
      await store.updateLocalAudioDevice?.(backup.localAudioDevice)
    }
    if (backup.volume !== undefined) await store.updateVolume(backup.volume)
    if (backup.playLocally !== undefined)
      await store.updatePlayLocally(backup.playLocally)

    if (backup.normalizationEnabled !== undefined) {
      await store.updateNormalizationEnabled?.(backup.normalizationEnabled)
    }
    if (backup.normalizationTarget !== undefined) {
      await store.updateNormalizationTarget?.(backup.normalizationTarget)
    }

    return { success: true, timestamp: backup.timestamp }
  } catch (e) {
    logError('backupManager', 'Restore error', e)
    return { success: false, error: e.message }
  }
}

/**
 * Deletes a backup by index.
 *
 * @param {number} index
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteBackup(index) {
  try {
    const backups = await readBackups()

    if (index < 0 || index >= backups.length) {
      return { success: false, error: 'Invalid index' }
    }

    backups.splice(index, 1)
    await writeBackups(backups)

    return { success: true }
  } catch (e) {
    logError('backupManager', 'Delete error', e)
    return { success: false, error: e.message }
  }
}

/**
 * Restores the last backup (used on startup if `autoRestore` is enabled).
 *
 * @param {Object} store
 * @returns {Promise<void>}
 */
async function checkAndRestoreBackup(store) {
  try {
    const lastBackupTime =
      await window.electronAPI?.storeGet?.(STORE_KEY_LAST_TIME)
    if (lastBackupTime) {
      const backups = await readBackups()
      const lastIndex = backups.length - 1
      if (lastIndex >= 0) {
        await restoreBackup(store, lastIndex)
      }
    }
  } catch (e) {
    logWarn('backupManager', 'Auto-restore error', e)
  }
}

/**
 * Exports the backup list to a JSON file (native save dialog).
 *
 * @returns {Promise<{success: boolean, path?: string, canceled?: boolean, error?: string}>}
 */
export async function exportBackups() {
  try {
    const backups = await readBackups()

    if (backups.length === 0) {
      return { success: false, error: 'No backups to export' }
    }

    const json = JSON.stringify(backups, null, 2)
    const defaultName = `sounddeck-backups-${new Date()
      .toISOString()
      .slice(0, 10)}.json`

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
      return { success: false, error: r?.error || 'Unknown error' }
    }
  } catch (e) {
    logError('backupManager', 'exportBackups error', e)
    return { success: false, error: e.message }
  }
}

/**
 * Imports a backup list from a JSON `File` (from a file input).
 *
 * Replaces the current backup list with the imported one.
 *
 * @param {File} file
 * @returns {Promise<{success: boolean, count: number}>}
 */
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
          reject(new Error('Invalid format'))
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