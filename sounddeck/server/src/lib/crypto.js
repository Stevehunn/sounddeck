// server/src/lib/crypto.js
import * as ed from '@noble/ed25519'
import { sha512 } from '@noble/hashes/sha512'

// @noble/ed25519 v2 requiert un hash injecté
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m))

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Convertit une string hex en Uint8Array avec validation stricte.
 * @param {string} hex
 * @param {number} [expectedBytes]  Taille attendue en octets (validation)
 * @returns {Uint8Array}
 */
function hexToBytes(hex, expectedBytes) {
  if (typeof hex !== 'string') {
    throw new Error(
      `hexToBytes: attendu une string, reçu ${typeof hex}`
    )
  }

  const clean = hex.trim()

  if (clean.length === 0) {
    throw new Error('hexToBytes: chaîne vide')
  }

  if (!/^[0-9a-f]+$/i.test(clean)) {
    throw new Error(
      `hexToBytes: caractère non-hex détecté (longueur=${clean.length}, début="${clean.slice(0, 16)}…")`
    )
  }

  if (clean.length % 2 !== 0) {
    throw new Error(
      `hexToBytes: longueur impaire (${clean.length}), attendu un multiple de 2`
    )
  }

  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16)
  }

  if (expectedBytes !== undefined && bytes.length !== expectedBytes) {
    throw new Error(
      `hexToBytes: taille invalide. Attendu ${expectedBytes} octets (${expectedBytes * 2} chars), reçu ${bytes.length} octets (${clean.length} chars)`
    )
  }

  return bytes
}

/**
 * Encode un Uint8Array en base64url (compatible Workers + Node).
 */
function b64url(bytes) {
  const bin = String.fromCharCode(...bytes)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Convertit un Uint8Array en hex string.
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ═══════════════════════════════════════════════════════════════════════
// ED25519 : SIGNATURE DE LICENCE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Signe un payload de licence avec la clé privée Ed25519.
 *
 * @param {object} payload  { v, tier, donorId, donorName, issuedAt, neverExpires }
 * @param {string} privateKeyHex  Clé privée (32 octets = 64 chars hex)
 * @returns {Promise<string>}  Token au format "SDCK1.<payload_b64url>.<sig_b64url>"
 */
export async function signLicense(payload, privateKeyHex) {
  if (!privateKeyHex) {
    throw new Error(
      'signLicense: PRIVATE_KEY_HEX manquant. ' +
        'Vérifie ton .dev.vars (dev) ou tes wrangler secrets (prod).'
    )
  }

  // ✅ Validation stricte : 32 octets = 64 chars hex
  const privateKey = hexToBytes(privateKeyHex, 32)

  const payloadJson = JSON.stringify(payload)
  const payloadBytes = new TextEncoder().encode(payloadJson)
  const signature = await ed.signAsync(payloadBytes, privateKey)

  return `SDCK1.${b64url(payloadBytes)}.${b64url(signature)}`
}

// ═══════════════════════════════════════════════════════════════════════
// PASSWORD HASHING (PBKDF2-HMAC-SHA256, 600k itérations)
// ═══════════════════════════════════════════════════════════════════════

// ⚠️ Cloudflare Workers limite PBKDF2 à 100 000 itérations max
// (limite du runtime `crypto.subtle`). On adapte en conséquence.
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEY_LEN = 32 // 32 octets = 256 bits
const PBKDF2_SALT_LEN = 16 // 16 octets

/**
 * Hash un password avec PBKDF2 + salt aléatoire.
 * @param {string} password
 * @returns {Promise<{hash: string, salt: string}>}  Hex strings
 */
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('hashPassword: password vide ou invalide')
  }

  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LEN))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LEN * 8
  )

  return {
    hash: bytesToHex(new Uint8Array(bits)),
    salt: bytesToHex(salt),
  }
}

/**
 * Vérifie un password contre un hash + salt.
 * @param {string} password
 * @param {string} hashHex  Hash attendu (64 chars)
 * @param {string} saltHex  Salt (32 chars)
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hashHex, saltHex) {
  if (typeof password !== 'string' || password.length === 0) return false
  if (typeof hashHex !== 'string' || typeof saltHex !== 'string') return false

  // ✅ Validation stricte : salt = 16 octets
  let salt
  try {
    salt = hexToBytes(saltHex, PBKDF2_SALT_LEN)
  } catch (e) {
    console.error('verifyPassword: salt invalide —', e.message)
    return false
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LEN * 8
  )

  const computed = bytesToHex(new Uint8Array(bits))

  // Comparaison à temps constant (évite les timing attacks)
  if (computed.length !== hashHex.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hashHex.charCodeAt(i)
  }
  return diff === 0
}

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Génère un mot de passe aléatoire lisible (16 chars, alphanumérique sans ambigus).
 */
export function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('')
}

/**
 * Génère un UUID v4.
 */
export function uuid() {
  return crypto.randomUUID()
}

// ═══════════════════════════════════════════════════════════════════════
// STRIPE WEBHOOK SIGNATURE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Vérifie la signature Stripe sur un webhook.
 * @param {string} payloadBody   Corps brut de la requête (string)
 * @param {string} signatureHeader  Header "stripe-signature"
 * @param {string} secret           Secret webhook (whsec_...)
 * @param {number} toleranceSec     Tolérance (5 min par défaut)
 * @returns {Promise<boolean>}
 */
export async function verifyStripeSignature(
  payloadBody,
  signatureHeader,
  secret,
  toleranceSec = 300
) {
  if (!signatureHeader || !secret) return false

  // Format : "t=timestamp,v1=sig1,v1=sig2,..."
  const parts = signatureHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=')
    if (!acc[key]) acc[key] = []
    acc[key].push(value)
    return acc
  }, {})

  const timestamp = parts.t?.[0]
  if (!timestamp) return false

  // Vérifie la fenêtre temporelle (protection contre le replay)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > toleranceSec) return false

  const signedPayload = `${timestamp}.${payloadBody}`
  const expected = await hmacSHA256Hex(secret, signedPayload)

  // Comparaison à temps constant avec toutes les signatures v1
  const signatures = parts.v1 || []
  for (const sig of signatures) {
    if (constantTimeEqual(sig, expected)) return true
  }
  return false
}

async function hmacSHA256Hex(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  )
  return bytesToHex(new Uint8Array(sig))
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export const PBKDF2_ITERATIONS_FOR_DISPLAY = PBKDF2_ITERATIONS