/**
 * @file Centralized click handlers for the ruler and the timeline.
 *
 * Priority order for a click on either surface:
 * 1. **Click-mode loop** — if `isTimelineClickModeActive`, forward the
 *    click to `onTimelineClickForLoop(time)` and stop propagation.
 * 2. **Pending action** — if `isPendingAction`, forward to
 *    `onExecutePendingAction(time)`.
 * 3. **Ignore** if the click hit a clip or a button.
 * 4. **Seek** otherwise (`onSeek(time)`).
 *
 * Double-click on the ruler seeks, then (if a clip is selected and the
 * click lands inside it) splits at that time.
 *
 * Escape cancels a pending action (`onCancelPendingAction`) — useful for
 * "click on the timeline to place a marker" flows.
 *
 * @see ../Timeline/index.jsx
 */

import { useCallback, useEffect } from 'react'

/** Min distance (seconds) from a clip's edge for a split to be allowed. */
const MIN_SPLIT_MARGIN_SECONDS = 0.05

/**
 * Timeline / ruler click handlers.
 *
 * @param {Object} params
 * @param {React.MutableRefObject<HTMLElement|null>} params.clipsContainerRef
 * @param {React.MutableRefObject<HTMLElement|null>} params.rulerContainerRef
 * @param {number} params.pixelsPerSecond
 * @param {number} params.totalWidth
 * @param {number} params.totalDuration
 * @param {boolean} params.isPendingAction
 * @param {boolean} params.isTimelineClickModeActive
 * @param {(time: number) => void} [params.onTimelineClickForLoop]
 * @param {(time: number) => void} [params.onExecutePendingAction]
 * @param {() => void} [params.onCancelPendingAction]
 * @param {(time: number) => void} [params.onSeek]
 * @param {string|null} params.selectedClipId
 * @param {string|null} params.selectedTrackId
 * @param {Array} params.tracks
 * @param {Object<string, number>} params.clipDurations
 * @param {(trackId: string, clipId: string, time: number) => void} [params.onSplitClip]
 * @param {(message: string, type?: string) => void} [params.addToast]
 * @param {(key: string, params?: Object) => string} params.tr
 * @returns {{
 *   clientXToTime: (clientX: number, container?: HTMLElement) => number,
 *   handleTimelineClick: (e: React.MouseEvent) => void,
 *   handleRulerClick: (e: React.MouseEvent) => void,
 *   handleRulerDoubleClick: (e: React.MouseEvent) => void,
 * }}
 */
export function useTimelineClickHandlers({
  clipsContainerRef,
  rulerContainerRef,
  pixelsPerSecond,
  totalWidth,
  totalDuration,
  isPendingAction,
  isTimelineClickModeActive,
  onTimelineClickForLoop,
  onExecutePendingAction,
  onCancelPendingAction,
  onSeek,
  selectedClipId,
  selectedTrackId,
  tracks,
  clipDurations,
  onSplitClip,
  addToast,
  tr,
}) {
  /**
   * Converts a `clientX` to a timeline time (seconds), clamped to
   * `[0, totalWidth / pixelsPerSecond]`.
   *
   * @param {number} clientX
   * @param {HTMLElement} [containerElement] - Overrides the clips ref.
   * @returns {number}
   */
  const clientXToTime = useCallback(
    (clientX, containerElement) => {
      const container = containerElement || clipsContainerRef.current
      if (!container) return 0
      const rect = container.getBoundingClientRect()
      const sl = container.scrollLeft
      const clickInTimeline = clientX - rect.left + sl
      const clampedX = Math.max(0, Math.min(totalWidth, clickInTimeline))
      return clampedX / pixelsPerSecond
    },
    [clipsContainerRef, pixelsPerSecond, totalWidth]
  )

  const handleTimelineClick = useCallback(
    (e) => {
      if (isTimelineClickModeActive && onTimelineClickForLoop) {
        const time = clientXToTime(e.clientX)
        if (time >= 0 && time <= totalDuration) {
          e.preventDefault()
          e.stopPropagation()
          onTimelineClickForLoop(time)
        }
        return
      }

      if (isPendingAction) {
        const time = clientXToTime(e.clientX)
        if (time >= 0 && time <= totalDuration) {
          onExecutePendingAction?.(time)
        }
        return
      }

      const target = e.target
      if (
        target.closest?.('.editor-clip-wrapper') ||
        target.closest?.('button')
      ) {
        return
      }

      const time = clientXToTime(e.clientX)
      if (time >= 0 && time <= totalDuration) {
        onSeek?.(time)
      }
    },
    [
      isPendingAction,
      isTimelineClickModeActive,
      onTimelineClickForLoop,
      clientXToTime,
      totalDuration,
      onExecutePendingAction,
      onSeek,
    ]
  )

  const handleRulerClick = useCallback(
    (e) => {
      if (isTimelineClickModeActive && onTimelineClickForLoop) {
        const time = clientXToTime(e.clientX, rulerContainerRef.current)
        if (time >= 0 && time <= totalDuration) {
          e.preventDefault()
          e.stopPropagation()
          onTimelineClickForLoop(time)
        }
        return
      }

      if (isPendingAction) {
        const time = clientXToTime(e.clientX, rulerContainerRef.current)
        if (time >= 0 && time <= totalDuration) {
          onExecutePendingAction?.(time)
        }
        return
      }

      const time = clientXToTime(e.clientX, rulerContainerRef.current)
      if (time >= 0 && time <= totalDuration) {
        onSeek?.(time)
      }
    },
    [
      isPendingAction,
      isTimelineClickModeActive,
      onTimelineClickForLoop,
      clientXToTime,
      totalDuration,
      onExecutePendingAction,
      onSeek,
      rulerContainerRef,
    ]
  )

  const handleRulerDoubleClick = useCallback(
    (e) => {
      const time = clientXToTime(e.clientX, rulerContainerRef.current)
      if (time < 0 || time > totalDuration) return

      onSeek?.(time)

      if (selectedClipId && selectedTrackId && onSplitClip) {
        const allClips = tracks.flatMap((t) => t.clips)
        const clip = allClips.find((c) => c.id === selectedClipId)
        if (clip) {
          const duration = clipDurations[clip.id] || clip.duration || 3
          const start = clip.start || 0
          const end = start + duration
          if (
            time > start + MIN_SPLIT_MARGIN_SECONDS &&
            time < end - MIN_SPLIT_MARGIN_SECONDS
          ) {
            onSplitClip(selectedTrackId, selectedClipId, time)
            addToast?.(
              tr('editorSplitSuccess') || 'Clip split at playhead',
              'success'
            )
          }
        }
      }
    },
    [
      clientXToTime,
      totalDuration,
      onSeek,
      selectedClipId,
      selectedTrackId,
      tracks,
      clipDurations,
      onSplitClip,
      addToast,
      tr,
      rulerContainerRef,
    ]
  )

  // Escape → cancel pending action.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isPendingAction) {
        onCancelPendingAction?.()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isPendingAction, onCancelPendingAction])

  return {
    clientXToTime,
    handleTimelineClick,
    handleRulerClick,
    handleRulerDoubleClick,
  }
}

export default useTimelineClickHandlers