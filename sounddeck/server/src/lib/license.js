// server/src/lib/license.js
import { signLicense } from './crypto.js'

/**
 * Construit le payload de licence standard.
 */
export function buildLicensePayload({ donorId, donorName, tier = 'pro' }) {
  return {
    v: 1,
    tier,
    donorId,
    donorName: donorName || null,
    issuedAt: Math.floor(Date.now() / 1000),
    neverExpires: true,
  }
}

/**
 * Génère un token signé prêt à être envoyé à l'utilisateur.
 */
export async function generateLicenseToken({ donorId, donorName, tier, privateKeyHex }) {
  const payload = buildLicensePayload({ donorId, donorName, tier })
  return signLicense(payload, privateKeyHex)
}