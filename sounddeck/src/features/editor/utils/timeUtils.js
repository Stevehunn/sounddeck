/**
 * @file Time formatting / parsing / snapping for the editor.
 *
 * Thin layer over `@shared/utils/format.js` with editor-specific extras:
 * - `parseTime` — parses `M:SS` or raw seconds.
 * - `snapTime` — rounds to the nearest grid step.
 * - `getRulerStep` — the ruler tick interval for a given zoom.
 * - `isInLoopRegion` — loop region membership test.
 * - `getTotalDuration` — total project duration (min 10s).
 * - `getPixelsPerSecond` — zoom → scale factor (min 10 px/s).
 */

import { formatTime as sharedFormatTime } from '@shared/utils/format'

/** Ruler tick (seconds) per zoom range. Ordered high→low zoom. */
const RULER_STEPS = [
  { maxZoom: 0.08, step: 60 },
  { maxZoom: 0.15, step: 30 },
  { maxZoom: 0.3, step: 10 },
  { maxZoom: 0.6, step: 5 },
  { maxZoom: 1.5, step: 1 },
  { maxZoom: 3, step: 0.5 },
]

/** Default base scale (px per second at zoom = 1). */
const BASE_PX_PER_SECOND = 80

/** Minimum pixels-per-second floor (avoids collapsing the timeline). */
const MIN_PX_PER_SECOND = 10

/** Minimum project duration (seconds). */
const MIN_PROJECT_DURATION = 10

/** Extra padding added after the last clip (seconds). */
const DURATION_PADDING = 2

/**
 * Formats a duration in seconds as `M:SS` (or `M:SS.ss` with ms).
 *
 * @param {number} seconds
 * @param {boolean} [showMilliseconds=false]
 * @returns {string}
 */
export function formatTime(seconds, showMilliseconds = false) {
  return sharedFormatTime(seconds, {
    decimals: showMilliseconds ? 2 : 0,
    alwaysMMSS: showMilliseconds,
  })
}

/**
 * Parses a time string into seconds.
 *
 * Supports `M:SS` / `M:SS.ss` and raw decimal seconds (`"90"`, `"1.5"`).
 *
 * @param {string} timeString
 * @returns {number} Seconds, or `0` on invalid input.
 */
export function parseTime(timeString) {
  if (!timeString) return 0

  const str = String(timeString).trim()

  const match = str.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (match) {
    const mins = parseInt(match[1], 10)
    const secs = parseFloat(match[2])
    return mins * 60 + secs
  }

  const num = parseFloat(str)
  return Number.isFinite(num) ? num : 0
}

/**
 * Rounds a time to the nearest multiple of `snapValue`.
 *
 * @param {number} time
 * @param {number} [snapValue=0.1] - Grid step (seconds). `<= 0` disables.
 * @returns {number}
 */
export function snapTime(time, snapValue = 0.1) {
  if (snapValue <= 0) return time
  return Math.round(time / snapValue) * snapValue
}

/**
 * Returns the ruler tick interval (seconds) for the given zoom level.
 *
 * @param {number} zoomLevel
 * @returns {number}
 */
export function getRulerStep(zoomLevel) {
  for (const { maxZoom, step } of RULER_STEPS) {
    if (zoomLevel < maxZoom) return step
  }
  return 0.1
}

/**
 * Returns `true` if `time` is inside the loop region.
 *
 * @param {number} time
 * @param {{enabled: boolean, start: number, end: number}|null|undefined} loopRegion
 * @returns {boolean}
 */
export function isInLoopRegion(time, loopRegion) {
  if (!loopRegion?.enabled) return false
  if (loopRegion.end <= loopRegion.start) return false
  return time >= loopRegion.start && time <= loopRegion.end
}

/**
 * Computes the total duration of a project from its clips.
 *
 * Returns `max(end) + DURATION_PADDING`, floored at `MIN_PROJECT_DURATION`.
 *
 * @param {Object} project
 * @param {Record<string, number>} [clipDurations={}]
 * @returns {number} Seconds.
 */
export function getTotalDuration(project, clipDurations = {}) {
  if (!project?.tracks || project.tracks.length === 0) {
    return MIN_PROJECT_DURATION
  }

  let maxDuration = 0
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const duration = clipDurations[clip.id] || clip.duration || 3
      const end = (clip.start || 0) + duration
      if (end > maxDuration) maxDuration = end
    }
  }
  return Math.max(maxDuration + DURATION_PADDING, MIN_PROJECT_DURATION)
}

/**
 * Returns the pixels-per-second factor for the given zoom level.
 *
 * @param {number} zoomLevel
 * @param {number} [basePixelsPerSecond=BASE_PX_PER_SECOND]
 * @returns {number} Clamped to `>= MIN_PX_PER_SECOND`.
 */
export function getPixelsPerSecond(
  zoomLevel,
  basePixelsPerSecond = BASE_PX_PER_SECOND
) {
  return Math.max(MIN_PX_PER_SECOND, basePixelsPerSecond * zoomLevel)
}