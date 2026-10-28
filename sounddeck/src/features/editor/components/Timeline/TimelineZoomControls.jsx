/**
 * @file Floating zoom controls — sticky pill at the bottom of the
 * timeline with four buttons (out / in / reset / fit) plus the total
 * duration label.
 *
 * The "Fit" button computes the zoom level that makes the entire project
 * fit inside the clips container width (clamped to 0.05 – 5). The
 * `-190` offset accounts for the zoom pill's own width so the compute
 * doesn't get crowded out by the pill itself.
 *
 * @see ../Timeline/index.jsx
 * @see ./useTimelineScroll.js
 */

import { memo } from 'react'
import { formatTime } from '@shared/utils/format'

/** Min zoom level. */
const ZOOM_MIN = 0.05

/** Max zoom level. */
const ZOOM_MAX = 10

/** Zoom step applied on each +/- click. */
const ZOOM_STEP = 0.1

/** Fit-target zoom clamp (max). */
const FIT_ZOOM_MAX = 5

/** Offset (px) applied to the container width so the pill doesn't
 *  collapse the fit target. */
const FIT_WIDTH_OFFSET_PX = 190

/** Fallback container width (px) when the ref is missing. */
const FALLBACK_CONTAINER_WIDTH_PX = 800

/** Base horizontal scale (px / s) used by the fit calculator. */
const BASE_PIXELS_PER_SECOND = 80

/** Extra px added to the fit calculation to leave breathing room. */
const FIT_PADDING_PX = 100

/**
 * Timeline zoom controls (see file header).
 *
 * @param {Object} props
 * @param {number} props.zoomLevel
 * @param {(zoom: number) => void} [props.onZoomChange]
 * @param {number} props.totalDuration
 * @param {React.MutableRefObject<HTMLElement|null>} [props.containerRef]
 * @param {(key: string, params?: Object) => string} props.tr
 * @returns {JSX.Element}
 */
const TimelineZoomControls = memo(function TimelineZoomControls({
  zoomLevel,
  onZoomChange,
  totalDuration,
  containerRef,
  tr,
}) {
  /**
   * Computes the zoom level that makes the whole project fit inside the
   * clips container width.
   *
   * @returns {void}
   */
  const handleFitClick = () => {
    const containerWidth =
      (containerRef?.current?.clientWidth || FALLBACK_CONTAINER_WIDTH_PX) -
      FIT_WIDTH_OFFSET_PX
    const neededZoom = Math.max(
      ZOOM_MIN,
      Math.min(
        FIT_ZOOM_MAX,
        containerWidth /
          (totalDuration * BASE_PIXELS_PER_SECOND + FIT_PADDING_PX)
      )
    )
    onZoomChange?.(neededZoom)
  }

  const zoomPercent = Math.round(zoomLevel * 100)

  return (
    <div
      data-testid="editor-zoom-controls"
      style={{
        position: 'sticky',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        zIndex: 20,
        marginTop: 8,
        width: 'fit-content',
      }}
    >
      <button
        className="btn-ghost btn-sm"
        onClick={() => onZoomChange?.(Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP))}
        style={{
          padding: '2px 6px',
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
        title={tr('editorZoomOut') || 'Zoom out (Ctrl+-)'}
      >
        <i className="ti ti-zoom-out" />
      </button>

      <span
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          minWidth: 50,
          textAlign: 'center',
        }}
      >
        {tr('editorZoomPercent')?.replace('{percent}', zoomPercent) ||
          `${zoomPercent}%`}
      </span>

      <button
        className="btn-ghost btn-sm"
        onClick={() => onZoomChange?.(Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP))}
        style={{
          padding: '2px 6px',
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
        title={tr('editorZoomIn') || 'Zoom in (Ctrl+=)'}
      >
        <i className="ti ti-zoom-in" />
      </button>

      <button
        className="btn-ghost btn-sm"
        onClick={() => onZoomChange?.(1)}
        style={{
          padding: '2px 6px',
          fontSize: 10,
          color: 'var(--text-tertiary)',
        }}
        title={tr('editorZoomReset') || 'Reset zoom (Ctrl+0)'}
      >
        <i className="ti ti-refresh" /> 100%
      </button>

      <button
        className="btn-ghost btn-sm"
        onClick={handleFitClick}
        style={{
          padding: '2px 6px',
          fontSize: 10,
          color: 'var(--text-tertiary)',
        }}
        title={tr('editorZoomFit') || 'Fit to view'}
      >
        <i className="ti ti-fit" /> {tr('editorZoomFit') || 'Fit'}
      </button>

      <span
        style={{
          fontSize: 9,
          color: 'var(--text-tertiary)',
          marginLeft: 4,
          borderLeft: '1px solid var(--border)',
          paddingLeft: 8,
          minWidth: 60,
        }}
      >
        {tr('editorDuration') || 'Duration'}: {formatTime(totalDuration)}
      </span>
    </div>
  )
})

TimelineZoomControls.displayName = 'TimelineZoomControls'

export default TimelineZoomControls