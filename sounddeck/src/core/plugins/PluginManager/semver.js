/**
 * @file Minimal semver parser + comparison (no dependency).
 *
 * Supports `>=`, `<=`, `>`, `<`, `=` operators (no ranges, no `~`/`^`).
 * Used by plugin manifests (`requires: ">=1.3.0"`).
 */

import { logWarn } from '@shared/utils/logger'

/**
 * Parses a version string into numeric parts.
 * @param {string} v
 * @returns {number[]}
 */
function parse(v) {
  return String(v)
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
}

/**
 * Compares two version strings numerically.
 * @param {string} a
 * @param {string} b
 * @returns {number} Negative / zero / positive (a < b, a = b, a > b).
 */
function cmp(a, b) {
  const va = parse(a)
  const vb = parse(b)
  const len = Math.max(va.length, vb.length)
  for (let i = 0; i < len; i++) {
    const x = va[i] || 0
    const y = vb[i] || 0
    if (x !== y) return x - y
  }
  return 0
}

/**
 * Returns `true` if `version` satisfies `requirement`.
 *
 * @param {string} version
 * @param {string} requirement - E.g. `">=1.3.0"`.
 * @returns {boolean}
 */
export function semverSatisfies(version, requirement) {
  const match = String(requirement).match(/^(>=|<=|>|<|=)?\s*(.+)$/)
  if (!match) return false
  const op = match[1] || '='
  const reqVersion = match[2].trim()
  const c = cmp(version, reqVersion)

  switch (op) {
    case '>=':
      return c >= 0
    case '>':
      return c > 0
    case '<=':
      return c <= 0
    case '<':
      return c < 0
    case '=':
    default:
      return c === 0
  }
}

/**
 * Checks that the current app version satisfies the plugin's `requires`.
 *
 * @param {Object} pluginInfo
 * @param {string} [appVersion='1.3.0']
 * @returns {boolean}
 */
export function checkCompatibility(pluginInfo, appVersion = '1.3.0') {
  if (!pluginInfo?.requires) return true
  if (!semverSatisfies(appVersion, pluginInfo.requires)) {
    logWarn(
      'PluginManager',
      `Plugin ${pluginInfo.id} requires ${pluginInfo.requires}, current version ${appVersion}`
    )
    return false
  }
  return true
}

export default { semverSatisfies, checkCompatibility }