// src/features/editor/components/Timeline/TimelineRuler.jsx
import React, { memo } from 'react'

const TimelineRuler = memo(({
  totalDuration,
  pixelsPerSecond,
  currentTime,
  isPlaying,
  zoomLevel,
  formatTime
}) => {
  const renderRuler = () => {
    const marks = []
    let step = 1
    if (zoomLevel < 0.08) step = 60
    else if (zoomLevel < 0.15) step = 30
    else if (zoomLevel < 0.3) step = 10
    else if (zoomLevel < 0.6) step = 5
    else if (zoomLevel < 1.5) step = 1
    else if (zoomLevel < 3) step = 0.5
    else step = 0.1

    const totalMarks = Math.ceil(totalDuration / step) + 1
    
    for (let i = 0; i < totalMarks; i++) {
      const time = i * step
      const position = time * pixelsPerSecond
      if (position > totalDuration * pixelsPerSecond + 20) break
      
      const isMain = time % 5 === 0 || step >= 5
      
      marks.push(
        <div
          key={time}
          style={{
            position: 'absolute',
            left: position,
            top: 0,
            height: isMain ? 16 : 8,
            width: 1,
            background: isMain ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            transform: 'translateX(-0.5px)'
          }}
        >
          {isMain && (
            <span style={{
              position: 'absolute',
              top: 18,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: Math.max(7, 10 * Math.min(zoomLevel, 2) / 1.5),
              color: 'var(--text-tertiary)',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}>
              {formatTime(time)}
            </span>
          )}
        </div>
      )
    }
    return marks
  }

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      height: 36,
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      zIndex: 5,
      cursor: 'pointer'
    }}>
      {renderRuler()}
      
      {/* Playhead */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: currentTime * pixelsPerSecond,
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
    </div>
  )
})

TimelineRuler.displayName = 'TimelineRuler'

export default TimelineRuler