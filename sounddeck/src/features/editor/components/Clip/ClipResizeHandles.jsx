// src/features/editor/components/Clip/ClipResizeHandles.jsx
import React, { memo } from 'react'

const ClipResizeHandles = memo(({
  isSelected,
  isHovering,
  duration,
  pixelsPerSecond,
  onResizeStart,
  onResizeEnd
}) => {
  const visible = isSelected || isHovering

  if (!visible) return null

  return (
    <>
      {/* Poignée de redimensionnement - début */}
      <div
        data-resize="start"
        style={{
          position: 'absolute',
          left: -4,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'ew-resize',
          zIndex: 6,
          opacity: visible ? 0.8 : 0,
          transition: 'opacity 0.2s'
        }}
        onMouseDown={onResizeStart}
      >
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 2,
          height: 30,
          background: 'var(--text-secondary)',
          borderRadius: 2,
          opacity: 0.5
        }} />
      </div>

      {/* Poignée de redimensionnement - fin */}
      <div
        data-resize="end"
        style={{
          position: 'absolute',
          right: -4,
          top: 0,
          bottom: 0,
          width: 8,
          cursor: 'ew-resize',
          zIndex: 6,
          opacity: visible ? 0.8 : 0,
          transition: 'opacity 0.2s'
        }}
        onMouseDown={onResizeEnd}
      >
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 2,
          height: 30,
          background: 'var(--text-secondary)',
          borderRadius: 2,
          opacity: 0.5
        }} />
      </div>
    </>
  )
})

ClipResizeHandles.displayName = 'ClipResizeHandles'

export default ClipResizeHandles