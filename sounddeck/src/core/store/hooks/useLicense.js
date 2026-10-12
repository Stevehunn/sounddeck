// src/core/store/hooks/useLicense.js
import { useState, useEffect, useCallback } from 'react'
import * as LicenseService from '@core/services/LicenseService'

export function useLicense() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const s = await LicenseService.getStatus(force)
      setStatus(s)
    } catch (e) {
      setError(e.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const activate = useCallback(async (token, email) => {
    setLoading(true)
    setError(null)
    try {
      const result = await LicenseService.activate(token, email)
      if (result.success) {
        setStatus(result.status)
        return { success: true }
      }
      setError(result.error || 'Erreur inconnue')
      return { success: false, error: result.error }
    } catch (e) {
      setError(e.message)
      return { success: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }, [])

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