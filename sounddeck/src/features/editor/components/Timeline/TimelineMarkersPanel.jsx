/**
 * @file Markers side panel + floating "add marker" button when closed.
 *
 * When `isOpen === false`, renders a floating pill button on the top-right
 * of the timeline (badge = marker count) that calls `onOpen()`.
 *
 * When `isOpen === true`, renders a 280-px-wide column with a header
 * (title + count + close button) and the `<MarkersPanel>` list.
 *
 * Returns `null` if `onAddMarker` is not provided — this lets the parent
 * disable the whole markers feature without mounting an empty panel.
 *
 * @see ../Timeline/index.jsx
 * @see ../Markers/MarkersPanel.jsx
 */

import { memo } from 'react'
import MarkersPanel from '../Markers/MarkersPanel'

/** Panel width (px). */
const PANEL_WIDTH_PX = 280

/**
 * Markers side panel (see file header).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Array} [props.markers]
 * @param {number} props.currentTime
 * @param {number} props.totalDuration
 * @param {Function} [props.onAddMarker]
 * @param {Function} [props.onRemoveMarker]
 * @param {Function} [props.onUpdateMarker]
 * @param {Function} [props.onNavigateToMarker]
 * @param {Function} [props.onClose]
 * @param {Function} [props.onOpen]
 * @param {Function} [props.onAutoOpenChange]
 * @param {(key: string, params?: Object) => string} props.tr
 * @returns {JSX.Element|null}
 */
const TimelineMarkersPanel = memo(function TimelineMarkersPanel({
  isOpen,
  markers,
  currentTime,
  totalDuration,
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onNavigateToMarker,
  onClose,
  onOpen,
  onAutoOpenChange,
  tr,
}) {
  if (!onAddMarker) return null

  if (!isOpen) {
    return (
      <button
        data-testid="editor-add-marker-button"
        className="btn-secondary btn-sm"
        onClick={onOpen}
        style={{
          position: 'absolute',
          right: 8,
          top: 8,
          zIndex: 10,
          padding: '4px 10px',
          fontSize: 11,
          color: 'var(--accent)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          background: 'var(--bg-secondary)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.background = 'var(--accent-light)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background = 'var(--bg-secondary)'
        }}
        title={tr('editorMarkers') || 'Show markers'}
      >
        <i className="ti ti-flag" />
        {tr('editorMarkers') || 'Markers'}
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            background: 'var(--bg-tertiary)',
            padding: '0 6px',
            borderRadius: 10,
            minWidth: 16,
            textAlign: 'center',
          }}
        >
          {markers?.length || 0}
        </span>
      </button>
    )
  }

  return (
    <div
      data-testid="editor-markers-panel"
      style={{
        width: PANEL_WIDTH_PX,
        minWidth: PANEL_WIDTH_PX,
        height: '100%',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        zIndex: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--bg-tertiary)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <i className="ti ti-flag" style={{ color: 'var(--accent)' }} />
          {tr('editorMarkers') || 'Markers'}
          <span
            style={{
              fontSize: 9,
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              marginLeft: 2,
            }}
          >
            ({markers?.length || 0})
          </span>
        </span>
        <button
          className="btn-ghost btn-sm btn-icon"
          onClick={onClose}
          style={{
            padding: '2px 4px',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            minWidth: 20,
            minHeight: 20,
            borderRadius: 'var(--radius-sm)',
          }}
          title={tr('close') || 'Close markers panel'}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <MarkersPanel
          markers={markers}
          onAddMarker={onAddMarker}
          onRemoveMarker={onRemoveMarker}
          onUpdateMarker={onUpdateMarker}
          onNavigateToMarker={onNavigateToMarker}
          currentTime={currentTime}
          totalDuration={totalDuration}
          tr={tr}
          onAutoOpenChange={onAutoOpenChange}
        />
      </div>
    </div>
  )
})

export default TimelineMarkersPanel