// src/shared/utils/fileExport.js

/**
 * Sauvegarde un buffer audio (WAV) via l'API Electron, avec fallbacks.
 * Essaie dans l'ordre :
 *   1. writeSoundFile (chemin direct)
 *   2. saveFileDialog (dialogue natif)
 *   3. exportAudioFile (2ᵉ tentative via dialogue)
 *   4. Download navigateur (dernier recours)
 *
 * @param {ArrayBuffer|Uint8Array} data
 * @param {string} outputPath
 * @returns {Promise<{success: boolean, path?: string, downloaded?: boolean, error?: string}>}
 */
export async function saveAudioBuffer(data, outputPath) {
  if (!outputPath) {
    return { success: false, error: 'outputPath manquant' }
  }

  const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(data)

  // Méthode 1 : writeSoundFile
  try {
    const result = await window.electronAPI?.writeSoundFile?.(
      outputPath,
      Array.from(uint8Array)
    )
    if (result?.success) {
      return { success: true, path: outputPath }
    }
  } catch (e) {
    console.warn('⚠️ [saveAudioBuffer] writeSoundFile exception:', e)
  }

  // Méthode 2 : saveFileDialog
  try {
    const fileName =
      outputPath.split('/').pop() ||
      outputPath.split('\\').pop() ||
      'exported.wav'
    const result = await window.electronAPI?.saveFileDialog?.(fileName, data)
    if (result?.success && result?.path) {
      return { success: true, path: result.path }
    }
  } catch (e) {
    console.warn('⚠️ [saveAudioBuffer] saveFileDialog exception:', e)
  }

  // Méthode 3 : exportAudioFile
  try {
    const fileName =
      outputPath.split('/').pop() ||
      outputPath.split('\\').pop() ||
      'exported.wav'
    const result = await window.electronAPI?.exportAudioFile?.({
      data: Array.from(uint8Array),
      fileName,
      format: 'wav',
    })
    if (result?.success && result?.path) {
      return { success: true, path: result.path }
    }
  } catch (e) {
    console.warn('⚠️ [saveAudioBuffer] exportAudioFile exception:', e)
  }

  // Méthode 4 : download navigateur
  try {
    const blob = new Blob([data], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download =
      outputPath.split('/').pop() ||
      outputPath.split('\\').pop() ||
      'exported.wav'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return { success: true, path: 'download://' + a.download, downloaded: true }
  } catch (e) {
    console.error('❌ [saveAudioBuffer] Échec de tous les fallbacks:', e)
    return { success: false, error: e.message }
  }
}

export default { saveAudioBuffer }