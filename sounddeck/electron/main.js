const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

const store = new Store()
const isDev = process.env.NODE_ENV !== 'production'

let mainWindow

const soundsDir = path.join(app.getPath('userData'), 'sounds')
if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true })

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 700, minWidth: 800, minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false   // permet le chargement des fichiers locaux file://
    },
    backgroundColor: '#111113',
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  createWindow()
  registerShortcuts()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

// ─── Raccourcis globaux ───────────────────────────────────────────────────────
function registerShortcuts() {
  const shortcuts = store.get('shortcuts', {})
  Object.entries(shortcuts).forEach(([soundId, accelerator]) => {
    if (!accelerator) return
    try {
      globalShortcut.register(accelerator, () => {
        mainWindow?.webContents.send('play-sound', soundId)
      })
    } catch (e) { console.error('Erreur raccourci:', accelerator, e.message) }
  })

  const profileShortcut = store.get('profileShortcut', '')
  if (profileShortcut) {
    try {
      globalShortcut.register(profileShortcut, () => {
        mainWindow?.webContents.send('switch-profile')
      })
    } catch (e) {}
  }
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

// ─── Fichiers sons ────────────────────────────────────────────────────────────
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer des sons',
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }],
    properties: ['openFile', 'multiSelections']
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('open-image-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choisir une image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('import-sound-file', async (event, filePath) => {
  try {
    const fileName = path.basename(filePath)
    const destPath = path.join(soundsDir, fileName)
    const finalDest = fs.existsSync(destPath)
      ? path.join(soundsDir, `${Date.now()}_${fileName}`)
      : destPath
    fs.copyFileSync(filePath, finalDest)
    return { success: true, path: finalDest, name: path.basename(finalDest, path.extname(finalDest)) }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('import-image-file', async (event, filePath) => {
  try {
    const imagesDir = path.join(app.getPath('userData'), 'images')
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
    const fileName = path.basename(filePath)
    const destPath = path.join(imagesDir, `${Date.now()}_${fileName}`)
    fs.copyFileSync(filePath, destPath)
    return { success: true, path: destPath }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('download-sound-url', async (event, url, fileName) => {
  const https = require('https')
  const http = require('http')
  const protocol = url.startsWith('https') ? https : http
  const destPath = path.join(soundsDir, fileName)
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath)
    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close()
        // Suivre la redirection
        const redirectUrl = response.headers.location
        const rProtocol = redirectUrl.startsWith('https') ? https : http
        const file2 = fs.createWriteStream(destPath)
        rProtocol.get(redirectUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r2) => {
          r2.pipe(file2)
          file2.on('finish', () => { file2.close(); resolve({ success: true, path: destPath }) })
        }).on('error', (e) => { fs.unlink(destPath, () => {}); resolve({ success: false, error: e.message }) })
        return
      }
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve({ success: true, path: destPath }) })
    }).on('error', (e) => { fs.unlink(destPath, () => {}); resolve({ success: false, error: e.message }) })
  })
})

ipcMain.handle('delete-sound-file', async (event, filePath) => {
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); return { success: true } }
  catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('get-sounds-dir', () => soundsDir)

// ─── Scraper myinstants ───────────────────────────────────────────────────────
ipcMain.handle('fetch-myinstants', async (event, query) => {
  const https = require('https')
  const url = `https://www.myinstants.com/fr/search/?name=${encodeURIComponent(query)}`
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
        'Accept': 'text/html',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          // Parser les boutons de sons dans le HTML
          const sounds = []
          // Pattern : onclick="play('media/sounds/xxx.mp3')" et le titre dans <b>
          const btnRegex = /onclick="play\('(media\/sounds\/[^']+)'\)"/g
          const titleRegex = /<b>([^<]+)<\/b>/g

          const btnMatches = [...data.matchAll(btnRegex)]
          const titleMatches = [...data.matchAll(titleRegex)]

          btnMatches.forEach((match, i) => {
            const soundPath = match[1]
            const title = titleMatches[i] ? titleMatches[i][1].trim() : path.basename(soundPath, '.mp3')
            sounds.push({
              id: `mi_${i}_${Date.now()}`,
              name: title,
              url: `https://www.myinstants.com/${soundPath}`,
              emoji: getEmojiForName(title)
            })
          })

          resolve({ success: true, sounds: sounds.slice(0, 30) })
        } catch (e) {
          resolve({ success: false, error: e.message, sounds: [] })
        }
      })
    }).on('error', (e) => resolve({ success: false, error: e.message, sounds: [] }))
  })
})

function getEmojiForName(name) {
  const n = name.toLowerCase()
  if (n.includes('boom') || n.includes('explo')) return '💥'
  if (n.includes('sad') || n.includes('trombone')) return '🎺'
  if (n.includes('air') || n.includes('horn')) return '📣'
  if (n.includes('laugh') || n.includes('lol') || n.includes('bruh')) return '😂'
  if (n.includes('win') || n.includes('yes') || n.includes('epic')) return '🏆'
  if (n.includes('oof') || n.includes('rip') || n.includes('fail')) return '😬'
  if (n.includes('fart') || n.includes('poop')) return '💨'
  if (n.includes('scream') || n.includes('aah') || n.includes('wtf')) return '😱'
  if (n.includes('bell') || n.includes('ding') || n.includes('notif')) return '🔔'
  if (n.includes('drum') || n.includes('ba dum')) return '🥁'
  if (n.includes('cat') || n.includes('meow')) return '🐱'
  if (n.includes('dog') || n.includes('woof')) return '🐶'
  if (n.includes('noot') || n.includes('penguin')) return '🐧'
  if (n.includes('vine')) return '🌿'
  return '🔊'
}

// ─── Store ────────────────────────────────────────────────────────────────────
ipcMain.handle('store-get', (event, key) => store.get(key))
ipcMain.handle('store-set', (event, key, value) => { store.set(key, value); return true })
ipcMain.handle('store-delete', (event, key) => { store.delete(key); return true })