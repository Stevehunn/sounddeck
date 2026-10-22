/**
 * @file Public key + license tier definitions.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ ⚠️  NEVER PUT THE PRIVATE KEY HERE                                │
 * │                                                                  │
 * │ The private key lives ONLY in:                                   │
 * │   ~/.sounddeck/keys/private.key                                  │
 * │                                                                  │
 * │ It is NEVER committed, NEVER shared, NEVER bundled in the app.   │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * To generate the keypair (once):
 *   node scripts/generate-keypair.mjs
 *
 * Then paste the printed PUBLIC key (hex) below.
 */

export const PUBLIC_KEY_HEX =
  '002808c99f6a702a28eff5ad541e2cf8206b1a84853c14c19dcaba8256a82ade'

// Supported token format version
export const TOKEN_VERSION = 1
export const TOKEN_PREFIX = 'SDCK1'

// Tier definitions
export const LICENSE_TIERS = {
  free: { rank: 0, label: 'Free' },
  pro: { rank: 10, label: 'Pro' },
  dev: { rank: 99, label: 'Dev' },
}

/**
 * Returns `true` if the public key looks like a valid 32-byte hex string.
 * @returns {boolean}
 */
export function isValidPublicKeyConfigured() {
  return (
    typeof PUBLIC_KEY_HEX === 'string' &&
    PUBLIC_KEY_HEX.length === 64 &&
    /^[0-9a-f]+$/i.test(PUBLIC_KEY_HEX)
  )
}

export default {
  PUBLIC_KEY_HEX,
  TOKEN_VERSION,
  TOKEN_PREFIX,
  LICENSE_TIERS,
  isValidPublicKeyConfigured,
}