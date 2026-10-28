/**
 * @file Track CRUD operations for the editor.
 *
 * Exposes `addTrack`, `removeTrack`, `renameTrack`, `muteTrack`,
 * `soloTrack`, and `setTrackVolume`. Each mutation:
 * 1. Builds the updated project immutably.
 * 2. Commits it via `commitProject` (which pushes history + persists).
 * 3. Syncs any derived state (`clipDurations`, `selected*`, `isDirty`).
 * 4. Shows a toast (except for volume changes, which are considered
 *    transient and use `skipHistory: true`).
 *
 * `removeTrack` requires confirmation when the track contains clips
 * (via `confirm`, falls back to `window.confirm` if not provided — e.g.
 * when used outside a `useConfirm` context).
 *
 * @see ../useEditorCore.js — provides `commitProject`, `confirm`, etc.
 * @see ./useEditorAudioPlayback.js — provides `updateTrackVolume`
 */

import { useCallback } from 'react'

/** Volume clamp bounds (0 = mute, 5 = +14 dB). */
const MIN_TRACK_VOLUME = 0
const MAX_TRACK_VOLUME = 5

/** Default track volume (1 = unity gain). */
const DEFAULT_TRACK_VOLUME = 1

/**
 * Track CRUD operations hook.
 *
 * @param {Object} core - Result of `useEditorCore`.
 * @param {Object} audioPlayback - Result of `useEditorAudioPlayback` (needs `updateTrackVolume`).
 * @returns {{
 *   addTrack: (name?: string, color?: string) => Promise<Object|null>,
 *   removeTrack: (trackId: string) => Promise<void>,
 *   renameTrack: (trackId: string, newName: string) => Promise<void>,
 *   muteTrack: (trackId: string, muted: boolean) => Promise<void>,
 *   soloTrack: (trackId: string, solo: boolean) => Promise<void>,
 *   setTrackVolume: (trackId: string, volume: number) => void,
 * }}
 */
