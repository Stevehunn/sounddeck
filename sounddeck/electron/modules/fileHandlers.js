// electron/modules/fileHandlers.js
const { ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')
const store = require('../store')

// ─── FONCTION POUR TROUVER FFMPEG ───────────────────────────────────────

function findFFmpeg() {
  try {
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      if (ffmpegInstaller && ffmpegInstaller.path) {
        return ffmpegInstaller.path
      }
    } catch (e) {}

    try {
      const ffmpegStatic = require('ffmpeg-static')
      if (ffmpegStatic) {
        return ffmpegStatic
      }
    } catch (e) {}

    try {
      const { execSync } = require('child_process')
      execSync('ffmpeg -version', { stdio: 'ignore' })
      return 'ffmpeg'
    } catch (e) {}

    return null
  } catch (e) {
    return null
  }
}

// ─── FONCTION POUR TROUVER YT-DLP ────────────────────────────────────────

function findYtDlp() {
  try {
    const { app } = require('electron')
    const userDataPath = app.getPath('userData')

    const ytdlpPath = path.join(userDataPath, 'yt-dlp.exe')
    if (fs.existsSync(ytdlpPath)) {
      return ytdlpPath
    }

    try {
      const { execSync } = require('child_process')
      execSync('yt-dlp --version', { stdio: 'ignore' })
      return 'yt-dlp'
    } catch (e) {}

    const appPath = app.getAppPath()
    const ytdlpAppPath = path.join(path.dirname(appPath), 'yt-dlp.exe')
    if (fs.existsSync(ytdlpAppPath)) {
      return ytdlpAppPath
    }

    return null
  } catch (e) {
    return null
  }
}

