/**
 * @file Timeline ruler — renders tick marks + time labels above the clips
 * area, with adaptive step sizing based on the current zoom level.
 *
 * Step selection (seconds between ticks):
 * - `zoomLevel < 0.08` → 60s
 * - `zoomLevel < 0.15` → 30s
 * - `zoomLevel < 0.3` → 10s
 * - `zoomLevel < 0.6` → 5s
 * - `zoomLevel < 1.5` → 1s
 * - `zoomLevel < 3` → 0.5s
 * - otherwise → 0.1s
 *
 * "Main" ticks (16-px tall, with a time label) are at `t % 5 === 0` or
 * when `step >= 5`; the others are 8-px tall with no label.
 *
 * **Note:** the playhead is NOT rendered here. It's rendered once, by
 * `<TimelinePlayhead>` in `Timeline/index.jsx`, to avoid a double-playhead
 * overlay (see the previous `S.A/B33` fix).
 *
 * @see ../Timeline/index.jsx
 * @see ./TimelinePlayhead.jsx
 */

import { memo } from 'react'

/** Minimum time label font size (px). */
const LABEL_MIN_FONT_PX = 7

/** Base label font size (px) before zoom scaling. */
const LABEL_BASE_FONT_PX = 10

/** Zoom multiplier cap for label scaling. */
const LABEL_ZOOM_CAP = 2

/** Zoom divisor applied to the label font scaling. */
const LABEL_ZOOM_DIVISOR = 1.5

/** "+20px" buffer past totalDuration so the last tick isn't clipped. */
const RULER_TICK_BUFFER_PX = 20

/**
 * Returns the tick step (in seconds) for the given zoom level.
 *
 * @param {number} zoomLevel
 * @returns {number}
 */
function getTickStep(zoomLevel) {
  if (zoomLevel < 0.08) return 60
  if (zoomLevel < 0.15) return 30
  if (zoomLevel < 0.3) return 10
  if (zoomLevel < 0.6) return 5
  if (zoomLevel < 1.5) return 1
  if (zoomLevel < 3) return 0.5
  return 0.1
}

/**
 * Timeline ruler (see file header).
 *
 * @param {Object} props
 * @param {number} props.totalDuration
 * @param {number} props.pixelsPerSecond
 * @param {number} props.zoomLevel
 * @param {(seconds: number) => string} props.formatTime
 * @returns {JSX.Element}
 */
const TimelineRuler = memo(function TimelineRuler({
  totalDuration,
  pixelsPerSecond,
  zoomLevel,
  formatTime,
}) {
  /**
   * Renders one absolute-positioned tick per step.
   * @returns {JSX.Element[]}
   */
  const renderRuler = () => {
    const marks = []
    const step = getTickStep(zoomLevel)
    const totalMarks = Math.ceil(totalDuration / step) + 1
    const maxPosition = totalDuration * pixelsPerSecond + RULER_TICK_BUFFER_PX

    for (let i = 0; i < totalMarks; i++) {
      const time = i * step
      const position = time * pixelsPerSecond
      if (position > maxPosition) break

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
            background: isMain
              ? 'var(--text-secondary)'
              : 'var(--text-tertiary)',
            transform: 'translateX(-0.5px)',
          }}
        >
          {isMain && (
            <span
              style={{
                position: 'absolute',
                top: 18,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: Math.max(
                  LABEL_MIN_FONT_PX,
                  (LABEL_BASE_FONT_PX * Math.min(zoomLevel, LABEL_ZOOM_CAP)) /
                    LABEL_ZOOM_DIVISOR
                ),
                color: 'var(--text-tertiary)',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
              }}
            >
              {formatTime(time)}
            </span>
          )}
        </div>
      )
    }
    return marks
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        height: 36,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        zIndex: 5,
        cursor: 'pointer',
      }}
    >
      {renderRuler()}
    </div>
  )
})

TimelineRuler.displayName = 'TimelineRuler'

export default TimelineRuler