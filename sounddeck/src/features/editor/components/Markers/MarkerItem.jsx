// src/features/editor/components/Markers/MarkerItem.jsx
import React, { useState, memo } from 'react'
import { createPortal } from 'react-dom'

const MarkerItem = memo(({
  marker,
  onRemove,
  onUpdate,
  onNavigate,
  currentTime,
  totalDuration,
  tr
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(marker.name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isHoveringDelete, setIsHoveringDelete] = useState(false)
  const [isHoveringConfirmDelete, setIsHoveringConfirmDelete] = useState(false)

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (name.trim() && name !== marker.name) {
      onUpdate?.(marker.id, { name: name.trim() })
    } else {
      setName(marker.name)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setName(marker.name)
      setIsEditing(false)
    }
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    onRemove?.(marker.id)
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return `${s.toFixed(1)}s`
  }

  const isCurrent = currentTime >= marker.time && currentTime < marker.time + 0.1

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        marginBottom: 2,
        borderRadius: 'var(--radius-sm)',
        background: isCurrent ? 'rgba(124,111,247,0.15)' : 'transparent',
        border: isCurrent ? '1px solid var(--accent)' : '1px solid transparent',
        transition: 'all 0.15s',
        cursor: 'pointer',
        minHeight: 32
      }}
      onClick={() => onNavigate?.(marker.time)}
      >
        {/* Indicateur de couleur */}
        <div style={{
          width: 4,
          height: 24,
          borderRadius: 2,
          background: marker.color || '#3b82f6',
          flexShrink: 0
        }} />

        {/* Temps */}
        <span style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: 'var(--text-secondary)',
          minWidth: 40,
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 'var(--radius-sm)'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onNavigate?.(marker.time)
        }}
        title={tr?.('editorNavigate') || 'Naviguer'}
        >
          {formatTime(marker.time)}
        </span>

        {/* Nom */}
        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="input-sm"
            style={{
              flex: 1,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--accent)',
              color: 'var(--text-primary)',
              fontSize: 11,
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              minWidth: 40
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              fontSize: 11,
              color: 'var(--text-primary)',
              cursor: 'text',
              padding: '4px 4px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent',
              transition: 'border-color 0.15s',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              handleDoubleClick()
            }}
            title={tr?.('editorRenameMarker') || 'Double-clic pour renommer'}
          >
            {marker.name}
          </span>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="btn-ghost btn-sm btn-icon"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate?.(marker.time)
            }}
            style={{
              padding: '4px 6px',
              fontSize: 12,
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
              minWidth: 24,
              minHeight: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.6'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
            title={tr?.('editorNavigate') || 'Naviguer'}
          >
            <i className="ti ti-arrow-right" />
          </button>
          
          <button
            className="btn-danger btn-sm btn-icon"
            onClick={handleDeleteClick}
            onMouseEnter={() => setIsHoveringDelete(true)}
            onMouseLeave={() => setIsHoveringDelete(false)}
            style={{
              padding: '4px 6px',
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
              minWidth: 24,
              minHeight: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)',
              background: isHoveringDelete ? 'rgba(224, 82, 82, 0.15)' : 'transparent',
              border: isHoveringDelete ? '1px solid var(--danger)' : '1px solid transparent',
              opacity: isHoveringDelete ? 1 : 0.7,
              transform: isHoveringDelete ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isHoveringDelete ? '0 0 20px rgba(224, 82, 82, 0.2)' : 'none'
            }}
            title={tr?.('editorRemoveMarker') || 'Supprimer'}
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>

      {/* Popup de confirmation avec effet de survol sur le bouton Supprimer */}
      {showDeleteConfirm && createPortal(
        <div className="modal-overlay" onClick={handleCancelDelete}>
          <div className="modal" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <i className="ti ti-trash" style={{ color: 'var(--danger)' }} />
              {tr?.('confirmDelete') || 'Confirmer la suppression'}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {tr?.('confirmDeleteMarker') || 'Voulez-vous vraiment supprimer le marqueur'} 
                <strong style={{ color: 'var(--text-primary)' }}> "{marker.name}"</strong> ?
              </p>
              <p style={{ 
                color: 'var(--text-tertiary)', 
                fontSize: 12, 
                marginTop: 8 
              }}>
                {tr?.('markerPositionInfo') || 'Position'}: {formatTime(marker.time)}
              </p>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleCancelDelete}
                style={{
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)'
                  e.currentTarget.style.borderColor = 'var(--text-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                {tr?.('cancel') || 'Annuler'}
              </button>
              
              {/* ✅ Bouton Supprimer avec effet de survol dans la popup */}
              <button 
                className="btn btn-danger btn-sm" 
                onClick={handleConfirmDelete}
                onMouseEnter={() => setIsHoveringConfirmDelete(true)}
                onMouseLeave={() => setIsHoveringConfirmDelete(false)}
                style={{
                  background: isHoveringConfirmDelete ? '#c0392b' : 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  padding: '4px 12px',
                  minHeight: 28,
                  fontSize: 11,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isHoveringConfirmDelete ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: isHoveringConfirmDelete 
                    ? '0 4px 15px rgba(224, 82, 82, 0.4)' 
                    : '0 2px 8px rgba(224, 82, 82, 0.2)'
                }}
              >
                <i className="ti ti-trash" /> {tr?.('delete') || 'Supprimer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
})

MarkerItem.displayName = 'MarkerItem'

export default MarkerItem