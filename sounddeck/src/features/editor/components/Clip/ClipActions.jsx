/**
 * @file Floating action buttons (duplicate, delete) on a selected clip.
 *
 * Shows two buttons when a clip is both selected AND hovered:
 * - **Duplicate** — calls `onDuplicate(clipId, trackId)`.
 * - **Delete** — `DeleteButton` (handles its own confirm dialog) which
 *   calls `onRemove(trackId, clipId)`.
 *
 * The delete button briefly stays visible after a delete confirm
 * (`isDeleting` flag) so the user doesn't lose the affordance mid-flow.
 *
 * ## Confirm flow
 *
 * `DeleteButton` fires two callbacks:
 * - `onConfirmStart` → enter "deleting" mode (delete button stays visible).
 * - `onConfirmEnd` → after `DELETE_RESET_DELAY_MS` ms, exit "deleting" mode.
 *
 * @see ../Clip/index.jsx — the parent that mounts it
 * @see @shared/components/ui/DeleteButton
 */

import { memo, useState, useRef, useEffect } from 'react'
import { DeleteButton } from '@shared/components/ui'

/** Delay before exiting the "deleting" state (ms). */
const DELETE_RESET_DELAY_MS = 300

/**
 * Floating action buttons (duplicate / delete) for a clip.
 *
 * @param {Object} props
 * @param {boolean} props.isSelected
 * @param {boolean} props.isHovering
 * @param {string} props.clipId
 * @param {string} props.trackId
 * @param {(clipId: string, trackId: string) => void} [props.onDuplicate]
 * @param {(trackId: string, clipId: string) => void} [props.onRemove]
 * @param {(key: string) => string} [props.tr] - i18n translator.
 * @returns {JSX.Element}
 */
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

    // Cleanup the pending timer on unmount.
    useEffect(() => {
      return () => {
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
      }
    }, [])

    const visible = isSelected && isHovering && !isDeleting
    const shouldShowDeleteButton =
      isSelected && (isHovering || isDeleting || showDeleteButton)

    /**
     * Enters the "deleting" state (keeps the delete button visible during
     * the confirm dialog).
     * @returns {void}
     */
    const handleDeleteStart = () => {
      setShowDeleteButton(true)
      setIsDeleting(true)
    }

    /**
     * Schedules the exit from the "deleting" state once the confirm
     * dialog closes.
     * @returns {void}
     */
    const handleDeleteEnd = () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
      deleteTimeoutRef.current = setTimeout(() => {
        setIsDeleting(false)
        setShowDeleteButton(false)
      }, DELETE_RESET_DELAY_MS)
    }

    /**
     * Forwards the delete confirmation to the parent.
     * @returns {void}
     */
    const handleDeleteConfirm = () => {
      if (onRemove && clipId && trackId) {
        onRemove(trackId, clipId)
      }
    }

    /**
     * Forwards the duplicate intent to the parent.
     *
     * @param {React.MouseEvent} e
     * @returns {void}
     */
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