/**
 * @file Markers CRUD + navigation.
 *
 * Markers are named timestamped points in a project (`project.markers`).
 * Each marker has `{id, name, time, color}`. They're used for navigation
 * (previous/next marker), visual reference on the timeline, and as snap
 * targets.
 *
 * `navigateToMarker` is a thin wrapper around `playback.seek()` — it moves
 * the playhead but does not play anything (the user presses Play).
 *
 * @see ../useEditorCore.js — provides `commitProject`, `currentTimeRef`, etc.
 * @see ./useEditorAudioPlayback.js — provides `seek`
 */

import { useCallback } from 'react'
import { uuid } from '@shared/utils/uuid'

/** Default color for new markers. */
const DEFAULT_MARKER_COLOR = '#3b82f6'

/**
 * Markers CRUD + navigation hook.
 *
 * @param {Object} core - Result of `useEditorCore`.
 * @param {Object} playback - Result of `useEditorAudioPlayback` (needs `seek`).
 * @returns {{
 *   addMarker: (markerData: Object) => Object|null,
 *   removeMarker: (markerId: string) => void,
 *   updateMarker: (markerId: string, updates: Object) => void,
 *   navigateToMarker: (time: number) => void,
 * }}
 */
export function useEditorMarkers(core, playback) {
  const { projectRef, currentTimeRef, commitProject, setIsDirty, addToastRef, tRef } =
    core
  const { seek } = playback

  /**
   * Adds a marker.
   *
   * `markerData.time` defaults to the current playhead position.
   * `markerData.name` defaults to `Marker {N+1}`.
   *
   * @param {Object} markerData
   * @param {string} [markerData.name]
   * @param {number} [markerData.time] - Defaults to `currentTimeRef.current`.
   * @param {string} [markerData.color='#3b82f6']
   * @returns {Object|null} The new marker, or `null` if no project.
   */
  const addMarker = useCallback(
    (markerData) => {
      const currentProject = projectRef.current
      if (!currentProject) return null

      const newMarker = {
        id: uuid('marker'),
        name:
          markerData.name ||
          `Marker ${(currentProject.markers?.length || 0) + 1}`,
        time: markerData.time || currentTimeRef.current,
        color: markerData.color || DEFAULT_MARKER_COLOR,
      }

      const updatedProject = {
        ...currentProject,
        markers: [...(currentProject.markers || []), newMarker],
        updatedAt: Date.now(),
      }

      commitProject(updatedProject)
      setIsDirty(true)
      addToastRef.current?.(
        tRef.current('editorToastMarkerAdded', { name: newMarker.name }),
        'success'
      )
      return newMarker
    },
    [
      projectRef,
      currentTimeRef,
      commitProject,
      setIsDirty,
      addToastRef,
      tRef,
    ]
  )

  /**
   * Removes a marker by ID.
   *
   * No-op if the marker doesn't exist.
   *
   * @param {string} markerId
   * @returns {void}
   */
  const removeMarker = useCallback(
    (markerId) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const markerToRemove = currentProject.markers?.find(
        (m) => m.id === markerId
      )
      if (!markerToRemove) return

      const updatedProject = {
        ...currentProject,
        markers: (currentProject.markers || []).filter(
          (m) => m.id !== markerId
        ),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject)
      setIsDirty(true)
      addToastRef.current?.(
        tRef.current('editorToastMarkerRemoved', {
          name: markerToRemove.name,
        }),
        'info'
      )
    },
    [projectRef, commitProject, setIsDirty, addToastRef, tRef]
  )

  /**
   * Shallow-merges `updates` into a marker.
   *
   * @param {string} markerId
   * @param {Object} updates - e.g. `{ name }`, `{ time }`, `{ color }`.
   * @returns {void}
   */
  const updateMarker = useCallback(
    (markerId, updates) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const updatedProject = {
        ...currentProject,
        markers: (currentProject.markers || []).map((m) =>
          m.id === markerId ? { ...m, ...updates } : m
        ),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject)
      setIsDirty(true)
    },
    [projectRef, commitProject, setIsDirty]
  )

  /**
   * Moves the playhead to a marker's position (no playback).
   *
   * @param {number} time - Seconds.
   * @returns {void}
   */
  const navigateToMarker = useCallback(
    (time) => {
      seek(time)
    },
    [seek]
  )

  return {
    addMarker,
    removeMarker,
    updateMarker,
    navigateToMarker,
  }
}