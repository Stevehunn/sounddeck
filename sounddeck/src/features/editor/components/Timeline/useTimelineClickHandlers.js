// src/features/editor/components/Timeline/useTimelineClickHandlers.js
import { useCallback, useEffect } from 'react'

/**
 * Centralise les handlers de clic sur le ruler et la timeline :
 *  - click simple → seek (ou click-mode loop/pending)
 *  - double-click → split au curseur si un clip est sélectionné
 *  - Escape → annule le pending action
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
          if (time > start + 0.05 && time < end - 0.05) {
            onSplitClip(selectedTrackId, selectedClipId, time)
            addToast?.(
              tr('editorSplitSuccess') || 'Clip coupé à la position du curseur',
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

  // Escape → annule le pending action
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