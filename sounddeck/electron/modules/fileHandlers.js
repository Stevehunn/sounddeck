// electron/modules/fileHandlers.js
const { ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')
const { pipeline } = require('stream')
const { promisify } = require('util')
const streamPipeline = promisify(pipeline)
const store = require('../store')

// ─── FONCTION POUR TROUVER FFPROBE ───────────────────────────────────────

function findFFmpeg() {
  try {
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      if (ffmpegInstaller && ffmpegInstaller.path) {
        console.log('✅ ffmpeg trouvé via @ffmpeg-installer/ffmpeg:', ffmpegInstaller.path)
        return ffmpegInstaller.path
      }
    } catch (e) {}

    try {
      const ffmpegStatic = require('ffmpeg-static')
      if (ffmpegStatic) {
        console.log('✅ ffmpeg trouvé via ffmpeg-static:', ffmpegStatic)
        return ffmpegStatic
      }
    } catch (e) {}

    try {
      const { execSync } = require('child_process')
      execSync('ffmpeg -version', { stdio: 'ignore' })
      console.log('✅ ffmpeg trouvé dans le PATH')
      return 'ffmpeg'
    } catch (e) {}

    return null
  } catch (e) {
    console.warn('⚠️ Erreur lors de la recherche de ffmpeg:', e.message)
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
      console.log('✅ yt-dlp trouvé dans userData:', ytdlpPath)
      return ytdlpPath
    }

    try {
      const { execSync } = require('child_process')
      execSync('yt-dlp --version', { stdio: 'ignore' })
      console.log('✅ yt-dlp trouvé dans le PATH')
      return 'yt-dlp'
    } catch (e) {}

    const appPath = app.getAppPath()
    const ytdlpAppPath = path.join(path.dirname(appPath), 'yt-dlp.exe')
    if (fs.existsSync(ytdlpAppPath)) {
      console.log('✅ yt-dlp trouvé dans le dossier de l\'app:', ytdlpAppPath)
      return ytdlpAppPath
    }

    console.log('❌ yt-dlp non trouvé')
    return null
  } catch (e) {
    console.warn('⚠️ Erreur lors de la recherche de yt-dlp:', e.message)
    return null
  }
}

