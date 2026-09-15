// src/shared/utils/format.js

/**
 * Formate un temps (en secondes) en chaîne lisible.
 *
 * Modes :
 *   - défaut          : "1:23" ou "45.3s" (auto)
 *   - alwaysMMSS      : "0:45" même si < 60s
 *   - decimals: 1|2   : "1:23.4" ou "1:23.45"
 *   - short           : "12.3s"
 *   - noDecimals      : "1:23" (floor)
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
 * Format "1:23" (MM:SS) — utilitaire raccourci
 */
export function formatMMSS(seconds) {
  return formatTime(seconds, { alwaysMMSS: true })
}

export default { formatTime, formatMMSS }