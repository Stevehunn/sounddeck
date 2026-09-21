// src/features/editor/components/Timeline/TimelineZoomControls.jsx
import React, { memo } from 'react'
import { formatTime } from '@shared/utils/format'

const TimelineZoomControls = memo(({
  zoomLevel,
  onZoomChange,
  totalDuration,
  containerRef,
  tr
}) => {

  return (
    <div 
      data-testid="editor-zoom-controls"
      style={{
        position: 'sticky',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        zIndex: 20,
        marginTop: 8,
        width: 'fit-content'
      }}
    >
      <button
        className="btn-ghost btn-sm"
        onClick={() => onZoomChange?.(Math.max(0.05, zoomLevel - 0.1))}
        style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-secondary)' }}
        title={tr('editorZoomOut') || 'Zoom arrière (Ctrl+-)'}
      >
        <i className="ti ti-zoom-out" />
      </button>
      
      <span style={{
        fontSize: 11,
        color: 'var(--text-secondary)',
        minWidth: 50,
        textAlign: 'center'
      }}>
        {tr('editorZoomPercent')?.replace('{percent}', Math.round(zoomLevel * 100)) || `${Math.round(zoomLevel * 100)}%`}
      </span>
      
      <button
        className="btn-ghost btn-sm"
        onClick={() => onZoomChange?.(Math.min(10, zoomLevel + 0.1))}
        style={{ padding: '2px 6px', fontSize: 12, color: 'var(--text-secondary)' }}
        title={tr('editorZoomIn') || 'Zoom avant (Ctrl+=)'}
      >
        <i className="ti ti-zoom-in" />
      </button>
      
      <button
        className="btn-ghost btn-sm"
        onClick={() => onZoomChange?.(1)}
        style={{ padding: '2px 6px', fontSize: 10, color: 'var(--text-tertiary)' }}
        title={tr('editorZoomReset') || 'Réinitialiser le zoom (Ctrl+0)'}
      >
        <i className="ti ti-refresh" /> 100%
      </button>

      <button
        className="btn-ghost btn-sm"
        onClick={() => {
          const containerWidth = containerRef?.current?.clientWidth - 190 || 800
          const neededZoom = Math.max(0.05, Math.min(5, containerWidth / (totalDuration * 80 + 100)))
          onZoomChange?.(neededZoom)
        }}
        style={{ padding: '2px 6px', fontSize: 10, color: 'var(--text-tertiary)' }}
        title={tr('editorZoomFit') || 'Ajuster pour tout voir'}
      >
        <i className="ti ti-fit" /> {tr('editorZoomFit') || 'Ajuster'}
      </button>

      <span style={{
        fontSize: 9,
        color: 'var(--text-tertiary)',
        marginLeft: 4,
        borderLeft: '1px solid var(--border)',
        paddingLeft: 8,
        minWidth: 60
      }}>
        {tr('editorDuration') || 'Durée'}: {formatTime(totalDuration)}
      </span>
    </div>
  )
})

TimelineZoomControls.displayName = 'TimelineZoomControls'

export default TimelineZoomControls