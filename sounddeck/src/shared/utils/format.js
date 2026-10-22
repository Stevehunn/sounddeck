/**
 * @file Time formatting helpers.
 *
 * `formatTime(seconds, options)` is the single place where durations are
 * turned into strings. It supports several output shapes:
 *
 * - **default**: `"1:23"` if ≥ 60 s, `"45.3s"` if < 60 s.
 * - **`alwaysMMSS`**: `"0:45"` even for < 60 s.
 * - **`decimals: 1|2`**: `"1:23.4"` or `"1:23.45"`.
 * - **`short: true`**: `"12.3s"`.
 * - **`noDecimals: true`**: `"1:23"` (floor).
 *
 * `formatMMSS(seconds)` is a convenience wrapper for the `alwaysMMSS` mode.
 *
 * @see @shared/components/audio/Waveform.jsx (formats handle labels)
 * @see @shared/components/audio/AudioTrimmer.jsx
 */

/**
 * Formats a duration (in seconds) as a human-readable string.
 *
 * @param {number} seconds
 * @param {Object} [options]
 * @param {boolean} [options.alwaysMMSS=false] - Use `M:SS` even for < 60 s.
 * @param {number} [options.decimals=0] - Number of decimal places (0-2).
 * @param {boolean} [options.short=false] - Return only seconds (e.g. `"12.3s"`).
 * @param {boolean} [options.noDecimals=false] - Floor the seconds (no decimal).
 * @returns {string} Formatted duration (`"0:00"` for invalid input).
 */
export function formatTime(seconds, options = {}) {
  if (!seconds && seconds !== 0) return '0:00'
  if (isNaN(seconds) || seconds < 0) return '0:00'

  const {
    alwaysMMSS = false,
    decimals = 0,
    short = false,
    noDecimals = false,
  } = options

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const secsFloor = Math.floor(secs)

  if (short) {
    return `${secsFloor.toFixed(decimals)}s`
  }

  if (mins > 0 || alwaysMMSS) {
    if (decimals > 0) {
      return `${mins}:${secsFloor.toString().padStart(2, '0')}.${Math.floor((secs - secsFloor) * Math.pow(10, decimals)).toString().padStart(decimals, '0')}`
    }
    return `${mins}:${secsFloor.toString().padStart(2, '0')}`
  }

  if (decimals > 0) {
    return `${secs.toFixed(decimals)}s`
  }

  if (noDecimals) {
    return `${secsFloor}s`
  }

  return `${secs.toFixed(1)}s`
}

/**
 * Shortcut for `formatTime(seconds, { alwaysMMSS: true })`.
 *
 * @param {number} seconds
 * @returns {string} Formatted duration (`"M:SS"`).
 */
export function formatMMSS(seconds) {
  return formatTime(seconds, { alwaysMMSS: true })
}

export default { formatTime, formatMMSS }