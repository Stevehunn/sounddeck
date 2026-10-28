/**
 * @file Clip CRUD operations for the editor.
 *
 * Exposes `addClip`, `addClipFromFile`, `removeClip`, `updateClip`,
 * `duplicateClip`, `moveClip`, `splitClip`, `selectClip`, and
 * `deselectClip`. Each mutation:
 * 1. Builds the updated project immutably.
 * 2. Commits it via `commitProject` (history + persistence).
 * 3. Syncs derived state (`clipDurations`, `loopState`, selection).
 * 4. Shows a toast on success (except for silent operations like
 *    `moveClip` during a drag, which pass `skipHistory: true`).
 *
 * All async functions read from refs (`projectRef`, `clipDurationsRef`,
 * `loopStateRef`) so they always see the latest state, even when called
 * from `setTimeout` or `requestAnimationFrame` callbacks.
 *
 * ## Split safety
 *
 * `splitClip` refuses splits closer than 5 ms to either clip boundary
 * (avoids zero-length or microscopic clips). It also clamps fade
 * durations on the resulting halves so they stay inside their own
 * duration.
 *
 * @see ../useEditorCore.js — provides `commitProject`, `generateUniqueId`, etc.
 * @see @shared/utils/audioContext.js — provides `getAudioFileDuration`
 */

import { useCallback } from 'react'

/** Minimum allowed clip duration (seconds). */
const MIN_CLIP_DURATION = 0.05

/** Floating-point tolerance for the min-duration check. */
const EPSILON = 1e-6

/** Default clip duration when nothing is known (seconds). */
const DEFAULT_CLIP_DURATION = 3

/** Gap (seconds) between duplicated clips and their source. */
const DUPLICATE_GAP = 0.5

/**
 * Clip CRUD operations hook.
 *
 * @param {Object} core - Result of `useEditorCore`.
 * @returns {{
 *   addClip: (trackId: string, soundId: string, startPosition?: number|null) => Promise<Object|null>,
 *   addClipFromFile: (trackId: string, filePath: string, startPosition?: number|null) => Promise<Object|null>,
 *   removeClip: (trackId: string, clipId: string) => void,
 *   updateClip: (trackId: string, clipId: string, updates: Object, options?: Object) => void,
 *   duplicateClip: (trackId: string, clipId: string) => Object|null,
 *   moveClip: (trackId: string, clipId: string, newStart: number, newTrackId?: string|null, options?: Object) => void,
 *   splitClip: (trackId: string, clipId: string, splitTime: number) => {leftClip: Object, rightClip: Object}|null,
 *   selectClip: (clipId: string, trackId: string) => void,
 *   deselectClip: () => void,
 * }}
 */
