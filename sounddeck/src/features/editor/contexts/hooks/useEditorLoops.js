/**
 * @file Loop state management (clip loops, timeline loop, loop region).
 *
 * Three loop concepts coexist:
 *
 * 1. **Clip loops** — `loopState.clips[clipId]` defines a repeat zone
 *    starting at the clip and ending somewhere (until end of track,
 *    after N cycles, after a manual duration, or after a manual click).
 *    Controlled via `toggleClipLoop` / `updateClipLoopOptions`.
 * 2. **Timeline loop** — `loopState.timeline` is a global loop that
 *    restarts the whole timeline at `end` back to `start`. Controlled via
 *    `setTimelineLoop` / `toggleTimelineLoop`.
 * 3. **Loop region** — `loopRegion` is a legacy visual selection
 *    (`{enabled, start, end}`) used by the trimmer-style preview. It's
 *    kept for backward compatibility with existing projects.
 *
 * All mutations commit the project with the new `loops` state and (for
 * the timeline loop) mark `isDirty`.
 *
 * ## Loop modes for clips
 *
 * - `endOfTrack` — loops until the last clip in the project ends.
 * - `cycles` — loops `cycleCount` times the clip's own duration.
 * - `manualDuration` — loops for a fixed total duration.
 * - `manualClick` — end position is set by clicking on the timeline.
 *
 * @see ../useEditorCore.js — provides `commitProject`, `loopStateRef`, etc.
 * @see ./useEditorOverlay.js — drives the click-mode interactions
 */

import { useCallback } from 'react'

/** Default arrow color for clip loops. */
const DEFAULT_ARROW_COLOR = '#22c55e'

/** Default number of cycles when using `loopMode: 'cycles'`. */
const DEFAULT_CYCLE_COUNT = 3

/** Default manual duration (seconds) when using `manualDuration`. */
const DEFAULT_MANUAL_DURATION = 10

/** Minimum timeline loop width (seconds) when toggling ON. */
const MIN_TIMELINE_LOOP_WIDTH = 1

/** Extra time (seconds) after the last clip for `endOfTrack` mode. */
const END_OF_TRACK_PADDING = 2

/** Multiplier applied to `clip.duration` when no other clip exists. */
const SOLO_CLIP_CYCLE_MULTIPLIER = 4

/**
 * Loop state hook.
 *
 * @param {Object} core - Result of `useEditorCore`.
 * @returns {{
 *   toggleClipLoop: (clipId: string, options?: Object) => void,
 *   updateClipLoopOptions: (clipId: string, options: Object) => void,
 *   setTimelineLoop: (options: Object) => void,
 *   toggleTimelineLoop: () => void,
 *   setLoopRegion: (start: number, end: number) => void,
 *   toggleLoop: () => void,
 *   clearLoop: () => void,
 * }}
 */
