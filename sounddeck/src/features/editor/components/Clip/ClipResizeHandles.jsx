/**
 * @file Interactive resize handles on the left and right edges of a clip.
 *
 * Renders two `div`s with `data-resize="start"` and `data-resize="end"`,
 * shown when the clip is selected or hovered. Each handle is a thin
 * 8-px-wide strip positioned just outside the clip border, with a
 * vertical visual indicator inside it.
 *
 * The actual resize logic lives in the parent (`EditorClip`) — this
 * component only forwards `mousedown` events via `onResizeStart` /
 * `onResizeEnd`.
 *
 * @see ../Clip/index.jsx — the parent that mounts it
 */

import { memo } from 'react'

/** Handle hit zone width (px). */
const HANDLE_WIDTH = 8

/** Offset applied to push the handle just outside the clip border (px). */
const HANDLE_OFFSET = -4

/** Vertical indicator bar dimensions (px). */
const INDICATOR_WIDTH = 2
const INDICATOR_HEIGHT = 30

/** Opacity of the inner indicator (always slightly visible on hover). */
const INDICATOR_OPACITY = 0.5

/** Opacity of the handle hit zone when visible. */
const HANDLE_OPACITY = 0.8

/** z-index of the resize handles (above the clip body, below the loop overlay). */
const HANDLE_Z_INDEX = 6

/**
 * Resize handles (left + right).
 *
 * @param {Object} props
 * @param {boolean} props.isSelected
 * @param {boolean} props.isHovering
 * @param {number} props.duration - Clip duration (unused; kept for API compat).
 * @param {number} props.pixelsPerSecond - Scale factor (unused; kept for API compat).
 * @param {(e: React.MouseEvent) => void} [props.onResizeStart]
 * @param {(e: React.MouseEvent) => void} [props.onResizeEnd]
 * @returns {JSX.Element|null}
 */
const ClipResizeHandles = memo(
  ({
    isSelected,
    isHovering,
    duration: _duration,
    pixelsPerSecond: _pixelsPerSecond,
    onResizeStart,
    onResizeEnd,
  }) => {
    const visible = isSelected || isHovering

    if (!visible) return null

    return (
      <>
        {/* Left resize handle */}
        <div
          data-resize="start"
          style={{
            position: 'absolute',
            left: HANDLE_OFFSET,
            top: 0,
            bottom: 0,
            width: HANDLE_WIDTH,
            cursor: 'ew-resize',
            zIndex: HANDLE_Z_INDEX,
            opacity: visible ? HANDLE_OPACITY : 0,
            transition: 'opacity 0.2s',
          }}
          onMouseDown={onResizeStart}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: INDICATOR_WIDTH,
              height: INDICATOR_HEIGHT,
              background: 'var(--text-secondary)',
              borderRadius: 2,
              opacity: INDICATOR_OPACITY,
            }}
          />
        </div>

        {/* Right resize handle */}
        <div
          data-resize="end"
          style={{
            position: 'absolute',
            right: HANDLE_OFFSET,
            top: 0,
            bottom: 0,
            width: HANDLE_WIDTH,
            cursor: 'ew-resize',
            zIndex: HANDLE_Z_INDEX,
            opacity: visible ? HANDLE_OPACITY : 0,
            transition: 'opacity 0.2s',
          }}
          onMouseDown={onResizeEnd}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: INDICATOR_WIDTH,
              height: INDICATOR_HEIGHT,
              background: 'var(--text-secondary)',
              borderRadius: 2,
              opacity: INDICATOR_OPACITY,
            }}
          />
        </div>
      </>
    )
  }
)

ClipResizeHandles.displayName = 'ClipResizeHandles'

export default ClipResizeHandles