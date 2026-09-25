// src/shared/utils/uuid.js
// ─────────────────────────────────────────────────────────────────────────────
// ✅ Générateur UUID canonique pour toute l'app.
// Préfère `crypto.randomUUID()` (natif, rapide), fallback UUIDv4-like.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Génère un UUID v4.
 * @param {string} [prefix] - Préfixe optionnel (ex: 'clip', 'effect', 'track')
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