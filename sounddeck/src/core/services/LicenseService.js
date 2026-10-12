// src/core/services/LicenseService.js
//
// Service haut niveau pour la gestion de la licence Pro.
// Contrairement à licenseManager qui ne fait QUE vérifier un token,
// ce service gère le stockage, l'activation, le logout et le cache.

import { logWarn, logError, logInfo } from '@shared/utils/logger'
import { verifyLicense } from '@core/plugins/PluginManager/licenseManager'

const STORE_KEY_TOKEN = 'licenseToken'
const STORE_KEY_EMAIL = 'licenseEmail'

let cachedStatus = null

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
    logError('LicenseService', 'Erreur getStatus', e)
    cachedStatus = buildFreeStatus('INTERNAL_ERROR')
    return cachedStatus
  }
}

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
    logInfo('LicenseService', `Licence activée : tier=${result.tier}`)
  } catch (e) {
    logError('LicenseService', 'Erreur persistance licence', e)
    return { success: false, error: 'STORE_ERROR' }
  }

  cachedStatus = null
  const status = await getStatus(true)
  return { success: true, status }
}

export async function logout() {
  try {
    await window.electronAPI?.storeSet?.(STORE_KEY_EMAIL, null)
    logInfo('LicenseService', 'Logout : email retiré (token conservé)')
  } catch (e) {
    logWarn('LicenseService', 'Erreur logout', e)
  }
  cachedStatus = null
  return getStatus(true)
}

export async function revokeLocal() {
  try {
    await window.electronAPI?.storeSet?.(STORE_KEY_TOKEN, null)
    await window.electronAPI?.storeSet?.(STORE_KEY_EMAIL, null)
    logWarn('LicenseService', 'Licence révoquée localement')
  } catch (e) {
    logWarn('LicenseService', 'Erreur revokeLocal', e)
  }
  cachedStatus = null
  return getStatus(true)
}

export async function meetsTier(requiredTier) {
  const status = await getStatus()
  const { meetsTier: check } = await import(
    '@core/plugins/PluginManager/licenseManager'
  )
  return check(status.tier, requiredTier)
}

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