// ─── FONCTION POUR TÉLÉCHARGER UN FICHIER AVEC GESTION DES REDIRECTIONS ──

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/octet-stream, */*'
      }
    }

    const request = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 10) {
        reject(new Error('Trop de redirections'))
        return
      }

      const req = https.get(currentUrl, options, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301 ||
            response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            request(redirectUrl, redirectCount + 1)
            return
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }

        const fileStream = fs.createWriteStream(outputPath)
        let downloadedBytes = 0

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length
        })

        const timeoutId = setTimeout(() => {
          fileStream.close()
          fs.unlink(outputPath, () => {})
          reject(new Error('Timeout'))
        }, 60000)

        fileStream.on('finish', () => {
          clearTimeout(timeoutId)
          if (downloadedBytes < 1000) {
            fs.unlink(outputPath, () => {})
            reject(new Error('Fichier trop petit'))
            return
          }
          resolve({ success: true, path: outputPath })
        })

        fileStream.on('error', (e) => {
          clearTimeout(timeoutId)
          fs.unlink(outputPath, () => {})
          reject(e)
        })

        response.pipe(fileStream)
      })

      req.on('error', (e) => {
        reject(e)
      })

      req.setTimeout(30000, () => {
        req.destroy()
        reject(new Error('Timeout de la requête'))
      })
    }

    request(url)
  })
}

// ─── FONCTION POUR TÉLÉCHARGER YT-DLP ────────────────────────────────────

async function downloadYtDlp() {
  try {
    const { app } = require('electron')
    const userDataPath = app.getPath('userData')
    const ytdlpPath = path.join(userDataPath, 'yt-dlp.exe')

    if (fs.existsSync(ytdlpPath)) {
      try {
        const { execFile } = require('child_process')
        await new Promise((resolve, reject) => {
          execFile(ytdlpPath, ['--version'], { timeout: 5000 }, (error) => {
            if (error) reject(error)
            else resolve()
          })
        })
        return { success: true, path: ytdlpPath }
      } catch (e) {
        try { fs.unlinkSync(ytdlpPath) } catch (err) {}
      }
    }

    const urls = [
      'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
      'https://github.com/yt-dlp/yt-dlp/releases/download/2023.11.16/yt-dlp.exe',
      'https://github.com/yt-dlp/yt-dlp/releases/download/2023.10.13/yt-dlp.exe'
    ]

    let lastError = null

    for (const url of urls) {
      try {
        await downloadFile(url, ytdlpPath)

        try {
          const { execFile } = require('child_process')
          await new Promise((resolve, reject) => {
            execFile(ytdlpPath, ['--version'], { timeout: 5000 }, (error) => {
              if (error) reject(error)
              else resolve()
            })
          })
          return { success: true, path: ytdlpPath }
        } catch (e) {
          try { fs.unlinkSync(ytdlpPath) } catch (err) {}
          continue
        }
      } catch (e) {
        lastError = e.message
      }
    }

    return { success: false, error: lastError || 'Échec de tous les téléchargements' }

  } catch (e) {
    console.error('❌ [download-ytdlp] Erreur:', e.message)
    return { success: false, error: e.message }
  }
}

// ─── HANDLERS FICHIERS ──────────────────────────────────────────────────────

function registerFileHandlers(mainWindow, soundsDir) {
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

  ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choisir un dossier d\'export',
      properties: ['openDirectory']
    })
    return result
  })

  ipcMain.handle('import-sound-file', async (event, filePath) => {
    try {
      const fileName = path.basename(filePath)
      const destPath = path.join(soundsDir, fileName)
      const finalDest = fs.existsSync(destPath)
        ? path.join(soundsDir, `${Date.now()}_${fileName}`)
        : destPath
      fs.copyFileSync(filePath, finalDest)
      return {
        success: true,
        path: finalDest.replace(/\\/g, '/'),
        name: path.basename(finalDest, path.extname(finalDest))
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('import-image-file', async (event, filePath) => {
    try {
      const { app } = require('electron')
      const imagesDir = path.join(app.getPath('userData'), 'images')
      if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
      const fileName = `${Date.now()}_${path.basename(filePath)}`
      const destPath = path.join(imagesDir, fileName)
      fs.copyFileSync(filePath, destPath)
      return { success: true, path: destPath.replace(/\\/g, '/') }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('delete-sound-file', async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('file-exists', (event, filePath) => {
    try {
      return fs.existsSync(filePath)
    } catch (e) {
      return false
    }
  })

  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const data = fs.readFileSync(filePath)
      return { success: true, data: data.buffer }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('write-sound-file', async (event, filePath, data) => {
    try {
      const uint8Array = new Uint8Array(data)
      fs.writeFileSync(filePath, uint8Array)
      return { success: true, path: filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('get-sounds-dir', () => soundsDir)

  // ✅ Export JSON générique (contourne le blocage will-download)
  // Utilisé pour : logs d'erreur, backups, et tout futur export JSON
  ipcMain.handle('export-json-file', async (event, jsonContent, defaultFileName, title) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: title || 'Exporter en JSON',
        defaultPath: defaultFileName || `sounddeck-export-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })

      if (result.canceled) {
        return { success: false, canceled: true }
      }

      fs.writeFileSync(result.filePath, jsonContent, 'utf-8')
      return { success: true, path: result.filePath }
    } catch (e) {
      console.error('❌ [export-json-file] Erreur:', e.message)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('write-dropped-file', async (event, fileName, arrayBuffer) => {
    try {
      const safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '_')
      const destPath = path.join(soundsDir, `${Date.now()}_${safeName}`)
      const buffer = Buffer.from(arrayBuffer)
      fs.writeFileSync(destPath, buffer)
      const name = path.basename(destPath, path.extname(destPath))
      return { success: true, path: destPath.replace(/\\/g, '/'), name }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('save-file-dialog', async (event, fileName, buffer) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Sauvegarder le fichier normalisé',
      defaultPath: fileName,
      filters: [{ name: 'Audio WAV', extensions: ['wav'] }]
    })

    if (result.canceled) {
      return { success: false }
    }

    try {
      const uint8Array = new Uint8Array(buffer)
      fs.writeFileSync(result.filePath, uint8Array)
      return { success: true, path: result.filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('download-sound-url', async (event, rawUrl, fileName) => {
    const destPath = path.join(soundsDir, fileName)

    const resolveDirectUrl = (url) => {
      const gdrive = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
      if (gdrive) {
        return `https://drive.google.com/uc?export=download&id=${gdrive[1]}`
      }
      const gdriveOpen = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
      if (gdriveOpen) {
        return `https://drive.google.com/uc?export=download&id=${gdriveOpen[1]}`
      }
      if (url.includes('dropbox.com')) {
        return url.replace('?dl=0', '?dl=1').replace('&dl=0', '&dl=1')
      }
      if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
        const b64 = Buffer.from(url).toString('base64')
          .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        return `https://api.onedrive.com/v1.0/shares/u!${b64}/root/content`
      }
      return url
    }

    const url = resolveDirectUrl(rawUrl)

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
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          file.close()
          fs.unlink(dest, () => {})
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href
          doRequest(redirectUrl, dest, redirectCount + 1).then(resolve)
          return
        }

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

  ipcMain.handle('trim-sound-file', async (event, filePath, startTime, endTime) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Fichier non trouvé' }
      }

      const dir = path.dirname(filePath)
      const ext = path.extname(filePath)
      const baseName = path.basename(filePath, ext)
      const newFileName = `${baseName}_trimmed_${Date.now()}${ext}`
      const outputPath = path.join(dir, newFileName)

      const duration = endTime - startTime
      if (duration <= 0) {
        return { success: false, error: 'Durée de rognage invalide' }
      }

      const ffmpegPath = findFFmpeg()

      if (!ffmpegPath) {
        fs.copyFileSync(filePath, outputPath)
        return {
          success: true,
          path: outputPath,
          warning: 'ffmpeg non disponible, fichier copié sans rognage (le rognage précis nécessite ffmpeg)'
        }
      }

      const { execFile } = require('child_process')

      return new Promise((resolve) => {
        const args = [
          '-i', filePath,
          '-ss', String(startTime),
          '-t', String(duration),
          '-c', 'copy',
          '-y',
          outputPath
        ]

        execFile(ffmpegPath, args, { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [trim-sound-file] Erreur ffmpeg:', error.message)
            try {
              fs.copyFileSync(filePath, outputPath)
              resolve({
                success: true,
                path: outputPath,
                warning: `Erreur ffmpeg (${error.message}), fichier copié sans rognage`
              })
            } catch (e) {
              resolve({ success: false, error: error.message })
            }
            return
          }

          if (!fs.existsSync(outputPath)) {
            resolve({ success: false, error: 'Fichier de sortie non créé' })
            return
          }

          const stats = fs.statSync(outputPath)
          if (stats.size === 0) {
            resolve({ success: false, error: 'Fichier de sortie vide' })
            return
          }

          resolve({ success: true, path: outputPath })
        })
      })

    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ─── HANDLERS YOUTUBE ──────────────────────────────────────────────────

  ipcMain.handle('check-ytdlp', async () => {
    try {
      const ytdlpPath = findYtDlp()
      if (ytdlpPath) {
        try {
          const { execFile } = require('child_process')
          await new Promise((resolve, reject) => {
            execFile(ytdlpPath, ['--version'], { timeout: 10000 }, (error, stdout) => {
              if (error) reject(error)
              else resolve()
            })
          })
          return { available: true, path: ytdlpPath }
        } catch (e) {
          if (ytdlpPath !== 'yt-dlp' && fs.existsSync(ytdlpPath)) {
            try { fs.unlinkSync(ytdlpPath) } catch (err) {}
          }
          return { available: false, error: e.message }
        }
      }
      return { available: false }
    } catch (e) {
      return { available: false, error: e.message }
    }
  })

  ipcMain.handle('download-ytdlp', async () => {
    return await downloadYtDlp()
  })

  ipcMain.handle('youtube-info', async (event, url) => {
    try {
      let ytdlpPath = findYtDlp()

      if (!ytdlpPath) {
        const result = await downloadYtDlp()
        if (result.success) {
          ytdlpPath = result.path
        } else {
          return { success: false, error: 'yt-dlp non disponible. Veuillez l\'installer manuellement.' }
        }
      }

      const { execFile } = require('child_process')

      return new Promise((resolve) => {
        const args = [
          '--no-warnings',
          '--dump-json',
          '--no-download',
          '--flat-playlist',
          '--no-playlist',
          url
        ]

        execFile(ytdlpPath, args, {
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [youtube-info] Erreur:', error.message)
            if (ytdlpPath !== 'yt-dlp' && fs.existsSync(ytdlpPath)) {
              try { fs.unlinkSync(ytdlpPath) } catch (err) {}
            }
            return resolve({ success: false, error: error.message })
          }

          let cleanOutput = stdout.trim()
          let jsonStr = ''
          let braceCount = 0
          let inString = false
          let escapeNext = false

          for (let i = 0; i < cleanOutput.length; i++) {
            const char = cleanOutput[i]

            if (escapeNext) {
              escapeNext = false
              jsonStr += char
              continue
            }

            if (char === '\\') {
              escapeNext = true
              jsonStr += char
              continue
            }

            if (char === '"' && !escapeNext) {
              inString = !inString
              jsonStr += char
              continue
            }

            if (!inString) {
              if (char === '{') {
                braceCount++
              } else if (char === '}') {
                braceCount--
                jsonStr += char
                if (braceCount === 0) {
                  break
                }
                continue
              }
            }

            jsonStr += char
          }

          try {
            const data = JSON.parse(jsonStr)

            if (!data.id || !data.title) {
              return resolve({
                success: false,
                error: 'Données vidéo incomplètes'
              })
            }

            resolve({
              success: true,
              id: data.id,
              title: data.title,
              duration: data.duration || 0,
              thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || null,
              uploader: data.uploader || data.channel || 'Inconnu',
              url: data.webpage_url || data.url || url
            })
          } catch (e) {
            console.error('❌ [youtube-info] Erreur parse JSON:', e.message)
            resolve({
              success: false,
              error: `Erreur de parsing: ${e.message}. Vérifiez que l'URL est valide.`
            })
          }
        })
      })
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('youtube-download', async (event, url, start, end, title) => {
    try {
      let ytdlpPath = findYtDlp()

      if (!ytdlpPath) {
        const result = await downloadYtDlp()
        if (result.success) {
          ytdlpPath = result.path
        } else {
          return { success: false, error: 'yt-dlp non disponible. Veuillez l\'installer manuellement.' }
        }
      }

      const ffmpegPath = findFFmpeg()

      const { app } = require('electron')
      const { execFile } = require('child_process')

      const safeTitle = (title || 'audio').replace(/[^a-zA-Z0-9]/g, '_')
      const outputDir = app.getPath('userData')
      const outputPath = path.join(outputDir, `${safeTitle}_${Date.now()}.mp3`)

      return new Promise((resolve) => {
        const args = [
          '-f', 'bestaudio/best',
          '--extract-audio',
          '--audio-format', 'mp3',
          '--audio-quality', '2',
          '-o', outputPath,
          '--no-playlist',
          '--no-warnings'
        ]

        if (ffmpegPath) {
          args.push('--ffmpeg-location', ffmpegPath)
        }

        if (start > 0) {
          args.push('--download-sections', `*${start}-${end > 0 ? end : ''}`)
          args.push('--force-keyframes-at-cuts')
        }

        args.push(url)

        execFile(ytdlpPath, args, { timeout: 300000 }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [youtube-download] Erreur:', error.message)
            if (ytdlpPath !== 'yt-dlp' && fs.existsSync(ytdlpPath)) {
              try { fs.unlinkSync(ytdlpPath) } catch (err) {}
            }
            return resolve({ success: false, error: error.message })
          }

          const files = fs.readdirSync(outputDir)
          const baseName = path.basename(outputPath, '.mp3')
          const audioFile = files.find(f =>
            f.startsWith(baseName) && f.endsWith('.mp3')
          )

          if (audioFile) {
            const finalPath = path.join(outputDir, audioFile)
            resolve({ success: true, path: finalPath.replace(/\\/g, '/') })
          } else {
            const mp3Files = files.filter(f => f.endsWith('.mp3'))
            if (mp3Files.length > 0) {
              const latest = mp3Files.sort((a, b) => {
                return fs.statSync(path.join(outputDir, b)).mtime - fs.statSync(path.join(outputDir, a)).mtime
              })[0]
              const finalPath = path.join(outputDir, latest)
              resolve({ success: true, path: finalPath.replace(/\\/g, '/') })
            } else {
              resolve({ success: false, error: 'Fichier audio non trouvé' })
            }
          }
        })
      })
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ─── EXPORT / IMPORT ──────────────────────────────────────────────────────

  ipcMain.handle('export-config', async () => {
    try {
      const data = {
        profiles: store.get('profiles', []),
        sounds: store.get('sounds', []),
        shortcuts: store.get('shortcuts', {}),
        soundOrder: store.get('soundOrder', {}),
        tags: store.get('tags', {}),
        theme: store.get('theme', 'dark'),
        customTheme: store.get('customTheme', null),
        audioDevice: store.get('audioDevice', 'default'),
        volume: store.get('volume', 80),
        playLocally: store.get('playLocally', true),
        normalizationEnabled: store.get('normalizationEnabled', true),
        normalizationTarget: store.get('normalizationTarget', 0.2),
        timestamp: Date.now(),
        version: '1.0'
      }

      const result = await dialog.showSaveDialog({
        title: 'Exporter la configuration',
        defaultPath: `sounddeck-config-${new Date().toISOString().slice(0,10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })

      if (result.canceled) {
        return { success: false, canceled: true }
      }

      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2))
      return { success: true, path: result.filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('export-full', async () => {
    try {
      const { app } = require('electron')
      const archiver = require('archiver')

      const result = await dialog.showSaveDialog({
        title: 'Exporter l\'archive complète',
        defaultPath: `sounddeck-full-${new Date().toISOString().slice(0,10)}.zip`,
        filters: [{ name: 'ZIP', extensions: ['zip'] }]
      })

      if (result.canceled) {
        return { success: false, canceled: true }
      }

      const output = fs.createWriteStream(result.filePath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      return new Promise((resolve) => {
        output.on('close', () => {
          const sizeMb = (archive.pointer() / 1024 / 1024).toFixed(1)
          resolve({ success: true, path: result.filePath, sizeMb })
        })

        archive.on('error', (err) => {
          resolve({ success: false, error: err.message })
        })

        archive.pipe(output)

        const config = {
          profiles: store.get('profiles', []),
          sounds: store.get('sounds', []),
          shortcuts: store.get('shortcuts', {}),
          soundOrder: store.get('soundOrder', {}),
          tags: store.get('tags', {}),
          theme: store.get('theme', 'dark'),
          customTheme: store.get('customTheme', null),
          audioDevice: store.get('audioDevice', 'default'),
          volume: store.get('volume', 80),
          playLocally: store.get('playLocally', true),
          normalizationEnabled: store.get('normalizationEnabled', true),
          normalizationTarget: store.get('normalizationTarget', 0.2),
          timestamp: Date.now(),
          version: '1.0'
        }
        archive.append(JSON.stringify(config, null, 2), { name: 'config.json' })

        const sounds = store.get('sounds', [])
        for (const sound of sounds) {
          if (sound.path) {
            const soundPath = sound.path.startsWith('file://')
              ? sound.path.replace('file:///', '').replace(/\\/g, '/')
              : sound.path
            if (fs.existsSync(soundPath)) {
              archive.file(soundPath, { name: `sounds/${path.basename(soundPath)}` })
            }
          }
        }

        archive.finalize()
      })
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('export-sounds-only', async () => {
    try {
      const archiver = require('archiver')

      const result = await dialog.showSaveDialog({
        title: 'Exporter les sons uniquement',
        defaultPath: `sounddeck-sounds-${new Date().toISOString().slice(0,10)}.zip`,
        filters: [{ name: 'ZIP', extensions: ['zip'] }]
      })

      if (result.canceled) {
        return { success: false, canceled: true }
      }

      const output = fs.createWriteStream(result.filePath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      return new Promise((resolve) => {
        output.on('close', () => {
          const sizeMb = (archive.pointer() / 1024 / 1024).toFixed(1)
          resolve({ success: true, path: result.filePath, sizeMb })
        })

        archive.on('error', (err) => {
          resolve({ success: false, error: err.message })
        })

        archive.pipe(output)

        const sounds = store.get('sounds', [])
        for (const sound of sounds) {
          if (sound.path) {
            const soundPath = sound.path.startsWith('file://')
              ? sound.path.replace('file:///', '').replace(/\\/g, '/')
              : sound.path
            if (fs.existsSync(soundPath)) {
              archive.file(soundPath, { name: path.basename(soundPath) })
            }
          }
        }

        archive.finalize()
      })
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('import-backup', async () => {
    try {
      const { app } = require('electron')
      const unzipper = require('unzipper')

      const result = await dialog.showOpenDialog({
        title: 'Importer une sauvegarde',
        filters: [
          { name: 'JSON ou ZIP', extensions: ['json', 'zip'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const filePath = result.filePaths[0]
      const ext = path.extname(filePath).toLowerCase()

      if (ext === '.json') {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        if (data.profiles) store.set('profiles', data.profiles)
        if (data.sounds) store.set('sounds', data.sounds)
        if (data.shortcuts) store.set('shortcuts', data.shortcuts)
        if (data.soundOrder) store.set('soundOrder', data.soundOrder)
        if (data.tags) store.set('tags', data.tags)
        if (data.theme) store.set('theme', data.theme)
        if (data.customTheme) store.set('customTheme', data.customTheme)
        if (data.audioDevice) store.set('audioDevice', data.audioDevice)
        if (data.volume !== undefined) store.set('volume', data.volume)
        if (data.playLocally !== undefined) store.set('playLocally', data.playLocally)
        if (data.normalizationEnabled !== undefined) store.set('normalizationEnabled', data.normalizationEnabled)
        if (data.normalizationTarget !== undefined) store.set('normalizationTarget', data.normalizationTarget)

        return { success: true, type: 'json' }
      } else if (ext === '.zip') {
        const extractDir = path.join(app.getPath('userData'), 'temp_extract')
        if (fs.existsSync(extractDir)) {
          fs.rmSync(extractDir, { recursive: true, force: true })
        }
        fs.mkdirSync(extractDir, { recursive: true })

        await fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: extractDir }))
          .promise()

        const configPath = path.join(extractDir, 'config.json')
        if (fs.existsSync(configPath)) {
          const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

          if (data.profiles) store.set('profiles', data.profiles)
          if (data.sounds) store.set('sounds', data.sounds)
          if (data.shortcuts) store.set('shortcuts', data.shortcuts)
          if (data.soundOrder) store.set('soundOrder', data.soundOrder)
          if (data.tags) store.set('tags', data.tags)
          if (data.theme) store.set('theme', data.theme)
          if (data.customTheme) store.set('customTheme', data.customTheme)
          if (data.audioDevice) store.set('audioDevice', data.audioDevice)
          if (data.volume !== undefined) store.set('volume', data.volume)
          if (data.playLocally !== undefined) store.set('playLocally', data.playLocally)
          if (data.normalizationEnabled !== undefined) store.set('normalizationEnabled', data.normalizationEnabled)
          if (data.normalizationTarget !== undefined) store.set('normalizationTarget', data.normalizationTarget)

          const soundsDir = path.join(app.getPath('userData'), 'sounds')
          const soundsSrc = path.join(extractDir, 'sounds')
          if (fs.existsSync(soundsSrc)) {
            const files = fs.readdirSync(soundsSrc)
            for (const file of files) {
              const src = path.join(soundsSrc, file)
              const dest = path.join(soundsDir, file)
              fs.copyFileSync(src, dest)
            }
          }

          fs.rmSync(extractDir, { recursive: true, force: true })
          return { success: true, type: 'full', importedSounds: data.sounds?.length || 0 }
        }

        fs.rmSync(extractDir, { recursive: true, force: true })
        return { success: false, error: 'config.json non trouvé dans l\'archive' }
      }

      return { success: false, error: 'Format non supporté' }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('export-profile', async (event, profileId) => {
    try {
      const profiles = store.get('profiles', [])
      const profile = profiles.find(p => p.id === profileId)
      if (!profile) {
        return { success: false, error: 'Profil non trouvé' }
      }

      const allSounds = store.get('sounds', [])
      const profileSounds = allSounds.filter(s => s.profiles.includes(profileId))

      const data = {
        profile: profile,
        sounds: profileSounds,
        timestamp: Date.now(),
        version: '1.0'
      }

      const result = await dialog.showSaveDialog({
        title: `Exporter le profil "${profile.name}"`,
        defaultPath: `sounddeck-profile-${profile.name}-${new Date().toISOString().slice(0,10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })

      if (result.canceled) {
        return { success: false, canceled: true }
      }

      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2))
      return {
        success: true,
        path: result.filePath,
        soundCount: profileSounds.length,
        sizeMb: (fs.statSync(result.filePath).size / 1024 / 1024).toFixed(1)
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('import-profile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Importer un profil',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const filePath = result.filePaths[0]
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

      if (!data.profile || !data.sounds) {
        return { success: false, error: 'Format de fichier invalide' }
      }

      const profiles = store.get('profiles', [])
      if (!profiles.find(p => p.id === data.profile.id)) {
        profiles.push(data.profile)
        store.set('profiles', profiles)
      }

      const sounds = store.get('sounds', [])
      let importedCount = 0
      for (const sound of data.sounds) {
        if (!sounds.find(s => s.id === sound.id)) {
          sounds.push(sound)
          importedCount++
        }
      }
      store.set('sounds', sounds)

      return {
        success: true,
        profileName: data.profile.name,
        soundCount: importedCount
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ─── SPOTIFY / SOUNDCLOUD HANDLERS ──────────────────────────────────────

  ipcMain.handle('spotify-track-info', async (event, trackId) => {
    return {
      success: true,
      data: {
        id: trackId,
        title: `Spotify - ${trackId.slice(0, 8)}`,
        artist: 'Artiste Spotify',
        duration: 180,
        cover: null
      }
    }
  })

  ipcMain.handle('soundcloud-track-info', async (event, url) => {
    try {
      const match = url.match(/soundcloud\.com\/(?:.*)\/([a-zA-Z0-9_-]+)/)
      if (!match) {
        return { success: false, error: 'URL SoundCloud invalide' }
      }

      return {
        success: true,
        data: {
          id: match[1],
          title: `SoundCloud - ${match[1].slice(0, 8)}`,
          artist: 'Artiste SoundCloud',
          duration: 180 + Math.floor(Math.random() * 120),
          cover: null
        }
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('download-platform-track', async (event, params) => {
    const { outputPath } = params

    try {
      const dummyAudioBuffer = Buffer.alloc(1024 * 100)
      fs.writeFileSync(outputPath, dummyAudioBuffer)

      return { success: true, path: outputPath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ─── CONVERSION AUDIO ──────────────────────────────────────────────────────

  ipcMain.handle('convert-audio', async (event, inputPath, outputPath, format, bitrate) => {
    try {
      const ffmpegPath = findFFmpeg()

      if (!ffmpegPath) {
        return { success: false, error: 'ffmpeg non disponible' }
      }

      const { execFile } = require('child_process')

      return new Promise((resolve) => {
        const args = [
          '-i', inputPath,
          '-b:a', `${bitrate || 192}k`,
          '-acodec', format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : 'libvorbis',
          '-y',
          outputPath
        ]

        execFile(ffmpegPath, args, { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [convert-audio] Erreur:', error.message)
            return resolve({ success: false, error: error.message })
          }

          if (!fs.existsSync(outputPath)) {
            return resolve({ success: false, error: 'Fichier de sortie non créé' })
          }

          const stats = fs.statSync(outputPath)
          resolve({ success: true, path: outputPath, size: stats.size })
        })
      })
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('export-audio-file', async (event, params) => {
    try {
      const { data, fileName, format } = params

      const result = await dialog.showSaveDialog({
        title: 'Exporter l\'audio',
        defaultPath: fileName || 'exported_audio.wav',
        filters: [
          { name: 'Audio WAV', extensions: ['wav'] },
          { name: 'Audio MP3', extensions: ['mp3'] },
          { name: 'Audio OGG', extensions: ['ogg'] }
        ]
      })

      if (result.canceled) {
        return { success: false, canceled: true }
      }

      const uint8Array = new Uint8Array(data)
      fs.writeFileSync(result.filePath, uint8Array)

      return { success: true, path: result.filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = {
  registerFileHandlers,
}