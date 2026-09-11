// electron/modules/shortcutManager.js
const { globalShortcut, ipcMain } = require('electron')
const store = require('../store')

let globalShortcutsEnabled = store.get('globalShortcutsEnabled', true)
let registeredShortcuts = []
let currentToggleWindowShortcut = 'CommandOrControl+Shift+S'

function safeRegister(accelerator, callback) {
  if (!accelerator) return false
  try {
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

function registerShortcutHandlers() {
  console.log('🔧 [shortcutManager] Enregistrement des handlers IPC...')
  
  if (!ipcMain.eventNames().includes('update-shortcuts')) {
    ipcMain.handle('update-shortcuts', (event, shortcuts) => {
      store.set('shortcuts', shortcuts)
      return true
    })
  }
  
  if (!ipcMain.eventNames().includes('update-profile-shortcut')) {
    ipcMain.handle('update-profile-shortcut', (event, accelerator) => {
      store.set('profileShortcut', accelerator)
      return true
    })
  }
  
  if (!ipcMain.eventNames().includes('update-loop-shortcut')) {
    ipcMain.handle('update-loop-shortcut', (event, accelerator) => {
      store.set('loopShortcut', accelerator)
      return true
    })
  }
  
  if (!ipcMain.eventNames().includes('update-stop-all-shortcut')) {
    ipcMain.handle('update-stop-all-shortcut', (event, accelerator) => {
      store.set('stopAllShortcut', accelerator)
      return true
    })
  }
  
  if (!ipcMain.eventNames().includes('update-presentation-shortcut')) {
    ipcMain.handle('update-presentation-shortcut', (event, accelerator) => {
      store.set('presentationShortcut', accelerator)
      return true
    })
  }
  
  if (!ipcMain.eventNames().includes('update-toggle-shortcuts-accelerator')) {
    ipcMain.handle('update-toggle-shortcuts-accelerator', (event, accelerator) => {
      store.set('toggleShortcutsAccelerator', accelerator)
      return true
    })
  }
  
  if (!ipcMain.eventNames().includes('update-toggle-window-shortcut')) {
    ipcMain.handle('update-toggle-window-shortcut', (event, accelerator) => {
      store.set('toggleWindowShortcut', accelerator)
      return true
    })
  }
  
  if (!ipcMain.eventNames().includes('toggle-global-shortcuts')) {
    ipcMain.handle('toggle-global-shortcuts', () => {
      const mainWindow = require('./windowManager').getMainWindow()
      return toggleGlobalShortcuts(mainWindow)
    })
  }
  
  console.log('✅ [shortcutManager] Handlers IPC enregistrés')
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
  registerShortcutHandlers,
}