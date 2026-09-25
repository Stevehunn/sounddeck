// src/core/plugins/PluginManager/semver.js
import { logWarn } from '@shared/utils/logger'

function parse(v) {
  return String(v)
    .split('.')
    .map((n) => parseInt(n, 10) || 0)
}

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

export function checkCompatibility(pluginInfo, appVersion = '1.3.0') {
  if (!pluginInfo?.requires) return true
  if (!semverSatisfies(appVersion, pluginInfo.requires)) {
    logWarn(
      'PluginManager',
      `Plugin ${pluginInfo.id} requiert ${pluginInfo.requires}, version actuelle ${appVersion}`
    )
    return false
  }
  return true
}

export default { semverSatisfies, checkCompatibility }