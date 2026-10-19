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
 * This module is a thin wrapper that:
 * - Builds the standard payload (`buildLicensePayload`)
 * - Signs it with the operator's Ed25519 private key (`generateLicenseToken`)
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
 * @returns {{
 *   v: number,
 *   tier: 'pro'|'dev',
 *   donorId: string,
 *   donorName: string|null,
 *   issuedAt: number,
 *   neverExpires: boolean
 * }}
 */
export function buildLicensePayload({ donorId, donorName, tier = "pro" }) {
  return {
    v: 1,
    tier,
    donorId,
    donorName: donorName || null,
    issuedAt: Math.floor(Date.now() / 1000),
    neverExpires: true,
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
 * @param {string} params.privateKeyHex - Ed25519 private key, 32 bytes hex (64 chars).
 * @returns {Promise<string>} Signed token: `SDCK1.xxx.yyy`.
 * @throws {Error} If `privateKeyHex` is missing or invalid.
 *
 * @example
 * const token = await generateLicenseToken({
 *   donorId: 'abc-123',
 *   donorName: 'Steve',
 *   tier: 'pro',
 *   privateKeyHex: env.PRIVATE_KEY_HEX,
 * })
 */
export async function generateLicenseToken({
  donorId,
  donorName,
  tier,
  privateKeyHex,
}) {
  const payload = buildLicensePayload({ donorId, donorName, tier });
  return signLicense(payload, privateKeyHex);
}
