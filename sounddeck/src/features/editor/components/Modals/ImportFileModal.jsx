// src/features/editor/components/Modals/ImportFileModal.jsx
import React, { useState, useRef, useEffect } from 'react'

const SUPPORTED_FORMATS = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'webm']

export default function ImportFileModal({ 
  isOpen, 
  onClose, 
  onConfirm,  // ✅ Nouvelle prop pour confirmer l'import
  tracks, 
  tr,
  fileName: defaultFileName = ''
}) {
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState(defaultFileName)
  const [trackId, setTrackId] = useState(tracks?.[0]?.id || '')
  const [startTime, setStartTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef(null)

  // ✅ Réinitialiser quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTrackId(tracks?.[0]?.id || '')
      setFile(null)
      setFileName(defaultFileName)
      setStartTime(0)
    }
  }, [isOpen, tracks, defaultFileName])

  if (!isOpen) return null

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0]
    if (selected) {
      const ext = selected.name.split('.').pop()?.toLowerCase()
      if (SUPPORTED_FORMATS.includes(ext)) {
        setFile(selected)
        setFileName(selected.name.replace(/\.[^.]+$/, ''))
      } else {
        alert(`Format non supporté. Formats acceptés: ${SUPPORTED_FORMATS.join(', ')}`)
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      const ext = dropped.name.split('.').pop()?.toLowerCase()
      if (SUPPORTED_FORMATS.includes(ext)) {
        setFile(dropped)
        setFileName(dropped.name.replace(/\.[^.]+$/, ''))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !trackId) {
      alert('Veuillez sélectionner un fichier et une piste')
      return
    }

    setIsProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      // ✅ Utiliser onConfirm pour retourner les données au parent
      onConfirm?.({
        file: arrayBuffer,
        fileName: fileName || file.name,
        trackId,
        startTime
      })
    } catch (err) {
      console.error('Erreur import:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const getTrackName = (id) => {
    const track = tracks?.find(t => t.id === id)
    return track?.name || `Piste ${tracks?.indexOf(track) + 1}`
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 450 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-file-import" style={{ color: 'var(--accent)' }} />
          {tr('editorImportFile') || 'Importer un fichier'}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Zone de drop */}
          <div
            style={{
              border: `2px dashed ${file ? 'var(--success)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 20,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: file ? 'rgba(29,158,117,0.05)' : 'transparent',
              marginBottom: 12
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-light)'
            }}
            onDragLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'transparent'
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_FORMATS.map(f => `.${f}`).join(',')}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {file ? (
              <div>
                <i className="ti ti-check" style={{ fontSize: 32, color: 'var(--success)' }} />
                <div style={{ fontWeight: 500, marginTop: 8 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            ) : (
              <div>
                <i className="ti ti-cloud-upload" style={{ fontSize: 32, color: 'var(--text-tertiary)' }} />
                <div style={{ marginTop: 8, color: 'var(--text-secondary)' }}>
                  {tr('dropFiles') || 'Glissez vos fichiers ici'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {tr('orBrowse') || 'ou cliquez pour parcourir'}
                </div>
              </div>
            )}
          </div>

          {/* Nom du fichier */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('editorNameLabel') || 'Nom'}
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={tr('editorNamePlaceholder') || 'Nom du nouveau son'}
              required
            />
          </div>

          {/* Sélection de la piste */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {tr('editorSelectTrack') || 'Piste'}
              </label>
              <select
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                style={{ width: '100%' }}
                required
              >
                {tracks?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || `Piste ${tracks.indexOf(t) + 1}`} ({t.clips?.length || 0} clips)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {tr('start') || 'Début'}
              </label>
              <input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(Math.max(0, parseFloat(e.target.value) || 0))}
                step={0.1}
                min={0}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {tr('cancel') || 'Annuler'}
            </button>
            <button type="submit" className="btn-primary" disabled={!file || isProcessing}>
              {isProcessing ? (
                <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('importing') || 'Import...'}</>
              ) : (
                <><i className="ti ti-upload" /> {tr('editorImport') || 'Importer'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}