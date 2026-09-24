// src/features/home/useHomeImport.js
import { useState, useCallback } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DEFAULT_EMOJIS } from '@shared/constants/emojis'
import { compressFileIfNeeded } from '@shared/utils/fileCompression'
import { logWarn } from '@shared/utils/logger'

const AUDIO_REGEX = /\.(mp3|wav|ogg|flac|m4a|aac|opus|weba)$/i

/**
 * Hook qui centralise la logique d'import de sons :
 *   - import depuis paths (dialog)
 *   - import depuis drag & drop de fichiers
 *
 * Gère la compression optionnelle, la progression, et les toasts.
 */
export function useHomeImport({ store, addToast, currentProfileId, t }) {
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [importSuccess, setImportSuccess] = useState(0)

  const compressOptions = useCallback(() => ({
    enabled: store.compressOnImport || false,
    bitrate: store.compressionBitrate || 128,
    onWarning: (msg) => logWarn('HomeImport', msg),
  }), [store.compressOnImport, store.compressionBitrate])

  const buildSuccessMessage = useCallback((count, compressed) => {
    if (compressed) {
      return `${count} ${t('sounds')} ${t('importedAndCompressed')}`
    }
    return `${count} ${t('sounds')} ${t('imported')}`
  }, [t])

  // ─── IMPORT DEPUIS PATHS (dialog) ────────────────────────────────────
  const importFromPaths = useCallback(async (filePaths) => {
    if (!filePaths || filePaths.length === 0) return

    setTotalFiles(filePaths.length)
    setImportProgress(0)
    let count = 0

    const compress = store.compressOnImport || false

    for (let i = 0; i < filePaths.length; i++) {
      const fp = filePaths[i]
      let result = await window.electronAPI.importSoundFile(fp)

      if (result.success) {
        const comp = await compressFileIfNeeded(result.path, compressOptions())
        result.path = comp.path
        result.compressed = comp.compressed
        result.originalSize = comp.originalSize
        result.compressedSize = comp.compressedSize
        result.compressionRatio = comp.compressionRatio
      }

      if (result.success) {
        await store.addSound({
          name: result.name,
          path: result.path,
          emoji: DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)],
          profiles: [currentProfileId],
          compressed: result.compressed || false,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
        })
        count++
      }
      setImportProgress(i + 1)
    }

    if (count > 0) {
      addToast(buildSuccessMessage(count, compress), 'success')
    }
    setImportProgress(0)
    setTotalFiles(0)
    return count
  }, [store, currentProfileId, addToast, compressOptions, buildSuccessMessage])

  // ─── IMPORT DEPUIS DRAG & DROP ──────────────────────────────────────
  const importFromDrop = useCallback(async (dataTransfer) => {
    const dtFiles = [...(dataTransfer?.files || [])]
    const dtItems = [...(dataTransfer?.items || [])]

    const allFiles = dtFiles.length > 0
      ? dtFiles
      : dtItems.filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean)

    const hasAnyItem = dtFiles.length > 0 || dtItems.some(i => i.kind === 'file')

    if (!allFiles.length) {
      if (hasAnyItem) {
        addToast(t('unsupportedFormat'), 'error')
      }
      return 0
    }

    setIsImporting(true)
    setImportSuccess(0)

    const audioFiles = allFiles.filter(f => {
      if (!f) return false
      const nameMatch = f.name && AUDIO_REGEX.test(f.name)
      const typeMatch = f.type && f.type.startsWith('audio/')
      return nameMatch || typeMatch
    })

    if (!audioFiles.length) {
      const names = allFiles.map(f => f.name).join(', ')
      addToast(`${t('unsupportedFormat')} : ${names}`, 'error')
      setIsImporting(false)
      return 0
    }

    let imported = 0
    const compress = store.compressOnImport || false

    for (const file of audioFiles) {
      try {
        let result = null

        if (file.path && file.path.length > 2) {
          result = await window.electronAPI.importSoundFile(file.path)
        } else {
          const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = () => reject(new Error(t('readError')))
            reader.readAsArrayBuffer(file)
          })
          result = await window.electronAPI.writeDroppedFile(file.name, arrayBuffer)
        }

        if (result.success) {
          const comp = await compressFileIfNeeded(result.path, compressOptions())
          result.path = comp.path

          await store.addSound({
            name: result.name,
            path: result.path,
            emoji: DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)],
            profiles: [currentProfileId],
          })
          imported++
        } else {
          addToast(`${t('errorFor')} ${file.name} : ${result?.error || t('unknown')}`, 'error')
        }
      } catch (err) {
        logWarn('HomeImport', `Erreur drop ${file.name}`, err)
        addToast(`${t('cannotImport')} ${file.name}`, 'error')
      }
    }

    setIsImporting(false)
    if (imported > 0) {
      setImportSuccess(imported)
      addToast(buildSuccessMessage(imported, compress), 'success')
      setTimeout(() => setImportSuccess(0), 3000)
    }

    return imported
  }, [store, currentProfileId, addToast, compressOptions, buildSuccessMessage, t])

  return {
    isImporting,
    importProgress,
    totalFiles,
    importSuccess,
    importFromPaths,
    importFromDrop,
  }
}