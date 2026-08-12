// src/features/editor/components/Track/TrackHeader.jsx
import React, { useState, memo } from 'react'
import { DeleteButton } from '@shared/components/ui'

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

  // Vérifier si la piste contient des clips
  const hasClips = track.clips && track.clips.length > 0

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

      {/* ✅ Bouton Supprimer générique */}
      <DeleteButton
        onDelete={() => {
          console.log('🗑️ [TrackHeader] Suppression de la piste:', track.id)
          onTrackRemove?.(track.id)
        }}
        confirmTitle={tr('confirmDeleteTrack') || 'Confirmer la suppression de la piste'}
        confirmMessage={tr('confirmDeleteTrackMessage') || 'Voulez-vous vraiment supprimer cette piste ?'}
        itemName={name}
        size="sm"
        variant="ghost"
        icon="ti-trash"
        disabled={false}
      />
    </div>
  )
})

TrackHeader.displayName = 'TrackHeader'

export default TrackHeader