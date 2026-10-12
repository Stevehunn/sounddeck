// src/core/plugins/PluginManager/licenseManager.js
//
// Vérification et parsing des tokens de licence Pro.
//
// Un token a le format :  SDCK1.<payload_b64url>.<signature_b64url>
//
// Le payload est un JSON lisible en clair :
//   { v, tier, donorId, donorName, issuedAt, neverExpires }
//
// La signature Ed25519 garantit l'authenticité. Aucun appel réseau,
// aucune donnée machine — le token est 100% portable.

import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'
import { logWarn, logError } from '@shared/utils/logger'
import {
  PUBLIC_KEY_HEX,
  TOKEN_VERSION,
  TOKEN_PREFIX,
  LICENSE_TIERS,
  isValidPublicKeyConfigured,
} from './licenseKeys'
import { isDonorRevoked } from './revokedDonors'

// @noble/ed25519 v2 requiert un hash injecté
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))

// ─── Helpers base64url ─────────────────────────────────────────────────

function b64urlDecode(str) {
  if (typeof str !== 'string') return null
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
    const bin = atob(s)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch (e) {
    return null
  }
}

function hexToBytes(hex) {
  if (typeof hex !== 'string' || hex.length % 2 !== 0) return null
  try {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
    }
    return bytes
  } catch (e) {
    return null
  }
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}

// ─── API publique ──────────────────────────────────────────────────────

/**
 * Résultat d'une vérification de licence.
 * @typedef {Object} LicenseResult
 * @property {boolean} valid
 * @property {string}  [tier]         'free' | 'pro' | 'dev'
 * @property {number}  [rank]         Rang numérique pour comparaisons
 * @property {string}  [donorId]
 * @property {string}  [donorName]
 * @property {number}  [issuedAt]
 * @property {string}  [error]        Code d'erreur si invalide
 * @property {object}  [payload]      Payload brut (debug)
 */

/**
 * Vérifie un token de licence.
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

  // 3. Décodage
  const payloadBytes = b64urlDecode(payloadB64)
  const signature = b64urlDecode(signatureB64)
  const publicKey = hexToBytes(PUBLIC_KEY_HEX)

  if (!payloadBytes || !signature || !publicKey) {
    return { valid: false, tier: 'free', error: 'DECODE_ERROR' }
  }

  // 4. Vérification cryptographique
  let cryptoValid = false
  try {
    cryptoValid = await ed.verifyAsync(signature, payloadBytes, publicKey)
  } catch (e) {
    logWarn('licenseManager', 'Erreur vérification Ed25519', e)
    return { valid: false, tier: 'free', error: 'VERIFY_THREW' }
  }

  if (!cryptoValid) {
    return { valid: false, tier: 'free', error: 'INVALID_SIGNATURE' }
  }

  // 5. Parsing du payload
  const payloadJson = new TextDecoder().decode(payloadBytes)
  const payload = safeJsonParse(payloadJson)

  if (!payload || typeof payload !== 'object') {
    return { valid: false, tier: 'free', error: 'BAD_PAYLOAD' }
  }

  if (payload.v !== TOKEN_VERSION) {
    return { valid: false, tier: 'free', error: 'UNSUPPORTED_VERSION' }
  }

  // 6. Révocation
  if (payload.donorId && isDonorRevoked(payload.donorId)) {
    return {
      valid: false,
      tier: 'free',
      error: 'REVOKED',
      donorId: payload.donorId,
    }
  }

  // 7. Tier inconnu ?
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
 * Vérifie si un tier donné satisfait un tier minimum requis.
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
 * Retourne le tier par défaut si aucune licence (free).
 */
export function getDefaultTier() {
  return 'free'
}

export default {
  verifyLicense,
  meetsTier,
  getDefaultTier,
}