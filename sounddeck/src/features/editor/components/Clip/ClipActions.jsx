// src/features/editor/components/Clip/ClipActions.jsx
// ✅ FIX : retrait des console.log de debug qui spammaient la console à 60fps
//         pendant la lecture (EditorTimeline re-render à chaque update de currentTime)

import React, { memo, useState, useRef, useEffect } from 'react'
import { DeleteButton } from '@shared/components/ui'

const ClipActions = memo(
  ({
    isSelected,
    isHovering,
    clipId,
    trackId,
    onDuplicate,
    onRemove,
    tr,
  }) => {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteButton, setShowDeleteButton] = useState(false)
    const deleteTimeoutRef = useRef(null)

    useEffect(() => {
      return () => {
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
      }
    }, [])

    const visible = isSelected && isHovering && !isDeleting
    const shouldShowDeleteButton =
      isSelected && (isHovering || isDeleting || showDeleteButton)

    const handleDeleteStart = () => {
      setShowDeleteButton(true)
      setIsDeleting(true)
    }

    const handleDeleteEnd = () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
      deleteTimeoutRef.current = setTimeout(() => {
        setIsDeleting(false)
        setShowDeleteButton(false)
      }, 300)
    }

    const handleDeleteConfirm = () => {
      if (onRemove && clipId && trackId) {
        onRemove(trackId, clipId)
      }
    }

    const handleDuplicateClick = (e) => {
      e?.stopPropagation?.()
      e?.preventDefault?.()
      if (onDuplicate && clipId && trackId) {
        onDuplicate(clipId, trackId)
      }
    }

    return (
      <div
        style={{
          position: 'absolute',
          top: 2,
          right: 4,
          display: 'flex',
          gap: 2,
          zIndex: 7,
          pointerEvents: 'auto',
        }}
      >
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
              transition: 'all 0.15s ease',
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
            onDelete={handleDeleteConfirm}
            confirmTitle={
              tr('confirmDeleteClip') || 'Confirmer la suppression du clip'
            }
            confirmMessage={
              tr('confirmDeleteClipMessage') ||
              'Voulez-vous vraiment supprimer ce clip ?'
            }
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
  }
)

ClipActions.displayName = 'ClipActions'

export default ClipActions