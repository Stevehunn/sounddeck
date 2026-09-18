// src/features/editor/components/Timeline/TimelineRuler.jsx
import React, { memo } from 'react'

const TimelineRuler = memo(({
  totalDuration,
  pixelsPerSecond,
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
      {/* ✅ FIX S.A/B33 : le playhead est retiré d'ici.
          Il est rendu UNE SEULE FOIS par <TimelinePlayhead /> dans Timeline/index.jsx,
          sinon on obtient un double-playhead superposé. */}
    </div>
  )
})

TimelineRuler.displayName = 'TimelineRuler'

export default TimelineRuler