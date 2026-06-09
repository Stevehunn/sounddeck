const { app, BrowserWindow, ipcMain, dialog, globalShortcut, shell, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

const store = new Store()

// Détection fiable dev vs production
const isDev = !app.isPackaged

// Supprimer la barre de menu native (File, Edit, View, Window)
Menu.setApplicationMenu(null)

let mainWindow

const soundsDir = path.join(app.getPath('userData'), 'sounds')
if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true })

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.ico')

  mainWindow = new BrowserWindow({
    width: 1100, height: 700, minWidth: 800, minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: true
    },
    backgroundColor: '#111113',
    show: false,
    autoHideMenuBar: true,  // cache la barre File/Edit/View
    frame: true,
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {})
  })
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // En production, le dossier dist est au même niveau que electron/
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
    mainWindow.loadFile(indexPath)
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

ipcMain.handle('update-presentation-shortcut', (event, accelerator) => {
  store.set('presentationShortcut', accelerator)
  globalShortcut.unregisterAll()
  registerShortcuts()
  return true
})

ipcMain.handle('update-stop-all-shortcut', (event, accelerator) => {
  store.set('stopAllShortcut', accelerator)
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

const https = require('https')

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      }
    }, (res) => {
      // Suivre les redirections
      if ([301,302,303,307].includes(res.statusCode) && res.headers.location) {
        fetchPage(res.headers.location).then(resolve)
        return
      }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ ok: true, html: data, status: res.statusCode }))
    }).on('error', (e) => resolve({ ok: false, error: e.message }))
  })
}

// Extraire les sons d'une page de liste myinstants
function parseSoundList(html) {
  const sounds = []
  const seen = new Set()

  // Log pour debug — afficher un extrait du HTML reçu
  console.log('parseSoundList HTML extrait:', html.substring(0, 500))
  console.log('parseSoundList HTML longueur:', html.length)

  // Myinstants peut utiliser plusieurs formats de liens :
  // 1. <a href="https://www.myinstants.com/fr/instant/fart/">Fart</a>
  // 2. <a href="/fr/instant/fart/">Fart</a>
  // 3. <a href="/instant/fart/">Fart</a>
  // On capture le slug ET le nom en une seule regex
  const patterns = [
    // Lien absolu avec domaine
    /href="https?:\/\/(?:www\.)?myinstants\.com\/(?:fr\/)?instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
    // Lien relatif /fr/instant/
    /href="\/fr\/instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
    // Lien relatif /instant/
    /href="\/instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
  ]

  const slugToName = {}
  const allSlugs = []

  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)]
    for (const m of matches) {
      const slug = m[1]
      const name = m[2]?.trim()
      if (slug && !seen.has(slug) && slug.length > 0 && slug.length < 80) {
        // Ignorer les slugs qui sont des chemins de navigation
        const ignore = ['favorites', 'recent', 'trending', 'search', 'categories',
                        'new', 'profile', 'settings', 'uploaded', 'best_of_all_time',
                        'report', 'add', 'embed']
        if (ignore.some(i => slug.includes(i))) continue
        seen.add(slug)
        allSlugs.push(slug)
        if (name && name.length > 0 && !name.startsWith('!') && !name.includes('svg')) {
          slugToName[slug] = name
        }
      }
    }
  }

  console.log(`parseSoundList: ${allSlugs.length} slugs uniques trouvés`)
  console.log('Premiers slugs:', allSlugs.slice(0, 5))

  // URLs directes mp3 depuis onclick="play('media/sounds/xxx.mp3')"
  // Associées dans l'ordre aux slugs
  const soundUrlRegex = /play\('(media\/sounds\/[^']+)'\)/g
  const directUrls = [...html.matchAll(soundUrlRegex)].map(m =>
    `https://www.myinstants.com/${m[1]}`
  )
  console.log(`parseSoundList: ${directUrls.length} URLs directes trouvées`)

  for (let i = 0; i < Math.min(allSlugs.length, 40); i++) {
    const slug = allSlugs[i]
    const rawName = slugToName[slug] || slug.replace(/-\d+$/, '').replace(/-/g, ' ')
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)
    const url = directUrls[i] || null

    sounds.push({
      id: `mi_${slug}_${Date.now()}`,
      name,
      slug,
      url,
      emoji: getEmojiForName(name)
    })
  }

  return sounds
}

