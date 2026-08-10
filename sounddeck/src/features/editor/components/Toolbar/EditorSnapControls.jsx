// src/features/editor/components/Toolbar/EditorSnapControls.jsx
import React, { useState, memo } from 'react'

const SNAP_OPTIONS = [
  { label: '0.1s', value: 0.1 },
  { label: '0.5s', value: 0.5 },
  { label: '1s', value: 1 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1min', value: 60 },
]

const EditorSnapControls = memo(({
  snapEnabled,
  snapValue,
  onToggleSnap,
  onSnapChange,
  zoomLevel,
  onZoomChange,
  tr
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      flexShrink: 0
    }}>
      <button
        className={`btn-ghost btn-sm ${snapEnabled ? 'active' : ''}`}
        onClick={onToggleSnap}
        style={{ 
          fontSize: 12, 
          color: snapEnabled ? 'var(--accent)' : 'var(--text-tertiary)',
          fontWeight: snapEnabled ? 500 : 400
        }}
        title={tr('editorSnap') || 'Aimantation'}
      >
        <i className="ti ti-magnet" />
      </button>

      <button
        className="btn-ghost btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{ fontSize: 11, color: 'var(--text-secondary)' }}
      >
        {snapValue}s <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 4,
          zIndex: 10,
          minWidth: 80
        }}>
          {SNAP_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className="btn-ghost btn-sm"
              onClick={() => {
                onSnapChange?.(opt.value)
                setIsOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '4px 8px',
                fontSize: 11,
                textAlign: 'left',
                color: snapValue === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                background: snapValue === opt.value ? 'var(--accent-light)' : 'transparent'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
        <i className="ti ti-zoom" /> {Math.round(zoomLevel * 100)}%
      </span>
    </div>
  )
})

EditorSnapControls.displayName = 'EditorSnapControls'

export default EditorSnapControls