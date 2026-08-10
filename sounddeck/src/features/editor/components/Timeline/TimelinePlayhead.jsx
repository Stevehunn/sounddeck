// src/features/editor/components/Timeline/TimelinePlayhead.jsx
import React, { memo } from 'react'

const TimelinePlayhead = memo(({
  currentTime,
  pixelsPerSecond,
  isPlaying,
  formatTime
}) => {
  const position = currentTime * pixelsPerSecond

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: position,
      width: 2,
      background: 'var(--accent)',
      zIndex: 10,
      pointerEvents: 'none',
      transform: 'translateX(-1px)',
      boxShadow: '0 0 10px rgba(124,111,247,0.5)',
      transition: isPlaying ? 'none' : 'left 0.1s ease'
    }}>
      <div style={{
        position: 'absolute',
        top: -4,
        left: -4,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: 'var(--accent)',
        border: '2px solid var(--bg-primary)'
      }} />
      <div style={{
        position: 'absolute',
        top: -20,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 9,
        fontFamily: 'monospace',
        color: 'var(--accent)',
        background: 'var(--bg-secondary)',
        padding: '1px 4px',
        borderRadius: 3,
        border: '1px solid var(--accent)',
        whiteSpace: 'nowrap',
        opacity: 0.8
      }}>
        {formatTime(currentTime)}
      </div>
    </div>
  )
})

TimelinePlayhead.displayName = 'TimelinePlayhead'

export default TimelinePlayhead