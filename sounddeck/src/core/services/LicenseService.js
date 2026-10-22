/**
 * @file High-level license management (Pro tier).
 *
 * While `licenseManager` only *verifies* a token, this service owns the
 * full lifecycle:
 * - **Storage** — the token and email are persisted in electron-store.
 * - **Activation** — validates a token, saves it, refreshes the cached
 *   status.
 * - **Sign-out** — clears the email but keeps the token (so the user
 *   stays Pro on this machine, only the display name disappears).
 * - **Revocation** — clears both the token and email (destructive).
 * - **Caching** — `getStatus()` caches the result; `getStatus(true)` or
 *   `invalidateCache()` bypasses it.
 *
 * @see @core/plugins/PluginManager/licenseManager.js (verification)
 * @see @core/plugins/PluginManager/licenseKeys.js (tier definitions)
 * @see @core/store/hooks/useLicense.js (React wrapper)
 */

import { logWarn, logError, logInfo } from '@shared/utils/logger'
import { verifyLicense } from '@core/plugins/PluginManager/licenseManager'

const STORE_KEY_TOKEN = 'licenseToken'
const STORE_KEY_EMAIL = 'licenseEmail'

let cachedStatus = null

/**
 * Builds a "free tier" status object.
 *
 * @param {string|null} [error=null] - Verification error code, if any.
 * @returns {Object}
 */
function buildFreeStatus(error = null) {
  return {
    valid: false,
    tier: 'free',
    rank: 0,
    donorId: null,
    donorName: null,
    email: null,
    issuedAt: null,
    error,
  }
}

/**
 * Returns the current license status (cached unless `force` is `true`).
 *
 * @param {boolean} [force=false] - Bypass the cache.
 * @returns {Promise<{
 *   valid: boolean,
 *   tier: 'free'|'pro'|'dev',
 *   rank: number,
 *   donorId: string|null,
 *   donorName: string|null,
 *   email: string|null,
 *   issuedAt: number|null,
 *   error: string|null,
 * }>}
 */
export async function getStatus(force = false) {
  if (cachedStatus && !force) return cachedStatus

  try {
    const token = await window.electronAPI?.storeGet?.(STORE_KEY_TOKEN)
    const email = await window.electronAPI?.storeGet?.(STORE_KEY_EMAIL)

    if (!token) {
      cachedStatus = buildFreeStatus(null)
      return cachedStatus
    }

    const result = await verifyLicense(token)

    if (!result.valid) {
      cachedStatus = { ...buildFreeStatus(result.error), email: email || null }
      return cachedStatus
    }

    cachedStatus = {
      valid: true,
      tier: result.tier,
      rank: result.rank,
      donorId: result.donorId || null,
      donorName: result.donorName || null,
      email: email || null,
      issuedAt: result.issuedAt || null,
      error: null,
    }
    return cachedStatus
  } catch (e) {
    logError('LicenseService', 'getStatus error', e)
    cachedStatus = buildFreeStatus('INTERNAL_ERROR')
    return cachedStatus
  }
}

/**
 * Activates a license token.
 *
 * @param {string} token - Raw token (whitespace is stripped).
 * @param {string|null} [email=null] - Optional email to associate.
 * @returns {Promise<{success: boolean, error?: string, status?: Object}>}
 */
export async function activate(token, email = null) {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'MISSING_TOKEN' }
  }

  const cleanToken = token.trim().replace(/\s+/g, '')

  const result = await verifyLicense(cleanToken)
  if (!result.valid) {
    return { success: false, error: result.error }
  }

  try {
    await window.electronAPI?.storeSet?.(STORE_KEY_TOKEN, cleanToken)
    if (email) {
      await window.electronAPI?.storeSet?.(STORE_KEY_EMAIL, email)
    }
    logInfo('LicenseService', `License activated: tier=${result.tier}`)
  } catch (e) {
    logError('LicenseService', 'License persistence error', e)
    return { success: false, error: 'STORE_ERROR' }
  }

  cachedStatus = null
  const status = await getStatus(true)
  return { success: true, status }
}

/**
 * Signs out (removes the email but keeps the token).
 *
 * @returns {Promise<Object>} The refreshed status.
 */
export async function logout() {
  try {
    await window.electronAPI?.storeSet?.(STORE_KEY_EMAIL, null)
    logInfo('LicenseService', 'Logout: email cleared (token kept)')
  } catch (e) {
    logWarn('LicenseService', 'Logout error', e)
  }
  cachedStatus = null
  return getStatus(true)
}

/**
 * Revokes the license locally (clears both token and email).
 *
 * @returns {Promise<Object>} The refreshed status.
 */
export async function revokeLocal() {
  try {
    await window.electronAPI?.storeSet?.(STORE_KEY_TOKEN, null)
    await window.electronAPI?.storeSet?.(STORE_KEY_EMAIL, null)
    logWarn('LicenseService', 'License revoked locally')
  } catch (e) {
    logWarn('LicenseService', 'revokeLocal error', e)
  }
  cachedStatus = null
  return getStatus(true)
}

/**
 * Returns `true` if the current user meets the given tier.
 *
 * @param {string} requiredTier
 * @returns {Promise<boolean>}
 */
export async function meetsTier(requiredTier) {
  const status = await getStatus()
  const { meetsTier: check } = await import(
    '@core/plugins/PluginManager/licenseManager'
  )
  return check(status.tier, requiredTier)
}

/**
 * Invalidates the cached status (next `getStatus()` will re-fetch).
 * @returns {void}
 */
export function invalidateCache() {
  cachedStatus = null
}

export default {
  getStatus,
  activate,
  logout,
  revokeLocal,
  meetsTier,
  invalidateCache,
}