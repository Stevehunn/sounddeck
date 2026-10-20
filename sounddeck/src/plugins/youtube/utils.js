/**
 * @file Utility helpers for the YouTube plugin.
 *
 * Currently a single helper: `formatDuration()` — used by `TrimStep.jsx`
 * to display track durations as `M:SS` (e.g. `3:45`) in the trim
 * controls and the video info row.
 *
 * Note: durations over 1 hour are still formatted as `M:SS` (e.g.
 * `121:05` for a 2h1m track) — this matches the YouTube convention
 * where minute counts can exceed 60.
 */

/**
 * Formats a duration in seconds as `M:SS`.
 *
 * Behavior:
 * - `null` / `undefined` / `NaN` / non-numeric strings → `"0:00"`
 * - Seconds are floored (e.g. `45.9` → `0:45`)
 * - Seconds are zero-padded to 2 digits
 *
 * @param {number|string|null|undefined} s - Duration in seconds.
 * @returns {string} Formatted duration (`M:SS`).
 *
 * @example
 * formatDuration(45)     // → "0:45"
 * formatDuration(125)    // → "2:05"
 * formatDuration(3600)   // → "60:00"
 * formatDuration(null)   // → "0:00"
 */
export function formatDuration(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}