import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function ImportFileModal({ 
  tracks, 
  onConfirm, 
  onCancel, 
  fileName,
  tr 
}) {
  const { t } = useLanguage()
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [autoDetect, setAutoDetect] = useState(true)
  const selectRef = useRef(null)

  useEffect(() => {
    if (tracks.length > 0 && autoDetect) {
      setSelectedTrackId(tracks[0].id)
    }
    setTimeout(() => {
      if (selectRef.current) {
        selectRef.current.focus()
      }
    }, 100)
  }, [tracks, autoDetect])

  const handleConfirm = () => {
    if (!selectedTrackId) {
      return
    }
    onConfirm(selectedTrackId)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  const selectedTrack = tracks.find(t => t.id === selectedTrackId)

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-file-import" style={{ color: 'var(--accent)' }} />
          {t('editorImportFile') || 'Importer un fichier'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Informations du fichier */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <i className="ti ti-file" style={{ fontSize: 20, color: 'var(--accent)' }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {fileName || 'Fichier audio'}
              </div>
              <div style={{
                fontSize: 10,
                color: 'var(--text-tertiary)'
              }}>
                {t('editorFileReady') || 'Fichier prêt à être importé'}
              </div>
            </div>
            <span style={{
              fontSize: 10,
              color: 'var(--success)',
              background: 'rgba(29,158,117,0.15)',
              padding: '2px 8px',
              borderRadius: 10
            }}>
              <i className="ti ti-check" /> {t('editorReady') || 'Prêt'}
            </span>
          </div>

          {/* Sélection de la piste */}
          <div>
            <label style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6
            }}>
              {t('editorSelectTrack') || 'Sélectionner une piste'}
            </label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 160,
                overflowY: 'auto',
                padding: '2px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)'
              }}>
                {tracks.map((track, index) => {
                  const isSelected = selectedTrackId === track.id
                  const trackColor = track.color || `hsl(${(index * 30 + 200) % 360}, 60%, 50%)`
                  const clipCount = track.clips?.length || 0
                  const isDefaultName = track.name?.startsWith('__track_') || /^(Piste|Track|Pista)\s+\d+$/.test(track.name)
                  const displayName = isDefaultName 
                    ? t('editorTrackDefault').replace('{index}', index + 1)
                    : track.name

                  return (
                    <button
                      key={track.id}
                      onClick={() => {
                        setSelectedTrackId(track.id)
                        setAutoDetect(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                        background: isSelected ? 'var(--accent-light)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--bg-hover)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <div style={{
                        width: 4,
                        height: 28,
                        borderRadius: 2,
                        background: trackColor,
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? 'var(--accent)' : 'var(--text-primary)'
                        }}>
                          {displayName}
                        </div>
                        <div style={{
                          fontSize: 10,
                          color: 'var(--text-tertiary)'
                        }}>
                          {clipCount} {t('editorClips') || 'clips'}
                        </div>
                      </div>
                      {isSelected && (
                        <i className="ti ti-check" style={{ color: 'var(--accent)', fontSize: 16 }} />
                      )}
                    </button>
                  )
                })}
              </div>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--text-secondary)'
              }}>
                <input
                  type="checkbox"
                  checked={autoDetect}
                  onChange={e => {
                    setAutoDetect(e.target.checked)
                    if (e.target.checked && tracks.length > 0) {
                      setSelectedTrackId(tracks[0].id)
                    }
                  }}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <span>
                  <i className="ti ti-robot" style={{ marginRight: 4 }} />
                  {t('editorAutoDetectTrack') || 'Sélectionner automatiquement la première piste'}
                </span>
              </label>
            </div>
          </div>

          <div style={{
            fontSize: 10,
            color: 'var(--text-tertiary)',
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            padding: '4px 0'
          }}>
            <span><kbd>Enter</kbd> {t('editorConfirm') || 'Confirmer'}</span>
            <span><kbd>Esc</kbd> {t('editorCancel') || 'Annuler'}</span>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button
            className="btn-secondary btn-lg"
            onClick={onCancel}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <i className="ti ti-x" /> {t('cancel') || 'Annuler'}
          </button>
          <button
            className="btn-primary btn-lg"
            onClick={handleConfirm}
            disabled={!selectedTrackId}
            style={{
              borderRadius: 'var(--radius-md)',
              opacity: selectedTrackId ? 1 : 0.5
            }}
          >
            <i className="ti ti-upload" /> {t('editorImport') || 'Importer'}
          </button>
        </div>
      </div>
    </div>
  )
}