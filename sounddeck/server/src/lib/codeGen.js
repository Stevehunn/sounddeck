/**
 * @file Redeem code generation and parsing.
 *
 * Redeem codes are 14 characters + hyphens in the format:
 *
 *   `SDCK-XXXX-XXXX-XXXX`
 *
 * where `X` is a character from a reduced alphabet that excludes visually
 * ambiguous characters (no I, L, O, 0, 1). This avoids typos when users
 * type the code manually or copy it from an email with mixed case.
 *
 * Entropy: 31 chars per position × 12 positions = ~59 bits, which is more
 * than enough for admin-issued codes (they're rate-limited, single-use,
 * and expire).
 */

// Reduced alphabet: no I, L, O, 0, 1 (visually ambiguous)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_PREFIX = "SDCK";
const GROUP_LEN = 4;
const GROUPS = 3;

/**
 * Generates a new redeem code in the format `SDCK-XXXX-XXXX-XXXX`.
 *
 * Uses `crypto.getRandomValues` for cryptographic randomness.
 *
 * @returns {string}
 *
 * @example
 * generateCode()  // → "SDCK-7HFG-9KM2-QWRT"
 */
export function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(GROUP_LEN * GROUPS));
  let out = CODE_PREFIX;
  for (let g = 0; g < GROUPS; g++) {
    let group = "";
    for (let i = 0; i < GROUP_LEN; i++) {
      group += ALPHABET[bytes[g * GROUP_LEN + i] % ALPHABET.length];
    }
    out += "-" + group;
  }
  return out;
}

/**
 * Checks that a string looks like a valid redeem code (format only).
 *
 * Does NOT check the database. Use this to reject obviously-wrong inputs
 * before making a DB call.
 *
 * The regex enforces:
 * - Prefix `SDCK`
 * - 3 groups of 4 chars from the reduced alphabet `A-HJ-NP-Z2-9`
 *   (i.e., A-Z except I/L/O, plus digits 2-9 except 0/1)
 *
 * @param {string} code
 * @returns {boolean}
 *
 * @example
 * isValidCodeFormat('SDCK-7HFG-9KM2-QWRT')  // → true
 * isValidCodeFormat('SDCK-1234-5678-9012')  // → false (contains 0, 1)
 */
export function isValidCodeFormat(code) {
  if (typeof code !== "string") return false;
  return /^SDCK-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(
    code,
  );
}

/**
 * Normalizes a redeem code: trims whitespace and uppercases it.
 *
 * Useful before storing or comparing codes, since users may paste codes
 * with extra spaces or lowercase letters.
 *
 * @param {string} code
 * @returns {string} Normalized code, or `''` if input isn't a string.
 *
 * @example
 * normalizeCode('  sdck-7hfg-9km2-qwrt  ')  // → "SDCK-7HFG-9KM2-QWRT"
 */
export function normalizeCode(code) {
  if (typeof code !== "string") return "";
  return code.trim().toUpperCase();
}

/**
 * Parses a duration string into a Unix timestamp (seconds).
 *
 * Supported units:
 * - `h` — hours
 * - `d` — days
 * - `m` — months (30 days)
 * - `y` — years (365 days)
 *
 * Special value: `"never"` → returns `null` (no expiry).
 *
 * @param {string} expiresIn - Duration like `"1h"`, `"7d"`, `"30d"`, `"1y"`, `"never"`.
 * @returns {number|null} Unix timestamp in seconds, or `null` for "never".
 * @throws {Error} If the format is invalid (not `{number}{unit}` and not "never").
 *
 * @example
 * parseExpiry('30d')    // → <now + 2592000>
 * parseExpiry('never')  // → null
 * parseExpiry('abc')    // → throws Error
 */
export function parseExpiry(expiresIn) {
  if (!expiresIn || expiresIn === "never") return null;

  const match = String(expiresIn).match(/^(\d+)([hdmy])$/);
  if (!match) {
    throw new Error(
      `Invalid expiresIn: "${expiresIn}". Format: 1h, 1d, 7d, 30d, 1y, never`,
    );
  }

  const n = parseInt(match[1], 10);
  const unit = match[2];
  const seconds = { h: 3600, d: 86400, m: 2592000, y: 31536000 }[unit];
  const now = Math.floor(Date.now() / 1000);

  return now + n * seconds;
}

export default { generateCode, isValidCodeFormat, normalizeCode, parseExpiry };