export function useEditorTracks(core, audioPlayback) {
  const {
    projectRef,
    clipDurationsRef,
    commitProject,
    generateUniqueId,
    setClipDurations,
    setIsDirty,
    setSelectedClipId,
    setSelectedTrackId,
    selectedClipIdRef,
    addToastRef,
    tRef,
    confirm,
  } = core

  const { updateTrackVolume } = audioPlayback

  /**
   * Adds a track to the project.
   *
   * If no project is loaded yet, a minimal default project is created
   * so the user can add tracks before explicitly creating one.
   *
   * @param {string} [name] - Track name (default: `Piste {N}`).
   * @param {string} [color] - Track color (default: HSL derived from index).
   * @returns {Promise<Object|null>} The new track, or `null` on error.
   */
  const addTrack = useCallback(
    async (name, color) => {
      try {
        let currentProject = projectRef.current
        if (!currentProject) {
          currentProject = {
            id: `project-${Date.now()}`,
            name: 'Nouveau projet',
            tracks: [],
            duration: 60,
            loops: { clips: {}, tracks: {}, timeline: {} },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        }

        const trackIndex = currentProject.tracks?.length || 0
        const trackName = name || `Piste ${trackIndex + 1}`
        const trackColor =
          color || `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 50%)`

        const newTrack = {
          id: generateUniqueId('track'),
          name: trackName,
          color: trackColor,
          clips: [],
          volume: DEFAULT_TRACK_VOLUME,
          muted: false,
          solo: false,
          effects: [],
        }

        const updatedProject = {
          ...currentProject,
          tracks: [...(currentProject.tracks || []), newTrack],
          updatedAt: Date.now(),
        }

        commitProject(updatedProject)

        // Recompute clipDurations for the whole project (new track is empty,
        // but the update keeps the invariant explicit).
        const durations = {}
        for (const track of updatedProject.tracks) {
          for (const clip of track.clips) {
            if (clip.id) durations[clip.id] = clip.duration || 3
          }
        }
        setClipDurations(durations)
        clipDurationsRef.current = durations

        setIsDirty(true)
        addToastRef.current?.(
          tRef.current('editorToastTrackAdded', { name: trackName }),
          'success'
        )
        return newTrack
      } catch (e) {
        addToastRef.current?.(
          tRef.current('editorToastTrackAddError', { error: e.message }),
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
      setClipDurations,
      setIsDirty,
      addToastRef,
      tRef,
    ]
  )

  /**
   * Removes a track from the project.
   *
   * Refuses to remove the last remaining track. If the track contains
   * clips, asks for confirmation first.
   *
   * @param {string} trackId
   * @returns {Promise<void>}
   */
  const removeTrack = useCallback(
    async (trackId) => {
      const currentProject = projectRef.current
      if (!currentProject) {
        addToastRef.current?.(tRef.current('editorToastNoProject'), 'error')
        return
      }

      const trackToRemove = currentProject.tracks.find((t) => t.id === trackId)
      if (!trackToRemove) {
        addToastRef.current?.(
          tRef.current('editorToastTrackNotFound'),
          'error'
        )
        return
      }

      if (currentProject.tracks.length <= 1) {
        addToastRef.current?.(tRef.current('editorToastLastTrack'), 'warning')
        return
      }

      if (trackToRemove.clips.length > 0) {
        const message = tRef.current('editorToastDeleteTrackWithClips', {
          name: trackToRemove.name,
          count: trackToRemove.clips.length,
        })

        let confirmed = false
        if (confirm) {
          confirmed = await confirm({
            title: tRef.current('confirmDeleteTrack'),
            message,
            type: 'warning',
            confirmText: tRef.current('delete'),
            cancelText: tRef.current('cancel'),
          })
        } else {
          // Fallback (should not happen when used inside EditorProvider).
          confirmed = window.confirm(message)
        }
        if (!confirmed) return
      }

      const updatedTracks = currentProject.tracks.filter(
        (t) => t.id !== trackId
      )
      const updatedProject = {
        ...currentProject,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      }
      commitProject(updatedProject)

      const durations = { ...clipDurationsRef.current }
      for (const clip of trackToRemove.clips) delete durations[clip.id]
      setClipDurations(durations)
      clipDurationsRef.current = durations

      setIsDirty(true)
      addToastRef.current?.(
        tRef.current('editorToastTrackRemoved', { name: trackToRemove.name }),
        'info'
      )

      // Deselect the current clip if it was on the removed track.
      if (
        selectedClipIdRef.current &&
        !updatedTracks.some((t) =>
          t.clips.some((c) => c.id === selectedClipIdRef.current)
        )
      ) {
        setSelectedTrackId(null)
        setSelectedClipId(null)
      }
    },
    [
      projectRef,
      clipDurationsRef,
      commitProject,
      selectedClipIdRef,
      setClipDurations,
      setIsDirty,
      setSelectedClipId,
      setSelectedTrackId,
      addToastRef,
      tRef,
      confirm,
    ]
  )

  /**
   * Renames a track.
   *
   * @param {string} trackId
   * @param {string} newName
   * @returns {Promise<void>}
   */
  const renameTrack = useCallback(
    async (trackId, newName) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) =>
          track.id === trackId ? { ...track, name: newName } : track
        ),
        updatedAt: Date.now(),
      }
      commitProject(updatedProject)
      setIsDirty(true)
    },
    [projectRef, commitProject, setIsDirty]
  )

  /**
   * Mutes or unmutes a track.
   *
   * @param {string} trackId
   * @param {boolean} muted
   * @returns {Promise<void>}
   */
  const muteTrack = useCallback(
    (trackId, muted) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) =>
          track.id === trackId ? { ...track, muted } : track
        ),
        updatedAt: Date.now(),
      }
      commitProject(updatedProject)
      setIsDirty(true)
    },
    [projectRef, commitProject, setIsDirty]
  )

  /**
   * Enables/disables solo on a track.
   *
   * Enabling solo mutes every other track (exclusive solo). Disabling
   * solo leaves the other tracks untouched (they keep their muted state).
   *
   * @param {string} trackId
   * @param {boolean} solo
   * @returns {Promise<void>}
   */
  const soloTrack = useCallback(
    (trackId, solo) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) => {
          if (track.id === trackId) return { ...track, solo }
          if (solo) return { ...track, muted: true, solo: false }
          return { ...track, solo: false }
        }),
        updatedAt: Date.now(),
      }
      commitProject(updatedProject)
      setIsDirty(true)
    },
    [projectRef, commitProject, setIsDirty]
  )

  /**
   * Sets the volume of a track (clamped to `[0, 5]`).
   *
   * Volume changes are transient (live slider drags) so they skip the
   * undo history. The audio playback is updated in real time.
   *
   * @param {string} trackId
   * @param {number} volume - Linear multiplier (0-5).
   * @returns {void}
   */
  const setTrackVolume = useCallback(
    (trackId, volume) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const clampedVolume = Math.max(
        MIN_TRACK_VOLUME,
        Math.min(MAX_TRACK_VOLUME, volume)
      )
      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) =>
          track.id === trackId ? { ...track, volume: clampedVolume } : track
        ),
        updatedAt: Date.now(),
      }
      commitProject(updatedProject, { skipHistory: true })
      updateTrackVolume(trackId, clampedVolume)
      setIsDirty(true)
    },
    [projectRef, commitProject, updateTrackVolume, setIsDirty]
  )

  return {
    addTrack,
    removeTrack,
    renameTrack,
    muteTrack,
    soloTrack,
    setTrackVolume,
  }
}