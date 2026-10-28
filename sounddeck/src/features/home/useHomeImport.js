/**
 * @file File import hook for the Home page.
 *
 * Two entry points:
 * - **`importFromPaths(paths)`** — used by the file picker dialog.
 *   Sequential (one file at a time, so the progress bar is meaningful).
 * - **`importFromDrop(dataTransfer)`** — used by drag & drop. Filters the
 *   dropped items by extension / MIME type before importing them.
 *
 * Both flows run `compressFileIfNeeded` (opt-in) and call `store.addSound`
 * once per successful file. Errors don't abort the whole batch — the hook
 * shows a partial-error toast at the end if some files failed.
 *
 * **i18n** — takes `t` as a parameter (React components can't call
 * `useLanguage()` from a pure module). Internal logs use English.
 *
 * @see ./Home.jsx — the caller
 * @see @shared/utils/fileCompression.js
 */

import { useState, useCallback } from 'react'
import { DEFAULT_EMOJIS } from '@shared/constants/emojis'
import { compressFileIfNeeded } from '@shared/utils/fileCompression'
import { logWarn } from '@shared/utils/logger'

/** Accepted audio file extensions (case-insensitive). */
const AUDIO_REGEX = /\.(mp3|wav|ogg|flac|m4a|aac|opus|weba)$/i

/**
 * Home page import hook.
 *
 * @param {Object} options
 * @param {Object} options.store - App store (must expose `addSound`).
 * @param {(msg: string, type?: string) => void} options.addToast
 * @param {string} options.currentProfileId - Profile to add sounds to.
 * @param {(key: string, params?: Object) => string} options.t
 *   i18n translator (from `useLanguage`).
 * @returns {{
 *   isImporting: boolean,
 *   importProgress: number,
 *   totalFiles: number,
 *   importSuccess: number,
 *   importFromPaths: (paths: string[]) => Promise<number>,
 *   importFromDrop: (dataTransfer: DataTransfer) => Promise<number>,
 * }}
 */
export function useHomeImport({ store, addToast, currentProfileId, t }) {
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [importSuccess, setImportSuccess] = useState(0)

  const compressOptions = useCallback(
    () => ({
      enabled: store.compressOnImport || false,
      bitrate: store.compressionBitrate || 128,
      onWarning: (msg) => logWarn('HomeImport', msg),
    }),
    [store.compressOnImport, store.compressionBitrate]
  )

  const buildSuccessMessage = useCallback(
    (count, compressed) => {
      if (compressed) {
        return `${count} ${t('sounds')} ${t('importedAndCompressed')}`
      }
      return `${count} ${t('sounds')} ${t('imported')}`
    },
    [t]
  )

  // ─── IMPORT FROM PATHS (file dialog) ──────────────────────────────
  const importFromPaths = useCallback(
    async (filePaths) => {
      if (!filePaths || filePaths.length === 0) return

      setTotalFiles(filePaths.length)
      setImportProgress(0)
      let count = 0
      let failed = 0

      const compress = store.compressOnImport || false

      for (let i = 0; i < filePaths.length; i++) {
        const fp = filePaths[i]
        let result = await window.electronAPI.importSoundFile(fp)

        if (result.success) {
          const comp = await compressFileIfNeeded(
            result.path,
            compressOptions()
          )
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
            emoji:
              DEFAULT_EMOJIS[
                Math.floor(Math.random() * DEFAULT_EMOJIS.length)
              ],
            profiles: [currentProfileId],
            compressed: result.compressed || false,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
          })
          count++
        } else {
          failed++
          logWarn('HomeImport', `Import failed: ${fp}`, result?.error)
        }
        setImportProgress(i + 1)
      }

      if (count > 0) {
        addToast(buildSuccessMessage(count, compress), 'success')
      }

      if (failed > 0) {
        addToast(
          t('toastImportPartialErrors', { count: failed }),
          'warning'
        )
      }

      setImportProgress(0)
      setTotalFiles(0)
      return count
    },
    [
      store,
      currentProfileId,
      addToast,
      compressOptions,
      buildSuccessMessage,
      t,
    ]
  )

  // ─── IMPORT FROM DRAG & DROP ──────────────────────────────────────
  const importFromDrop = useCallback(
    async (dataTransfer) => {
      const dtFiles = [...(dataTransfer?.files || [])]
      const dtItems = [...(dataTransfer?.items || [])]

      const allFiles =
        dtFiles.length > 0
          ? dtFiles
          : dtItems
              .filter((i) => i.kind === 'file')
              .map((i) => i.getAsFile())
              .filter(Boolean)

      const hasAnyItem =
        dtFiles.length > 0 || dtItems.some((i) => i.kind === 'file')

      if (!allFiles.length) {
        if (hasAnyItem) {
          addToast(t('unsupportedFormat'), 'error')
        }
        return 0
      }

      setIsImporting(true)
      setImportSuccess(0)

      const audioFiles = allFiles.filter((f) => {
        if (!f) return false
        const nameMatch = f.name && AUDIO_REGEX.test(f.name)
        const typeMatch = f.type && f.type.startsWith('audio/')
        return nameMatch || typeMatch
      })

      if (!audioFiles.length) {
        const names = allFiles.map((f) => f.name).join(', ')
        addToast(`${t('unsupportedFormat')}: ${names}`, 'error')
        setIsImporting(false)
        return 0
      }

      let imported = 0
      let failed = 0
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
            result = await window.electronAPI.writeDroppedFile(
              file.name,
              arrayBuffer
            )
          }

          if (result.success) {
            const comp = await compressFileIfNeeded(
              result.path,
              compressOptions()
            )
            result.path = comp.path

            await store.addSound({
              name: result.name,
              path: result.path,
              emoji:
                DEFAULT_EMOJIS[
                  Math.floor(Math.random() * DEFAULT_EMOJIS.length)
                ],
              profiles: [currentProfileId],
            })
            imported++
          } else {
            failed++
            addToast(
              `${t('errorFor')} ${file.name}: ${result?.error || t('unknown')}`,
              'error'
            )
          }
        } catch (err) {
          failed++
          logWarn('HomeImport', `Drop error for ${file.name}`, err)
          addToast(`${t('cannotImport')} ${file.name}`, 'error')
        }
      }

      setIsImporting(false)
      if (imported > 0) {
        setImportSuccess(imported)
        addToast(buildSuccessMessage(imported, compress), 'success')
        setTimeout(() => setImportSuccess(0), 3000)
      }

      if (failed > 0 && imported > 0) {
        addToast(
          t('toastImportPartialErrors', { count: failed }),
          'warning'
        )
      }

      return imported
    },
    [
      store,
      currentProfileId,
      addToast,
      compressOptions,
      buildSuccessMessage,
      t,
    ]
  )

  return {
    isImporting,
    importProgress,
    totalFiles,
    importSuccess,
    importFromPaths,
    importFromDrop,
  }
}

export default useHomeImport