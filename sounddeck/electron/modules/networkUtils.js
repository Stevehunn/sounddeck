// electron/modules/networkUtils.js
// Helper partagé pour normaliser les erreurs réseau (DNS, timeout, etc.)
// Utilisé par ipcHandlers.js et fileHandlers.js.

const NETWORK_ERROR_PATTERNS = [
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ENETDOWN',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
  'getaddrinfo',
  'Failed to resolve',
  'network is unreachable',
  'no such host',
  'Temporary failure in name resolution',
  'Name or service not known',
  'Could not resolve host',
]

/**
 * Retourne 'NETWORK_ERROR' ou 'NETWORK_TIMEOUT' si l'erreur est réseau,
 * sinon null.
 *
 * @param {Error|string} err
 * @returns {'NETWORK_ERROR'|'NETWORK_TIMEOUT'|null}
 */
function normalizeNetworkError(err) {
  const msg = String(err?.message || err || '')
  if (!msg) return null

  const lower = msg.toLowerCase()

  for (const pattern of NETWORK_ERROR_PATTERNS) {
    if (msg.includes(pattern) || lower.includes(pattern.toLowerCase())) {
      return 'NETWORK_ERROR'
    }
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'NETWORK_TIMEOUT'
  }

  return null
}

/**
 * Renvoie true si l'erreur est une erreur réseau.
 * @param err
 */
function isNetworkError(err) {
  return normalizeNetworkError(err) !== null
}

module.exports = {
  normalizeNetworkError,
  isNetworkError,
  NETWORK_ERROR_PATTERNS,
}