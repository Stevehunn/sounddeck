const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

const store = new Store()
const isDev = process.env.NODE_ENV !== 'production'

let mainWindow

// Dossier où les sons sont stockés
const soundsDir = path.join(app.getPath('userData'), 'sounds')
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    show: false,
    icon: path.join(__dirname, '../public/icon.png')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  registerShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

// ─── Raccourcis globaux ───────────────────────────────────────────────────────

let registeredShortcuts = {}

function registerShortcuts() {
  const shortcuts = store.get('shortcuts', {})
  Object.entries(shortcuts).forEach(([soundId, accelerator]) => {
    if (!accelerator) return
    try {
      globalShortcut.register(accelerator, () => {
        mainWindow?.webContents.send('play-sound', soundId)
      })
      registeredShortcuts[soundId] = accelerator
    } catch (e) {
      console.error('Erreur raccourci:', accelerator, e)
    }
  })

  // Raccourci changement de profil
  const profileShortcut = store.get('profileShortcut', 'CommandOrControl+Tab')
  try {
    globalShortcut.register(profileShortcut, () => {
      mainWindow?.webContents.send('switch-profile')
    })
  } catch (e) {}
}

ipcMain.handle('update-shortcuts', (event, shortcuts) => {
  globalShortcut.unregisterAll()
  store.set('shortcuts', shortcuts)
  registerShortcuts()
  return true
})

ipcMain.handle('update-profile-shortcut', (event, accelerator) => {
  store.set('profileShortcut', accelerator)
  globalShortcut.unregisterAll()
  registerShortcuts()
  return true
})

// ─── Gestion des sons ─────────────────────────────────────────────────────────

// Ouvre la boîte de dialogue pour importer des fichiers audio
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer des sons',
    filters: [
      { name: 'Fichiers audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }
    ],
    properties: ['openFile', 'multiSelections']
  })
  if (result.canceled) return []
  return result.filePaths
})

// Copie un fichier son dans le dossier userData
ipcMain.handle('import-sound-file', async (event, filePath) => {
  try {
    const fileName = path.basename(filePath)
    const destPath = path.join(soundsDir, fileName)

    // Si le fichier existe déjà, on ajoute un timestamp
    const finalDest = fs.existsSync(destPath)
      ? path.join(soundsDir, `${Date.now()}_${fileName}`)
      : destPath

    fs.copyFileSync(filePath, finalDest)
    return { success: true, path: finalDest, name: path.basename(finalDest, path.extname(finalDest)) }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Télécharge un son depuis une URL
ipcMain.handle('download-sound-url', async (event, url, fileName) => {
  const https = require('https')
  const http = require('http')
  const protocol = url.startsWith('https') ? https : http
  const destPath = path.join(soundsDir, fileName)

  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath)
    protocol.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve({ success: true, path: destPath })
      })
    }).on('error', (e) => {
      fs.unlink(destPath, () => {})
      resolve({ success: false, error: e.message })
    })
  })
})

// Supprime un son du dossier
ipcMain.handle('delete-sound-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Retourne le chemin du dossier sons (pour charger les fichiers via file://)
ipcMain.handle('get-sounds-dir', () => soundsDir)

// ─── Store (profils, favoris, options) ───────────────────────────────────────

ipcMain.handle('store-get', (event, key) => store.get(key))
ipcMain.handle('store-set', (event, key, value) => { store.set(key, value); return true })
ipcMain.handle('store-delete', (event, key) => { store.delete(key); return true })

// ─── Sélection du périphérique audio ─────────────────────────────────────────

ipcMain.handle('get-audio-devices', async () => {
  // Retourné depuis le renderer via navigator.mediaDevices
  return []
})