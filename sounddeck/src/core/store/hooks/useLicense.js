/**
 * @file React hook exposing the current license status + actions.
 *
 * Wraps `LicenseService` and mirrors its state into React. Re-fetches on
 * mount and exposes `refresh(force)` for manual reloads (used after
 * external activation).
 *
 * @see @core/services/LicenseService.js
 */

import { useState, useEffect, useCallback } from 'react'
import * as LicenseService from '@core/services/LicenseService'

export function useLicense() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /**
   * Re-fetches the license status.
   *
   * @param {boolean} [force=false] - Bypass the service cache.
   * @returns {Promise<void>}
   */
  const refresh = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const s = await LicenseService.getStatus(force)
      setStatus(s)
    } catch (e) {
      setError(e.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Deferred via setTimeout(0) so refresh()'s setState doesn't run
  // synchronously in the effect body (React 19's set-state-in-effect rule).
  useEffect(() => {
    const timer = setTimeout(() => refresh(), 0)
    return () => clearTimeout(timer)
  }, [refresh])

  /**
   * Activates a license token.
   *
   * @param {string} token
   * @param {string} [email]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const activate = useCallback(async (token, email) => {
    setLoading(true)
    setError(null)
    try {
      const result = await LicenseService.activate(token, email)
      if (result.success) {
        setStatus(result.status)
        return { success: true }
      }
      setError(result.error || 'Unknown error')
      return { success: false, error: result.error }
    } catch (e) {
      setError(e.message)
      return { success: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Signs out (keeps the token but clears the email).
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    setLoading(true)
    try {
      const s = await LicenseService.logout()
      setStatus(s)
    } finally {
      setLoading(false)
    }
  }, [])

  const tier = status?.tier || 'free'
  const isPro = tier === 'pro' || tier === 'dev'
  const isDev = tier === 'dev'

  return {
    status,
    loading,
    error,
    tier,
    isPro,
    isDev,
    activate,
    logout,
    refresh,
  }
}

export default useLicense