// src/features/editor/components/Modals/AddTrackModal.jsx
import React, { useState } from 'react'

export default function AddTrackModal({ 
  isOpen, 
  onClose,
  onCancel,
  onConfirm,
  onAddTrack,
  defaultName,
  tr 
}) {
  const [name, setName] = useState(defaultName || '')
  const [color, setColor] = useState('#3b82f6')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('✅ [AddTrackModal] handleSubmit:', name, color)
    
    if (onConfirm) {
      onConfirm(name || undefined, color)
    } else if (onAddTrack) {
      onAddTrack(name || undefined, color)
    } else {
      console.warn('⚠️ [AddTrackModal] Aucun handler de confirmation')
    }
    
    setName('')
    if (onClose) {
      onClose()
    } else if (onCancel) {
      onCancel()
    }
  }

  const handleClose = () => {
    setName('')
    if (onClose) {
      onClose()
    } else if (onCancel) {
      onCancel()
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-playlist" style={{ color: 'var(--accent)' }} />
          {tr('editorAddTrack') || 'Ajouter une piste'}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('editorTrackName') || 'Nom de la piste'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr('editorTrackNamePlaceholder') || 'Ex: Batterie, Voix, Effets...'}
              autoFocus
              className="input-lg"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('editorTrackColor') || 'Couleur de la piste'}
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 50, height: 40, padding: 2, cursor: 'pointer', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleClose}
              style={{
                fontSize: 13,
                padding: '8px 20px',
                minWidth: 100,
                minHeight: 40,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              {tr('cancel') || 'Annuler'}
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{
                fontSize: 13,
                padding: '8px 20px',
                minWidth: 100,
                minHeight: 40,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <i className="ti ti-plus" /> {tr('add') || 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}