// electron/main.js
const { app, Menu, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const {
  storeHandlers,
  windowManager,
  trayManager,
  shortcutManager,
  ipcHandlers,
  fileHandlers,
  diagnostic,
  registerProjectHandlers,
} = require('./modules')

const store = require('./store')

// Supprimer la barre de menu native
Menu.setApplicationMenu(null)

let mainWindow = null
let isQuitting = false

const isDev = !app.isPackaged

// ─── SINGLE INSTANCE ──────────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  windowManager.focusMainWindow()
})

// ─── RÉPERTOIRES ─────────────────────────────────────────────────────────

const soundsDir = path.join(app.getPath('userData'), 'sounds')
if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true })

const shouldStartMinimized = store.get('startMinimized', false)

// ─── ENREGISTREMENT DES HANDLERS ────────────────────────────────────────

function registerAllHandlers() {
  // Store - TOUJOURS en premier
  if (storeHandlers && typeof storeHandlers.registerStoreHandlers === 'function') {
    storeHandlers.registerStoreHandlers()
  } else {
    console.error('❌ storeHandlers.registerStoreHandlers n\'est pas une fonction !')
  }

  // Projets - après storeHandlers
  registerProjectHandlers(store)

  // Raccourcis
  if (shortcutManager && typeof shortcutManager.registerShortcutHandlers === 'function') {
    shortcutManager.registerShortcutHandlers()
  }

  // Système - handlers généraux (INCLUT fetch-myinstants)
  if (ipcHandlers && typeof ipcHandlers.registerSystemHandlers === 'function') {
    ipcHandlers.registerSystemHandlers()
  }

  // Fichiers - avec la référence à mainWindow
  if (fileHandlers && typeof fileHandlers.registerFileHandlers === 'function') {
    fileHandlers.registerFileHandlers(mainWindow, soundsDir)
  }

  // Confirmation - avec windowManager
  if (ipcHandlers && typeof ipcHandlers.registerConfirmHandlers === 'function') {
    ipcHandlers.registerConfirmHandlers(windowManager)
  }

  // Diagnostic
  if (diagnostic && typeof diagnostic.registerDiagnosticHandlers === 'function') {
    diagnostic.registerDiagnosticHandlers()
  }

  // Gestion du tray
  if (ipcHandlers && typeof ipcHandlers.registerTrayUpdateHandler === 'function') {
    ipcHandlers.registerTrayUpdateHandler((lang) => {
      updateTrayMenu()
    })
  }
}

// ─── CRÉATION DE LA FENÊTRE ─────────────────────────────────────────────

function createMainWindow() {
  mainWindow = windowManager.createWindow(shouldStartMinimized)

  registerAllHandlers()

  mainWindow.once('ready-to-show', () => {
    const lang = store.get('lang', 'fr')

    trayManager.createTray(lang, {
      onOpen: () => {
        windowManager.showMainWindow()
      },
      onToggleShortcuts: () => {
        shortcutManager.toggleGlobalShortcuts(mainWindow)
        updateTrayMenu()
      },
      onLaunchAtStartup: (checked) => {
        store.set('launchAtStartup', checked)
      },
      onStartMinimized: (checked) => {
        store.set('startMinimized', checked)
      },
      onQuit: () => {
        isQuitting = true
        app.quit()
      },
      onDoubleClick: () => {
        windowManager.showMainWindow()
      }
    })

    shortcutManager.registerShortcuts(mainWindow)
    shortcutManager.registerToggleShortcut(mainWindow)

    const savedToggleWindowShortcut = store.get('toggleWindowShortcut', 'CommandOrControl+Shift+S')
    shortcutManager.registerToggleWindowShortcut(mainWindow, savedToggleWindowShortcut)

    if (!shouldStartMinimized) {
      mainWindow.show()
    }

    if (isDev) {
      setTimeout(() => {
        diagnostic.runFullDiagnostic()
      }, 3000)
    }
  })

  mainWindow.on('close', (e) => {
    const closeToTray = store.get('closeToTray', true)

    if (isQuitting) {
      return
    }

    if (closeToTray === false) {
      isQuitting = true
      app.quit()
      return
    }

    e.preventDefault()
    mainWindow.webContents.send('show-quit-confirm')
  })

  mainWindow.on('closed', () => {
    windowManager.cleanupWindow()
  })

  return mainWindow
}

// ─── FONCTION POUR METTRE À JOUR LE MENU DU TRAY ─────────────────────────

function updateTrayMenu() {
  const lang = store.get('lang', 'fr')
  trayManager.updateTrayMenu(lang, {
    onOpen: () => windowManager.showMainWindow(),
    onToggleShortcuts: () => {
      shortcutManager.toggleGlobalShortcuts(mainWindow)
      setTimeout(() => updateTrayMenu(), 100)
    },
    onLaunchAtStartup: (checked) => {
      store.set('launchAtStartup', checked)
    },
    onStartMinimized: (checked) => {
      store.set('startMinimized', checked)
    },
    onQuit: () => {
      isQuitting = true
      app.quit()
    },
    onDoubleClick: () => {
      windowManager.showMainWindow()
    }
  })
}

// ─── APP ──────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Nettoyer les raccourcis orphelins
  const sounds = store.get('sounds', [])
  const soundIds = new Set(sounds.map(s => s.id))
  const shortcuts = store.get('shortcuts', {})
  let hasChanges = false

  Object.keys(shortcuts).forEach(id => {
    if (!soundIds.has(id)) {
      delete shortcuts[id]
      hasChanges = true
    }
  })

  if (hasChanges) {
    store.set('shortcuts', shortcuts)
  }

  const systemLang = app.getLocale().split('-')[0]
  const supportedLangs = ['fr', 'en', 'es']
  const savedLang = store.get('lang')

  if (!savedLang && supportedLangs.includes(systemLang)) {
    store.set('lang', systemLang)
  }

  await createMainWindow()

  app.on('activate', () => {
    if (!mainWindow) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (isQuitting) {
    shortcutManager.cleanupShortcuts()
    trayManager.destroyTray()
    app.quit()
    return
  }
})

app.on('before-quit', () => {
  isQuitting = true
  shortcutManager.cleanupShortcuts()
  trayManager.destroyTray()
})