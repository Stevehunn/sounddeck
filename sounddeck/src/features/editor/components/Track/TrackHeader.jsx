/**
 * @file Track header row — color bar, editable name (double-click to
 * rename), and a generic delete button.
 *
 * Rename flow:
 * - **Double-click** the name → inline `<input>` prefilled with the name.
 * - **Enter / blur** → commit (`onRenameTrack(track.id, trimmedName)`) if
 *   the name is non-empty and actually changed.
 * - **Escape** → revert to `track.name`.
 *
 * @see ./index.jsx
 * @see ./TrackControls.jsx
 * @see @shared/components/ui/DeleteButton
 */

import { useState, memo } from 'react'
import { DeleteButton } from '@shared/components/ui'

/**
 * Track header (name + color bar + delete).
 *
 * @param {Object} props
 * @param {{id: string, name?: string, clips?: Array}} props.track
 * @param {number} props.trackIndex - Used for the `Piste N` fallback name.
 * @param {string} props.trackColor - Color bar color.
 * @param {boolean} [props.isHovering] - Reserved for future hover styling.
 * @param {string|null} [props.selectedTrackId]
 * @param {(trackId: string) => void} [props.onTrackRemove]
 * @param {(trackId: string, newName: string) => void} [props.onRenameTrack]
 * @param {(key: string, params?: Object) => string} props.tr
 * @returns {JSX.Element}
 */
const TrackHeader = memo(function TrackHeader({
  track,
  trackIndex,
  trackColor,
  isHovering: _isHovering,
  selectedTrackId,
  onTrackRemove,
  onRenameTrack,
  tr,
}) {
  /**
   * Returns the "track N" fallback label, localized and indexed.
   * @param {number} index
   * @returns {string}
   */
  const getFallbackName = (index) =>
    tr?.('editorTrackFallback', { n: index + 1 }) || `Track ${index + 1}`

  const fallbackName = getFallbackName(trackIndex)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(track.name || fallbackName)

  const handleDoubleClick = () => {
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (name.trim() && name !== track.name) {
      onRenameTrack?.(track.id, name.trim())
    } else {
      setName(track.name || fallbackName)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setName(track.name || fallbackName)
      setIsEditing(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 3,
          height: 24,
          borderRadius: 2,
          background: trackColor,
          flexShrink: 0,
        }}
      />

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
            minWidth: 40,
          }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color:
              selectedTrackId === track.id
                ? 'var(--accent)'
                : 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'text',
            flex: 1,
            padding: '2px 4px',
            borderRadius: 3,
            border: '1px solid transparent',
            transition: 'border-color 0.15s',
          }}
          title={tr?.('editorDoubleClickToRename')}
        >
          {name}
        </div>
      )}

      <DeleteButton
        onDelete={() => onTrackRemove?.(track.id)}
        confirmTitle={
          tr?.('confirmDeleteTrack') || 'Confirm track deletion'
        }
        confirmMessage={
          tr?.('confirmDeleteTrackMessage') ||
          'Do you really want to delete this track?'
        }
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