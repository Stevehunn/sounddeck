/**
 * @file Vertical playhead line + top circle + floating time badge, drawn
 * inside the timeline ruler.
 *
 * Two transition modes:
 * - **Playing** — `transition: none` so the playhead tracks every frame
 *   without any easing lag.
 * - **Paused** — `transition: left 0.1s ease` so seek jumps look smooth.
 *
 * The component is purely visual (`pointer-events: none`); seeking is
 * handled by `useTimelineClickHandlers` on the parent container.
 *
 * @see ../Timeline/index.jsx
 */

import { memo } from 'react'

/** Playhead line width (px). */
const PLAYHEAD_WIDTH_PX = 2

/** Top handle circle diameter (px). */
const HANDLE_DIAMETER_PX = 10

/**
 * Timeline playhead.
 *
 * @param {Object} props
 * @param {number} props.currentTime
 * @param {number} props.pixelsPerSecond
 * @param {boolean} props.isPlaying
 * @param {(seconds: number) => string} props.formatTime
 * @returns {JSX.Element}
 */
const TimelinePlayhead = memo(function TimelinePlayhead({
  currentTime,
  pixelsPerSecond,
  isPlaying,
  formatTime,
}) {
  const position = currentTime * pixelsPerSecond

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: position,
        width: PLAYHEAD_WIDTH_PX,
        background: 'var(--accent)',
        zIndex: 10,
        pointerEvents: 'none',
        transform: 'translateX(-1px)',
        boxShadow: '0 0 10px rgba(124,111,247,0.5)',
        transition: isPlaying ? 'none' : 'left 0.1s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -4,
          left: -4,
          width: HANDLE_DIAMETER_PX,
          height: HANDLE_DIAMETER_PX,
          borderRadius: '50%',
          background: 'var(--accent)',
          border: '2px solid var(--bg-primary)',
        }}
      />
      <div
        style={{
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
          opacity: 0.8,
        }}
      >
        {formatTime(currentTime)}
      </div>
    </div>
  )
})

TimelinePlayhead.displayName = 'TimelinePlayhead'

export default TimelinePlayhead