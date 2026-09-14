// src/shared/utils/backupManager.js
// Gestionnaire de sauvegarde automatique

let backupInterval = null
let backupConfig = {
  enabled: true,
  interval: 5,
  maxBackups: 10,
  autoRestore: false
}

/**
 * Initialise le gestionnaire de sauvegarde
 */
export function initBackupManager(store, config = {}) {
  backupConfig = { ...backupConfig, ...config }

  if (!backupConfig.enabled) {
    return
  }

  startAutoBackup(store)

  if (backupConfig.autoRestore) {
    checkAndRestoreBackup(store)
  }
}

/**
 * Démarre les sauvegardes automatiques
 */
export function startAutoBackup(store) {
  if (backupInterval) {
    clearInterval(backupInterval)
  }

  const intervalMs = backupConfig.interval * 60 * 1000

  backupInterval = setInterval(() => {
    performBackup(store)
  }, intervalMs)

  setTimeout(() => performBackup(store), 5000)
}

/**
 * Arrête les sauvegardes automatiques
 */
export function stopAutoBackup() {
  if (backupInterval) {
    clearInterval(backupInterval)
    backupInterval = null
  }
}

/**
 * Effectue une sauvegarde
 */
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

    const backups = getBackupList()
    backups.push(backupData)

    while (backups.length > backupConfig.maxBackups) {
      backups.shift()
    }

    localStorage.setItem('sounddeck-backups', JSON.stringify(backups))

    await window.electronAPI.storeSet('autoBackup', backupData)
    await window.electronAPI.storeSet('lastBackupTime', Date.now())

    return { success: true, timestamp: backupData.timestamp }

  } catch (e) {
    console.error('❌ Erreur sauvegarde automatique:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Récupère la liste des sauvegardes
 */
export function getBackupList() {
  try {
    const data = localStorage.getItem('sounddeck-backups')
    return data ? JSON.parse(data) : []
  } catch (e) {
    console.warn('Erreur lecture sauvegardes:', e)
    return []
  }
}

/**
 * Récupère une sauvegarde spécifique
 */
export function getBackup(index) {
  const backups = getBackupList()
  return backups[index] || null
}

/**
 * Restaure une sauvegarde
 */
export async function restoreBackup(store, index) {
  const backup = getBackup(index)
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
                profiles: sound.profiles || ['all']
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

/**
 * Supprime une sauvegarde spécifique
 */
export function deleteBackup(index) {
  try {
    const backups = getBackupList()

    if (index < 0 || index >= backups.length) {
      return { success: false, error: 'Index invalide' }
    }

    backups.splice(index, 1)
    localStorage.setItem('sounddeck-backups', JSON.stringify(backups))

    return { success: true }
  } catch (e) {
    console.error('❌ [backupManager] Erreur deleteBackup:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Vérifie et restaure automatiquement la dernière sauvegarde
 */
async function checkAndRestoreBackup(store) {
  try {
    const lastBackup = await window.electronAPI.storeGet('autoBackup')
    if (lastBackup) {
      const backups = getBackupList()
      const lastIndex = backups.length - 1
      if (lastIndex >= 0) {
        await restoreBackup(store, lastIndex)
      }
    }
  } catch (e) {
    console.warn('⚠️ Erreur restauration automatique:', e)
  }
}

/**
 * ✅ Exporte les sauvegardes vers un fichier JSON via IPC
 * (contourne le blocage will-download de Electron)
 */
export async function exportBackups() {
  try {
    const backups = getBackupList()

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

/**
 * Importe des sauvegardes depuis un fichier
 */
export function importBackups(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (Array.isArray(data)) {
          localStorage.setItem('sounddeck-backups', JSON.stringify(data))
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
  importBackups
}