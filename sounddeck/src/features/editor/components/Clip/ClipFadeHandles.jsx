/**
 * @file Interactive fade handles and visual gradient zones for a clip.
 *
 * Renders up to four elements inside the clip container:
 * 1. **Fade-in gradient** — dark → transparent, from the left edge.
 * 2. **Fade-out gradient** — transparent → dark, to the right edge.
 * 3. **Fade-in handle** — a thin vertical grip on the left edge (mouse-down
 *    starts a horizontal drag to set the fade-in duration).
 * 4. **Fade-out handle** — same on the right edge, for fade-out.
 *
 * The gradient zones are only rendered when `clip.fadeIn > 0` /
 * `clip.fadeOut > 0`. Handles are always rendered when the clip is
 * selected or hovered — they're invisible (`opacity: 0`,
 * `pointer-events: none`) until the user starts hovering.
 *
 * ## Drag throttling
 *
 * `onFade(clipId, edge, durationSeconds)` is called at most once every
 * `THROTTLE_MS` (~30fps) during the drag, via `requestAnimationFrame`.
 * A final flush happens on `mouseup` to capture the exact released value.
 *
 * @see ../Clip/index.jsx — the parent that mounts it
 */

import { memo } from 'react'

/** Throttle interval for drag updates (ms). ~30fps, avoids overwhelming React. */
const THROTTLE_MS = 33

/** Handle hit zone width (px). */
const HANDLE_WIDTH = 8

/** Vertical indicator bar dimensions (px). */
const INDICATOR_WIDTH = 2
const INDICATOR_HEIGHT = 20

/** Opacities (handle vs inner indicator). */
const HANDLE_OPACITY_HOVER = 0.6
const INDICATOR_OPACITY = 0.5

/**
 * Starts a fade drag on `edge` (`'in'` or `'out'`).
 *
 * - Installs `mousemove` / `mouseup` listeners on `document`.
 * - Throttles `onFade` calls via `requestAnimationFrame` (one call per
 *   `THROTTLE_MS`).
 * - On `mouseup`, does a final synchronous flush with the exact released
 *   value, then removes all listeners.
 *
 * @param {React.MouseEvent} e
 * @param {'in'|'out'} edge
 * @param {HTMLElement|null} parentEl - The clip container (bounding rect source).
 * @param {string} clipId
 * @param {number} pixelsPerSecond - Scale factor (duration → px).
 * @param {(clipId: string, edge: 'in'|'out', duration: number) => void} [onFade]
 * @returns {void}
 */
function startFadeDrag(e, edge, parentEl, clipId, pixelsPerSecond, onFade) {
  e.stopPropagation()
  if (!parentEl) return

  let latestValue = null
  let rafId = null
  let lastFlush = 0

  /**
   * Throttled flush — schedules another rAF if not enough time has
   * passed since the last emit.
   * @returns {void}
   */
  const flush = () => {
    rafId = null
    if (latestValue === null) return
    const now = performance.now()
    if (now - lastFlush < THROTTLE_MS) {
      rafId = requestAnimationFrame(flush)
      return
    }
    lastFlush = now
    onFade?.(clipId, edge, latestValue)
    latestValue = null
  }

  /**
   * Computes the new fade duration from the cursor position.
   * @param {MouseEvent} e2
   * @returns {void}
   */
  const onMouseMove = (e2) => {
    const rect = parentEl.getBoundingClientRect()
    const x =
      edge === 'in'
        ? e2.clientX - rect.left
        : rect.right - e2.clientX
    latestValue = Math.max(0, x / pixelsPerSecond)
    if (rafId === null) {
      rafId = requestAnimationFrame(flush)
    }
  }

  /**
   * Final flush + listener removal (called on `mouseup`).
   * @returns {void}
   */
  const onMouseUp = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    // Final flush: capture the exact released value.
    if (latestValue !== null) {
      onFade?.(clipId, edge, latestValue)
      latestValue = null
    }
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

/**
 * Fade handles + gradient zones overlay.
 *
 * @param {Object} props
 * @param {{id: string, fadeIn?: number, fadeOut?: number}} props.clip
 * @param {string} props.trackId
 * @param {boolean} props.isSelected
 * @param {boolean} props.isHovering
 * @param {(clipId: string, edge: 'in'|'out', duration: number) => void} [props.onFade]
 * @param {number} props.pixelsPerSecond
 * @returns {JSX.Element|null}
 */
const ClipFadeHandles = memo(
  ({ clip, trackId, isSelected, isHovering, onFade, pixelsPerSecond }) => {
    const hasFadeIn = clip.fadeIn && clip.fadeIn > 0
    const hasFadeOut = clip.fadeOut && clip.fadeOut > 0
    const visible = isSelected || isHovering

    if (!visible) return null

    return (
      <>
        {/* Fade-in gradient zone */}
        {hasFadeIn && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: clip.fadeIn * pixelsPerSecond,
              height: '100%',
              background:
                'linear-gradient(to right, rgba(0,0,0,0.3), transparent)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}

        {/* Fade-out gradient zone */}
        {hasFadeOut && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: clip.fadeOut * pixelsPerSecond,
              height: '100%',
              background:
                'linear-gradient(to left, rgba(0,0,0,0.3), transparent)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}

        {/* Fade-in handle (hover-only) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: HANDLE_WIDTH,
            height: '100%',
            cursor: 'ew-resize',
            zIndex: 5,
            opacity: isHovering ? HANDLE_OPACITY_HOVER : 0,
            transition: 'opacity 0.2s',
            pointerEvents: isHovering ? 'auto' : 'none',
          }}
          onMouseDown={(e) =>
            startFadeDrag(
              e,
              'in',
              e.currentTarget.parentElement,
              clip.id,
              pixelsPerSecond,
              onFade
            )
          }
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: INDICATOR_WIDTH,
              height: INDICATOR_HEIGHT,
              background: 'var(--accent)',
              borderRadius: 1,
              opacity: INDICATOR_OPACITY,
            }}
          />
        </div>

        {/* Fade-out handle (hover-only) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: HANDLE_WIDTH,
            height: '100%',
            cursor: 'ew-resize',
            zIndex: 5,
            opacity: isHovering ? HANDLE_OPACITY_HOVER : 0,
            transition: 'opacity 0.2s',
            pointerEvents: isHovering ? 'auto' : 'none',
          }}
          onMouseDown={(e) =>
            startFadeDrag(
              e,
              'out',
              e.currentTarget.parentElement,
              clip.id,
              pixelsPerSecond,
              onFade
            )
          }
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: INDICATOR_WIDTH,
              height: INDICATOR_HEIGHT,
              background: 'var(--accent)',
              borderRadius: 1,
              opacity: INDICATOR_OPACITY,
            }}
          />
        </div>
      </>
    )
  }
)

ClipFadeHandles.displayName = 'ClipFadeHandles'

export default ClipFadeHandles