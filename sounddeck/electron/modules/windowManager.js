// electron/modules/windowManager.js
const { BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null
let isQuitting = false
let pendingQuit = false
let closeToTray = true

const isDev = !require('electron').app.isPackaged

// ─── CRÉATION DE LA FENÊTRE ──────────────────────────────────────────────

function createWindow(shouldStartMinimized = false) {
  const iconPath = path.join(__dirname, '../../public/icon.ico')

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    backgroundColor: '#111113',
    show: !shouldStartMinimized,
    autoHideMenuBar: true,
    frame: true,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    let indexPath = path.join(require('electron').app.getAppPath(), 'dist', 'index.html')

    if (!fs.existsSync(indexPath)) {
      const resourcePath = path.join(process.resourcesPath, 'app', 'dist', 'index.html')
      if (fs.existsSync(resourcePath)) {
        indexPath = resourcePath
      } else {
        const exePath = path.join(
          path.dirname(require('electron').app.getPath('exe')),
          'resources',
          'app',
          'dist',
          'index.html'
        )
        if (fs.existsSync(exePath)) {
          indexPath = exePath
        }
      }
    }

    if (!fs.existsSync(indexPath)) {
      console.error('❌ ERREUR: index.html introuvable !')
      dialog.showErrorBox(
        'Erreur de chargement',
        'Impossible de trouver index.html.\n\n' +
          'Chemin recherché: ' + indexPath + '\n\n' +
          'Vérifiez que le build est correct.'
      )
      require('electron').app.quit()
      return
    }

    mainWindow.loadFile(indexPath)
  }

  mainWindow.webContents.on('will-navigate', (e, url) => {
    const currentUrl = mainWindow.webContents.getURL()
    if (url === currentUrl) return

    e.preventDefault()

    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        require('electron').shell.openExternal(url)
      } catch (err) {
        console.warn('[will-navigate] openExternal error:', err.message)
      }
    }

    if (isDev) {
      console.log(`🔒 [will-navigate] Navigation bloquée : ${url}`)
    }
  })

  mainWindow.webContents.session.on('will-download', (e, item) => {
    e.preventDefault()
    if (isDev) {
      console.log(`🔒 [will-download] Téléchargement bloqué : ${item?.getURL?.() || 'unknown'}`)
    }
  })

  return mainWindow
}

// ─── GESTION DE LA FENÊTRE ───────────────────────────────────────────────

function getMainWindow() {
  return mainWindow
}

function showMainWindow() {
  if (mainWindow) {
    const wasHidden = !mainWindow.isVisible()
    if (wasHidden) {
      mainWindow.webContents.send('hide-quit-confirm')
    }
    mainWindow.show()
    mainWindow.focus()
  }
}

function hideMainWindow() {
  if (mainWindow) {
    mainWindow.hide()
  }
}

function isWindowVisible() {
  return mainWindow ? mainWindow.isVisible() : false
}

function focusMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
}

// ─── GESTION DE LA FERMETURE ─────────────────────────────────────────────

function setQuitting(value) { isQuitting = value }
function setPendingQuit(value) { pendingQuit = value }
function setCloseToTray(value) { closeToTray = value }
function getCloseToTray() { return closeToTray }
function getIsQuitting() { return isQuitting }
function getPendingQuit() { return pendingQuit }

// ─── NETTOYAGE ───────────────────────────────────────────────────────────

function cleanupWindow() {
  if (mainWindow) {
    mainWindow = null
  }
}

module.exports = {
  createWindow,
  getMainWindow,
  showMainWindow,
  hideMainWindow,
  isWindowVisible,
  focusMainWindow,
  setQuitting,
  setPendingQuit,
  setCloseToTray,
  getCloseToTray,
  getIsQuitting,
  getPendingQuit,
  cleanupWindow,
}