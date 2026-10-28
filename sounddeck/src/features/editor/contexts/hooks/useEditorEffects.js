/**
 * @file Clip effects CRUD (add, remove, update params, toggle, fades).
 *
 * Effects are stored per-clip in `clip.effects: Array<{id, type, params, enabled}>`.
 * The five exposed operations:
 *
 * - `addEffectToClip` — push a new effect (auto-generates its ID).
 * - `removeEffectFromClip` — filter out by effect ID.
 * - `updateEffectParam` — shallow-merge a single param (`skipHistory: true`
 *   because it's called on every slider drag).
 * - `toggleEffect` — flip `enabled`.
 * - `setClipFade` — upsert a `fadeIn`/`fadeOut` effect from a handle drag.
 *
 * All mutations are **immutable** at every level (project → tracks →
 * clips → effects → params) so React can diff cheaply and the undo stack
 * keeps consistent snapshots.
 *
 * @see ../useEditorCore.js — provides `commitProject`, `generateUniqueId`, etc.
 * @see @shared/utils/realTimeEffects.js — the actual audio processing
 */

import { useCallback } from 'react'

/** Fade duration bounds (seconds). */
const MIN_FADE_DURATION = 0.05
const MAX_FADE_DURATION = 10

/**
 * Clip effects CRUD hook.
 *
 * @param {Object} core - Result of `useEditorCore`.
 * @returns {{
 *   addEffectToClip: (trackId: string, clipId: string, effectType: string, params?: Object) => Promise<Object|null>,
 *   removeEffectFromClip: (trackId: string, clipId: string, effectId: string) => Promise<void>,
 *   updateEffectParam: (trackId: string, clipId: string, effectId: string, param: string, value: any) => Promise<void>,
 *   toggleEffect: (trackId: string, clipId: string, effectId: string, enabled: boolean) => Promise<void>,
 *   setClipFade: (trackId: string, clipId: string, edge: 'in'|'out', duration: number) => void,
 * }}
 */
export function useEditorEffects(core) {
  const { projectRef, commitProject, generateUniqueId, setIsDirty } = core

  /**
   * Adds a new effect to a clip.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @param {string} effectType - e.g. `'volume'`, `'echo'`, `'reverb'`, `'fadeIn'`, `'fadeOut'`, `'speed'`.
   * @param {Object} [params={}] - Effect-specific parameters.
   * @returns {Promise<Object|null>} The new effect, or `null` on error.
   */
  const addEffectToClip = useCallback(
    async (trackId, clipId, effectType, params = {}) => {
      const currentProject = projectRef.current
      if (!currentProject) return null

      const effect = {
        id: generateUniqueId('effect'),
        type: effectType,
        params,
        enabled: true,
      }

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) => {
          if (track.id !== trackId) return track
          return {
            ...track,
            clips: track.clips.map((clip) =>
              clip.id === clipId
                ? { ...clip, effects: [...(clip.effects || []), effect] }
                : clip
            ),
          }
        }),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject)
      setIsDirty(true)
      return effect
    },
    [projectRef, commitProject, generateUniqueId, setIsDirty]
  )

  /**
   * Removes an effect from a clip.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @param {string} effectId
   * @returns {Promise<void>}
   */
  const removeEffectFromClip = useCallback(
    async (trackId, clipId, effectId) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) => {
          if (track.id !== trackId) return track
          return {
            ...track,
            clips: track.clips.map((clip) =>
              clip.id === clipId
                ? {
                    ...clip,
                    effects: (clip.effects || []).filter(
                      (e) => e.id !== effectId
                    ),
                  }
                : clip
            ),
          }
        }),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject)
      setIsDirty(true)
    },
    [projectRef, commitProject, setIsDirty]
  )

  /**
   * Updates a single parameter of an effect.
   *
   * Uses `skipHistory: true` because this is called on every slider drag
   * (one undo step per drag would flood the history).
   *
   * @param {string} trackId
   * @param {string} clipId
   * @param {string} effectId
   * @param {string} param - Parameter name (e.g. `'value'`, `'decay'`).
   * @param {any} value
   * @returns {Promise<void>}
   */
  const updateEffectParam = useCallback(
    async (trackId, clipId, effectId, param, value) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) => {
          if (track.id !== trackId) return track
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id !== clipId) return clip
              return {
                ...clip,
                effects: (clip.effects || []).map((effect) =>
                  effect.id === effectId
                    ? {
                        ...effect,
                        params: { ...effect.params, [param]: value },
                      }
                    : effect
                ),
              }
            }),
          }
        }),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject, { skipHistory: true })
      setIsDirty(true)
    },
    [projectRef, commitProject, setIsDirty]
  )

  /**
   * Enables or disables an effect.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @param {string} effectId
   * @param {boolean} enabled
   * @returns {Promise<void>}
   */
  const toggleEffect = useCallback(
    async (trackId, clipId, effectId, enabled) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) => {
          if (track.id !== trackId) return track
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id !== clipId) return clip
              return {
                ...clip,
                effects: (clip.effects || []).map((effect) =>
                  effect.id === effectId ? { ...effect, enabled } : effect
                ),
              }
            }),
          }
        }),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject)
      setIsDirty(true)
    },
    [projectRef, commitProject, setIsDirty]
  )

  /**
   * Sets (or updates) a fade-in or fade-out effect on a clip.
   *
   * Called on every fade-handle drag. Uses `skipHistory: true`.
   *
   * If an effect of the same type already exists, its `duration` param is
   * updated in place. Otherwise, a new effect is appended.
   *
   * A duration of `<= MIN_FADE_DURATION` **disables** the effect (rather
   * than removing it), so re-dragging the handle re-enables it.
   *
   * @param {string} trackId
   * @param {string} clipId
   * @param {'in'|'out'} edge - `'in'` → fadeIn, `'out'` → fadeOut.
   * @param {number} duration - Fade duration in seconds (clamped).
   * @returns {void}
   */
  const setClipFade = useCallback(
    (trackId, clipId, edge, duration) => {
      const currentProject = projectRef.current
      if (!currentProject) return

      const clampedDuration = Math.max(
        MIN_FADE_DURATION,
        Math.min(MAX_FADE_DURATION, duration)
      )
      const effectType = edge === 'in' ? 'fadeIn' : 'fadeOut'

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map((track) => {
          if (track.id !== trackId) return track
          return {
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.id !== clipId) return clip

              const existingEffect = (clip.effects || []).find(
                (e) => e.type === effectType
              )

              if (existingEffect) {
                return {
                  ...clip,
                  effects: (clip.effects || []).map((e) =>
                    e.type === effectType
                      ? {
                          ...e,
                          params: { ...e.params, duration: clampedDuration },
                          enabled: clampedDuration > MIN_FADE_DURATION,
                        }
                      : e
                  ),
                }
              }
              return {
                ...clip,
                effects: [
                  ...(clip.effects || []),
                  {
                    id: generateUniqueId('effect'),
                    type: effectType,
                    params: { duration: clampedDuration },
                    enabled: clampedDuration > MIN_FADE_DURATION,
                  },
                ],
              }
            }),
          }
        }),
        updatedAt: Date.now(),
      }

      commitProject(updatedProject, { skipHistory: true })
      setIsDirty(true)
    },
    [projectRef, commitProject, generateUniqueId, setIsDirty]
  )

  return {
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    toggleEffect,
    setClipFade,
  }
}