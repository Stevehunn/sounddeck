// electron/modules/fileHandlers.js
const { ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')

// ─── FONCTION POUR TROUVER FFPROBE ───────────────────────────────────────

function findFFmpeg() {
  try {
    // Essayer ffmpeg-installer
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
      if (ffmpegInstaller && ffmpegInstaller.path) {
        console.log('✅ ffmpeg trouvé via @ffmpeg-installer/ffmpeg:', ffmpegInstaller.path)
        return ffmpegInstaller.path
      }
    } catch (e) {
      // Silencieux
    }

    // Essayer ffmpeg-static
    try {
      const ffmpegStatic = require('ffmpeg-static')
      if (ffmpegStatic) {
        console.log('✅ ffmpeg trouvé via ffmpeg-static:', ffmpegStatic)
        return ffmpegStatic
      }
    } catch (e) {
      // Silencieux
    }

    // Essayer ffmpeg dans le PATH
    try {
      const { execSync } = require('child_process')
      execSync('ffmpeg -version', { stdio: 'ignore' })
      console.log('✅ ffmpeg trouvé dans le PATH')
      return 'ffmpeg'
    } catch (e) {
      // Silencieux
    }

    return null
  } catch (e) {
    console.warn('⚠️ Erreur lors de la recherche de ffmpeg:', e.message)
    return null
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

  // ✅ AJOUT : ROGNER UN FICHIER SON AVEC FFMEG
  ipcMain.handle('trim-sound-file', async (event, filePath, startTime, endTime) => {
    console.log('✂️ [trim-sound-file] Appelé avec:', { filePath, startTime, endTime })
    
    try {
      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        console.error('❌ [trim-sound-file] Fichier non trouvé:', filePath)
        return { success: false, error: 'Fichier non trouvé' }
      }

      // Créer un nom pour le fichier rogné
      const dir = path.dirname(filePath)
      const ext = path.extname(filePath)
      const baseName = path.basename(filePath, ext)
      const newFileName = `${baseName}_trimmed_${Date.now()}${ext}`
      const outputPath = path.join(dir, newFileName)

      console.log(`✂️ [trim-sound-file] Output: ${outputPath}`)

      // Calculer la durée du rognage
      const duration = endTime - startTime
      if (duration <= 0) {
        return { success: false, error: 'Durée de rognage invalide' }
      }

      // Vérifier que ffmpeg est disponible
      const ffmpegPath = findFFmpeg()
      
      if (!ffmpegPath) {
        console.warn('⚠️ [trim-sound-file] ffmpeg non disponible, copie du fichier')
        // Fallback : copier le fichier entier
        fs.copyFileSync(filePath, outputPath)
        return {
          success: true,
          path: outputPath,
          warning: 'ffmpeg non disponible, fichier copié sans rognage (le rognage précis nécessite ffmpeg)'
        }
      }

      // Commande ffmpeg pour rogner
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
            // Fallback : copier le fichier
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

          // Vérifier que le fichier a été créé
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

  console.log('✅ [fileHandlers] Tous les handlers fichiers enregistrés')
}

module.exports = {
  registerFileHandlers,
}