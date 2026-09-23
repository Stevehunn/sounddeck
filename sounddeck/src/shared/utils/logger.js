// src/shared/utils/logger.js

const __DEV__ =
  typeof import.meta !== 'undefined' && import.meta.env?.DEV

/**
 * Extrait un message lisible d'une erreur.
 */
function getErrorMessage(e) {
  if (!e) return ''
  if (typeof e === 'string') return e
  if (e.message) return e.message
  return String(e)
}

/**
 * Log une erreur (DEV uniquement, silencieux en prod).
 * @param {string} context - ex: 'AudioService', 'PluginManager'
 * @param {Error|string} error
 * @param {Object} [meta] - données complémentaires
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
 * Log un avertissement (DEV uniquement).
 * @param {string} context
 * @param {string} message
 * @param {Object} [meta]
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
 * Log info (DEV uniquement).
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