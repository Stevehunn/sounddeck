/**
 * @file Crypto primitives for the SoundDeck worker.
 *
 * Provides three independent groups of helpers:
 *
 * 1. Ed25519 signatures — used to sign Pro license tokens offline. The
 *    private key NEVER leaves the operator's machine; only the public key
 *    is embedded in the app (`licenseKeys.js`). See `signLicense`.
 *
 * 2. Password hashing — PBKDF2-HMAC-SHA256, 100 000 iterations (Cloudflare
 *    Workers cap for `crypto.subtle`). All passwords are stored as a
 *    `{hash, salt}` pair of hex strings. See `hashPassword` / `verifyPassword`.
 *
 * 3. HMAC-SHA256 — used to verify webhook signatures from Stripe and
 *    GitHub Sponsors. Comparisons are constant-time. See `verifyStripeSignature`
 *    and `verifyGitHubSignature`.
 *
 * @see https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
 * @see https://www.npmjs.com/package/@noble/ed25519
 */

import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// @noble/ed25519 v2 requires an injected SHA-512 implementation
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// ═══════════════════════════════════════════════════════════════════════════
// HEX / BASE64 HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converts a hex string to a `Uint8Array` with strict validation.
 *
 * @param {string} hex
 * @param {number} [expectedBytes] - If provided, throws if the decoded length
 *   doesn't match (defensive against malformed keys).
 * @returns {Uint8Array}
 * @throws {Error} If the input is not a valid hex string, has an odd length,
 *   or doesn't match `expectedBytes`.
 */
function hexToBytes(hex, expectedBytes) {
  if (typeof hex !== "string") {
    throw new Error(`hexToBytes: expected a string, got ${typeof hex}`);
  }

  const clean = hex.trim();

  if (clean.length === 0) {
    throw new Error("hexToBytes: empty string");
  }

  if (!/^[0-9a-f]+$/i.test(clean)) {
    throw new Error(
      `hexToBytes: non-hex character detected (length=${clean.length}, start="${clean.slice(0, 16)}…")`,
    );
  }

  if (clean.length % 2 !== 0) {
    throw new Error(
      `hexToBytes: odd length (${clean.length}), expected a multiple of 2`,
    );
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }

  if (expectedBytes !== undefined && bytes.length !== expectedBytes) {
    throw new Error(
      `hexToBytes: invalid size. Expected ${expectedBytes} bytes (${expectedBytes * 2} chars), got ${bytes.length} bytes (${clean.length} chars)`,
    );
  }

  return bytes;
}

/**
 * Encodes a `Uint8Array` to base64url (URL-safe base64, no padding).
 * Compatible with both Cloudflare Workers and Node.js.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function b64url(bytes) {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Converts a `Uint8Array` to a lowercase hex string.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ═══════════════════════════════════════════════════════════════════════════
// ED25519 — LICENSE TOKEN SIGNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Signs a license payload with the operator's Ed25519 private key.
 *
 * The resulting token has the format:
 *
 *   `SDCK1.<payload_b64url>.<signature_b64url>`
 *
 * The payload is a plain JSON object (not encrypted — just signed). Anyone
 * can read it; only the operator can produce a valid signature.
 *
 * @param {Object} payload - License payload.
 * @param {number} payload.v - Format version (currently 1).
 * @param {'pro'|'dev'} payload.tier - License tier.
 * @param {string} payload.donorId - Unique donor identifier.
 * @param {string|null} payload.donorName - Display name (may be null).
 * @param {number} payload.issuedAt - Unix timestamp (seconds).
 * @param {boolean} payload.neverExpires - Currently always true.
 * @param {string} privateKeyHex - Ed25519 private key, 32 bytes hex (64 chars).
 * @returns {Promise<string>} The signed license token.
 * @throws {Error} If `privateKeyHex` is missing or invalid.
 *
 * @example
 * const token = await signLicense(
 *   { v: 1, tier: 'pro', donorId: 'abc', donorName: 'Steve', issuedAt: 1700000000, neverExpires: true },
 *   process.env.PRIVATE_KEY_HEX
 * )
 * // → "SDCK1.eyJ2IjoxLCJ0aWVyIjoicHJvIi...<sig>"
 */
