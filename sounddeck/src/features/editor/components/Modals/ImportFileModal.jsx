/**
 * @file Import-file modal.
 *
 * Picks an audio file via the native dialog (or accepts a pre-selected
 * file from the parent), asks for the target track and start time, then
 * forwards everything to `onConfirm({filePath, fileName, trackId, startTime})`.
 *
 * The modal also validates the file extension against `SUPPORTED_FORMATS`
 * before accepting it (shows a native `alert()` on mismatch).
 *
 * ## Two modes
 *
 * - **Standalone** — the user clicks the drop zone to open the file
 *   picker (`handlePickFile`).
 * - **Pre-filled** — the parent passes `initialFilePath` / `initialFileName`
 *   (e.g. from a drag-and-drop or a native picker in `Editor.jsx`).
 *
 * @see ../Editor.jsx — the caller
 */

import { useState, useEffect } from 'react'

/** File extensions accepted for import. */
const SUPPORTED_FORMATS = [
  'mp3',
  'wav',
  'ogg',
  'flac',
  'm4a',
  'aac',
  'opus',
  'webm',
]

/**
 * Returns the file extension, lowercased, or an empty string.
 * @param {string} path
 * @returns {string}
 */
function getExtension(path) {
  return path.split('.').pop()?.toLowerCase() || ''
}

/**
 * Returns the file base name (without extension) from a path.
 * @param {string} path
 * @returns {string}
 */
function getBaseName(path) {
  return path.replace(/\.[^.]+$/, '').split(/[\\/]/).pop() || ''
}

/**
 * Import-file modal.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {(payload: {filePath: string, fileName: string, trackId: string, startTime: number}) => void} props.onConfirm
 * @param {Array<{id: string, name: string, clips?: Array<Object>}>} props.tracks
 * @param {(key: string) => string} props.tr
 * @param {string} [props.defaultTrackId='']
 * @param {string|null} [props.initialFilePath=null]
 * @param {string} [props.initialFileName='']
 * @returns {JSX.Element|null}
 */
export default function ImportFileModal({
  isOpen,
  onClose,
  onConfirm,
  tracks,
  tr,
  defaultTrackId = '',
  initialFilePath = null,
  initialFileName = '',
}) {
  const [filePath, setFilePath] = useState('')
  const [fileName, setFileName] = useState('')
  const [trackId, setTrackId] = useState(defaultTrackId)
  const [startTime, setStartTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Reset the local state whenever the modal opens or the initial values
  // change (the modal can be re-used across multiple imports).
  useEffect(() => {
    if (!isOpen) return

    const defaultTrack = defaultTrackId || tracks?.[0]?.id || ''
    setTrackId(defaultTrack)
    setStartTime(0)

    if (initialFilePath) {
      setFilePath(initialFilePath)
      setFileName(
        initialFileName ||
          initialFilePath.split(/[\\/]/).pop() ||
          tr('editorAudioFileFallback') ||
          'Audio file'
      )
    } else {
      setFilePath('')
      setFileName('')
    }
  }, [
    isOpen,
    tracks,
    defaultTrackId,
    initialFilePath,
    initialFileName,
    tr,
  ])

  if (!isOpen) return null

  /**
   * Opens the native file picker and validates the extension.
   * @returns {Promise<void>}
   */
  const handlePickFile = async () => {
    try {
      const result = await window.electronAPI.openFileDialog?.()
      if (!result || result.length === 0) return

      const picked = result[0]
      const ext = getExtension(picked)
      if (!SUPPORTED_FORMATS.includes(ext)) {
        // eslint-disable-next-line no-alert
        alert(
          tr('editorUnsupportedFormat', {
            formats: SUPPORTED_FORMATS.join(', '),
          }) ||
            `Unsupported format. Accepted formats: ${SUPPORTED_FORMATS.join(', ')}`
        )
        return
      }

      setFilePath(picked)
      setFileName(getBaseName(picked))
    } catch (e) {
      console.error('File picker error:', e)
    }
  }

  /**
   * Validates and forwards the import to the parent.
   * @param {React.FormEvent} e
   * @returns {void}
   */
  const handleSubmit = (e) => {
    e.preventDefault()

    if (!filePath || !trackId) {
      // eslint-disable-next-line no-alert
      alert('Please select a file and a track')
      return
    }

    setIsProcessing(true)

    onConfirm?.({
      filePath,
      fileName: fileName || tr('editorAudioFileFallback') || 'Audio file',
      trackId,
      startTime: Math.max(0, startTime),
    })

    setIsProcessing(false)
  }

  const selectedFileBaseName = filePath
    ? filePath.split(/[\\/]/).pop() || filePath
    : ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i
            className="ti ti-file-import"
            style={{ color: 'var(--accent)' }}
          />
          {tr('editorImportFile') || 'Import a file'}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Drop zone / file picker */}
          <div
            style={{
              border: `2px dashed ${
                filePath ? 'var(--success)' : 'var(--border)'
              }`,
              borderRadius: 'var(--radius-md)',
              padding: 20,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: filePath ? 'rgba(29,158,117,0.05)' : 'transparent',
              marginBottom: 12,
            }}
            onClick={handlePickFile}
          >
            {filePath ? (
              <div>
                <i
                  className="ti ti-check"
                  style={{ fontSize: 32, color: 'var(--success)' }}
                />
                <div
                  style={{
                    fontWeight: 500,
                    marginTop: 8,
                    wordBreak: 'break-all',
                  }}
                >
                  {selectedFileBaseName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    marginTop: 4,
                  }}
                >
                  {tr('orBrowse') || 'Click to change'}
                </div>
              </div>
            ) : (
              <div>
                <i
                  className="ti ti-cloud-upload"
                  style={{ fontSize: 32, color: 'var(--text-tertiary)' }}
                />
                <div
                  style={{ marginTop: 8, color: 'var(--text-secondary)' }}
                >
                  {tr('dropFiles') || 'Choose an audio file'}
                </div>
                <div
                  style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                >
                  {tr('orBrowse') || 'or click to browse'}
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr('editorNameLabel') || 'Name'}
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={tr('editorNamePlaceholder') || 'New sound name'}
              required
              className="input-lg"
            />
          </div>

          {/* Track + Start time */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {tr('editorSelectTrack') || 'Track'}
              </label>
              <select
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                style={{ width: '100%' }}
                className="input-lg"
                required
              >
                {tracks?.map((t, index) => (
                  <option key={t.id} value={t.id}>
                    {t.name || `Track ${index + 1}`} ({t.clips?.length || 0}{' '}
                    clips)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                {tr('start') || 'Start'}
              </label>
              <input
                type="number"
                value={startTime}
                onChange={(e) =>
                  setStartTime(
                    Math.max(0, parseFloat(e.target.value) || 0)
                  )
                }
                step={0.1}
                min={0}
                className="input-lg"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                fontSize: 13,
                padding: '8px 20px',
                minWidth: 100,
                minHeight: 40,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {tr('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!filePath || isProcessing}
              style={{
                fontSize: 13,
                padding: '8px 20px',
                minWidth: 100,
                minHeight: 40,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isProcessing ? (
                <>
                  <i
                    className="ti ti-loader"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />{' '}
                  {tr('importing') || 'Import...'}
                </>
              ) : (
                <>
                  <i className="ti ti-upload" />{' '}
                  {tr('editorImport') || 'Import'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}