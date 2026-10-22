/**
 * @file Dev-only logger with context tags.
 *
 * All loggers are silent in production (`import.meta.env.DEV === false`)
 * — the bundler strips them out completely (no-op functions after build).
 *
 * Each log takes a `context` tag (e.g. `"AudioService"`, `"PluginManager"`)
 * so DevTools filtering is easy.
 *
 * @see @shared/utils/errorHandler.js (persists errors in the store)
 */

const __DEV__ =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV

/**
 * Extracts a human-readable message from any error-like value.
 *
 * @param {Error|string|any} e
 * @returns {string}
 */
function getErrorMessage(e) {
  if (!e) return ''
  if (typeof e === 'string') return e
  if (e.message) return e.message
  return String(e)
}

/**
 * Logs an error (dev only, no-op in prod).
 *
 * @param {string} context - Module tag (e.g. `'AudioService'`).
 * @param {Error|string} error
 * @param {Object} [meta] - Extra debug data.
 * @returns {void}
 */
export function logError(context, error, meta = null) {
  if (!__DEV__) return
  const msg = getErrorMessage(error)
  if (meta) {
    console.error(`❌ [${context}] ${msg}`, meta, error)
  } else {
    console.error(`❌ [${context}] ${msg}`, error)
  }
}

/**
 * Logs a warning (dev only, no-op in prod).
 *
 * @param {string} context
 * @param {string} message
 * @param {Object} [meta]
 * @returns {void}
 */
export function logWarn(context, message, meta = null) {
  if (!__DEV__) return
  if (meta) {
    console.warn(`⚠️ [${context}] ${message}`, meta)
  } else {
    console.warn(`⚠️ [${context}] ${message}`)
  }
}

/**
 * Logs an informational message (dev only, no-op in prod).
 *
 * @param {string} context
 * @param {string} message
 * @param {Object} [meta]
 * @returns {void}
 */
export function logInfo(context, message, meta = null) {
  if (!__DEV__) return
  if (meta) {
    console.log(`ℹ️ [${context}] ${message}`, meta)
  } else {
    console.log(`ℹ️ [${context}] ${message}`)
  }
}

export default { logError, logWarn, logInfo }