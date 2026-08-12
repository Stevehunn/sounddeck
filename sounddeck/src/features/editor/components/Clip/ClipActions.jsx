// src/features/editor/components/Clip/ClipActions.jsx
import React, { memo, useState, useRef, useEffect } from 'react'
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
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteButton, setShowDeleteButton] = useState(false)
  const deleteTimeoutRef = useRef(null)
  const buttonRef = useRef(null)

  console.log('🔄 [ClipActions] Render:', { isSelected, isHovering, isDeleting, showDeleteButton, clipId })

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current)
      }
    }
  }, [])

  const visible = isSelected && isHovering && !isDeleting
  const shouldShowDeleteButton = isSelected && (isHovering || isDeleting || showDeleteButton)

  const handleDeleteStart = () => {
    console.log('🗑️ [ClipActions] handleDeleteStart appelé')
    setShowDeleteButton(true)
    setIsDeleting(true)
  }

  const handleDeleteEnd = () => {
    console.log('🗑️ [ClipActions] handleDeleteEnd appelé')
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current)
    }
    deleteTimeoutRef.current = setTimeout(() => {
      console.log('🗑️ [ClipActions] Réinitialisation après délai')
      setIsDeleting(false)
      setShowDeleteButton(false)
    }, 300)
  }

  const handleDeleteConfirm = () => {
    console.log('🗑️ [ClipActions] handleDeleteConfirm appelé avec:', { clipId, trackId })
    if (onRemove && clipId && trackId) {
      // ✅ CORRECTION : onRemove attend (trackId, clipId)
      console.log('🗑️ [ClipActions] Appel de onRemove avec (trackId, clipId)')
      onRemove(trackId, clipId)  // ✅ Bon ordre : trackId d'abord, clipId ensuite
    } else {
      console.warn('🗑️ [ClipActions] onRemove non disponible ou IDs manquants')
    }
  }

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
      {visible && (
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
      )}

      {shouldShowDeleteButton && (
        <DeleteButton
          ref={buttonRef}
          onDelete={handleDeleteConfirm}
          confirmTitle={tr('confirmDeleteClip') || 'Confirmer la suppression du clip'}
          confirmMessage={tr('confirmDeleteClipMessage') || 'Voulez-vous vraiment supprimer ce clip ?'}
          itemName=""
          size="sm"
          variant="ghost"
          icon="ti-trash"
          disabled={false}
          onConfirmStart={handleDeleteStart}
          onConfirmEnd={handleDeleteEnd}
        />
      )}
    </div>
  )
})

ClipActions.displayName = 'ClipActions'

export default ClipActions