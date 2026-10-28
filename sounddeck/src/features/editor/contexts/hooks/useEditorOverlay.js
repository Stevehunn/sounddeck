/**
 * @file Click-mode overlay state (loop / split interactions).
 *
 * When the user activates a "click mode" action, the editor dims the
 * timeline and shows an overlay. Each click is forwarded to
 * `executeActionOverlay(clickTime)`, which dispatches to the right handler
 * based on the current overlay `type`:
 *
 * - **`loop-clip`** — user clicks a target end-time for a specific clip loop.
 *   The clip loops from its start to the click position (one-shot).
 * - **`loop-timeline`** — 3-step wizard: click start → click end →
 *   click duration. The timeline loop config is applied at the end.
 * - **`split`** — user clicks a split position inside the target clip.
 *
 * The overlay is stored in `core.actionOverlay` (mirrored in
 * `core.actionOverlayRef`). It's cleared (`cancelActionOverlay`) either
 * automatically after execution or by the user pressing Escape.
 *
 * ## Multi-step wizard
 *
 * The `loop-timeline` overlay uses `step` (0, 1, 2) and `data` (partial
 * `{start, end, duration}`) to track progress across successive clicks.
 * Each click both persists progress and shows an informational toast.
 *
 * @see ../useEditorCore.js — provides `actionOverlayRef`, `setActionOverlay`, etc.
 * @see ./useEditorLoops.js — provides `toggleClipLoop`, `setTimelineLoop`
 * @see ./useEditorClips.js — provides `splitClip`
 * @see ../../components/ActionOverlay.jsx — the visual overlay
 */

import { useCallback } from 'react'

/** Initial "no action" overlay state. Duplicated from `useEditorCore` on purpose:
 *  it must not depend on the parent's own `INITIAL_OVERLAY_STATE` reference. */
const INITIAL_OVERLAY_STATE = {
  type: null,
  clipId: null,
  trackId: null,
  options: null,
  step: 0,
  totalSteps: 1,
  clipName: null,
  data: {},
}

/** Default arrow color for clip loops started from click mode. */
const DEFAULT_ARROW_COLOR = '#22c55e'

/** Minimum split distance from either clip boundary (seconds). */
const MIN_SPLIT_MARGIN = 0.05

/** Minimum duration accepted for a manual click-duration loop (seconds). */
const MIN_LOOP_DURATION = 0.1

/**
 * Click-mode overlay hook.
 *
 * @param {Object} core - Result of `useEditorCore`.
 * @param {Object} loops - Result of `useEditorLoops` (needs `toggleClipLoop`, `setTimelineLoop`).
 * @param {Object} clips - Result of `useEditorClips` (needs `splitClip`).
 * @returns {{
 *   cancelActionOverlay: () => void,
 *   activateLoopManualClick: (clipId: string, trackId: string, options?: Object) => void,
 *   activateTimelineLoopManualClick: () => void,
 *   activateSplitManualClick: (clipId: string, trackId: string) => void,
 *   executeActionOverlay: (clickTime: number) => void,
 * }}
 */
