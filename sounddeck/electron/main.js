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
    let url
    // Les pages trending/best chargent leurs sons via JS dynamique → pas parsables
    // On les remplace par des recherches équivalentes qui retournent du HTML statique
    if (mode === 'trending') {
      // Tendances FR → recherche des sons populaires français
      url = 'https://www.myinstants.com/fr/search/?name=meme'
    } else if (mode === 'best') {
      // Panthéon → meilleurs sons internationaux connus
      url = 'https://www.myinstants.com/fr/search/?name=vine+boom+bruh+airhorn+oof'
    } else if (mode === 'trending_fr') {
      url = 'https://www.myinstants.com/fr/search/?name=francais'
    } else if (mode === 'category') {
      url = `https://www.myinstants.com/fr/categories/${encodeURIComponent(query)}/`
    } else {
      // Recherche standard — si vide on met un terme générique
      const q = query && query.trim() ? query : 'meme'
      url = `https://www.myinstants.com/fr/search/?name=${encodeURIComponent(q)}`
    }

    console.log('fetch-myinstants:', mode, url)
    const result = await fetchPage(url)

    if (!result.ok) {
      return { success: false, error: result.error, sounds: [] }
    }

    let sounds = parseSoundList(result.html)

    if (!sounds.length) {
      return { success: false, error: 'Aucun son trouvé', sounds: [] }
    }

    // Résoudre les URLs manquantes en parallèle (max 10 à la fois)
    const needsResolve = sounds.filter(s => !s.url && s.slug)
    if (needsResolve.length > 0) {
      const batches = []
      for (let i = 0; i < Math.min(needsResolve.length, 20); i += 5) {
        batches.push(needsResolve.slice(i, i + 5))
      }
      for (const batch of batches) {
        await Promise.all(batch.map(async (sound) => {
          const resolvedUrl = await resolveInstantUrl(sound.slug)
          if (resolvedUrl) sound.url = resolvedUrl
        }))
      }
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

// ─── Vérifier existence fichier ──────────────────────────────────────────────
ipcMain.handle('file-exists', (event, filePath) => {
  try { return fs.existsSync(filePath) }
  catch (e) { return false }
})

// ─── Store ────────────────────────────────────────────────────────────────────
ipcMain.handle('store-get', (event, key) => store.get(key))
ipcMain.handle('store-set', (event, key, value) => { store.set(key, value); return true })
ipcMain.handle('store-delete', (event, key) => { store.delete(key); return true })