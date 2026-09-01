// src/shared/utils/backupManager.js
// Gestionnaire de sauvegarde automatique

let backupInterval = null
let backupConfig = {
  enabled: true,
  interval: 5, // minutes
  maxBackups: 10,
  autoRestore: false
}

/**
 * Initialise le gestionnaire de sauvegarde
 */
export function initBackupManager(store, config = {}) {
  backupConfig = { ...backupConfig, ...config }
  
  if (!backupConfig.enabled) {
    console.log('ℹ️ Sauvegarde automatique désactivée')
    return
  }
  
  // Démarrer les sauvegardes automatiques
  startAutoBackup(store)
  
  // Vérifier s'il y a une sauvegarde à restaurer au démarrage
  if (backupConfig.autoRestore) {
    checkAndRestoreBackup(store)
  }
  
  console.log(`💾 Sauvegarde automatique activée (toutes les ${backupConfig.interval} minutes)`)
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
  
  // Effectuer une première sauvegarde immédiate
  setTimeout(() => performBackup(store), 5000)
}

/**
 * Arrête les sauvegardes automatiques
 */
export function stopAutoBackup() {
  if (backupInterval) {
    clearInterval(backupInterval)
    backupInterval = null
    console.log('💾 Sauvegarde automatique arrêtée')
  }
}

/**
 * Effectue une sauvegarde
 */
export async function performBackup(store) {
  try {
    console.log('💾 Sauvegarde automatique...')
    
    // Récupérer les données à sauvegarder
    const backupData = {
      timestamp: Date.now(),
      version: '1.0',
      profiles: store.profiles,
      sounds: store.sounds,
      shortcuts: store.shortcuts,
      soundOrder: store.soundOrder,
      tags: store.tags,
      folders: store.folders,
      theme: store.theme,
      customTheme: store.customTheme,
      audioDevice: store.audioDevice,
      volume: store.volume,
      playLocally: store.playLocally,
      normalizationEnabled: store.normalizationEnabled,
      normalizationTarget: store.normalizationTarget,
      // ... autres données
    }
    
    // Sauvegarder dans le localStorage
    const backups = getBackupList()
    backups.push(backupData)
    
    // Limiter le nombre de sauvegardes
    while (backups.length > backupConfig.maxBackups) {
      backups.shift()
    }
    
    localStorage.setItem('sounddeck-backups', JSON.stringify(backups))
    
    // Sauvegarder également dans le store electron
    await window.electronAPI.storeSet('autoBackup', backupData)
    await window.electronAPI.storeSet('lastBackupTime', Date.now())
    
    console.log(`✅ Sauvegarde effectuée à ${new Date().toLocaleTimeString()}`)
    
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
    console.log('🔄 Restauration de la sauvegarde...')
    
    // Restaurer les données une par une
    if (backup.profiles) {
      // On ne peut pas remplacer directement les profils, on les ajoute un par un
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
      // Restaurer les sons (en vérifiant l'existence des fichiers)
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
      // Restaurer les tags
      for (const [soundId, tags] of Object.entries(backup.tags)) {
        for (const tag of tags) {
          await store.addTagToSound(soundId, tag)
        }
      }
    }
    
    if (backup.folders) {
      // Restaurer les dossiers
      for (const [profileId, folders] of Object.entries(backup.folders)) {
        for (const folder of folders) {
          const newFolder = await store.createFolder(profileId, folder.name)
          if (newFolder && folder.soundIds) {
            for (const soundId of folder.soundIds) {
              await store.addSoundToFolder(profileId, newFolder.id, soundId)
            }
          }
        }
      }
    }
    
    // Restaurer les paramètres
    if (backup.theme) await store.updateTheme(backup.theme)
    if (backup.customTheme) await store.updateCustomTheme(backup.customTheme)
    if (backup.audioDevice) await store.updateAudioDevice(backup.audioDevice)
    if (backup.volume) await store.updateVolume(backup.volume)
    if (backup.playLocally !== undefined) await store.updatePlayLocally(backup.playLocally)
    
    console.log('✅ Sauvegarde restaurée avec succès')
    
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
  console.log('🗑️ [backupManager] deleteBackup appelé pour l\'index:', index)
  try {
    const backups = getBackupList()
    console.log('📋 [backupManager] Sauvegardes avant suppression:', backups.length)
    
    if (index < 0 || index >= backups.length) {
      console.error('❌ [backupManager] Index invalide:', index)
      return { success: false, error: 'Index invalide' }
    }
    
    backups.splice(index, 1)
    localStorage.setItem('sounddeck-backups', JSON.stringify(backups))
    console.log('📋 [backupManager] Sauvegardes après suppression:', backups.length)
    
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
      console.log('🔄 Restauration automatique de la dernière sauvegarde...')
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
 * Exporte les sauvegardes
 */
export function exportBackups() {
  const backups = getBackupList()
  const json = JSON.stringify(backups, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sounddeck-backups-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Importe des sauvegardes
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