export function useEditorLoops(core) {
  const {
    projectRef,
    loopStateRef,
    clipDurationsRef,
    totalDurationRef,
    commitProject,
    setLoopState,
    setLoopRegionState,
    setIsDirty,
    addToastRef,
    tRef,
  } = core

  /**
   * Toggles (or configures) a clip loop.
   *
   * If the loop is already enabled or `options.enabled === false`, it
   * disables the loop. Otherwise it enables a new loop and computes its
   * end position based on `options.loopMode`.
   *
   * @param {string} clipId
   * @param {Object} [options]
   * @param {boolean} [options.enabled] - Force enable/disable.
   * @param {string} [options.arrowColor='#22c55e'] - Arrow visual color.
   * @param {'endOfTrack'|'cycles'|'manualDuration'|'manualClick'} [options.loopMode='endOfTrack']
   * @param {number} [options.cycleCount=3]
   * @param {number} [options.manualDuration=10]
   * @returns {void}
   */
  const toggleClipLoop = useCallback(
    (clipId, options = {}) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const track = currentProject.tracks.find((t) =>
        t.clips.some((c) => c.id === clipId)
      )
      if (!track) return
      const clip = track.clips.find((c) => c.id === clipId)
      if (!clip) return

      const duration =
        clipDurationsRef.current[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const currentLoopState = loopStateRef.current

      // ─── DISABLE PATH ────────────────────────────────────────────────
      if (
        options.enabled === false ||
        currentLoopState.clips[clipId]?.enabled
      ) {
        const updatedLoopState = {
          ...currentLoopState,
          clips: {
            ...currentLoopState.clips,
            [clipId]: {
              ...currentLoopState.clips[clipId],
              enabled: false,
            },
          },
        }
        setLoopState(updatedLoopState)
        loopStateRef.current = updatedLoopState

        commitProject({
          ...currentProject,
          loops: updatedLoopState,
          updatedAt: Date.now(),
        })
        addToastRef.current?.(
          tRef.current('editorToastLoopDisabledOn', { name: clip.name }),
          'info'
        )
        return
      }

      // ─── ENABLE PATH ─────────────────────────────────────────────────
      const arrowColor = options.arrowColor || DEFAULT_ARROW_COLOR
      const loopMode = options.loopMode || 'endOfTrack'
      const cycleCount = options.cycleCount || DEFAULT_CYCLE_COUNT
      const manualDuration =
        options.manualDuration || DEFAULT_MANUAL_DURATION

      let loopEnd = totalDurationRef.current

      if (loopMode === 'endOfTrack') {
        // Loop until the last *non-looped* clip, plus a small padding.
        const normalClips = currentProject.tracks
          .flatMap((t) => t.clips)
          .filter(
            (c) => c.id !== clipId && !currentLoopState.clips[c.id]?.enabled
          )
        if (normalClips.length > 0) {
          const lastNormalClip = normalClips.reduce((max, c) => {
            const end =
              (c.start || 0) +
              (clipDurationsRef.current[c.id] || c.duration || 3)
            return end > max ? end : max
          }, 0)
          loopEnd = Math.max(
            lastNormalClip + END_OF_TRACK_PADDING,
            start + duration * 2
          )
        } else {
          // No other clip: at least 4 cycles of the clip.
          loopEnd = Math.max(
            totalDurationRef.current,
            start + duration * SOLO_CLIP_CYCLE_MULTIPLIER
          )
        }
      } else if (loopMode === 'cycles') {
        loopEnd = start + duration * cycleCount
      } else if (loopMode === 'manualDuration') {
        loopEnd = Math.max(start + duration, start + manualDuration)
      } else if (loopMode === 'manualClick') {
        loopEnd = Math.max(start + duration, totalDurationRef.current)
      }

      const updatedLoopState = {
        ...currentLoopState,
        clips: {
          ...currentLoopState.clips,
          [clipId]: {
            enabled: true,
            start,
            end: loopEnd,
            visual: 'arrow',
            arrowColor,
            followClip: true,
            loopMode,
            cycleCount: loopMode === 'cycles' ? cycleCount : undefined,
            manualDuration:
              loopMode === 'manualDuration' ? manualDuration : undefined,
            manualEndTime: loopMode === 'manualClick' ? null : undefined,
            cycleCountCurrent: 0,
            totalCycles: loopMode === 'cycles' ? cycleCount : undefined,
          },
        },
      }
      setLoopState(updatedLoopState)
      loopStateRef.current = updatedLoopState

      commitProject({
        ...currentProject,
        loops: updatedLoopState,
        updatedAt: Date.now(),
      })

      // Build a mode-specific toast suffix.
      let suffix = ''
      if (loopMode === 'cycles')
        suffix = tRef.current('editorToastLoopWithCycles', {
          count: cycleCount,
        })
      else if (loopMode === 'endOfTrack')
        suffix = tRef.current('editorToastLoopUntilEndOfTrack')
      else if (loopMode === 'manualDuration')
        suffix = tRef.current('editorToastLoopWithDuration', {
          duration: manualDuration,
        })
      else if (loopMode === 'manualClick')
        suffix = tRef.current('editorToastLoopWithClick')

      addToastRef.current?.(
        tRef.current('editorToastLoopEnabledOn', { name: clip.name }) + suffix,
        'success'
      )
    },
    [
      projectRef,
      loopStateRef,
      clipDurationsRef,
      totalDurationRef,
      commitProject,
      setLoopState,
      addToastRef,
      tRef,
    ]
  )

  /**
   * Updates the options of an existing clip loop (does nothing if the
   * loop doesn't exist yet).
   *
   * @param {string} clipId
   * @param {Object} options - Partial loop options to merge.
   * @returns {void}
   */
  const updateClipLoopOptions = useCallback(
    (clipId, options) => {
      const currentProject = projectRef.current
      const currentLoopState = loopStateRef.current
      if (!currentProject || !currentLoopState.clips[clipId]) return

      const updatedLoopState = {
        ...currentLoopState,
        clips: {
          ...currentLoopState.clips,
          [clipId]: { ...currentLoopState.clips[clipId], ...options },
        },
      }
      setLoopState(updatedLoopState)
      loopStateRef.current = updatedLoopState
      commitProject({
        ...currentProject,
        loops: updatedLoopState,
        updatedAt: Date.now(),
      })
    },
    [projectRef, loopStateRef, commitProject, setLoopState]
  )

  /**
   * Updates the timeline loop config (partial merge).
   *
   * @param {Object} options - Partial timeline loop options to merge.
   * @returns {void}
   */
  const setTimelineLoop = useCallback(
    (options) => {
      const currentProject = projectRef.current
      const currentLoopState = loopStateRef.current
      if (!currentProject) return

      const updatedLoopState = {
        ...currentLoopState,
        timeline: { ...currentLoopState.timeline, ...options },
      }
      setLoopState(updatedLoopState)
      loopStateRef.current = updatedLoopState

      commitProject({
        ...currentProject,
        loops: updatedLoopState,
        updatedAt: Date.now(),
      })
      setIsDirty(true)
    },
    [projectRef, loopStateRef, commitProject, setLoopState, setIsDirty]
  )

  /**
   * Toggles the timeline loop ON/OFF.
   *
   * If turning ON with an invalid zone (`start >= end`), silently widens
   * the zone by 1s before enabling (avoids a stuck "ON but no loop" state).
   *
   * @returns {void}
   */
  const toggleTimelineLoop = useCallback(() => {
    const timeline = loopStateRef.current.timeline
    const newEnabled = !timeline.enabled

    if (newEnabled) {
      const start = timeline.start
      const end = timeline.end
      if (start >= end) {
        setTimelineLoop({
          enabled: true,
          end: Math.max(start + MIN_TIMELINE_LOOP_WIDTH, 10),
        })
        return
      }
    }
    setTimelineLoop({ enabled: newEnabled })
  }, [loopStateRef, setTimelineLoop])

  /**
   * Sets the visual loop region (start/end clamped to `[0, totalDuration]`).
   *
   * @param {number} start
   * @param {number} end
   * @returns {void}
   */
  const setLoopRegionFn = useCallback(
    (start, end) => {
      setLoopRegionState((prev) => ({
        ...prev,
        start: Math.max(0, start),
        end: Math.min(totalDurationRef.current, end),
      }))
    },
    [totalDurationRef, setLoopRegionState]
  )

  /**
   * Alias for `toggleTimelineLoop` (used by legacy callers).
   * @returns {void}
   */
  const toggleLoop = useCallback(() => {
    toggleTimelineLoop()
  }, [toggleTimelineLoop])

  /**
   * Clears the visual loop region and disables the timeline loop.
   * @returns {void}
   */
  const clearLoop = useCallback(() => {
    setLoopRegionState({ enabled: false, start: 0, end: 10 })
    setTimelineLoop({ enabled: false, start: 0, end: 10 })
  }, [setLoopRegionState, setTimelineLoop])

  return {
    toggleClipLoop,
    updateClipLoopOptions,
    setTimelineLoop,
    toggleTimelineLoop,
    setLoopRegion: setLoopRegionFn,
    toggleLoop,
    clearLoop,
  }
}