// src/features/editor/components/Track/TrackHeader.jsx
import React, { useState, memo } from 'react'

const TrackHeader = memo(({
  track,
  trackIndex,
  trackColor,
  isHovering,
  selectedTrackId,
  onTrackRemove,
  onRenameTrack,
  tr
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(track.name || `Piste ${trackIndex + 1}`)

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (name.trim() && name !== track.name) {
      onRenameTrack?.(track.id, name.trim())
    } else {
      setName(track.name || `Piste ${trackIndex + 1}`)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setName(track.name || `Piste ${trackIndex + 1}`)
      setIsEditing(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      flex: 1,
      minWidth: 0,
      overflow: 'hidden'
    }}>
      <div style={{
        width: 3,
        height: 24,
        borderRadius: 2,
        background: trackColor,
        flexShrink: 0
      }} />
      
      {isEditing ? (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--accent)',
            color: 'var(--text-primary)',
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 6px',
            borderRadius: 3,
            outline: 'none',
            flex: 1,
            minWidth: 40
          }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: selectedTrackId === track.id ? 'var(--accent)' : 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'text',
            flex: 1,
            padding: '2px 4px',
            borderRadius: 3,
            border: '1px solid transparent',
            transition: 'border-color 0.15s'
          }}
          title={tr('editorDoubleClickToRename')}
        >
          {name}
        </div>
      )}

      <button
        className="btn-ghost btn-sm"
        onClick={(e) => {
          e.stopPropagation()
          console.log('🗑️ [TrackHeader] Suppression de la piste:', track.id)
          onTrackRemove?.(track.id)  // ✅ Appelle onTrackRemove avec track.id
        }}
        style={{
          padding: '2px 4px',
          fontSize: 12,
          color: 'var(--text-tertiary)',
          borderRadius: 3,
          flexShrink: 0,
          minWidth: 20,
          minHeight: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--danger)'
          e.currentTarget.style.background = 'rgba(224, 82, 82, 0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-tertiary)'
          e.currentTarget.style.background = 'transparent'
        }}
        title={tr('editorRemoveTrack')}
      >
        <i className="ti ti-trash" />
      </button>
    </div>
  )
})

TrackHeader.displayName = 'TrackHeader'

export default TrackHeader