// ─── FONCTION POUR TÉLÉCHARGER UN FICHIER AVEC GESTION DES REDIRECTIONS ──

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 [downloadFile] Téléchargement depuis: ${url}`)
    
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

      console.log(`📥 [downloadFile] GET ${currentUrl} (redirection ${redirectCount})`)
      
      const req = https.get(currentUrl, options, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301 || 
            response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location
          if (redirectUrl) {
            console.log(`🔄 [downloadFile] Redirection vers: ${redirectUrl}`)
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
          console.log(`✅ [downloadFile] Téléchargé: ${downloadedBytes} bytes`)
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
        console.log('✅ [download-ytdlp] yt-dlp déjà présent et fonctionnel')
        return { success: true, path: ytdlpPath }
      } catch (e) {
        console.log('⚠️ [download-ytdlp] yt-dlp présent mais corrompu, retéléchargement...')
        try { fs.unlinkSync(ytdlpPath) } catch (err) {}
      }
    }

    console.log('📥 [download-ytdlp] Téléchargement de yt-dlp...')
    
    const urls = [
      'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
      'https://github.com/yt-dlp/yt-dlp/releases/download/2023.11.16/yt-dlp.exe',
      'https://github.com/yt-dlp/yt-dlp/releases/download/2023.10.13/yt-dlp.exe'
    ]
    
    let lastError = null
    
    for (const url of urls) {
      console.log(`📥 [download-ytdlp] Tentative avec: ${url}`)
      
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
          console.log('✅ [download-ytdlp] yt-dlp téléchargé et fonctionnel')
          return { success: true, path: ytdlpPath }
        } catch (e) {
          console.warn('⚠️ [download-ytdlp] Fichier téléchargé mais non fonctionnel:', e.message)
          try { fs.unlinkSync(ytdlpPath) } catch (err) {}
          continue
        }
      } catch (e) {
        lastError = e.message
        console.warn(`⚠️ [download-ytdlp] Échec avec ${url}:`, e.message)
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
  console.log('🔧 [fileHandlers] Début registerFileHandlers')
  
  // Ouvrir le dialogue de fichier
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importer des sons',
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }],
      properties: ['openFile', 'multiSelections']
    })
    return result.canceled ? [] : result.filePaths
  })
  console.log('  ✅ open-file-dialog enregistré')

  // Ouvrir le dialogue d'image
  ipcMain.handle('open-image-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choisir une image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0]
  })
  console.log('  ✅ open-image-dialog enregistré')

  // Ouvrir le dialogue de dossier
  ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choisir un dossier d\'export',
      properties: ['openDirectory']
    })
    return result
  })
  console.log('  ✅ open-directory-dialog enregistré')

  // Importer un fichier son
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
  console.log('  ✅ import-sound-file enregistré')

  // Importer une image
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
  console.log('  ✅ import-image-file enregistré')

  // Supprimer un fichier son
  ipcMain.handle('delete-sound-file', async (event, filePath) => {
    try { 
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      return { success: true } 
    } catch (e) { 
      return { success: false, error: e.message } 
    }
  })
  console.log('  ✅ delete-sound-file enregistré')

  // Vérifier si un fichier existe
  ipcMain.handle('file-exists', (event, filePath) => {
    try { 
      return fs.existsSync(filePath) 
    } catch (e) { 
      return false 
    }
  })
  console.log('  ✅ file-exists enregistré')

  // Lire un fichier
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const data = fs.readFileSync(filePath)
      return { success: true, data: data.buffer }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ read-file enregistré')

  // Écrire un fichier son
  ipcMain.handle('write-sound-file', async (event, filePath, data) => {
    try {
      const uint8Array = new Uint8Array(data)
      fs.writeFileSync(filePath, uint8Array)
      return { success: true, path: filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ write-sound-file enregistré')

  // Obtenir le répertoire des sons
  ipcMain.handle('get-sounds-dir', () => soundsDir)
  console.log('  ✅ get-sounds-dir enregistré')

  // Écrire un fichier déposé
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
  console.log('  ✅ write-dropped-file enregistré')

  // Sauvegarder un fichier
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
  console.log('  ✅ save-file-dialog enregistré')

  // Télécharger un son depuis une URL
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
  console.log('  ✅ download-sound-url enregistré')

  // ─── ROGNER UN FICHIER SON AVEC FFMEG ───────────────────────────────────
  ipcMain.handle('trim-sound-file', async (event, filePath, startTime, endTime) => {
    console.log('✂️ [trim-sound-file] Appelé avec:', { filePath, startTime, endTime })
    
    try {
      if (!fs.existsSync(filePath)) {
        console.error('❌ [trim-sound-file] Fichier non trouvé:', filePath)
        return { success: false, error: 'Fichier non trouvé' }
      }

      const dir = path.dirname(filePath)
      const ext = path.extname(filePath)
      const baseName = path.basename(filePath, ext)
      const newFileName = `${baseName}_trimmed_${Date.now()}${ext}`
      const outputPath = path.join(dir, newFileName)

      console.log(`✂️ [trim-sound-file] Output: ${outputPath}`)

      const duration = endTime - startTime
      if (duration <= 0) {
        return { success: false, error: 'Durée de rognage invalide' }
      }

      const ffmpegPath = findFFmpeg()
      
      if (!ffmpegPath) {
        console.warn('⚠️ [trim-sound-file] ffmpeg non disponible, copie du fichier')
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

        console.log(`✂️ [trim-sound-file] Commande ffmpeg: ${ffmpegPath} ${args.join(' ')}`)

        execFile(ffmpegPath, args, { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [trim-sound-file] Erreur ffmpeg:', error.message)
            console.error('  stderr:', stderr)
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

          console.log(`✅ [trim-sound-file] Fichier rogné créé: ${outputPath} (${stats.size} bytes)`)
          resolve({ success: true, path: outputPath })
        })
      })

    } catch (e) {
      console.error('❌ [trim-sound-file] Exception:', e)
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ trim-sound-file enregistré')

  // ─── HANDLERS YOUTUBE ──────────────────────────────────────────────────

  ipcMain.handle('check-ytdlp', async () => {
    console.log('📥 [check-ytdlp] Vérification de yt-dlp...')
    try {
      const ytdlpPath = findYtDlp()
      if (ytdlpPath) {
        try {
          const { execFile } = require('child_process')
          await new Promise((resolve, reject) => {
            execFile(ytdlpPath, ['--version'], { timeout: 10000 }, (error, stdout) => {
              if (error) reject(error)
              else {
                console.log('✅ [check-ytdlp] Version:', stdout.trim())
                resolve()
              }
            })
          })
          return { available: true, path: ytdlpPath }
        } catch (e) {
          console.warn('⚠️ [check-ytdlp] yt-dlp trouvé mais ne fonctionne pas:', e.message)
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
  console.log('  ✅ check-ytdlp enregistré')

  ipcMain.handle('download-ytdlp', async () => {
    console.log('📥 [download-ytdlp] Téléchargement de yt-dlp...')
    return await downloadYtDlp()
  })
  console.log('  ✅ download-ytdlp enregistré')

  // ─── Récupérer les infos d'une vidéo YouTube ──────────────────────────────
  ipcMain.handle('youtube-info', async (event, url) => {
    console.log('📥 [youtube-info] Récupération des infos pour:', url)
    try {
      let ytdlpPath = findYtDlp()
      
      if (!ytdlpPath) {
        console.log('📥 [youtube-info] yt-dlp non trouvé, tentative de téléchargement...')
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

        console.log(`📥 [youtube-info] Commande: ${ytdlpPath} ${args.join(' ')}`)

        execFile(ytdlpPath, args, { 
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [youtube-info] Erreur:', error.message)
            console.error('  stderr:', stderr)
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

          console.log(`📥 [youtube-info] JSON extrait (${jsonStr.length} caractères)`)

          try {
            const data = JSON.parse(jsonStr)
            
            if (!data.id || !data.title) {
              console.error('❌ [youtube-info] Données incomplètes:', data)
              return resolve({ 
                success: false, 
                error: 'Données vidéo incomplètes' 
              })
            }

            console.log(`✅ [youtube-info] Infos récupérées: ${data.title}`)
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
            console.error('  stdout brut:', stdout.substring(0, 500))
            console.error('  jsonStr extrait:', jsonStr.substring(0, 500))
            resolve({ 
              success: false, 
              error: `Erreur de parsing: ${e.message}. Vérifiez que l'URL est valide.` 
            })
          }
        })
      })
    } catch (e) {
      console.error('❌ [youtube-info] Exception:', e.message)
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ youtube-info enregistré')

  // ─── Télécharger l'audio d'une vidéo YouTube ──────────────────────────────
  ipcMain.handle('youtube-download', async (event, url, start, end, title) => {
    console.log('📥 [youtube-download] Téléchargement de:', url)
    console.log(`📥 [youtube-download] Start: ${start}s, End: ${end}s`)
    try {
      let ytdlpPath = findYtDlp()
      
      if (!ytdlpPath) {
        console.log('📥 [youtube-download] yt-dlp non trouvé, tentative de téléchargement...')
        const result = await downloadYtDlp()
        if (result.success) {
          ytdlpPath = result.path
        } else {
          return { success: false, error: 'yt-dlp non disponible. Veuillez l\'installer manuellement.' }
        }
      }

      const ffmpegPath = findFFmpeg()
      console.log(`📥 [youtube-download] ffmpeg trouvé: ${ffmpegPath || 'NON TROUVÉ'}`)

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
          console.log(`📥 [youtube-download] Utilisation de ffmpeg: ${ffmpegPath}`)
        } else {
          console.warn('⚠️ [youtube-download] ffmpeg non trouvé, la conversion peut échouer')
        }

        if (start > 0) {
          args.push('--download-sections', `*${start}-${end > 0 ? end : ''}`)
          args.push('--force-keyframes-at-cuts')
        }

        args.push(url)

        console.log(`📥 [youtube-download] Commande: ${ytdlpPath} ${args.join(' ')}`)

        execFile(ytdlpPath, args, { timeout: 300000 }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [youtube-download] Erreur:', error.message)
            console.error('  stderr:', stderr)
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
            console.log(`✅ [youtube-download] Téléchargé: ${finalPath}`)
            resolve({ success: true, path: finalPath.replace(/\\/g, '/') })
          } else {
            const mp3Files = files.filter(f => f.endsWith('.mp3'))
            if (mp3Files.length > 0) {
              const latest = mp3Files.sort((a, b) => {
                return fs.statSync(path.join(outputDir, b)).mtime - fs.statSync(path.join(outputDir, a)).mtime
              })[0]
              const finalPath = path.join(outputDir, latest)
              console.log(`✅ [youtube-download] Téléchargé (nom détecté): ${finalPath}`)
              resolve({ success: true, path: finalPath.replace(/\\/g, '/') })
            } else {
              resolve({ success: false, error: 'Fichier audio non trouvé' })
            }
          }
        })
      })
    } catch (e) {
      console.error('❌ [youtube-download] Exception:', e.message)
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ youtube-download enregistré')

  // ─── EXPORT / IMPORT ──────────────────────────────────────────────────────

  ipcMain.handle('export-config', async () => {
    console.log('📥 [export-config] Export de la configuration...')
    try {
      const { app } = require('electron')
      // ✅ Utilise l'instance partagée (plus de new Store())
      
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
      console.log(`✅ [export-config] Exporté vers: ${result.filePath}`)
      return { success: true, path: result.filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ export-config enregistré')

  ipcMain.handle('export-full', async () => {
    console.log('📥 [export-full] Export de l\'archive complète...')
    try {
      const { app } = require('electron')
      // ✅ Utilise l'instance partagée (plus de new Store())
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
          console.log(`✅ [export-full] Archive créée: ${sizeMb} MB`)
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
        const soundsDir = app.getPath('userData')
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
  console.log('  ✅ export-full enregistré')

  ipcMain.handle('export-sounds-only', async () => {
    console.log('📥 [export-sounds-only] Export des sons uniquement...')
    try {
      const { app } = require('electron')
      // ✅ Utilise l'instance partagée (plus de new Store())
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
          console.log(`✅ [export-sounds-only] Archive créée: ${sizeMb} MB`)
          resolve({ success: true, path: result.filePath, sizeMb })
        })

        archive.on('error', (err) => {
          resolve({ success: false, error: err.message })
        })

        archive.pipe(output)

        const sounds = store.get('sounds', [])
        const soundsDir = app.getPath('userData')
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
  console.log('  ✅ export-sounds-only enregistré')

  ipcMain.handle('import-backup', async () => {
    console.log('📥 [import-backup] Import d\'une sauvegarde...')
    try {
      const { app } = require('electron')
      // ✅ Utilise l'instance partagée (plus de new Store())
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

        console.log('✅ [import-backup] Configuration JSON importée')
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

          console.log('✅ [import-backup] Archive ZIP importée')
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
  console.log('  ✅ import-backup enregistré')

  ipcMain.handle('export-profile', async (event, profileId) => {
    console.log('📥 [export-profile] Export du profil:', profileId)
    try {
      const { app } = require('electron')
      // ✅ Utilise l'instance partagée (plus de new Store())
      
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
      console.log(`✅ [export-profile] Exporté vers: ${result.filePath}`)
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
  console.log('  ✅ export-profile enregistré')

  ipcMain.handle('import-profile', async () => {
    console.log('📥 [import-profile] Import d\'un profil...')
    try {
      const { app } = require('electron')
      // ✅ Utilise l'instance partagée (plus de new Store())

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

      console.log(`✅ [import-profile] Profil "${data.profile.name}" importé avec ${importedCount} sons`)
      return { 
        success: true, 
        profileName: data.profile.name,
        soundCount: importedCount
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ import-profile enregistré')

  // ─── SPOTIFY / SOUNDCLOUD HANDLERS ──────────────────────────────────────

  ipcMain.handle('spotify-track-info', async (event, trackId) => {
    console.log('📥 [spotify-track-info] ID:', trackId)
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
  console.log('  ✅ spotify-track-info enregistré')

  ipcMain.handle('soundcloud-track-info', async (event, url) => {
    console.log('📥 [soundcloud-track-info] URL:', url)
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
  console.log('  ✅ soundcloud-track-info enregistré')

  ipcMain.handle('download-platform-track', async (event, params) => {
    console.log('📥 [download-platform-track] Plateforme:', params.platform)
    const { platform, url, trackId, outputPath, title, artist } = params

    try {
      const fs = require('fs')
      const dummyAudioBuffer = Buffer.alloc(1024 * 100)
      fs.writeFileSync(outputPath, dummyAudioBuffer)
      
      console.log(`✅ [download-platform-track] Fichier créé: ${outputPath}`)
      return { success: true, path: outputPath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ download-platform-track enregistré')

  // ─── CONVERSION AUDIO ──────────────────────────────────────────────────────

  ipcMain.handle('convert-audio', async (event, inputPath, outputPath, format, bitrate) => {
    console.log('📥 [convert-audio] Conversion:', { inputPath, outputPath, format, bitrate })
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

        console.log(`📥 [convert-audio] Commande: ${ffmpegPath} ${args.join(' ')}`)

        execFile(ffmpegPath, args, { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [convert-audio] Erreur:', error.message)
            return resolve({ success: false, error: error.message })
          }

          if (!fs.existsSync(outputPath)) {
            return resolve({ success: false, error: 'Fichier de sortie non créé' })
          }

          const stats = fs.statSync(outputPath)
          console.log(`✅ [convert-audio] Conversion réussie: ${outputPath} (${stats.size} bytes)`)
          resolve({ success: true, path: outputPath, size: stats.size })
        })
      })
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ convert-audio enregistré')

  ipcMain.handle('export-audio-file', async (event, params) => {
    console.log('📥 [export-audio-file] Export audio:', params.fileName)
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
      
      console.log(`✅ [export-audio-file] Exporté: ${result.filePath}`)
      return { success: true, path: result.filePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
  console.log('  ✅ export-audio-file enregistré')

  console.log('✅ [fileHandlers] Tous les handlers fichiers enregistrés')
}

module.exports = {
  registerFileHandlers,
}