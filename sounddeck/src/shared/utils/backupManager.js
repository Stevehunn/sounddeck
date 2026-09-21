// src/shared/utils/backupManager.js

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

// ─── STORAGE HELPERS ────────────────────────────────────────────────────────

async function readBackups() {
  try {
    let data = await window.electronAPI?.storeGet?.(STORE_KEY_BACKUPS)

    // Migration douce depuis localStorage (une seule fois)
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
        } catch (e) {
          // silencieux
        }
      }
    }

    return Array.isArray(data) ? data : []
  } catch (e) {
    console.warn('⚠️ [backupManager] Erreur lecture backups:', e)
    return []
  }
}

async function writeBackups(list) {
  try {
    await window.electronAPI?.storeSet?.(STORE_KEY_BACKUPS, list)
  } catch (e) {
    console.warn('⚠️ [backupManager] Erreur écriture backups:', e)
  }
}

// ─── INIT ───────────────────────────────────────────────────────────────────

export function initBackupManager(store, config = {}) {
  backupConfig = { ...backupConfig, ...config }
  if (!backupConfig.enabled) return

  startAutoBackup(store)

  if (backupConfig.autoRestore) {
    checkAndRestoreBackup(store)
  }
}

export function startAutoBackup(store) {
  if (backupInterval) clearInterval(backupInterval)

  const intervalMs = backupConfig.interval * 60 * 1000
  backupInterval = setInterval(() => {
    performBackup(store)
  }, intervalMs)

  setTimeout(() => performBackup(store), 5000)
}

export function stopAutoBackup() {
  if (backupInterval) {
    clearInterval(backupInterval)
    backupInterval = null
  }
}

// ─── ACTIONS ────────────────────────────────────────────────────────────────

export async function performBackup(store) {
  try {
    const backupData = {
      timestamp: Date.now(),
      version: '1.0',
      profiles: store.profiles,
      sounds: store.sounds,
      shortcuts: store.shortcuts,
      soundOrder: store.soundOrder,
      tags: store.tags,
      theme: store.theme,
      customTheme: store.customTheme,
      audioDevice: store.audioDevice,
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
    console.error('❌ Erreur sauvegarde automatique:', e)
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
    if (backup.profiles) {
      for (const profile of backup.profiles) {
        if (profile.id !== 'all') {
          const exists = store.profiles.find(p => p.id === profile.id)
          if (!exists) {
            await store.createProfile(profile.name)
          }
        }
      }
    }

    if (backup.sounds) {
      for (const sound of backup.sounds) {
        if (sound.path) {
          const exists = await window.electronAPI.fileExists(sound.path)
          if (exists) {
            const soundExists = store.sounds.find(s => s.id === sound.id)
            if (!soundExists) {
              await store.addSound({
                name: sound.name,
                path: sound.path,
                image: sound.image,
                emoji: sound.emoji || '🔊',
                profiles: sound.profiles || ['all'],
              })
            }
          }
        }
      }
    }

    if (backup.tags) {
      for (const [soundId, tags] of Object.entries(backup.tags)) {
        for (const tag of tags) {
          await store.addTagToSound(soundId, tag)
        }
      }
    }

    if (backup.theme) await store.updateTheme(backup.theme)
    if (backup.customTheme) await store.updateCustomTheme(backup.customTheme)
    if (backup.audioDevice) await store.updateAudioDevice(backup.audioDevice)
    if (backup.volume) await store.updateVolume(backup.volume)
    if (backup.playLocally !== undefined) await store.updatePlayLocally(backup.playLocally)

    return { success: true, timestamp: backup.timestamp }
  } catch (e) {
    console.error('❌ Erreur restauration:', e)
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
    console.error('❌ [backupManager] Erreur deleteBackup:', e)
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
    console.warn('⚠️ Erreur restauration automatique:', e)
  }
}

// ─── IMPORT / EXPORT ────────────────────────────────────────────────────────

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
    console.error('❌ [backupManager] exportBackups error:', e)
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