/**
 * @file Renders timeline markers as vertical lines.
 *
 * Two variants:
 * - `'ruler'` — triangle + truncated label + dotted line (richer, used in
 *   the top ruler).
 * - `'timeline'` — plain 2-px vertical line (used inside the clip area).
 *
 * Markers beyond `totalWidth` are skipped to avoid overflowing the
 * container. `pointer-events: none` everywhere so markers never steal
 * clicks from the clips or the seek handler.
 *
 * @see ../Timeline/index.jsx
 */

import { memo } from 'react'
import { formatTime } from '@shared/utils/format'

/** Default marker color when `marker.color` is absent. */
const DEFAULT_MARKER_COLOR = '#3b82f6'

/** Max characters shown in the ruler label before truncation. */
const LABEL_MAX_CHARS = 8

/**
 * Timeline markers (see file header).
 *
 * @param {Object} props
 * @param {Array<{id: string, name: string, time: number, color?: string}>} props.markers
 * @param {number} props.pixelsPerSecond
 * @param {number} props.totalWidth
 * @param {'ruler'|'timeline'} [props.variant='timeline']
 * @returns {JSX.Element|null}
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

          const color = marker.color || DEFAULT_MARKER_COLOR

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
                {marker.name.length > LABEL_MAX_CHARS
                  ? marker.name.slice(0, LABEL_MAX_CHARS) + '…'
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

  // variant === 'timeline' → simple vertical line
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
              background: marker.color || DEFAULT_MARKER_COLOR,
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