export function useEditorOverlay(core, loops, clips) {
  const {
    projectRef,
    clipDurationsRef,
    totalDurationRef,
    actionOverlayRef,
    setActionOverlay,
    addToastRef,
    tRef,
  } = core
  const { toggleClipLoop, setTimelineLoop } = loops
  const { splitClip } = clips

  /**
   * Clears the overlay (cancels any pending click-mode action).
   * @returns {void}
   */
  const cancelActionOverlay = useCallback(() => {
    setActionOverlay(INITIAL_OVERLAY_STATE)
    actionOverlayRef.current = INITIAL_OVERLAY_STATE
  }, [setActionOverlay, actionOverlayRef])

  /**
   * Enters click mode for a **clip loop**: the next timeline click will
   * define the loop end (relative to the clip's start).
   *
   * @param {string} clipId
   * @param {string} trackId
   * @param {Object} [options]
   * @param {string} [options.arrowColor='#22c55e']
   * @returns {void}
   */
  const activateLoopManualClick = useCallback(
    (clipId, trackId, options = {}) => {
      const currentProject = projectRef.current
      const clip = currentProject?.tracks
        ?.flatMap((t) => t.clips)
        .find((c) => c.id === clipId)

      const newOverlay = {
        type: 'loop-clip',
        clipId,
        trackId,
        options: {
          arrowColor: options.arrowColor || DEFAULT_ARROW_COLOR,
          loopMode: 'manualClick',
          ...options,
        },
        step: 0,
        totalSteps: 1,
        clipName: clip?.name || null,
        data: {},
      }
      setActionOverlay(newOverlay)
      actionOverlayRef.current = newOverlay
      addToastRef.current?.(
        tRef.current('editorToastClickModeActivated'),
        'info'
      )
    },
    [projectRef, actionOverlayRef, setActionOverlay, addToastRef, tRef]
  )

  /**
   * Enters the 3-step click mode for a **timeline loop**:
   * step 1 = start, step 2 = end, step 3 = duration.
   *
   * @returns {void}
   */
  const activateTimelineLoopManualClick = useCallback(() => {
    const newOverlay = {
      type: 'loop-timeline',
      clipId: null,
      trackId: null,
      options: null,
      step: 0,
      totalSteps: 3,
      clipName: null,
      data: { start: null, end: null, duration: null },
    }
    setActionOverlay(newOverlay)
    actionOverlayRef.current = newOverlay
    addToastRef.current?.(
      tRef.current('editorToastClickModeStep1'),
      'info'
    )
  }, [actionOverlayRef, setActionOverlay, addToastRef, tRef])

  /**
   * Enters click mode for a **clip split**: the next timeline click
   * defines the split position.
   *
   * @param {string} clipId
   * @param {string} trackId
   * @returns {void}
   */
  const activateSplitManualClick = useCallback(
    (clipId, trackId) => {
      const currentProject = projectRef.current
      const clip = currentProject?.tracks
        ?.flatMap((t) => t.clips)
        .find((c) => c.id === clipId)

      const newOverlay = {
        type: 'split',
        clipId,
        trackId,
        options: null,
        step: 0,
        totalSteps: 1,
        clipName: clip?.name || null,
        data: {},
      }
      setActionOverlay(newOverlay)
      actionOverlayRef.current = newOverlay
      addToastRef.current?.(
        tRef.current('editorToastSplitClickModeActivated'),
        'info'
      )
    },
    [projectRef, actionOverlayRef, setActionOverlay, addToastRef, tRef]
  )

  /**
   * Handles a timeline click while a click-mode action is active.
   *
   * Dispatches to the right handler based on `actionOverlay.type`. Every
   * click time is first clamped to `[0, totalDuration]`.
   *
   * @param {number} clickTime - Click position on the timeline (seconds).
   * @returns {void}
   */
  const executeActionOverlay = useCallback(
    (clickTime) => {
      const overlay = actionOverlayRef.current
      if (!overlay.type) return

      const { type, clipId, trackId, options, step, data } = overlay
      const clampedTime = Math.max(
        0,
        Math.min(clickTime, totalDurationRef.current)
      )

      // ─── LOOP CLIP (single click) ─────────────────────────────────────
      if (type === 'loop-clip') {
        const currentProject = projectRef.current
        const clip = currentProject?.tracks
          ?.flatMap((t) => t.clips)
          .find((c) => c.id === clipId)
        if (!clip) {
          addToastRef.current?.(
            tRef.current('editorToastClipNotFound'),
            'error'
          )
          cancelActionOverlay()
          return
        }
        const duration =
          clipDurationsRef.current[clip.id] || clip.duration || 3
        const start = clip.start || 0
        // Manual duration must at least cover the clip itself.
        const manualDuration = Math.max(duration, clampedTime - start)

        toggleClipLoop(clipId, {
          ...options,
          loopMode: 'manualDuration',
          manualDuration,
        })
        addToastRef.current?.(
          tRef.current('editorToastLoopDefinedUntil', {
            duration: manualDuration.toFixed(1),
          }),
          'success'
        )
        cancelActionOverlay()
        return
      }

      // ─── LOOP TIMELINE (3-step wizard) ────────────────────────────────
      if (type === 'loop-timeline') {
        const newData = { ...data }

        if (step === 0) {
          // Step 1/3: capture start.
          newData.start = clampedTime
          const next = { ...overlay, step: 1, data: newData }
          setActionOverlay(next)
          actionOverlayRef.current = next
          addToastRef.current?.(
            tRef.current('editorToastLoopStartDefined', {
              time: clampedTime.toFixed(1),
            }),
            'info'
          )
        } else if (step === 1) {
          // Step 2/3: capture end (must be after start).
          if (clampedTime > data.start) {
            newData.end = clampedTime
            const next = { ...overlay, step: 2, data: newData }
            setActionOverlay(next)
            actionOverlayRef.current = next
            addToastRef.current?.(
              tRef.current('editorToastLoopEndDefined', {
                time: clampedTime.toFixed(1),
              }),
              'info'
            )
          } else {
            addToastRef.current?.(
              tRef.current('editorToastLoopEndMustBeAfterStart'),
              'warning'
            )
          }
        } else if (step === 2) {
          // Step 3/3: capture duration and apply the loop.
          const duration = clampedTime - data.start
          if (duration > MIN_LOOP_DURATION) {
            setTimelineLoop({
              enabled: true,
              start: data.start,
              end: data.end || clampedTime,
              manualDuration: duration,
              durationMode: 'manualDuration',
            })
            addToastRef.current?.(
              tRef.current('editorToastLoopDefined', {
                start: data.start.toFixed(1),
                end: (data.end || clampedTime).toFixed(1),
              }),
              'success'
            )
            cancelActionOverlay()
          } else {
            addToastRef.current?.(
              tRef.current('editorToastLoopDurationTooShort'),
              'warning'
            )
          }
        }
        return
      }

      // ─── SPLIT (single click) ─────────────────────────────────────────
      if (type === 'split') {
        const currentProject = projectRef.current
        const clip = currentProject?.tracks
          ?.flatMap((t) => t.clips)
          .find((c) => c.id === clipId)
        if (!clip) {
          addToastRef.current?.(
            tRef.current('editorToastClipNotFound'),
            'error'
          )
          cancelActionOverlay()
          return
        }
        const duration =
          clipDurationsRef.current[clip.id] || clip.duration || 3
        const start = clip.start || 0
        const end = start + duration

        if (
          clampedTime > start + MIN_SPLIT_MARGIN &&
          clampedTime < end - MIN_SPLIT_MARGIN
        ) {
          splitClip(trackId, clipId, clampedTime)
        } else {
          addToastRef.current?.(
            tRef.current('editorToastClipSplitInvalid'),
            'warning'
          )
        }
        cancelActionOverlay()
      }
    },
    [
      projectRef,
      clipDurationsRef,
      totalDurationRef,
      actionOverlayRef,
      setActionOverlay,
      toggleClipLoop,
      setTimelineLoop,
      splitClip,
      cancelActionOverlay,
      addToastRef,
      tRef,
    ]
  )

  return {
    cancelActionOverlay,
    activateLoopManualClick,
    activateTimelineLoopManualClick,
    activateSplitManualClick,
    executeActionOverlay,
  }
}