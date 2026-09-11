// electron/main.js
const { app, Menu, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// ─── IMPORTS DES MODULES ──────────────────────────────────────────────────

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

// ─── INITIALISATION ──────────────────────────────────────────────────────

// Supprimer la barre de menu native
Menu.setApplicationMenu(null)

let mainWindow = null
let isQuitting = false

const isDev = !app.isPackaged

// ─── SINGLE INSTANCE ──────────────────────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('ℹ️ Une instance de SoundDeck est déjà en cours. Fermeture...')
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
  console.log('🔧 Enregistrement des handlers IPC...')
  console.log(`📌 mainWindow existe: ${!!mainWindow}`)
  
  // Store - TOUJOURS en premier
  console.log('  📦 Enregistrement storeHandlers...')
  if (storeHandlers && typeof storeHandlers.registerStoreHandlers === 'function') {
    storeHandlers.registerStoreHandlers()
  } else {
    console.error('❌ storeHandlers.registerStoreHandlers n\'est pas une fonction !')
  }
  
  // ✅ PROJETS - APRÈS storeHandlers
  console.log('  📦 Enregistrement projectHandlers...')
  registerProjectHandlers(store)
  console.log('  ✅ projectHandlers enregistrés')
  
  console.log(`  📊 Handlers après store: ${ipcMain.eventNames().join(', ')}`)
  
  // Raccourcis
  console.log('  📦 Enregistrement shortcutManager...')
  if (shortcutManager && typeof shortcutManager.registerShortcutHandlers === 'function') {
    shortcutManager.registerShortcutHandlers()
    console.log('  ✅ shortcutManager.registerShortcutHandlers exécuté')
  } else {
    console.error('❌ shortcutManager.registerShortcutHandlers n\'est pas une fonction !')
  }
  
  console.log(`  📊 Handlers après raccourcis: ${ipcMain.eventNames().join(', ')}`)
  
  // Système - handlers généraux (INCLUT fetch-myinstants)
  console.log('  📦 Enregistrement ipcHandlers (système)...')
  if (ipcHandlers && typeof ipcHandlers.registerSystemHandlers === 'function') {
    ipcHandlers.registerSystemHandlers()
    console.log('  ✅ ipcHandlers.registerSystemHandlers exécuté')
  } else {
    console.error('❌ ipcHandlers.registerSystemHandlers n\'est pas une fonction !')
  }
  
  console.log(`  📊 Handlers après système: ${ipcMain.eventNames().join(', ')}`)
  
  // Fichiers - avec la référence à mainWindow
  console.log('  📦 Enregistrement fileHandlers...')
  if (fileHandlers && typeof fileHandlers.registerFileHandlers === 'function') {
    fileHandlers.registerFileHandlers(mainWindow, soundsDir)
    console.log('  ✅ fileHandlers.registerFileHandlers exécuté')
  } else {
    console.error('❌ fileHandlers.registerFileHandlers n\'est pas une fonction !')
  }
  
  console.log(`  📊 Handlers après fichiers: ${ipcMain.eventNames().join(', ')}`)
  
  // Confirmation - avec windowManager
  console.log('  📦 Enregistrement ipcHandlers (confirmation)...')
  if (ipcHandlers && typeof ipcHandlers.registerConfirmHandlers === 'function') {
    ipcHandlers.registerConfirmHandlers(windowManager)
    console.log('  ✅ ipcHandlers.registerConfirmHandlers exécuté')
  } else {
    console.error('❌ ipcHandlers.registerConfirmHandlers n\'est pas une fonction !')
  }
  
  console.log(`  📊 Handlers après confirmation: ${ipcMain.eventNames().join(', ')}`)
  
  // Diagnostic
  console.log('  📦 Enregistrement diagnostic...')
  if (diagnostic && typeof diagnostic.registerDiagnosticHandlers === 'function') {
    diagnostic.registerDiagnosticHandlers()
    console.log('  ✅ diagnostic.registerDiagnosticHandlers exécuté')
  } else {
    console.error('❌ diagnostic.registerDiagnosticHandlers n\'est pas une fonction !')
  }
  
  console.log(`  📊 Handlers après diagnostic: ${ipcMain.eventNames().join(', ')}`)
  
  // Gestion du tray
  if (ipcHandlers && typeof ipcHandlers.registerTrayUpdateHandler === 'function') {
    ipcHandlers.registerTrayUpdateHandler((lang) => {
      console.log(`🌐 Mise à jour du tray vers la langue: ${lang}`)
      const currentLang = lang || store.get('lang', 'fr')
      updateTrayMenu()
    })
    console.log('  ✅ ipcHandlers.registerTrayUpdateHandler exécuté')
  }
  
  console.log('✅ Tous les handlers IPC enregistrés')
  console.log(`📊 Handlers finaux: ${ipcMain.eventNames().join(', ')}`)
}

// ─── CRÉATION DE LA FENÊTRE ─────────────────────────────────────────────

function createMainWindow() {
  mainWindow = windowManager.createWindow(shouldStartMinimized)
  
  registerAllHandlers()
  
  console.log('🔍 Vérification des handlers essentiels:')
  console.log(`  - fetch-myinstants: ${ipcMain.eventNames().includes('fetch-myinstants') ? '✅' : '❌'}`)
  console.log(`  - update-tray-language: ${ipcMain.eventNames().includes('update-tray-language') ? '✅' : '❌'}`)
  console.log(`  - store-get: ${ipcMain.eventNames().includes('store-get') ? '✅' : '❌'}`)
  console.log(`📊 Tous les handlers: ${ipcMain.eventNames().join(', ')}`)

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
        if (checked) {
          console.log('🔧 Activation du démarrage automatique')
        } else {
          console.log('🔧 Désactivation du démarrage automatique')
        }
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
    console.log('✅ Raccourcis orphelins nettoyés au démarrage')
  }

  const systemLang = app.getLocale().split('-')[0]
  const supportedLangs = ['fr', 'en', 'es']
  const savedLang = store.get('lang')
  
  if (!savedLang && supportedLangs.includes(systemLang)) {
    store.set('lang', systemLang)
    console.log(`🌐 Langue système détectée: ${systemLang}`)
  }

  await createMainWindow()

  const isLaunchAtStartup = store.get('launchAtStartup', false)
  if (isLaunchAtStartup) {
    console.log('🔧 Démarrage automatique activé')
  }

  app.on('activate', () => {
    if (!mainWindow) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (!isQuitting) {
    if (process.platform !== 'darwin') {
      return
    }
  }
  if (isQuitting) {
    shortcutManager.cleanupShortcuts()
    trayManager.destroyTray()
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  shortcutManager.cleanupShortcuts()
  trayManager.destroyTray()
})