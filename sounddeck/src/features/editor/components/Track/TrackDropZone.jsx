// src/features/editor/components/Track/TrackDropZone.jsx
import React, { useState, memo } from 'react'

const TrackDropZone = memo(({
  track,
  isDragging,
  pixelsPerSecond
}) => {
  const [isDropTarget, setIsDropTarget] = useState(false)

  if (!isDragging) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        border: isDropTarget ? '2px dashed var(--accent)' : 'none',
        borderRadius: 4,
        margin: 2,
        pointerEvents: 'none',
        opacity: isDropTarget ? 0.6 : 0.2,
        transition: 'all 0.2s',
        zIndex: 0
      }}
    >
      {isDropTarget && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--accent)',
          fontSize: 12,
          fontWeight: 500,
          opacity: 0.8
        }}>
          <i className="ti ti-arrow-big-down" /> {track.name || `Piste ${track.index + 1}`}
        </div>
      )}
    </div>
  )
})

TrackDropZone.displayName = 'TrackDropZone'

export default TrackDropZone