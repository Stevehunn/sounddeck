import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

const TRACK_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3',
  '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ffeb3b',
  '#ff9800', '#795548', '#607d8b', '#7C6FF7', '#1D9E75'
]

export default function AddTrackModal({ onConfirm, onCancel, defaultName, tr }) {
  const { t } = useLanguage()
  const [name, setName] = useState(defaultName || '')
  const [color, setColor] = useState(TRACK_COLORS[0])
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100)
    }
  }, [])

  const handleConfirm = () => {
    if (!name.trim()) {
      return
    }
    onConfirm(name.trim(), color)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-plus" style={{ color: 'var(--accent)' }} />
          {t('editorAddTrack') || 'Ajouter une piste'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nom de la piste */}
          <div>
            <label style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 4
            }}>
              {t('editorTrackName') || 'Nom de la piste'}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('editorTrackNamePlaceholder') || 'Ex: Batterie, Voix, Effets...'}
              className="input-lg"
              style={{
                fontSize: 14,
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                minHeight: 40
              }}
            />
          </div>

          {/* Couleur de la piste */}
          <div>
            <label style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 6
            }}>
              {t('editorTrackColor') || 'Couleur de la piste'}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TRACK_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `3px solid ${color === c ? 'var(--accent)' : 'transparent'}`,
                    background: c,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: color === c ? '0 0 12px rgba(124,111,247,0.3)' : 'none'
                  }}
                  onMouseEnter={e => {
                    if (color !== c) {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (color !== c) {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.borderColor = 'transparent'
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Aperçu de la piste */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 4,
              height: 28,
              borderRadius: 2,
              background: color,
              flexShrink: 0
            }} />
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)'
            }}>
              {name.trim() || t('editorTrackNamePlaceholder') || 'Nom de la piste'}
            </div>
            <div style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-secondary)',
              padding: '2px 8px',
              borderRadius: 10
            }}>
              {t('editorPreview') || 'Aperçu'}
            </div>
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
            disabled={!name.trim()}
            style={{
              borderRadius: 'var(--radius-md)',
              opacity: name.trim() ? 1 : 0.5
            }}
          >
            <i className="ti ti-plus" /> {t('add') || 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}