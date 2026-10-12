// server/src/lib/codeGen.js

// Alphabet sans caractères ambigus (pas de I, L, O, 0, 1)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_PREFIX = 'SDCK'
const GROUP_LEN = 4
const GROUPS = 3

/**
 * Génère un code au format SDCK-XXXX-XXXX-XXXX.
 * @returns {string}
 */
export function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(GROUP_LEN * GROUPS))
  let out = CODE_PREFIX
  for (let g = 0; g < GROUPS; g++) {
    let group = ''
    for (let i = 0; i < GROUP_LEN; i++) {
      group += ALPHABET[bytes[g * GROUP_LEN + i] % ALPHABET.length]
    }
    out += '-' + group
  }
  return out
}

/**
 * Valide le format d'un code (sans toucher à la base).
 * @param {string} code
 * @returns {boolean}
 */
export function isValidCodeFormat(code) {
  if (typeof code !== 'string') return false
  return /^SDCK-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code)
}

/**
 * Normalise un code (uppercase, trim).
 */
export function normalizeCode(code) {
  if (typeof code !== 'string') return ''
  return code.trim().toUpperCase()
}

/**
 * Parse une durée "30d", "1y", "1h", "never".
 * @returns {number|null} Timestamp Unix (secondes) ou null pour "never"
 */
export function parseExpiry(expiresIn) {
  if (!expiresIn || expiresIn === 'never') return null

  const match = String(expiresIn).match(/^(\d+)([hdmy])$/)
  if (!match) {
    throw new Error(`expiresIn invalide : "${expiresIn}". Format : 1h, 1d, 7d, 30d, 1y, never`)
  }

  const n = parseInt(match[1], 10)
  const unit = match[2]
  const seconds = { h: 3600, d: 86400, m: 2592000, y: 31536000 }[unit]
  const now = Math.floor(Date.now() / 1000)

  return now + n * seconds
}

export default { generateCode, isValidCodeFormat, normalizeCode, parseExpiry }