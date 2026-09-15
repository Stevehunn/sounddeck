// src/features/editor/components/Markers/MarkerItem.jsx
import React, { useState, memo } from 'react'
import { DeleteButton } from '@shared/components/ui'
import { formatTime as formatTimeShared } from '@shared/utils/format'

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

  const formatTime = (seconds) => formatTimeShared(seconds)

  const isCurrent = currentTime >= marker.time && currentTime < marker.time + 0.1

  return (
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
        
        {/* ✅ Bouton Supprimer générique - variant ghost pour inline */}
        <DeleteButton
          onDelete={() => onRemove?.(marker.id)}
          confirmTitle={tr?.('confirmDelete') || 'Confirmer la suppression'}
          confirmMessage={tr?.('confirmDeleteMarker') || 'Voulez-vous vraiment supprimer ce marqueur ?'}
          itemName={marker.name}
          size="sm"
          variant="ghost"
          icon="ti-trash"
        />
      </div>
    </div>
  )
})

MarkerItem.displayName = 'MarkerItem'

export default MarkerItem