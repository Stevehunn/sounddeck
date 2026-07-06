import path from 'path'

/**
 * Version simplifiée - utilise Web Audio API pour réduire la qualité
 * Note: La vraie compression nécessite ffmpeg
 */
export async function compressAudio(inputPath, outputPath, options = {}) {
  const { bitrate = 128, format = 'mp3' } = options

  try {
    // Vérifier si ffmpeg est disponible
    const ffmpeg = await getFFmpeg()
    if (!ffmpeg) {
      // Fallback: copier le fichier avec un suffixe _compressed
      console.warn('⚠️ ffmpeg non disponible, copie du fichier avec suffixe _compressed')
      const ext = path.extname(inputPath)
      const baseName = path.basename(inputPath, ext)
      const fallbackPath = path.join(path.dirname(inputPath), `${baseName}_compressed${ext}`)
      
      const fs = require('fs')
      fs.copyFileSync(inputPath, fallbackPath)
      
      const stats = fs.statSync(inputPath)
      return {
        success: true,
        path: fallbackPath,
        size: stats.size,
        originalSize: stats.size,
        ratio: 1,
        warning: 'ffmpeg non disponible - fichier copié sans compression'
      }
    }

    // ... reste du code de compression avec ffmpeg ...
    const args = [
      '-i', inputPath,
      '-b:a', `${bitrate}k`,
      '-acodec', 'libmp3lame',
      '-qscale:a', '2',
      outputPath
    ]

    return new Promise((resolve) => {
      const { execFile } = require('child_process')
      execFile(ffmpeg, args, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message || stderr })
          return
        }
        try {
          const fs = require('fs')
          const stats = fs.statSync(outputPath)
          const originalStats = fs.statSync(inputPath)
          resolve({
            success: true,
            path: outputPath,
            size: stats.size,
            originalSize: originalStats.size,
            ratio: stats.size / originalStats.size
          })
        } catch (e) {
          resolve({ success: false, error: 'Impossible de lire les fichiers' })
        }
      })
    })

  } catch (e) {
    return { success: false, error: e.message }
  }
}

async function getFFmpeg() {
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
    return ffmpegInstaller.path
  } catch (e) {
    try {
      const ffmpegStatic = require('ffmpeg-static')
      return ffmpegStatic
    } catch (e2) {
      const { execSync } = require('child_process')
      try {
        execSync('ffmpeg -version', { stdio: 'ignore' })
        return 'ffmpeg'
      } catch {
        return null
      }
    }
  }
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default {
  compressAudio,
  getFFmpeg,
  formatSize
}