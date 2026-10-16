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
  protocolHandler,
  registerProjectHandlers,
} = require('./modules')

const { registerSoundPopupHandlers } = require('./modules/soundPopupManager')
const { initAutoUpdater } = require('./modules/autoUpdater')

const store = require('./store')

// ─── CONFIGURATION DES WEBHOOKS FEEDBACK ──────────────────────────────
function initFeedbackWebhooks() {
  try {
    let fileConfig = {}
    try {
      // eslint-disable-next-line global-require
      fileConfig = require('./feedback-config')
    } catch (e) {
      // Aucun fichier config — c'est OK
    }

    // ─── 1. Webhook par défaut ─────────────────────────────────────
    const envDefault = process.env.SOUNDDECK_FEEDBACK_WEBHOOK
    const fileDefault = fileConfig?.default
    const finalDefault = envDefault || fileDefault

    const existingDefault = store.get('feedbackWebhookUrl')
    if (finalDefault && !existingDefault) {
      store.set('feedbackWebhookUrl', finalDefault)
    }

    // ─── 2. Webhooks par type ──────────────────────────────────────
    const envPerType = {
      bug: process.env.SOUNDDECK_FEEDBACK_WEBHOOK_BUG,
      feature: process.env.SOUNDDECK_FEEDBACK_WEBHOOK_FEATURE,
      question: process.env.SOUNDDECK_FEEDBACK_WEBHOOK_QUESTION,
      praise: process.env.SOUNDDECK_FEEDBACK_WEBHOOK_PRAISE,
    }
    const filePerType = fileConfig?.perType || {}

    const finalPerType = {}
    for (const type of ['bug', 'feature', 'question', 'praise']) {
      const v = envPerType[type] || filePerType[type]
      if (v) finalPerType[type] = v
    }

    const existingPerType = store.get('feedbackWebhookUrls') || {}
    const mergedPerType = { ...finalPerType, ...existingPerType }

    const hasNew = Object.keys(finalPerType).some(
      (k) => finalPerType[k] && !existingPerType[k]
    )
    if (hasNew) {
      store.set('feedbackWebhookUrls', mergedPerType)
      const count = Object.keys(finalPerType).length
    }

    // ─── 3. Log récapitulatif (DEV uniquement) ─────────────────────
    if (!app.isPackaged) {
      const finalDefaultState = store.get('feedbackWebhookUrl')
      const finalPerTypeState = store.get('feedbackWebhookUrls') || {}
      console.log('📬 [feedback-config] État final:', {
        default: finalDefaultState ? '(défini)' : '(vide)',
        perType: Object.keys(finalPerTypeState).length > 0
          ? Object.keys(finalPerTypeState)
          : '(aucun)',
      })
    }
  } catch (e) {
    console.warn('⚠️ [feedback-config] Erreur init:', e.message)
  }
}

// Supprimer la barre de menu native
Menu.setApplicationMenu(null)

protocolHandler.registerLocalSchemes()

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
  if (storeHandlers && typeof storeHandlers.registerStoreHandlers === 'function') {
    storeHandlers.registerStoreHandlers()
  } else {
    console.error('❌ storeHandlers.registerStoreHandlers n\'est pas une fonction !')
  }

  registerProjectHandlers(store)

  if (shortcutManager && typeof shortcutManager.registerShortcutHandlers === 'function') {
    shortcutManager.registerShortcutHandlers()
  }

  if (ipcHandlers && typeof ipcHandlers.registerSystemHandlers === 'function') {
    ipcHandlers.registerSystemHandlers()
  }

  if (fileHandlers && typeof fileHandlers.registerFileHandlers === 'function') {
    fileHandlers.registerFileHandlers(mainWindow, soundsDir)
  }

  if (ipcHandlers && typeof ipcHandlers.registerConfirmHandlers === 'function') {
    ipcHandlers.registerConfirmHandlers(windowManager)
  }

  if (diagnostic && typeof diagnostic.registerDiagnosticHandlers === 'function') {
    diagnostic.registerDiagnosticHandlers()
  }

  if (ipcHandlers && typeof ipcHandlers.registerTrayUpdateHandler === 'function') {
    ipcHandlers.registerTrayUpdateHandler(() => {
      updateTrayMenu()
    })
  }

  registerSoundPopupHandlers(ipcMain, { getMainWindow: () => mainWindow })
}

// ─── CRÉATION DE LA FENÊTRE ─────────────────────────────────────────────

function createMainWindow() {
  mainWindow = windowManager.createWindow(shouldStartMinimized)

  registerAllHandlers()

  // ✅ Auto-updater
  initAutoUpdater(() => mainWindow)

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
      },
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

    if (isQuitting) return

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
    },
  })
}

// ─── APP ──────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  protocolHandler.registerLocalFileProtocol()

  // ✅ Stocker la version de l'app pour le check de mise à jour
  try {
    store.set('appVersion', app.getVersion())
  } catch (e) {
    console.warn('⚠️ Impossible de stocker appVersion:', e.message)
  }

  // injecte les webhooks feedback (avant de créer la fenêtre)
  initFeedbackWebhooks()

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