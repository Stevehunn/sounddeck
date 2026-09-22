// src/shared/utils/fileCompression.js

/**
 * Compresse un fichier audio si `enabled === true`.
 * Ne throw jamais : retourne toujours un chemin valide (original si échec).
 *
 * @param {string} filePath - Chemin absolu du fichier source
 * @param {Object} options
 * @param {boolean} options.enabled - Active la compression
 * @param {number}  options.bitrate - Bitrate en kbps (défaut 128)
 * @param {boolean} options.deleteOriginal - Supprime le fichier source après succès
 * @param {Function} options.onWarning - Callback(warningMessage)
 * @returns {Promise<{
 *   success: boolean,
 *   path: string,
 *   compressed: boolean,
 *   originalSize?: number,
 *   compressedSize?: number,
 *   compressionRatio?: number,
 * }>}
 */
export async function compressFileIfNeeded(filePath, options = {}) {
  const {
    enabled = false,
    bitrate = 128,
    deleteOriginal = true,
    onWarning = null,
  } = options

  // Pas de compression demandée → retour direct
  if (!enabled || !filePath) {
    return { success: true, path: filePath, compressed: false }
  }

  // API non disponible → warn et skip
  if (typeof window.electronAPI?.convertAudio !== 'function') {
    onWarning?.('convertAudio non disponible')
    return { success: true, path: filePath, compressed: false }
  }

  try {
    const originalPath = filePath
    const ext = (originalPath.split('.').pop() || 'mp3').toLowerCase()
    const compressedPath = originalPath.replace(`.${ext}`, `_compressed.${ext}`)
    const format = ext === 'mp3' ? 'mp3' : 'aac'

    const result = await window.electronAPI.convertAudio(
      originalPath,
      compressedPath,
      format,
      bitrate
    )

    if (!result?.success) {
      onWarning?.(result?.error || 'Compression échouée')
      return { success: true, path: originalPath, compressed: false }
    }

    // Supprimer l'original après succès
    if (deleteOriginal) {
      try {
        await window.electronAPI.deleteSoundFile(originalPath)
      } catch (e) {
        // silencieux
      }
    }

    const originalSize = result.originalSize || 0
    const compressedSize = result.size || 0
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1

    return {
      success: true,
      path: compressedPath,
      compressed: true,
      originalSize,
      compressedSize,
      compressionRatio,
    }
  } catch (e) {
    console.warn('⚠️ [compressFileIfNeeded] Erreur:', e)
    onWarning?.(e.message)
    return { success: true, path: filePath, compressed: false }
  }
}

export default { compressFileIfNeeded }