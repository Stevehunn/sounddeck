// src/features/editor/components/Clip/ClipActions.jsx
import React, { memo } from 'react'

const ClipActions = memo(({
  isSelected,
  isHovering,
  clipId,
  trackId,
  onDuplicate,
  onRemove,
  tr
}) => {
  const visible = isSelected && isHovering

  if (!visible) return null

  // ✅ ORDRE CORRECT: clipId, trackId
  const handleDuplicateClick = (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    console.log('📋 [ClipActions] Duplicate clicked:', { clipId, trackId })
    if (onDuplicate && clipId && trackId) {
      onDuplicate(clipId, trackId)
    }
  }

  // ✅ ORDRE CORRECT: clipId, trackId
  const handleRemoveClick = (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    console.log('🗑️ [ClipActions] Remove clicked:', { clipId, trackId })
    if (onRemove && clipId && trackId) {
      onRemove(clipId, trackId)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 2,
      right: 4,
      display: 'flex',
      gap: 2,
      zIndex: 7,
      pointerEvents: 'auto'
    }}>
      <button
        className="btn-ghost btn-sm"
        onClick={handleDuplicateClick}
        style={{
          padding: '2px 5px',
          fontSize: 9,
          color: 'var(--text-secondary)',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer'
        }}
        title={tr('editorDuplicateClip') || 'Dupliquer'}
      >
        <i className="ti ti-copy" />
      </button>
      <button
        className="btn-ghost btn-sm"
        onClick={handleRemoveClick}
        style={{
          padding: '2px 5px',
          fontSize: 9,
          color: 'var(--danger)',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer'
        }}
        title={tr('editorRemoveClip') || 'Supprimer'}
      >
        <i className="ti ti-trash" />
      </button>
    </div>
  )
})

ClipActions.displayName = 'ClipActions'

export default ClipActions