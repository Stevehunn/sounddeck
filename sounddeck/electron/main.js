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
      webSecurity: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: true    // nécessaire pour File.path sur certaines versions
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

  // Empêcher Electron de naviguer vers un fichier droppé (comportement par défaut)
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url !== mainWindow.webContents.getURL()) e.preventDefault()
  })

  // Autoriser le drag & drop de fichiers dans la fenêtre
  mainWindow.webContents.session.on('will-download', (e) => {
    e.preventDefault()
  })
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

// ─── Raccourcis ───────────────────────────────────────────────────────────────
function safeRegister(accelerator, callback) {
  if (!accelerator) return false
  try {
    // Electron n'accepte pas les touches seules sans modificateur sauf Fn
    const isFn = /^F\d+$/.test(accelerator)
    const hasMod = accelerator.includes('+')
    if (!isFn && !hasMod) {
      // Touche seule : on passe quand même, Electron l'accepte pour certaines
      const ok = globalShortcut.register(accelerator, callback)
      return ok
    }
    const ok = globalShortcut.register(accelerator, callback)
    return ok
  } catch (e) {
    console.warn('Raccourci non supporté:', accelerator, e.message)
    return false
  }
}

function registerShortcuts() {
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

ipcMain.handle('update-loop-shortcut', (event, accelerator) => {
  store.set('loopShortcut', accelerator)
  globalShortcut.unregisterAll()
  registerShortcuts()
  return true
})

// ─── Fichiers ─────────────────────────────────────────────────────────────────
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
    return { success: true, path: finalDest.replace(/\\/g, '/'), name: path.basename(finalDest, path.extname(finalDest)) }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('import-image-file', async (event, filePath) => {
  try {
    const imagesDir = path.join(app.getPath('userData'), 'images')
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
    const fileName = `${Date.now()}_${path.basename(filePath)}`
    const destPath = path.join(imagesDir, fileName)
    fs.copyFileSync(filePath, destPath)
    return { success: true, path: destPath.replace(/\\/g, '/') }
  } catch (e) { return { success: false, error: e.message } }
})

ipcMain.handle('download-sound-url', async (event, rawUrl, fileName) => {
  const https = require('https')
  const http = require('http')
  const destPath = path.join(soundsDir, fileName)

  // ─── Conversion des liens de partage en liens directs ────────────────────
  function resolveDirectUrl(url) {
    // Google Drive : /file/d/ID/view → uc?export=download&id=ID
    const gdrive = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (gdrive) {
      return `https://drive.google.com/uc?export=download&id=${gdrive[1]}`
    }
    // Google Drive : open?id=ID
    const gdriveOpen = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
    if (gdriveOpen) {
      return `https://drive.google.com/uc?export=download&id=${gdriveOpen[1]}`
    }
    // Dropbox : ?dl=0 → ?dl=1
    if (url.includes('dropbox.com')) {
      return url.replace('?dl=0', '?dl=1').replace('&dl=0', '&dl=1')
    }
    // OneDrive : liens de partage → download direct
    if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
      // Encoder en base64 et construire le lien direct
      const b64 = Buffer.from(url).toString('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
      return `https://api.onedrive.com/v1.0/shares/u!${b64}/root/content`
    }
    return url
  }

  const url = resolveDirectUrl(rawUrl)
  console.log('Download URL résolu:', rawUrl, '→', url)

  const doRequest = (url, dest, redirectCount = 0) => new Promise((resolve) => {
    if (redirectCount > 10) {
      resolve({ success: false, error: 'Trop de redirections' })
      return
    }
    const protocol = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*, */*'
      }
    }, (res) => {
      console.log('HTTP status:', res.statusCode, 'Content-Type:', res.headers['content-type'])

      // Suivre les redirections
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        file.close()
        fs.unlink(dest, () => {})
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href
        console.log('Redirection vers:', redirectUrl)
        doRequest(redirectUrl, dest, redirectCount + 1).then(resolve)
        return
      }

      // Vérifier que c'est bien un fichier audio (pas une page HTML)
      const contentType = res.headers['content-type'] || ''
      if (res.statusCode === 200 && contentType.includes('text/html')) {
        file.close()
        fs.unlink(dest, () => {})
        resolve({
          success: false,
          error: 'Le lien pointe vers une page web et non un fichier audio direct.\n\nPour Google Drive : ouvrez le fichier → cliquez "Télécharger" → copiez le lien direct.\nPour Dropbox : remplacez ?dl=0 par ?dl=1 dans l\'URL.'
        })
        return
      }

      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(dest, () => {})
        resolve({ success: false, error: `Erreur HTTP ${res.statusCode}` })
        return
      }

      res.pipe(file)
      file.on('finish', () => {
        file.close()
        // Vérifier la taille minimale (éviter les fichiers vides ou HTML)
        const stats = fs.statSync(dest)
        if (stats.size < 1000) {
          fs.unlink(dest, () => {})
          resolve({ success: false, error: 'Fichier téléchargé trop petit — lien invalide ou protégé.' })
          return
        }
        resolve({ success: true, path: dest.replace(/\\/g, '/') })
      })
      file.on('error', (e) => {
        fs.unlink(dest, () => {})
        resolve({ success: false, error: e.message })
      })
    })

    req.on('error', (e) => {
      fs.unlink(dest, () => {})
      resolve({ success: false, error: e.message })
    })

    req.setTimeout(15000, () => {
      req.destroy()
      fs.unlink(dest, () => {})
      resolve({ success: false, error: 'Timeout — le serveur ne répond pas.' })
    })
  })

  return doRequest(url, destPath)
})

// Trim audio via fluent-ffmpeg + @ffmpeg-installer/ffmpeg
ipcMain.handle('trim-sound-file', async (event, filePath, startSec, endSec) => {
  try {
    let ffmpegPath = null

    // 1. Essayer @ffmpeg-installer/ffmpeg (binaire précompilé cross-platform)
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      ffmpegPath = ffmpegInstaller.path
      console.log('ffmpeg via installer:', ffmpegPath)
    } catch (e) {
      console.warn('@ffmpeg-installer/ffmpeg non disponible:', e.message)
    }

    // 2. Fallback ffmpeg-static
    if (!ffmpegPath) {
      try {
        ffmpegPath = require('ffmpeg-static')
        if (ffmpegPath && ffmpegPath.includes('app.asar')) {
          ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
        }
        console.log('ffmpeg via static:', ffmpegPath)
      } catch (e) { ffmpegPath = null }
    }

    // 3. Fallback PATH système
    if (!ffmpegPath) ffmpegPath = 'ffmpeg'

    const ext = path.extname(filePath) || '.mp3'
    const outName = `trimmed_${Date.now()}${ext}`
    const outPath = path.join(soundsDir, outName)
    const duration = endSec - startSec

    console.log('trim:', filePath, startSec, '->', endSec, 'dur:', duration)

    await new Promise((resolve, reject) => {
      const { execFile } = require('child_process')
      execFile(ffmpegPath, [
        '-y',
        '-i', filePath,
        '-ss', String(startSec),
        '-t', String(duration),
        '-acodec', 'copy',
        outPath
      ], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) {
          console.error('ffmpeg stderr:', stderr)
          reject(new Error(err.message + ' | ' + stderr))
        } else {
          console.log('trim OK:', outPath)
          resolve()
        }
      })
    })

    // Vérifier que le fichier a bien été créé et n'est pas vide
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 100) {
      throw new Error('Fichier de sortie invalide ou vide')
    }

    return { success: true, path: outPath.replace(/\\/g, '/'), trimmed: true }

  } catch (e) {
    console.error('trim-sound-file error:', e.message)
    // Fallback : copie du fichier original
    try {
      const ext = path.extname(filePath) || '.mp3'
      const outPath = path.join(soundsDir, `copy_${Date.now()}${ext}`)
      fs.copyFileSync(filePath, outPath)
      return {
        success: true,
        path: outPath.replace(/\\/g, '/'),
        trimmed: false,
        warning: 'ffmpeg non disponible — fichier complet importé. Installez @ffmpeg-installer/ffmpeg.'
      }
    } catch (e2) {
      return { success: false, error: e.message }
    }
  }
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
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120', 'Accept': 'text/html', 'Accept-Language': 'fr-FR,fr;q=0.9' } }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const sounds = []
          const btnRegex = /onclick="play\('(media\/sounds\/[^']+)'\)"/g
          const titleRegex = /<b>([^<]+)<\/b>/g
          const btnMatches = [...data.matchAll(btnRegex)]
          const titleMatches = [...data.matchAll(titleRegex)]
          btnMatches.forEach((match, i) => {
            const soundPath = match[1]
            const title = titleMatches[i] ? titleMatches[i][1].trim() : path.basename(soundPath, '.mp3')
            sounds.push({ id: `mi_${i}_${Date.now()}`, name: title, url: `https://www.myinstants.com/${soundPath}`, emoji: getEmojiForName(title) })
          })
          resolve({ success: true, sounds: sounds.slice(0, 30) })
        } catch (e) { resolve({ success: false, error: e.message, sounds: [] }) }
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
  if (n.includes('scream') || n.includes('aah') || n.includes('wtf')) return '😱'
  if (n.includes('bell') || n.includes('ding')) return '🔔'
  if (n.includes('drum') || n.includes('ba dum')) return '🥁'
  if (n.includes('cat') || n.includes('meow')) return '🐱'
  if (n.includes('noot') || n.includes('penguin')) return '🐧'
  return '🔊'
}

// ─── Écriture d'un fichier droppé depuis son contenu binaire ────────────────
// Utilisé quand file.path n'est pas disponible dans le renderer
ipcMain.handle('write-dropped-file', async (event, fileName, arrayBuffer) => {
  try {
    const safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '_')
    const destPath = path.join(soundsDir, `${Date.now()}_${safeName}`)
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(destPath, buffer)
    const name = path.basename(destPath, path.extname(destPath))
    console.log('write-dropped-file OK:', destPath, buffer.length, 'bytes')
    return { success: true, path: destPath.replace(/\\/g, '/'), name }
  } catch (e) {
    console.error('write-dropped-file error:', e.message)
    return { success: false, error: e.message }
  }
})

// ─── Vérifier existence fichier ──────────────────────────────────────────────
ipcMain.handle('file-exists', (event, filePath) => {
  try { return fs.existsSync(filePath) }
  catch (e) { return false }
})

// ─── Store ────────────────────────────────────────────────────────────────────
ipcMain.handle('store-get', (event, key) => store.get(key))
ipcMain.handle('store-set', (event, key, value) => { store.set(key, value); return true })
ipcMain.handle('store-delete', (event, key) => { store.delete(key); return true })