// Résoudre l'URL MP3 d'un son via sa page détail (og:audio)
async function resolveInstantUrl(slug) {
  const url = `https://www.myinstants.com/fr/instant/${slug}/`
  const result = await fetchPage(url)
  if (!result.ok) return null

  // Extraire og:audio depuis les meta tags
  const ogAudio = result.html.match(/meta-og:audio:\s*(https?:\/\/[^\s\n]+)/)
  if (ogAudio) return ogAudio[1].trim()

  // Fallback : chercher dans le HTML
  const audioMatch = result.html.match(/href="(\/media\/sounds\/[^"]+\.mp3)"/)
  if (audioMatch) return `https://www.myinstants.com${audioMatch[1]}`

  return null
}

// Handler principal : liste + recherche + catégories
ipcMain.handle('fetch-myinstants', async (event, query, mode = 'search') => {
  try {
    let sounds = []

    // Mode 'multi' : plusieurs recherches combinées
    if (mode === 'multi') {
      const terms = query.split(',').map(t => t.trim()).filter(Boolean)
      for (const term of terms.slice(0, 4)) {
        const r = await fetchPage(`https://www.myinstants.com/fr/search/?name=${encodeURIComponent(term)}`)
        if (r.ok) {
          const found = parseSoundList(r.html)
          sounds.push(...found)
        }
        await new Promise(r => setTimeout(r, 200))
      }
      // Dédupliquer par slug
      const seen = new Set()
      sounds = sounds.filter(s => {
        if (seen.has(s.slug)) return false
        seen.add(s.slug)
        return true
      })
    } else {
      let url
      if (mode === 'trending') {
        url = 'https://www.myinstants.com/fr/search/?name=meme'
      } else if (mode === 'category') {
        url = `https://www.myinstants.com/fr/categories/${encodeURIComponent(query)}/`
      } else {
        const q = query && query.trim() ? query : 'meme'
        url = `https://www.myinstants.com/fr/search/?name=${encodeURIComponent(q)}`
      }

      console.log('fetch-myinstants:', mode, url)
      const result = await fetchPage(url)
      if (!result.ok) return { success: false, error: result.error, sounds: [] }
      sounds = parseSoundList(result.html)
    }

    if (!sounds.length) {
      return { success: false, error: 'Aucun son trouvé', sounds: [] }
    }

    // Résoudre les URLs manquantes — séquentiellement avec délai pour éviter le rate limiting
    const needsResolve = sounds.filter(s => !s.url && s.slug)
    console.log(`Résolution de ${needsResolve.length} URLs via pages détail...`)

    if (needsResolve.length > 0) {
      // Résoudre par batch de 3 avec délai entre chaque batch
      const toResolve = needsResolve.slice(0, 20)
      for (let i = 0; i < toResolve.length; i += 3) {
        const batch = toResolve.slice(i, i + 3)
        await Promise.all(batch.map(async (sound) => {
          const resolvedUrl = await resolveInstantUrl(sound.slug)
          if (resolvedUrl) sound.url = resolvedUrl
        }))
        // Petit délai entre les batches pour éviter d'être bloqué
        if (i + 3 < toResolve.length) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      const resolved = sounds.filter(s => s.url).length
      console.log(`URLs résolues : ${resolved}/${sounds.length}`)
    }

    // Filtrer les sons sans URL résolue
    sounds = sounds.filter(s => s.url)

    console.log(`fetch-myinstants: ${sounds.length} sons trouvés`)
    return { success: true, sounds }

  } catch (e) {
    console.error('fetch-myinstants error:', e.message)
    return { success: false, error: e.message, sounds: [] }
  }
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

// ─── Export / Import ─────────────────────────────────────────────────────────

function buildConfig() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    profiles: store.get('profiles', []),
    sounds: store.get('sounds', []),
    shortcuts: store.get('shortcuts', {}),
    profileShortcut: store.get('profileShortcut', ''),
    loopShortcut: store.get('loopShortcut', ''),
    stopAllShortcut: store.get('stopAllShortcut', ''),
    presentationShortcut: store.get('presentationShortcut', ''),
    theme: store.get('theme', 'dark'),
    customTheme: store.get('customTheme', null),
    volume: store.get('volume', 80),
    playLocally: store.get('playLocally', true),
    audioDevice: store.get('audioDevice', 'default'),
  }
}

function applyConfig(config) {
  if (config.profiles) store.set('profiles', config.profiles)
  if (config.shortcuts) store.set('shortcuts', config.shortcuts)
  if (config.profileShortcut != null) store.set('profileShortcut', config.profileShortcut)
  if (config.loopShortcut != null) store.set('loopShortcut', config.loopShortcut)
  if (config.stopAllShortcut != null) store.set('stopAllShortcut', config.stopAllShortcut)
  if (config.presentationShortcut != null) store.set('presentationShortcut', config.presentationShortcut)
  if (config.theme) store.set('theme', config.theme)
  if (config.customTheme) store.set('customTheme', config.customTheme)
  if (config.volume != null) store.set('volume', config.volume)
  if (config.playLocally != null) store.set('playLocally', config.playLocally)
  if (config.audioDevice) store.set('audioDevice', config.audioDevice)
}

// ── Mode 1 : Config seule (JSON) ─────────────────────────────────────────────
ipcMain.handle('export-config', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter la configuration',
    defaultPath: `sounddeck-config-${new Date().toISOString().slice(0,10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled) return { success: false }
  try {
    const config = buildConfig()
    // Marquer les sons comme références (pas de fichiers inclus)
    config.sounds = config.sounds.map(s => ({ ...s, included: false }))
    fs.writeFileSync(result.filePath, JSON.stringify(config, null, 2), 'utf-8')
    return { success: true, path: result.filePath }
  } catch (e) { return { success: false, error: e.message } }
})

// ── Mode 2 : Archive complète (ZIP config + sons) ────────────────────────────
ipcMain.handle('export-full', async (event) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter archive complète',
    defaultPath: `sounddeck-full-${new Date().toISOString().slice(0,10)}.zip`,
    filters: [{ name: 'Archive ZIP', extensions: ['zip'] }]
  })
  if (result.canceled) return { success: false }

  try {
    const archiver = require('archiver')
    const config = buildConfig()
    const sounds = store.get('sounds', [])

    // Construire la config avec chemins relatifs dans le ZIP
    const configForZip = {
      ...config,
      sounds: sounds.map(s => ({
        ...s,
        included: fs.existsSync(s.path || ''),
        zipPath: fs.existsSync(s.path || '') ? `sounds/${path.basename(s.path)}` : null
      }))
    }

    const output = fs.createWriteStream(result.filePath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    await new Promise((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      // Ajouter config.json
      archive.append(JSON.stringify(configForZip, null, 2), { name: 'config.json' })

      // Ajouter chaque fichier son existant
      let added = 0
      for (const sound of sounds) {
        if (sound.path && fs.existsSync(sound.path)) {
          archive.file(sound.path, { name: `sounds/${path.basename(sound.path)}` })
          added++
        }
      }

      // Ajouter les images
      const imagesDir = path.join(app.getPath('userData'), 'images')
      if (fs.existsSync(imagesDir)) {
        archive.directory(imagesDir, 'images')
      }

      archive.finalize()
      console.log(`Archive : ${added} sons inclus`)
    })

    const stats = fs.statSync(result.filePath)
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1)
    return { success: true, path: result.filePath, sizeMb }
  } catch (e) {
    console.error('export-full error:', e)
    return { success: false, error: e.message }
  }
})

// ── Mode 3 : Sons uniquement (ZIP) ───────────────────────────────────────────
ipcMain.handle('export-sounds-only', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter les sons',
    defaultPath: `sounddeck-sons-${new Date().toISOString().slice(0,10)}.zip`,
    filters: [{ name: 'Archive ZIP', extensions: ['zip'] }]
  })
  if (result.canceled) return { success: false }

  try {
    const archiver = require('archiver')
    const sounds = store.get('sounds', [])
    const output = fs.createWriteStream(result.filePath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    await new Promise((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      let added = 0
      for (const sound of sounds) {
        if (sound.path && fs.existsSync(sound.path)) {
          archive.file(sound.path, { name: path.basename(sound.path) })
          added++
        }
      }
      archive.finalize()
      console.log(`Sons exportés : ${added}`)
    })

    const stats = fs.statSync(result.filePath)
    const sizeMb = (stats.size / 1024 / 1024).toFixed(1)
    return { success: true, path: result.filePath, sizeMb }
  } catch (e) { return { success: false, error: e.message } }
})

// ── Import universel (JSON ou ZIP) ───────────────────────────────────────────
ipcMain.handle('import-backup', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer une sauvegarde',
    filters: [
      { name: 'Sauvegardes SoundDeck', extensions: ['json', 'zip'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'Archive ZIP', extensions: ['zip'] }
    ],
    properties: ['openFile']
  })
  if (result.canceled) return { success: false }

  const filePath = result.filePaths[0]
  const ext = path.extname(filePath).toLowerCase()

  // ── Import JSON ────────────────────────────────────────────────────────────
  if (ext === '.json') {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const config = JSON.parse(raw)
      if (!config.version) return { success: false, error: 'Fichier JSON invalide' }

      applyConfig(config)

      if (config.sounds) {
        const sounds = config.sounds.map(s => ({
          ...s,
          missing: s.path && !fs.existsSync(s.path)
        }))
        store.set('sounds', sounds)
        const missing = sounds.filter(s => s.missing).length
        return { success: true, type: 'json', exportedAt: config.exportedAt, missing }
      }
      return { success: true, type: 'json', exportedAt: config.exportedAt, missing: 0 }
    } catch (e) { return { success: false, error: e.message } }
  }

  // ── Import ZIP ────────────────────────────────────────────────────────────
  if (ext === '.zip') {
    try {
      const unzipper = require('unzipper')
      const tmpDir = path.join(app.getPath('temp'), `sounddeck_import_${Date.now()}`)
      fs.mkdirSync(tmpDir, { recursive: true })

      // Extraire le ZIP dans un dossier temporaire
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: tmpDir }))
          .on('close', resolve)
          .on('error', reject)
      })

      // Lire config.json si présent
      const configPath = path.join(tmpDir, 'config.json')
      let importedSounds = 0
      let importedConfig = false

      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        applyConfig(config)
        importedConfig = true

        // Copier les sons extraits et mettre à jour les chemins
        const soundsTmpDir = path.join(tmpDir, 'sounds')
        if (fs.existsSync(soundsTmpDir)) {
          const updatedSounds = (config.sounds || []).map(sound => {
            if (!sound.zipPath) return { ...sound, missing: !fs.existsSync(sound.path || '') }
            const srcFile = path.join(tmpDir, sound.zipPath)
            if (!fs.existsSync(srcFile)) return { ...sound, missing: true }
            const destFile = path.join(soundsDir, path.basename(srcFile))
            fs.copyFileSync(srcFile, destFile)
            importedSounds++
            return { ...sound, path: destFile.replace(/\\/g, '/'), missing: false }
          })
          store.set('sounds', updatedSounds)
        }

        // Copier les images
        const imagesTmpDir = path.join(tmpDir, 'images')
        const imagesDir = path.join(app.getPath('userData'), 'images')
        if (fs.existsSync(imagesTmpDir)) {
          if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
          fs.readdirSync(imagesTmpDir).forEach(f => {
            fs.copyFileSync(path.join(imagesTmpDir, f), path.join(imagesDir, f))
          })
        }

      } else {
        // ZIP de sons uniquement — importer tous les fichiers audio
        const files = fs.readdirSync(tmpDir).filter(f =>
          f.match(/\.(mp3|wav|ogg|flac|m4a|aac)$/i)
        )
        const existingSounds = store.get('sounds', [])
        const newSounds = []

        for (const file of files) {
          const src = path.join(tmpDir, file)
          const dest = path.join(soundsDir, `imported_${Date.now()}_${file}`)
          fs.copyFileSync(src, dest)
          newSounds.push({
            id: require('crypto').randomUUID(),
            name: path.basename(file, path.extname(file)),
            path: dest.replace(/\\/g, '/'),
            emoji: '🔊',
            favorite: false,
            profiles: ['all'],
            volume: 100,
            createdAt: Date.now()
          })
          importedSounds++
        }
        store.set('sounds', [...existingSounds, ...newSounds])
      }

      // Nettoyer le dossier temporaire
      fs.rmSync(tmpDir, { recursive: true, force: true })

      return {
        success: true,
        type: importedConfig ? 'full' : 'sounds-only',
        importedSounds,
        importedConfig
      }
    } catch (e) {
      console.error('import-backup ZIP error:', e)
      return { success: false, error: e.message }
    }
  }

  return { success: false, error: 'Format non supporté' }
})

// ─── Ouvrir un lien externe dans le navigateur par défaut ────────────────────
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url)
})

// ─── YouTube import via yt-dlp ───────────────────────────────────────────────

const YTDLP_DIR = path.join(app.getPath('userData'), 'bin')
const YTDLP_PATH = path.join(YTDLP_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp')

// Vérifier si yt-dlp est disponible
ipcMain.handle('check-ytdlp', async () => {
  // 1. Vérifier dans userData/bin
  if (fs.existsSync(YTDLP_PATH)) return { available: true, path: YTDLP_PATH, source: 'local' }

  // 2. Vérifier dans le PATH système
  const { execFile } = require('child_process')
  const systemCmd = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return new Promise((resolve) => {
    execFile(systemCmd, ['--version'], { timeout: 5000 }, (err, stdout) => {
      if (!err) resolve({ available: true, path: systemCmd, source: 'system', version: stdout.trim() })
      else resolve({ available: false })
    })
  })
})

// Télécharger yt-dlp automatiquement
ipcMain.handle('download-ytdlp', async () => {
  try {
    if (!fs.existsSync(YTDLP_DIR)) fs.mkdirSync(YTDLP_DIR, { recursive: true })

    const https = require('https')
    const url = process.platform === 'win32'
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : process.platform === 'darwin'
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'

    const doDownload = (url, dest) => new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest)
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location) {
          file.close()
          doDownload(res.headers.location, dest).then(resolve).catch(reject)
          return
        }
        res.pipe(file)
        file.on('finish', () => {
          file.close()
          // Rendre exécutable sur Unix
          if (process.platform !== 'win32') {
            fs.chmodSync(dest, '755')
          }
          resolve()
        })
      }).on('error', reject)
    })

    await doDownload(url, YTDLP_PATH)
    return { success: true, path: YTDLP_PATH }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Récupérer les infos d'une vidéo YouTube
ipcMain.handle('youtube-info', async (event, url) => {
  try {
    const ytdlpPath = fs.existsSync(YTDLP_PATH) ? YTDLP_PATH : 'yt-dlp'
    const { execFile } = require('child_process')

    return new Promise((resolve) => {
      execFile(ytdlpPath, [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        url
      ], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ success: false, error: stderr || err.message })
          return
        }
        try {
          const info = JSON.parse(stdout)
          resolve({
            success: true,
            title: info.title,
            duration: info.duration,
            thumbnail: info.thumbnail,
            uploader: info.uploader,
            url: info.webpage_url
          })
        } catch (e) {
          resolve({ success: false, error: 'Impossible de lire les infos' })
        }
      })
    })
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// Télécharger l'audio d'une vidéo YouTube
ipcMain.handle('youtube-download', async (event, url, startSec, endSec, title) => {
  try {
    const ytdlpPath = fs.existsSync(YTDLP_PATH) ? YTDLP_PATH : 'yt-dlp'
    const { execFile } = require('child_process')

    // Récupérer le chemin ffmpeg depuis @ffmpeg-installer
    let ffmpegPath = null
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      ffmpegPath = ffmpegInstaller.path
      if (ffmpegPath && ffmpegPath.includes('app.asar')) {
        ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
      }
      // Extraire le dossier contenant ffmpeg (yt-dlp a besoin du dossier, pas du fichier)
      ffmpegPath = path.dirname(ffmpegPath)
    } catch (e) {
      ffmpegPath = null
    }

    const safeName = (title || 'youtube').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    const outPath = path.join(soundsDir, `yt_${Date.now()}_${safeName}.mp3`)

    // Arguments de base
    const args = [
      '--no-playlist',
      '--no-warnings',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
    ]

    // Indiquer le dossier ffmpeg à yt-dlp
    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath)
    }

    // Portion spécifique
    const fullDuration = endSec > 0
    const hasStart = startSec > 0
    const notFullVideo = hasStart || (endSec > 0 && endSec < 9999)

    if (notFullVideo) {
      const start = formatYtTime(startSec)
      const end = formatYtTime(endSec)
      args.push('--download-sections', `*${start}-${end}`)
      args.push('--force-keyframes-at-cuts')
    }

    args.push('-o', outPath, url)

    console.log('yt-dlp args:', args.join(' '))

    return new Promise((resolve) => {
      execFile(ytdlpPath, args, { timeout: 180000 }, (err, stdout, stderr) => {
        console.log('yt-dlp stdout:', stdout?.slice(0, 200))
        console.log('yt-dlp stderr:', stderr?.slice(0, 200))

        if (err) {
          if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
            resolve({ success: true, path: outPath.replace(/\\/g, '/') })
          } else {
            resolve({ success: false, error: stderr || err.message })
          }
          return
        }
        if (fs.existsSync(outPath)) {
          resolve({ success: true, path: outPath.replace(/\\/g, '/') })
        } else {
          // yt-dlp peut légèrement modifier le nom du fichier
          const files = fs.readdirSync(soundsDir)
            .filter(f => f.startsWith('yt_') && f.endsWith('.mp3'))
            .map(f => ({ f, t: fs.statSync(path.join(soundsDir, f)).mtimeMs }))
            .sort((a, b) => b.t - a.t)
          if (files.length > 0) {
            const found = path.join(soundsDir, files[0].f)
            resolve({ success: true, path: found.replace(/\\/g, '/') })
          } else {
            resolve({ success: false, error: 'Fichier de sortie introuvable' })
          }
        }
      })
    })
  } catch (e) {
    return { success: false, error: e.message }
  }
})

function formatYtTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
}

// ─── Partage de profil ───────────────────────────────────────────────────────

ipcMain.handle('export-profile', async (event, profileId) => {
  const profiles = store.get('profiles', [])
  const sounds = store.get('sounds', [])
  const shortcuts = store.get('shortcuts', {})

  const profile = profileId === 'all'
    ? { id: 'all', name: 'Tous les sons', isDefault: true }
    : profiles.find(p => p.id === profileId)

  if (!profile) return { success: false, error: 'Profil introuvable' }

  // Sons appartenant à ce profil
  const profileSounds = profileId === 'all'
    ? sounds
    : sounds.filter(s => s.profiles?.includes(profileId))

  const result = await dialog.showSaveDialog(mainWindow, {
    title: `Exporter le profil "${profile.name}"`,
    defaultPath: `sounddeck-profil-${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().slice(0,10)}.zip`,
    filters: [{ name: 'Profil SoundDeck', extensions: ['zip'] }]
  })
  if (result.canceled) return { success: false }

  try {
    const archiver = require('archiver')
    const output = fs.createWriteStream(result.filePath)
    const archive = archiver('zip', { zlib: { level: 6 } })

    const profileData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      sounds: profileSounds.map(s => ({
        ...s,
        zipPath: fs.existsSync(s.path || '') ? `sounds/${path.basename(s.path)}` : null,
        imageZipPath: s.image && fs.existsSync(s.image || '') ? `images/${path.basename(s.image)}` : null,
        shortcut: shortcuts[s.id] || null
      }))
    }

    await new Promise((resolve, reject) => {
      output.on('close', resolve)
      archive.on('error', reject)
      archive.pipe(output)

      archive.append(JSON.stringify(profileData, null, 2), { name: 'profile.json' })

      let addedSounds = 0
      for (const sound of profileSounds) {
        if (sound.path && fs.existsSync(sound.path)) {
          archive.file(sound.path, { name: `sounds/${path.basename(sound.path)}` })
          addedSounds++
        }
        if (sound.image && fs.existsSync(sound.image)) {
          archive.file(sound.image, { name: `images/${path.basename(sound.image)}` })
        }
      }

      archive.finalize()
      console.log(`Export profil "${profile.name}": ${addedSounds} sons`)
    })

    const sizeMb = (fs.statSync(result.filePath).size / 1024 / 1024).toFixed(1)
    return { success: true, path: result.filePath, sizeMb, soundCount: profileSounds.length }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

ipcMain.handle('import-profile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer un profil',
    filters: [{ name: 'Profil SoundDeck', extensions: ['zip'] }],
    properties: ['openFile']
  })
  if (result.canceled) return { success: false }

  try {
    const unzipper = require('unzipper')
    const tmpDir = path.join(app.getPath('temp'), `sounddeck_profile_${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    await new Promise((resolve, reject) => {
      fs.createReadStream(result.filePaths[0])
        .pipe(unzipper.Extract({ path: tmpDir }))
        .on('close', resolve)
        .on('error', reject)
    })

    const profileJsonPath = path.join(tmpDir, 'profile.json')
    if (!fs.existsSync(profileJsonPath)) {
      return { success: false, error: 'Fichier de profil invalide' }
    }

    const profileData = JSON.parse(fs.readFileSync(profileJsonPath, 'utf-8'))
    const { profile, sounds: importedSounds } = profileData

    // Créer un nouveau profil avec un nouvel ID pour éviter les conflits
    const { v4: uuidv4 } = require('uuid')
    const newProfileId = uuidv4()
    const newProfile = {
      ...profile,
      id: newProfileId,
      name: profile.name + (profile.id === 'all' ? ' (importé)' : ''),
      isDefault: false
    }

    // Copier les sons et images
    const imagesDir = path.join(app.getPath('userData'), 'images')
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })

    const existingSounds = store.get('sounds', [])
    const newSounds = []
    const newShortcuts = { ...store.get('shortcuts', {}) }

    for (const sound of importedSounds) {
      const newSoundId = uuidv4()
      let newPath = sound.path
      let newImage = sound.image || null

      // Copier le fichier son
      if (sound.zipPath) {
        const srcSound = path.join(tmpDir, sound.zipPath)
        if (fs.existsSync(srcSound)) {
          const destSound = path.join(soundsDir, `imported_${Date.now()}_${path.basename(srcSound)}`)
          fs.copyFileSync(srcSound, destSound)
          newPath = destSound.replace(/\\/g, '/')
        }
      }

      // Copier l'image
      if (sound.imageZipPath) {
        const srcImg = path.join(tmpDir, sound.imageZipPath)
        if (fs.existsSync(srcImg)) {
          const destImg = path.join(imagesDir, `imported_${Date.now()}_${path.basename(srcImg)}`)
          fs.copyFileSync(srcImg, destImg)
          newImage = destImg.replace(/\\/g, '/')
        }
      }

      // Raccourci
      if (sound.shortcut) newShortcuts[newSoundId] = sound.shortcut

      newSounds.push({
        id: newSoundId,
        name: sound.name,
        path: newPath,
        image: newImage,
        emoji: sound.emoji || '🔊',
        favorite: sound.favorite || false,
        profiles: [newProfileId],
        volume: sound.volume || 100,
        playCount: 0,
        createdAt: Date.now()
      })
    }

    // Sauvegarder
    const existingProfiles = store.get('profiles', [])
    store.set('profiles', [...existingProfiles, newProfile])
    store.set('sounds', [...existingSounds, ...newSounds])
    store.set('shortcuts', newShortcuts)

    fs.rmSync(tmpDir, { recursive: true, force: true })

    return {
      success: true,
      profileName: newProfile.name,
      soundCount: newSounds.length
    }
  } catch (e) {
    console.error('import-profile error:', e)
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