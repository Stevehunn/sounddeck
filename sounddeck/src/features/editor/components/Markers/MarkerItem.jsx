// src/features/editor/components/Markers/MarkerItem.jsx
import React, { useState, memo } from 'react'

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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 8px',
      marginBottom: 2,
      borderRadius: 'var(--radius-sm)',
      background: isCurrent ? 'var(--accent-light)' : 'transparent',
      border: isCurrent ? '1px solid var(--accent)' : '1px solid transparent',
      transition: 'all 0.15s'
    }}>
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
        cursor: 'pointer'
      }}
      onClick={() => onNavigate?.(marker.time)}
      title={tr('editorNavigate') || 'Naviguer'}
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
          style={{
            flex: 1,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--accent)',
            color: 'var(--text-primary)',
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 3,
            outline: 'none'
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            fontSize: 11,
            color: 'var(--text-primary)',
            cursor: 'text',
            padding: '2px 4px',
            borderRadius: 3,
            border: '1px solid transparent',
            transition: 'border-color 0.15s'
          }}
          onDoubleClick={handleDoubleClick}
          title={tr('editorRenameMarker') || 'Double-clic pour renommer'}
        >
          {marker.name}
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2 }}>
        <button
          className="btn-ghost btn-sm"
          onClick={() => onNavigate?.(marker.time)}
          style={{
            padding: '2px 4px',
            fontSize: 10,
            color: 'var(--text-secondary)',
            borderRadius: 3
          }}
          title={tr('editorNavigate') || 'Naviguer'}
        >
          <i className="ti ti-arrow-right" />
        </button>
        <button
          className="btn-ghost btn-sm"
          onClick={() => onRemove?.(marker.id)}
          style={{
            padding: '2px 4px',
            fontSize: 10,
            color: 'var(--danger)',
            borderRadius: 3
          }}
          title={tr('editorRemoveMarker') || 'Supprimer'}
        >
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  )
})

MarkerItem.displayName = 'MarkerItem'

export default MarkerItem