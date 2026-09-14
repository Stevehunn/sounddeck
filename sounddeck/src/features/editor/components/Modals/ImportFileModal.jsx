// src/features/editor/components/Modals/ImportFileModal.jsx
import React, { useState, useEffect } from 'react'

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

  useEffect(() => {
    if (!isOpen) return

    const defaultTrack = defaultTrackId || tracks?.[0]?.id || ''
    setTrackId(defaultTrack)
    setStartTime(0)

    if (initialFilePath) {
      setFilePath(initialFilePath)
      setFileName(
        initialFileName || initialFilePath.split(/[\\/]/).pop() || 'Fichier audio'
      )
    } else {
      setFilePath('')
      setFileName('')
    }
  }, [isOpen, tracks, defaultTrackId, initialFilePath, initialFileName])

  if (!isOpen) return null

  const handlePickFile = async () => {
    try {
      const result = await window.electronAPI.openFileDialog?.()
      if (!result || result.length === 0) return

      const picked = result[0]
      const ext = picked.split('.').pop()?.toLowerCase()
      if (!SUPPORTED_FORMATS.includes(ext)) {
        alert(
          `Format non supporté. Formats acceptés: ${SUPPORTED_FORMATS.join(', ')}`
        )
        return
      }

      setFilePath(picked)
      setFileName(picked.replace(/\.[^.]+$/, '').split(/[\\/]/).pop() || '')
    } catch (e) {
      console.error('Erreur sélection fichier:', e)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!filePath || !trackId) {
      alert('Veuillez sélectionner un fichier et une piste')
      return
    }

    setIsProcessing(true)

    onConfirm?.({
      filePath,
      fileName: fileName || 'Fichier audio',
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
          {tr('editorImportFile') || 'Importer un fichier'}
        </div>

        <form onSubmit={handleSubmit}>
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
                  {tr('orBrowse') || 'Cliquez pour changer'}
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
                  {tr('dropFiles') || 'Choisissez un fichier audio'}
                </div>
                <div
                  style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
                >
                  {tr('orBrowse') || 'ou cliquez pour parcourir'}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}
            >
              {tr('editorNameLabel') || 'Nom'}
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={tr('editorNamePlaceholder') || 'Nom du nouveau son'}
              required
              className="input-lg"
            />
          </div>

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
                {tr('editorSelectTrack') || 'Piste'}
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
                    {t.name || `Piste ${index + 1}`} ({t.clips?.length || 0}{' '}
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
                {tr('start') || 'Début'}
              </label>
              <input
                type="number"
                value={startTime}
                onChange={(e) =>
                  setStartTime(Math.max(0, parseFloat(e.target.value) || 0))
                }
                step={0.1}
                min={0}
                className="input-lg"
                style={{ width: '100%' }}
              />
            </div>
          </div>

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
              {tr('cancel') || 'Annuler'}
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
                  {tr('editorImport') || 'Importer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}