/**
 * @file Revoked donor IDs.
 *
 * Usage: if a user shares their key too widely and you want to revoke it,
 * add their donorId here and bump the app version. All users with that key
 * will lose Pro access at next update.
 *
 * ⚠️ This is a "soft revocation" — users who skip updates keep access.
 * For real revocation, an online check would be required (out of scope).
 */

export const REVOKED_DONOR_IDS = new Set([
  // 'exemple-uuid-here',
])

/**
 * Returns `true` if the given donor ID is revoked.
 * @param {string} donorId
 * @returns {boolean}
 */
export function isDonorRevoked(donorId) {
  return REVOKED_DONOR_IDS.has(donorId)
}

export default { REVOKED_DONOR_IDS, isDonorRevoked }