export function useEditorClips(core) {
  const {
    projectRef,
    storeRef,
    clipDurationsRef,
    loopStateRef,
    commitProject,
    generateUniqueId,
    getAudioDuration,
    setClipDurations,
    setIsDirty,
    setSelectedClipId,
    setSelectedTrackId,
    selectedClipIdRef,
    addToastRef,
    tRef,
    setLoopState,
  } = core

  // ─── ADD CLIP (from library sound) ───────────────────────────────────

  /**
   * Adds a clip from a library sound to the given track.
   *
   * If `startPosition` is `null`, the clip is placed after the last clip
   * on the track (with a 0.5s gap).
   *
   * @param {string} trackId
   * @param {string} soundId - Sound ID to look up in `storeRef.current.sounds`.
   * @param {number|null} [startPosition=null]
   * @returns {Promise<Object|null>} The new clip, or `null` on error.
   */
  const addClip = useCallback(
    async (trackId, soundId, startPosition = null) => {
      const currentStore = storeRef.current
      if (!currentStore) {
        addToastRef.current?.(
          tRef.current('editorToastStoreNotAvailable'),
          'error'
        )
        return null
      }

      const sound = currentStore.sounds?.find((s) => s.id === soundId)
      if (!sound) {
        addToastRef.current?.(
          tRef.current('editorToastSoundNotFound'),
          'error'
        )
        return null
      }

      try {
        const currentProject = projectRef.current
        const track = currentProject?.tracks?.find((t) => t.id === trackId)
        if (!track) {
          addToastRef.current?.(
            tRef.current('editorToastTrackNotFound'),
            'error'
          )
          return null
        }

        const actualDuration = await getAudioDuration(sound.path)

        let actualStart = startPosition
        if (actualStart === null || actualStart === undefined) {
          if (track.clips.length > 0) {
            const lastClip = track.clips.reduce(
              (max, clip) => {
                const clipEnd =
                  clip.start + (clip.duration || DEFAULT_CLIP_DURATION)
                return clipEnd > max.end
                  ? { start: clip.start, end: clipEnd }
                  : max
              },
              { start: 0, end: 0 }
            )
            actualStart = lastClip.end + DUPLICATE_GAP
          } else {
            actualStart = 0
          }
        }

        const newClip = {
          id: generateUniqueId('clip'),
          soundId: sound.id,
          name: sound.name,
          path: sound.path,
          start: actualStart,
          duration: actualDuration,
          offset: 0,
          volume: 0,
          volumeDb: 0,
          effects: [],
          fadeIn: 0,
          fadeOut: 0,
          pitch: 0,
          speed: 1,
        }

        const updatedProject = {
          ...currentProject,
          tracks: currentProject.tracks.map((t) => {
            if (t.id === trackId) {
              const clips = [...t.clips, newClip].sort(
                (a, b) => a.start - b.start
              )
              return { ...t, clips }
            }
            return t
          }),
          updatedAt: Date.now(),
        }

        commitProject(updatedProject)

        const newDurations = {
          ...clipDurationsRef.current,
          [newClip.id]: actualDuration,
        }
        setClipDurations(newDurations)
        clipDurationsRef.current = newDurations

        setIsDirty(true)
        addToastRef.current?.(
          tRef.current('editorToastClipAdded', { name: sound.name }),
          'success'
        )
        setSelectedClipId(newClip.id)
        setSelectedTrackId(trackId)
        return newClip
      } catch (e) {
        addToastRef.current?.(
          tRef.current('editorToastClipAddError', { error: e.message }),
          'error'
        )
        return null
      }
    },
    [
      projectRef,
      storeRef,
      clipDurationsRef,
      commitProject,
      generateUniqueId,
      getAudioDuration,
      setClipDurations,
      setIsDirty,
      setSelectedClipId,
      setSelectedTrackId,
      addToastRef,
      tRef,
    ]
  )

  // ─── ADD CLIP (from external file) ───────────────────────────────────

  /**
   * Imports a file via `electronAPI.importSoundFile` and adds it as an
   * **external** clip (not linked to a library sound).
   *
   * @param {string} trackId
   * @param {string} filePath - Absolute path to the source file.
   * @param {number|null} [startPosition=null]
   * @returns {Promise<Object|null>} The new clip, or `null` on error.
   */
  const addClipFromFile = useCallback(
    async (trackId, filePath, startPosition = null) => {
      if (!filePath) {
        addToastRef.current?.(
          tRef.current('editorToastNoFileSelected'),
          'error'
        )
        return null
      }

      try {
        const currentProject = projectRef.current
        const track = currentProject?.tracks?.find((t) => t.id === trackId)
        if (!track) {
          addToastRef.current?.(
            tRef.current('editorToastTrackNotFound'),
            'error'
          )
          return null
        }

        const importResult = await window.electronAPI.importSoundFile(filePath)
        if (!importResult?.success) {
          addToastRef.current?.(
            tRef.current('editorToastFileImportError'),
            'error'
          )
          return null
        }

        const fileName = filePath.split(/[\\/]/).pop() || 'Fichier audio'
        const actualDuration = await getAudioDuration(importResult.path)

        let actualStart = startPosition
        if (actualStart === null || actualStart === undefined) {
          if (track.clips.length > 0) {
            const lastClip = track.clips.reduce(
              (max, clip) => {
                const clipEnd =
                  clip.start + (clip.duration || DEFAULT_CLIP_DURATION)
                return clipEnd > max.end
                  ? { start: clip.start, end: clipEnd }
                  : max
              },
              { start: 0, end: 0 }
            )
            actualStart = lastClip.end + DUPLICATE_GAP
          } else {
            actualStart = 0
          }
        }

        const newClip = {
          id: generateUniqueId('clip'),
          soundId: null,
          name: fileName,
          path: importResult.path,
          start: actualStart,
          duration: actualDuration,
          offset: 0,
          volume: 0,
          volumeDb: 0,
          effects: [],
          fadeIn: 0,
          fadeOut: 0,
          pitch: 0,
          speed: 1,
          isExternal: true,
        }

        const updatedProject = {
          ...currentProject,
          tracks: currentProject.tracks.map((t) => {
            if (t.id === trackId) {
              const clips = [...t.clips, newClip].sort(
                (a, b) => a.start - b.start
              )
              return { ...t, clips }
            }
            return t
          }),
          updatedAt: Date.now(),
        }

        commitProject(updatedProject)

        const newDurations = {
          ...clipDurationsRef.current,
          [newClip.id]: actualDuration,
        }
        setClipDurations(newDurations)
        clipDurationsRef.current = newDurations

        setIsDirty(true)
        addToastRef.current?.(
          tRef.current('editorToastFileImported', { name: fileName }),
          'success'
        )
        setSelectedClipId(newClip.id)
        setSelectedTrackId(trackId)
        return newClip
      } catch (e) {
        addToastRef.current?.(
          tRef.current('editorToastFileImportError'),
          'error'
        )
        return null
      }
    },
    [
      projectRef,
      clipDurationsRef,
      commitProject,
      generateUniqueId,
      getAudioDuration,
      setClipDurations,
      setIsDirty,
      setSelectedClipId,
      setSelectedTrackId,
      addToastRef,
      tRef,
    ]
  )

  // ─── REMOVE CLIP ─────────────────────────────────────────────────────

  /**
   * Removes a clip from its track.
   *
   * Cleans up `clipDurations` and `loopState.clips` entries. Deselects
   * the clip if it was selected.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @returns {void}
   */
  const removeClip = useCallback(
    (trackId, clipId) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const track = currentProject.tracks.find((t) => t.id === trackId)
      if (!track || !track.clips.some((c) => c.id === clipId)) return

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
            : t
        ),
        updatedAt: Date.now(),
      }

      const newDurations = { ...clipDurationsRef.current }
      delete newDurations[clipId]
      setClipDurations(newDurations)
      clipDurationsRef.current = newDurations

      if (loopStateRef.current.clips[clipId]) {
        const updatedLoopState = {
          ...loopStateRef.current,
          clips: { ...loopStateRef.current.clips },
        }
        delete updatedLoopState.clips[clipId]
        setLoopState(updatedLoopState)
        loopStateRef.current = updatedLoopState
        commitProject({ ...updatedProject, loops: updatedLoopState })
      } else {
        commitProject(updatedProject)
      }

      if (selectedClipIdRef.current === clipId) {
        setSelectedClipId(null)
        setSelectedTrackId(null)
      }

      setIsDirty(true)
      addToastRef.current?.(tRef.current('editorToastClipRemoved'), 'info')
    },
    [
      projectRef,
      clipDurationsRef,
      loopStateRef,
      commitProject,
      setClipDurations,
      setLoopState,
      setIsDirty,
      setSelectedClipId,
      setSelectedTrackId,
      selectedClipIdRef,
      addToastRef,
      tRef,
    ]
  )

  // ─── UPDATE CLIP ─────────────────────────────────────────────────────

  /**
   * Shallow-merges `updates` into a clip.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @param {Object} updates
   * @param {Object} [options] - Passed through to `commitProject`.
   * @returns {void}
   */
  const updateClip = useCallback(
    (trackId, clipId, updates, options = {}) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) => {
          if (track.id !== trackId) return track
          return {
            ...track,
            clips: track.clips.map((clip) =>
              clip.id !== clipId ? clip : { ...clip, ...updates }
            ),
          }
        }),
        updatedAt: Date.now(),
      }
      commitProject(updatedProject, options)
      setIsDirty(true)
    },
    [projectRef, commitProject, setIsDirty]
  )

  // ─── DUPLICATE CLIP ──────────────────────────────────────────────────

  /**
   * Duplicates a clip on the same track, placed after the original
   * (gap = `DUPLICATE_GAP`). Regenerates the IDs of the copied effects.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @returns {Object|null} The new clip, or `null` on error.
   */
  const duplicateClip = useCallback(
    (trackId, clipId) => {
      const currentProject = projectRef.current
      if (!currentProject) return null

      const track = currentProject.tracks.find((t) => t.id === trackId)
      if (!track) return null
      const clip = track.clips.find((c) => c.id === clipId)
      if (!clip) return null

      const duration =
        clipDurationsRef.current[clip.id] || clip.duration || 3

      const newClip = {
        ...clip,
        id: generateUniqueId('clip'),
        start: (clip.start || 0) + duration + DUPLICATE_GAP,
        effects: (clip.effects || []).map((e) => ({
          ...e,
          id: generateUniqueId('effect'),
        })),
      }

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((t) => {
          if (t.id === trackId) {
            const clips = [...t.clips, newClip].sort(
              (a, b) => a.start - b.start
            )
            return { ...t, clips }
          }
          return t
        }),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject)

      const newDurations = {
        ...clipDurationsRef.current,
        [newClip.id]: newClip.duration || 3,
      }
      setClipDurations(newDurations)
      clipDurationsRef.current = newDurations

      setIsDirty(true)
      addToastRef.current?.(
        tRef.current('editorToastClipDuplicated'),
        'success'
      )
      return newClip
    },
    [
      projectRef,
      clipDurationsRef,
      commitProject,
      generateUniqueId,
      setClipDurations,
      setIsDirty,
      addToastRef,
      tRef,
    ]
  )

  // ─── MOVE CLIP ───────────────────────────────────────────────────────

  /**
   * Moves a clip to a new start time (and optionally a new track).
   *
   * **Robustness**: if `trackId` doesn't contain the clip, all tracks
   * are searched. Handles cross-track moves atomically (remove + add).
   *
   * @param {string} trackId - Source track (may be wrong; falls back to search).
   * @param {string} clipId
   * @param {number} newStart - New start time (clamped to `>= 0`).
   * @param {string|null} [newTrackId=null] - Target track (defaults to source).
   * @param {Object} [options] - Passed through to `commitProject`.
   * @returns {void}
   */
  const moveClip = useCallback(
    (trackId, clipId, newStart, newTrackId, options = {}) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      let sourceTrack = currentProject.tracks.find((t) => t.id === trackId)
      let clipToMove = sourceTrack?.clips.find((c) => c.id === clipId)

      // Fallback: find the clip anywhere if the source track hint is wrong.
      if (!clipToMove) {
        for (const track of currentProject.tracks) {
          const clip = track.clips.find((c) => c.id === clipId)
          if (clip) {
            clipToMove = clip
            sourceTrack = track
            break
          }
        }
      }
      if (!clipToMove) return

      const actualTrackId = sourceTrack?.id || trackId
      const targetTrackId = newTrackId || actualTrackId
      const clampedStart = Math.max(0, newStart)
      const updatedClip = { ...clipToMove, start: clampedStart }

      let finalTracks
      if (actualTrackId === targetTrackId) {
        // Same-track move: update in place.
        finalTracks = currentProject.tracks.map((track) => {
          if (track.id === actualTrackId) {
            const clips = track.clips
              .map((c) => (c.id === clipId ? updatedClip : c))
              .sort((a, b) => a.start - b.start)
            return { ...track, clips }
          }
          return track
        })
      } else {
        // Cross-track move: remove from source, add to target.
        const without = currentProject.tracks.map((track) =>
          track.id === actualTrackId
            ? { ...track, clips: track.clips.filter((c) => c.id !== clipId) }
            : track
        )
        finalTracks = without.map((track) => {
          if (track.id === targetTrackId) {
            const clips = [...track.clips, updatedClip].sort(
              (a, b) => a.start - b.start
            )
            return { ...track, clips }
          }
          return track
        })
      }

      const updatedProject = {
        ...currentProject,
        tracks: finalTracks,
        updatedAt: Date.now(),
      }
      commitProject(updatedProject, options)
      setIsDirty(true)

      if (updatedClip.duration) {
        const newDurations = {
          ...clipDurationsRef.current,
          [clipId]: updatedClip.duration,
        }
        setClipDurations(newDurations)
        clipDurationsRef.current = newDurations
      }
    },
    [projectRef, clipDurationsRef, commitProject, setClipDurations, setIsDirty]
  )

  // ─── SPLIT CLIP ──────────────────────────────────────────────────────

  /**
   * Splits a clip at `splitTime` into two halves.
   *
   * The left clip keeps `offset`, the right clip gets `offset + leftDuration`
   * so both halves reference the correct portion of the source file.
   *
   * Fade durations are clamped on each half so they don't exceed 50% of
   * that half's duration.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @param {number} splitTime - Absolute time (seconds) on the timeline.
   * @returns {{leftClip: Object, rightClip: Object}|null}
   */
  const splitClip = useCallback(
    (trackId, clipId, splitTime) => {
      const currentProject = projectRef.current
      if (!currentProject) {
        addToastRef.current?.(tRef.current('editorToastNoProject'), 'error')
        return null
      }

      const track = currentProject.tracks.find((t) => t.id === trackId)
      if (!track) {
        addToastRef.current?.(
          tRef.current('editorToastTrackNotFound'),
          'error'
        )
        return null
      }

      const clipIndex = track.clips.findIndex((c) => c.id === clipId)
      if (clipIndex === -1) {
        addToastRef.current?.(
          tRef.current('editorToastClipNotFound'),
          'error'
        )
        return null
      }

      const clip = track.clips[clipIndex]
      const duration =
        clipDurationsRef.current[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const end = start + duration

      // Guard against zero-length halves.
      if (
        splitTime - start < MIN_CLIP_DURATION - EPSILON ||
        end - splitTime < MIN_CLIP_DURATION - EPSILON
      ) {
        addToastRef.current?.(
          tRef.current('editorToastClipSplitTooClose'),
          'warning'
        )
        return null
      }

      const clampedSplitTime = Math.max(start, Math.min(end, splitTime))

      const leftDuration = clampedSplitTime - start
      const rightDuration = end - clampedSplitTime
      const currentOffset = clip.offset || 0

      const leftClip = {
        ...clip,
        id: generateUniqueId('clip'),
        duration: leftDuration,
        offset: currentOffset,
        start,
        effects: clip.effects ? clip.effects.map((e) => ({ ...e })) : [],
      }

      const rightClip = {
        ...clip,
        id: generateUniqueId('clip'),
        duration: rightDuration,
        offset: currentOffset + leftDuration,
        start: clampedSplitTime,
        effects: clip.effects ? clip.effects.map((e) => ({ ...e })) : [],
      }

      // Clamp fade-out on the left half and fade-in on the right half so
      // they fit inside their new (shorter) duration.
      if (leftClip.effects) {
        const fadeOut = leftClip.effects.find((e) => e.type === 'fadeOut')
        if (fadeOut && fadeOut.params.duration > leftDuration * 0.5) {
          fadeOut.params.duration = Math.min(
            fadeOut.params.duration,
            leftDuration * 0.5
          )
        }
      }
      if (rightClip.effects) {
        const fadeIn = rightClip.effects.find((e) => e.type === 'fadeIn')
        if (fadeIn && fadeIn.params.duration > rightDuration * 0.5) {
          fadeIn.params.duration = Math.min(
            fadeIn.params.duration,
            rightDuration * 0.5
          )
        }
      }

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((t) => {
          if (t.id === trackId) {
            const newClips = [
              ...track.clips.slice(0, clipIndex),
              leftClip,
              rightClip,
              ...track.clips.slice(clipIndex + 1),
            ].sort((a, b) => a.start - b.start)
            return { ...t, clips: newClips }
          }
          return t
        }),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject)

      const newDurations = {
        ...clipDurationsRef.current,
        [leftClip.id]: leftDuration,
        [rightClip.id]: rightDuration,
      }
      setClipDurations(newDurations)
      clipDurationsRef.current = newDurations

      setIsDirty(true)
      addToastRef.current?.(
        tRef.current('editorToastClipSplitAt', {
          name: clip.name,
          time: splitTime.toFixed(1),
        }),
        'success'
      )
      setSelectedClipId(leftClip.id)
      setSelectedTrackId(trackId)

      return { leftClip, rightClip }
    },
    [
      projectRef,
      clipDurationsRef,
      commitProject,
      generateUniqueId,
      setClipDurations,
      setIsDirty,
      setSelectedClipId,
      setSelectedTrackId,
      addToastRef,
      tRef,
    ]
  )

  // ─── SELECTION ───────────────────────────────────────────────────────

  /**
   * Selects a clip (and its track).
   *
   * @param {string} clipId
   * @param {string} trackId
   * @returns {void}
   */
  const selectClip = useCallback(
    (clipId, trackId) => {
      setSelectedClipId(clipId)
      setSelectedTrackId(trackId)
    },
    [setSelectedClipId, setSelectedTrackId]
  )

  /**
   * Clears the current selection.
   * @returns {void}
   */
  const deselectClip = useCallback(() => {
    setSelectedClipId(null)
    setSelectedTrackId(null)
  }, [setSelectedClipId, setSelectedTrackId])

  return {
    addClip,
    addClipFromFile,
    removeClip,
    updateClip,
    duplicateClip,
    moveClip,
    splitClip,
    selectClip,
    deselectClip,
  }
}