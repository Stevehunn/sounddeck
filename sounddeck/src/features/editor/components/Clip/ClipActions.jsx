// src/features/editor/components/Clip/ClipActions.jsx
import React, { memo } from 'react'
import { DeleteButton } from '@shared/components/ui'

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

  const handleDuplicateClick = (e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    console.log('📋 [ClipActions] Duplicate clicked:', { clipId, trackId })
    if (onDuplicate && clipId && trackId) {
      onDuplicate(clipId, trackId)
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
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--accent)'
          e.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
        }}
        title={tr('editorDuplicateClip') || 'Dupliquer'}
      >
        <i className="ti ti-copy" />
      </button>

      {/* ✅ Bouton Supprimer générique */}
      <DeleteButton
        onDelete={() => {
          console.log('🗑️ [ClipActions] Remove clicked:', { clipId, trackId })
          if (onRemove && clipId && trackId) {
            onRemove(clipId, trackId)
          }
        }}
        confirmTitle={tr('confirmDeleteClip') || 'Confirmer la suppression du clip'}
        confirmMessage={tr('confirmDeleteClipMessage') || 'Voulez-vous vraiment supprimer ce clip ?'}
        itemName=""
        size="sm"
        variant="ghost"
        icon="ti-trash"
        disabled={false}
        style={{
          padding: '2px 5px',
          fontSize: 9,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      />
    </div>
  )
})

ClipActions.displayName = 'ClipActions'

export default ClipActions