/**
 * @file UUID v4 generator.
 *
 * Prefers `crypto.randomUUID()` (native, fast). Falls back to a Math.random
 * + timestamp implementation for older browsers / non-secure contexts.
 *
 * The optional `prefix` is prepended with a dash (`"clip"` → `"clip-<uuid>"`)
 * — used by the editor to distinguish clip / effect / track IDs.
 *
 * @see @shared/utils/audioContext.js (uses UUID for sound IDs)
 */

/**
 * Generates a UUID v4 (optionally prefixed).
 *
 * @param {string} [prefix='']
 * @returns {string}
 */
export function uuid(prefix = '') {
  let id
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    id = crypto.randomUUID()
  } else {
    // Fallback UUIDv4-like (Math.random + timestamp)
    id =
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
  }
  return prefix ? `${prefix}-${id}` : id
}

export default uuid