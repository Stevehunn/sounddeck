/**
 * @file One marker row in the markers panel — color bar, time, editable
 * name, navigate button, delete button.
 *
 * Interaction model:
 * - **Click on the row** → navigate to the marker (`onNavigate(marker.time)`).
 * - **Click on the time** → same, but stops propagation so the row's click
 *   handler doesn't double-fire.
 * - **Double-click on the name** → inline `<input>` (Enter / blur commits,
 *   Escape reverts).
 * - **Click on the navigate icon** → same as clicking the row.
 * - **Click on the delete icon** → `onRemove(marker.id)` via the generic
 *   `<DeleteButton>` confirm flow.
 *
 * The row highlights (accent tint + border) when `currentTime` is within
 * 100 ms of `marker.time` — i.e. the playhead is on the marker.
 *
 * @see ./MarkersPanel.jsx — the parent list
 * @see @shared/components/ui/DeleteButton
 */

import { useState, memo } from 'react'
import { DeleteButton } from '@shared/components/ui'
import { formatTime as formatTimeShared } from '@shared/utils/format'

/** Highlight window around `marker.time` (seconds). */
const HIGHLIGHT_WINDOW_S = 0.1

/** Default marker color when `marker.color` is absent. */
const DEFAULT_MARKER_COLOR = '#3b82f6'

/**
 * Marker row (see file header).
 *
 * @param {Object} props
 * @param {{id: string, name: string, time: number, color?: string}} props.marker
 * @param {(markerId: string) => void} [props.onRemove]
 * @param {(markerId: string, updates: {name?: string}) => void} [props.onUpdate]
 * @param {(time: number) => void} [props.onNavigate]
 * @param {number} [props.currentTime=0]
 * @param {number} [props.totalDuration=0] - Unused; kept for API compat.
 * @param {(key: string, params?: Object) => string} [props.tr]
 * @returns {JSX.Element}
 */
const MarkerItem = memo(function MarkerItem({
  marker,
  onRemove,
  onUpdate,
  onNavigate,
  currentTime,
  totalDuration: _totalDuration,
  tr,
}) {
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

  const isCurrent =
    currentTime >= marker.time &&
    currentTime < marker.time + HIGHLIGHT_WINDOW_S

  return (
    <div
      style={{
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
        minHeight: 32,
      }}
      onClick={() => onNavigate?.(marker.time)}
    >
      {/* Color bar */}
      <div
        style={{
          width: 4,
          height: 24,
          borderRadius: 2,
          background: marker.color || DEFAULT_MARKER_COLOR,
          flexShrink: 0,
        }}
      />

      {/* Time */}
      <span
        style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: 'var(--text-secondary)',
          minWidth: 40,
          cursor: 'pointer',
          padding: '2px 4px',
          borderRadius: 'var(--radius-sm)',
        }}
        onClick={(e) => {
          e.stopPropagation()
          onNavigate?.(marker.time)
        }}
        title={tr?.('editorNavigate') || 'Navigate'}
      >
        {formatTimeShared(marker.time)}
      </span>

      {/* Name (editable) */}
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
            minWidth: 40,
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
            whiteSpace: 'nowrap',
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            handleDoubleClick()
          }}
          title={
            tr?.('editorRenameMarker') || 'Double-click to rename'
          }
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
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          title={tr?.('editorNavigate') || 'Navigate'}
        >
          <i className="ti ti-arrow-right" />
        </button>

        <DeleteButton
          onDelete={() => onRemove?.(marker.id)}
          confirmTitle={tr?.('confirmDelete') || 'Confirm deletion'}
          confirmMessage={
            tr?.('confirmDeleteMarker') ||
            'Do you really want to delete this marker?'
          }
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