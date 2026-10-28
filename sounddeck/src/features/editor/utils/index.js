/**
 * @file Barrel + small helpers for the editor utils.
 *
 * `formatTime` uses the editor convention: **always** `M:SS` (never the
 * auto `< 60s` variant used elsewhere) so that clip labels are consistent
 * regardless of duration.
 *
 * @see @shared/utils/format.js
 */

import { formatTime as sharedFormatTime } from '@shared/utils/format'

/**
 * Formats a duration (seconds) as `M:SS`.
 *
 * @param {number} seconds
 * @returns {string} `"0:45"` for 45s, `"1:23"` for 83s, etc.
 */
export const formatTime = (seconds) =>
  sharedFormatTime(seconds, { alwaysMMSS: true })

/**
 * Finds a clip by its ID across all tracks.
 *
 * @param {Array<{clips: Array<{id: string}>}>} tracks
 * @param {string} clipId
 * @returns {Object|null} The clip, or `null` if not found.
 */
export const getClipById = (tracks, clipId) => {
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === clipId)
    if (clip) return clip
  }
  return null
}

/**
 * Finds a track by its ID.
 *
 * @param {Array<{id: string}>} tracks
 * @param {string} trackId
 * @returns {Object|null}
 */
export const getTrackById = (tracks, trackId) => {
  return tracks.find((t) => t.id === trackId) || null
}

/**
 * Returns the index of a track in the list, or `-1`.
 *
 * @param {Array<{id: string}>} tracks
 * @param {string} trackId
 * @returns {number}
 */
export const getTrackIndex = (tracks, trackId) => {
  return tracks.findIndex((t) => t.id === trackId)
}

/**
 * Generates a deterministic HSL color from a track index.
 *
 * Rotates the hue by 30° per index, offset by 200° so track 0 lands on a
 * blue/purple tone rather than red (which is reserved for "danger").
 *
 * @param {number} index
 * @returns {string} `hsl(...)` string.
 */
export const generateTrackColor = (index) => {
  return `hsl(${(index * 30 + 200) % 360}, 60%, 50%)`
}