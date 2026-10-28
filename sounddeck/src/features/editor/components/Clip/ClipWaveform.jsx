/**
 * @file Waveform visualization overlay for a clip.
 *
 * Renders up to `MAX_BARS` vertical bars over the clip's body, each
 * reflecting the amplitude at that position in the audio. The bars are
 * vertically scaled by `Math.abs(value)`, clamped to
 * `[MIN_HEIGHT_PCT, MAX_HEIGHT_PCT]`, and vertically flipped for negative
 * values (so they extend downward).
 *
 * The whole overlay is non-interactive (`pointer-events: none`) and very
 * transparent (`opacity: WRAPPER_OPACITY`) — it's a visual hint, not a
 * UI element.
 *
 * @see ../Clip/index.jsx — the parent that mounts it
 */

import { memo } from 'react'

/** Maximum number of bars rendered (avoids sub-pixel rendering for long clips). */
const MAX_BARS = 100

/** Minimum bar height (percent of clip height). */
const MIN_HEIGHT_PCT = 4

/** Maximum bar height (percent of clip height). */
const MAX_HEIGHT_PCT = 80

/** Wrapper opacity (bars are only a visual hint). */
const WRAPPER_OPACITY = 0.2

/**
 * Waveform overlay.
 *
 * @param {Object} props
 * @param {number[]|null} props.waveformData - Peak values (0-1).
 * @param {string} props.trackColor - Bar fill color.
 * @param {number} props.duration - Clip duration (unused; kept for API compat).
 * @returns {JSX.Element|null}
 */
const ClipWaveform = memo(
  ({ waveformData, trackColor, duration: _duration }) => {
    if (!waveformData || waveformData.length === 0) {
      return null
    }

    const data = waveformData.slice(
      0,
      Math.min(waveformData.length, MAX_BARS)
    )

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: WRAPPER_OPACITY,
          pointerEvents: 'none',
          padding: '8px 4px',
        }}
      >
        {data.map((value, index) => {
          const height = Math.max(
            MIN_HEIGHT_PCT,
            Math.min(MAX_HEIGHT_PCT, Math.abs(value) * 100)
          )
          return (
            <div
              key={index}
              style={{
                flex: 1,
                height: `${height}%`,
                minHeight: 2,
                maxHeight: '100%',
                background: trackColor,
                margin: '0 0.5px',
                borderRadius: 1,
                transform: `scaleY(${value > 0 ? 1 : -1})`,
                transformOrigin: 'center',
                transition: 'height 0.2s ease',
              }}
            />
          )
        })}
      </div>
    )
  }
)

ClipWaveform.displayName = 'ClipWaveform'

export default ClipWaveform