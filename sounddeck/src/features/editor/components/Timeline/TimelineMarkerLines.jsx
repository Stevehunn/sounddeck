// src/features/editor/components/Timeline/TimelineMarkerLines.jsx
import { memo } from 'react'
import { formatTime } from '@shared/utils/format'

/**
 * Rend les marqueurs sur la timeline / le ruler.
 *
 * @param {string} variant - 'ruler' (triangle + label) ou 'timeline' (simple ligne)
 */
const TimelineMarkerLines = memo(function TimelineMarkerLines({
  markers,
  pixelsPerSecond,
  totalWidth,
  variant = 'timeline',
}) {
  if (!markers || markers.length === 0) return null

  if (variant === 'ruler') {
    return (
      <>
        {markers.map((marker) => {
          const position = marker.time * pixelsPerSecond
          if (position > totalWidth) return null

          const color = marker.color || '#3b82f6'

          return (
            <div
              key={`marker-${marker.id}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: position,
                width: 2,
                background: color,
                zIndex: 6,
                pointerEvents: 'none',
                opacity: 0.9,
              }}
              title={`${marker.name} (${formatTime(marker.time)})`}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: `6px solid ${color}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 7,
                  color: 'var(--text-tertiary)',
                  background: 'var(--bg-secondary)',
                  padding: '1px 4px',
                  borderRadius: 2,
                  border: `1px solid ${color}`,
                  whiteSpace: 'nowrap',
                  opacity: 0.7,
                  maxWidth: 60,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {marker.name.length > 8
                  ? marker.name.slice(0, 8) + '…'
                  : marker.name}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 1,
                  background: color,
                  opacity: 0.3,
                }}
              />
            </div>
          )
        })}
      </>
    )
  }

  // variant === 'timeline' : simple ligne verticale
  return (
    <>
      {markers.map((marker) => {
        const position = marker.time * pixelsPerSecond
        if (position > totalWidth) return null

        return (
          <div
            key={`marker-line-${marker.id}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: position,
              width: 2,
              background: marker.color || '#3b82f6',
              opacity: 0.45,
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
        )
      })}
    </>
  )
})

export default TimelineMarkerLines