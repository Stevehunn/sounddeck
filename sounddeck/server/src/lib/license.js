/**
 * @file License token generation for Pro licenses.
 *
 * A license token is a signed JWS-like string produced by `signLicense` in
 * `crypto.js`. It has the shape:
 *
 *   `SDCK1.<payload_b64url>.<signature_b64url>`
 *
 * The payload is a plain JSON object that the app can decode and verify
 * offline with the public key embedded in `licenseKeys.js`. It is NOT
 * encrypted — anyone can read it — only the signature proves authenticity.
 *
 * Since 1.4.13, the payload also carries `expiresAt` (Unix seconds) and
 * `neverExpires` (boolean) to distinguish:
 * - **Lifetime Pro** (`expiresAt: null`, `neverExpires: true`) — donors,
 *   redeem codes, admin-created accounts.
 * - **Trial Pro** (`expiresAt: <ts>`, `neverExpires: false`) — the 3-month
 *   trial activated on email verification.
 *
 * @see ./crypto.js (signLicense)
 * @see ../routes/login.js (called on login to issue a fresh token)
 */

import { signLicense } from "./crypto.js";

/**
 * Builds a standard license payload object.
 *
 * The payload format is version 1 (`v: 1`). If we ever need to change the
 * shape, bump `v` so the app can detect and handle old vs. new tokens.
 *
 * @param {Object} params
 * @param {string} params.donorId - Unique donor identifier.
 * @param {string|null} [params.donorName] - Display name (may be null).
 * @param {'pro'|'dev'} [params.tier='pro'] - License tier.
 * @param {number|null} [params.expiresAt=null]
 *   Unix seconds when the license expires. `null` = never (lifetime Pro).
 * @returns {{
 *   v: number,
 *   tier: 'pro'|'dev',
 *   donorId: string,
 *   donorName: string|null,
 *   issuedAt: number,
 *   neverExpires: boolean,
 *   expiresAt: number|null
 * }}
 */
export function buildLicensePayload({
  donorId,
  donorName,
  tier = "pro",
  expiresAt = null,
}) {
  return {
    v: 1,
    tier,
    donorId,
    donorName: donorName || null,
    issuedAt: Math.floor(Date.now() / 1000),
    neverExpires: expiresAt === null,
    expiresAt,
  };
}

/**
 * Generates a signed license token ready to be sent to the user.
 *
 * Wraps `buildLicensePayload` + `signLicense`. Returns the full token string.
 *
 * @param {Object} params
 * @param {string} params.donorId
 * @param {string|null} params.donorName
 * @param {'pro'|'dev'} [params.tier] - Default: 'pro' (via buildLicensePayload).
 * @param {number|null} [params.expiresAt=null] - Unix seconds or `null`
 *   for lifetime Pro.
 * @param {string} params.privateKeyHex - Ed25519 private key, 32 bytes hex (64 chars).
 * @returns {Promise<string>} Signed token: `SDCK1.xxx.yyy`.
 * @throws {Error} If `privateKeyHex` is missing or invalid.
 *
 * @example
 * // Lifetime Pro (donor / redeem code / admin)
 * const token = await generateLicenseToken({
 *   donorId: 'abc-123',
 *   donorName: 'Steve',
 *   tier: 'pro',
 *   expiresAt: null,
 *   privateKeyHex: env.PRIVATE_KEY_HEX,
 * })
 *
 * @example
 * // Trial Pro (3-month)
 * const token = await generateLicenseToken({
 *   donorId: 'abc-123',
 *   donorName: null,
 *   tier: 'pro',
 *   expiresAt: 1798761599, // 2027-01-31 23:59:59 UTC
 *   privateKeyHex: env.PRIVATE_KEY_HEX,
 * })
 */
export async function generateLicenseToken({
  donorId,
  donorName,
  tier,
  expiresAt = null,
  privateKeyHex,
}) {
  const payload = buildLicensePayload({ donorId, donorName, tier, expiresAt });
  return signLicense(payload, privateKeyHex);
}