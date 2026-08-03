// electron/modules/shortcutManager.js
const { globalShortcut } = require('electron')
const Store = require('electron-store')

const store = new Store()
let globalShortcutsEnabled = store.get('globalShortcutsEnabled', true)
let registeredShortcuts = []
let currentToggleWindowShortcut = 'CommandOrControl+Shift+S'

// ─── ENREGISTREMENT ──────────────────────────────────────────────────────────

function safeRegister(accelerator, callback) {
  if (!accelerator) return false
  try {
    const isFn = /^F\d+$/.test(accelerator)
    const hasMod = accelerator.includes('+')
    if (!isFn && !hasMod) {
      const ok = globalShortcut.register(accelerator, callback)
      if (ok) registeredShortcuts.push(accelerator)
      return ok
    }
    const ok = globalShortcut.register(accelerator, callback)
    if (ok) registeredShortcuts.push(accelerator)
    return ok
  } catch (e) {
    console.warn('Raccourci non supporté:', accelerator, e.message)
    return false
  }
}

function unregisterAllShortcuts() {
  registeredShortcuts.forEach(acc => {
    try {
      globalShortcut.unregister(acc)
    } catch (e) {}
  })
  registeredShortcuts = []
  console.log('🔇 Tous les raccourcis désenregistrés')
}

function registerShortcuts(mainWindow) {
  if (!globalShortcutsEnabled) {
    console.log('🔇 Raccourcis globaux désactivés')
    return
  }

  const shortcuts = store.get('shortcuts', {})
  Object.entries(shortcuts).forEach(([soundId, accelerator]) => {
    if (!accelerator) return
    safeRegister(accelerator, () => {
      mainWindow?.webContents.send('play-sound', soundId)
    })
  })

  const profileShortcut = store.get('profileShortcut', '')
  if (profileShortcut) {
    safeRegister(profileShortcut, () => {
      mainWindow?.webContents.send('switch-profile')
    })
  }

  const loopShortcut = store.get('loopShortcut', '')
  if (loopShortcut) {
    safeRegister(loopShortcut, () => {
      mainWindow?.webContents.send('toggle-loop')
    })
  }

  const stopAllShortcut = store.get('stopAllShortcut', '')
  if (stopAllShortcut) {
    safeRegister(stopAllShortcut, () => {
      mainWindow?.webContents.send('stop-all-sounds')
    })
  }

  const presentationShortcut = store.get('presentationShortcut', '')
  if (presentationShortcut) {
    safeRegister(presentationShortcut, () => {
      mainWindow?.webContents.send('toggle-presentation')
    })
  }

  console.log('✅ Raccourcis globaux activés')
}

function reregisterShortcuts(mainWindow) {
  unregisterAllShortcuts()
  if (globalShortcutsEnabled) {
    registerShortcuts(mainWindow)
  }
  if (mainWindow) {
    mainWindow.webContents.send('shortcuts-toggle', globalShortcutsEnabled)
  }
}

function toggleGlobalShortcuts(mainWindow) {
  globalShortcutsEnabled = !globalShortcutsEnabled
  store.set('globalShortcutsEnabled', globalShortcutsEnabled)

  if (globalShortcutsEnabled) {
    registerShortcuts(mainWindow)
  } else {
    unregisterAllShortcuts()
  }

  if (mainWindow) {
    mainWindow.webContents.send('shortcuts-toggle', globalShortcutsEnabled)
  }

  return globalShortcutsEnabled
}

function registerToggleShortcut(mainWindow) {
  const toggleAccelerator = store.get('toggleShortcutsAccelerator', 'CommandOrControl+Shift+K')
  if (!toggleAccelerator) return

  try {
    globalShortcut.unregister(toggleAccelerator)

    const ok = globalShortcut.register(toggleAccelerator, () => {
      globalShortcutsEnabled = !globalShortcutsEnabled
      store.set('globalShortcutsEnabled', globalShortcutsEnabled)

      if (globalShortcutsEnabled) {
        registerShortcuts(mainWindow)
      } else {
        unregisterAllShortcuts()
      }

      if (mainWindow) {
        mainWindow.webContents.send('shortcuts-toggle', globalShortcutsEnabled)
      }

      const state = globalShortcutsEnabled ? 'activés' : 'désactivés'
      console.log(`🔇 Raccourcis ${state}`)
    })

    if (ok) {
      console.log('✅ Raccourci toggle enregistré:', toggleAccelerator)
    } else {
      console.warn('⚠️ Impossible d\'enregistrer le raccourci toggle:', toggleAccelerator)
    }
  } catch (e) {
    console.warn('Erreur enregistrement toggle:', e.message)
  }
}

function registerToggleWindowShortcut(mainWindow, shortcut) {
  if (!shortcut) {
    shortcut = currentToggleWindowShortcut
  }
  
  try {
    globalShortcut.unregister(currentToggleWindowShortcut)
  } catch (e) {}
  
  if (!shortcut) {
    console.log('ℹ️ Raccourci toggle fenêtre désactivé')
    return
  }
  
  try {
    const ok = globalShortcut.register(shortcut, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
    
    if (ok) {
      currentToggleWindowShortcut = shortcut
      console.log(`✅ Raccourci pour toggle la fenêtre enregistré: ${shortcut}`)
    } else {
      console.warn(`⚠️ Impossible d'enregistrer le raccourci: ${shortcut}`)
    }
  } catch (e) {
    console.warn('Erreur enregistrement toggle fenêtre:', e.message)
  }
}

function getShortcutsEnabled() {
  return globalShortcutsEnabled
}

function getRegisteredShortcuts() {
  return registeredShortcuts
}

function cleanupShortcuts() {
  unregisterAllShortcuts()
  globalShortcut.unregisterAll()
}

module.exports = {
  registerShortcuts,
  reregisterShortcuts,
  toggleGlobalShortcuts,
  registerToggleShortcut,
  registerToggleWindowShortcut,
  getShortcutsEnabled,
  getRegisteredShortcuts,
  cleanupShortcuts,
  unregisterAllShortcuts,
}