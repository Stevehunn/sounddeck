// src/features/editor/components/Timeline/TimelineMarkersPanel.jsx
import { memo } from 'react'
import MarkersPanel from '../Markers/MarkersPanel'

/**
 * Panneau latéral des marqueurs + bouton flottant quand fermé.
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
        title={tr('editorMarkers') || 'Afficher les marqueurs'}
      >
        <i className="ti ti-flag" />
        {tr('editorMarkers') || 'Marqueurs'}
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
        width: 280,
        minWidth: 280,
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
          {tr('editorMarkers') || 'Marqueurs'}
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
          title={tr('close') || 'Fermer le panneau des marqueurs'}
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