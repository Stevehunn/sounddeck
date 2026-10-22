/**
 * @file License token verification + tier comparison.
 *
 * A license token has the shape:
 *
 *   `SDCK1.<payload_base64url>.<signature_base64url>`
 *
 * The payload is plain JSON (readable, non-secret):
 *
 *   `{ v, tier, donorId, donorName, issuedAt, neverExpires }`
 *
 * The Ed25519 signature guarantees authenticity. No network call, no
 * machine binding — the token is 100% portable.
 *
 * @see ./licenseKeys.js — the public key + tier definitions
 * @see ./revokedDonors.js — revoked donor list
 * @see @core/services/LicenseService.js — storage + activation
 */

import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import { logWarn } from '@shared/utils/logger'
import {
  PUBLIC_KEY_HEX,
  TOKEN_VERSION,
  TOKEN_PREFIX,
  LICENSE_TIERS,
  isValidPublicKeyConfigured,
} from './licenseKeys'
import { isDonorRevoked } from './revokedDonors'

// @noble/ed25519 v2 requires an injected hash function
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))

// ─── base64url helpers ────────────────────────────────────────────────

/**
 * Decodes a base64url string to bytes.
 * @param {string} str
 * @returns {Uint8Array|null} `null` on invalid input.
 */
function b64urlDecode(str) {
  if (typeof str !== 'string') return null
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
    const bin = atob(s)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/**
 * Converts a hex string to bytes.
 * @param {string} hex
 * @returns {Uint8Array|null} `null` on invalid input.
 */
function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) return null
  try {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
    }
    return bytes
  } catch {
    return null
  }
}

/**
 * Safely parses a JSON string.
 * @param {string} str
 * @returns {Object|null} `null` on invalid input.
 */
function safeJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

// ─── PUBLIC API ────────────────────────────────────────────────────────

/**
 * Result of a license verification.
 * @typedef {Object} LicenseResult
 * @property {boolean} valid
 * @property {string}  [tier]       'free' | 'pro' | 'dev'
 * @property {number}  [rank]       Numeric rank for comparisons
 * @property {string}  [donorId]
 * @property {string}  [donorName]
 * @property {number}  [issuedAt]
 * @property {string}  [error]      Error code if invalid
 * @property {Object}  [payload]    Raw payload (debug)
 */

/**
 * Verifies a license token.
 *
 * @param {string} token
 * @returns {Promise<LicenseResult>}
 */
export async function verifyLicense(token) {
  // 1. Config check
  if (!isValidPublicKeyConfigured()) {
    return {
      valid: false,
      tier: 'free',
      error: 'PUBLIC_KEY_NOT_CONFIGURED',
    }
  }

  // 2. Format check
  if (!token || typeof token !== 'string') {
    return { valid: false, tier: 'free', error: 'MISSING_TOKEN' }
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return { valid: false, tier: 'free', error: 'MALFORMED_TOKEN' }
  }

  const [prefix, payloadB64, signatureB64] = parts
  if (prefix !== TOKEN_PREFIX) {
    return { valid: false, tier: 'free', error: 'WRONG_PREFIX' }
  }

  // 3. Decode
  const payloadBytes = b64urlDecode(payloadB64)
  const signature = b64urlDecode(signatureB64)
  const publicKey = hexToBytes(PUBLIC_KEY_HEX)

  if (!payloadBytes || !signature || !publicKey) {
    return { valid: false, tier: 'free', error: 'DECODE_ERROR' }
  }

  // 4. Cryptographic verification
  let cryptoValid
  try {
    cryptoValid = await ed.verifyAsync(signature, payloadBytes, publicKey)
  } catch (e) {
    logWarn('licenseManager', 'Ed25519 verification error', e)
    return { valid: false, tier: 'free', error: 'VERIFY_THREW' }
  }

  if (!cryptoValid) {
    return { valid: false, tier: 'free', error: 'INVALID_SIGNATURE' }
  }

  // 5. Payload parsing
  const payloadJson = new TextDecoder().decode(payloadBytes)
  const payload = safeJsonParse(payloadJson)

  if (!payload || typeof payload !== 'object') {
    return { valid: false, tier: 'free', error: 'BAD_PAYLOAD' }
  }

  if (payload.v !== TOKEN_VERSION) {
    return { valid: false, tier: 'free', error: 'UNSUPPORTED_VERSION' }
  }

  // 6. Revocation
  if (payload.donorId && isDonorRevoked(payload.donorId)) {
    return {
      valid: false,
      tier: 'free',
      error: 'REVOKED',
      donorId: payload.donorId,
    }
  }

  // 7. Unknown tier?
  const tierInfo = LICENSE_TIERS[payload.tier]
  if (!tierInfo) {
    return { valid: false, tier: 'free', error: 'UNKNOWN_TIER' }
  }

  return {
    valid: true,
    tier: payload.tier,
    rank: tierInfo.rank,
    donorId: payload.donorId,
    donorName: payload.donorName || null,
    issuedAt: payload.issuedAt,
    payload,
  }
}

/**
 * Returns `true` if `userTier` meets or exceeds `requiredTier`.
 *
 * @param {string} userTier
 * @param {string} requiredTier
 * @returns {boolean}
 */
export function meetsTier(userTier, requiredTier) {
  const u = LICENSE_TIERS[userTier]?.rank ?? 0
  const r = LICENSE_TIERS[requiredTier]?.rank ?? 0
  return u >= r
}

/**
 * Returns the default tier (no license → free).
 * @returns {'free'}
 */
export function getDefaultTier() {
  return 'free'
}

export default {
  verifyLicense,
  meetsTier,
  getDefaultTier,
}