export async function signLicense(payload, privateKeyHex) {
  if (!privateKeyHex) {
    throw new Error(
      "signLicense: PRIVATE_KEY_HEX missing. " +
        "Check your .dev.vars (dev) or your wrangler secrets (prod).",
    );
  }

  // Strict validation: 32 bytes = 64 chars hex
  const privateKey = hexToBytes(privateKeyHex, 32);

  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const signature = await ed.signAsync(payloadBytes, privateKey);

  return `SDCK1.${b64url(payloadBytes)}.${b64url(signature)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD HASHING — PBKDF2-HMAC-SHA256
// ═══════════════════════════════════════════════════════════════════════════

// ⚠️ Cloudflare Workers caps PBKDF2 at 100 000 iterations
// (runtime `crypto.subtle` limitation). We tune accordingly.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LEN = 32; // 32 bytes = 256 bits
const PBKDF2_SALT_LEN = 16; // 16 bytes

/**
 * Hashes a password with PBKDF2-HMAC-SHA256 and a random 16-byte salt.
 *
 * Returns both values as hex strings — store them together in the `users`
 * table (`password_hash` + `password_salt` columns).
 *
 * @param {string} password - Plaintext password (non-empty).
 * @returns {Promise<{hash: string, salt: string}>} Hex-encoded hash and salt.
 * @throws {Error} If `password` is empty or invalid.
 */
export async function hashPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("hashPassword: password is empty or invalid");
  }

  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LEN));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    PBKDF2_KEY_LEN * 8,
  );

  return {
    hash: bytesToHex(new Uint8Array(bits)),
    salt: bytesToHex(salt),
  };
}

/**
 * Verifies a plaintext password against a stored hash + salt.
 *
 * The comparison is constant-time (no early return on partial match) to
 * prevent timing attacks.
 *
 * @param {string} password - Plaintext password from the login form.
 * @param {string} hashHex - Hex-encoded hash from the DB.
 * @param {string} saltHex - Hex-encoded salt from the DB.
 * @returns {Promise<boolean>} `true` if the password matches.
 */
export async function verifyPassword(password, hashHex, saltHex) {
  if (typeof password !== "string" || password.length === 0) return false;
  if (typeof hashHex !== "string" || typeof saltHex !== "string") return false;

  // Strict validation: salt must be 16 bytes
  let salt;
  try {
    salt = hexToBytes(saltHex, PBKDF2_SALT_LEN);
  } catch (e) {
    console.error("verifyPassword: invalid salt —", e.message);
    return false;
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    PBKDF2_KEY_LEN * 8,
  );

  const computed = bytesToHex(new Uint8Array(bits));

  // Constant-time comparison (avoids timing attacks)
  if (computed.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a random 16-character password.
 *
 * Uses a restricted alphabet (no `0/O/1/l/I`) for readability when the
 * user has to type or copy the password manually.
 *
 * @returns {string}
 */
export function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/**
 * Returns a v4 UUID.
 *
 * Wrapper around `crypto.randomUUID()` so callers don't need to know the
 * runtime specifics.
 *
 * @returns {string}
 */
export function uuid() {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK SIGNATURES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verifies a Stripe webhook signature (`Stripe-Signature` header).
 *
 * Stripe's format: `t=timestamp,v1=sig1,v1=sig2,...`. We reconstruct the
 * signed payload as `${timestamp}.${body}`, recompute HMAC-SHA256 with the
 * webhook secret, and compare in constant-time against each `v1` signature.
 *
 * Also enforces a tolerance window (default 5 minutes) to prevent replay
 * attacks.
 *
 * @param {string} payloadBody - Raw request body (string, NOT parsed JSON).
 * @param {string} signatureHeader - Value of the `Stripe-Signature` header.
 * @param {string} secret - Webhook signing secret (`whsec_...`).
 * @param {number} [toleranceSec=300] - Max accepted clock skew, in seconds.
 * @returns {Promise<boolean>} `true` if at least one `v1` signature matches.
 *
 * @see https://stripe.com/docs/webhooks/signatures
 */
export async function verifyStripeSignature(
  payloadBody,
  signatureHeader,
  secret,
  toleranceSec = 300,
) {
  if (!signatureHeader || !secret) return false;

  // Format: "t=timestamp,v1=sig1,v1=sig2,..."
  const parts = signatureHeader.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    if (!acc[key]) acc[key] = [];
    acc[key].push(value);
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  if (!timestamp) return false;

  // Enforce the time window (replay protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > toleranceSec) return false;

  const signedPayload = `${timestamp}.${payloadBody}`;
  const expected = await hmacSHA256Hex(secret, signedPayload);

  // Constant-time compare against every v1 signature
  const signatures = parts.v1 || [];
  for (const sig of signatures) {
    if (constantTimeEqual(sig, expected)) return true;
  }
  return false;
}

/**
 * Verifies a GitHub webhook signature (`X-Hub-Signature-256` header).
 *
 * GitHub's format: `sha256=<hex>`. We compute HMAC-SHA256 of the raw body
 * with the webhook secret and compare in constant-time.
 *
 * @param {string} payloadBody - Raw request body (string, NOT parsed JSON).
 * @param {string} signatureHeader - Value of the `X-Hub-Signature-256` header.
 * @param {string} secret - Webhook secret configured on GitHub.
 * @returns {Promise<boolean>}
 *
 * @see https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks
 */
export async function verifyGitHubSignature(
  payloadBody,
  signatureHeader,
  secret,
) {
  if (!signatureHeader || !secret) return false;
  if (!signatureHeader.startsWith("sha256=")) return false;

  const expected = signatureHeader.slice(7).toLowerCase();
  const actual = await hmacSHA256Hex(secret, payloadBody);
  return constantTimeEqual(expected, actual);
}

/**
 * Computes the HMAC-SHA256 of `data` with `secret`, returns hex.
 *
 * @param {string} secret
 * @param {string} data
 * @returns {Promise<string>} Hex-encoded digest.
 */
async function hmacSHA256Hex(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return bytesToHex(new Uint8Array(sig));
}

/**
 * Constant-time string comparison. Returns `true` only if `a === b`.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Exported for informational purposes (display in admin UI, diagnostics).
 * Do NOT change this value without bumping existing password hashes.
 */
export const PBKDF2_ITERATIONS_FOR_DISPLAY = PBKDF2_ITERATIONS;
