// src/shared/contexts/NetworkContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@core/i18n/LanguageContext'

const NetworkContext = createContext(null)

// ─── SONDE RÉSEAU RÉELLE ────────────────────────────────────────────────
// Liste d'URLs "ping" fiables (favicons légers, toujours dispo)
const PROBE_URLS = [
  'https://www.google.com/favicon.ico',
  'https://www.cloudflare.com/favicon.ico',
  'https://www.myinstants.com/favicon.ico',
]

const PROBE_TIMEOUT_MS = 3000
const PROBE_CACHE_MS = 3000 // évite de spammer si clics rapides

let lastProbeTime = 0
let lastProbeResult = true

function probeOneUrl(baseUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    let resolved = false

    const timer = setTimeout(() => {
      if (resolved) return
      resolved = true
      img.onload = img.onerror = null
      img.src = ''
      resolve(false)
    }, PROBE_TIMEOUT_MS)

    img.onload = () => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      resolve(true)
    }

    img.onerror = () => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      resolve(false)
    }

    // Cache-busting pour forcer un vrai round-trip réseau
    img.src = `${baseUrl}?_=${Date.now()}`
  })
}

/**
 * Sonde réseau réelle.
 * Fiable même quand `navigator.onLine === true` (cas DNS down).
 * @returns {Promise<boolean>}
 */
export async function probeNetwork() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false
  }

  const now = Date.now()
  if (now - lastProbeTime < PROBE_CACHE_MS) {
    return lastProbeResult
  }

  for (const url of PROBE_URLS) {
    const ok = await probeOneUrl(url)
    if (ok) {
      lastProbeTime = now
      lastProbeResult = true
      return true
    }
  }

  lastProbeTime = now
  lastProbeResult = false
  return false
}

// ─── PROVIDER ───────────────────────────────────────────────────────────
export function NetworkProvider({ children }) {
  const { t } = useLanguage()

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [showModal, setShowModal] = useState(false)
  const probingRef = useRef(false)

  // Écoute les événements natifs (câble débranché, wifi désactivé)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowModal(false)
      lastProbeTime = 0 // force un nouveau probe la prochaine fois
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowModal(true)
      lastProbeTime = 0
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Forcer l'affichage du modal (appelé par les composants sur erreur IPC)
  const showNoConnection = useCallback(() => {
    setIsOnline(false)
    setShowModal(true)
  }, [])

  const hideNoConnection = useCallback(() => {
    setShowModal(false)
  }, [])

  /**
   * ✅ FIX — Helper principal :
   * Vérifie la connectivité via sonde RÉELLE. Si offline, affiche le modal.
   *
   * Usage :
   *   const ok = await ensureOnline()
   *   if (!ok) return   // abort l'action
   *
   * @returns {Promise<boolean>} true si en ligne, false sinon (modal affiché)
   */
  const ensureOnline = useCallback(async () => {
    if (probingRef.current) {
      // Une probe est déjà en cours → on attend son résultat
      return lastProbeResult
    }

    probingRef.current = true
    try {
      const online = await probeNetwork()
      if (!online) {
        setIsOnline(false)
        setShowModal(true)
        return false
      }
      setIsOnline(true)
      return true
    } finally {
      probingRef.current = false
    }
  }, [])

  const value = useMemo(
    () => ({
      isOnline,
      showNoConnection,
      hideNoConnection,
      ensureOnline,   // ✅ NOUVEAU
      probeNetwork,   // ✅ NOUVEAU (bas niveau si besoin)
    }),
    [isOnline, showNoConnection, hideNoConnection, ensureOnline]
  )

  return (
    <NetworkContext.Provider value={value}>
      {children}
      {showModal &&
        createPortal(
          <NoConnectionModal t={t} onClose={hideNoConnection} />,
          document.body
        )}
    </NetworkContext.Provider>
  )
}

export function useNetwork() {
  const ctx = useContext(NetworkContext)
  if (!ctx) {
    throw new Error('useNetwork must be used within NetworkProvider')
  }
  return ctx
}

// ─── MODAL ──────────────────────────────────────────────────────────────
function NoConnectionModal({ t, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 999999 }}
      data-testid="no-connection-modal"
    >
      <div
        className="modal"
        style={{ width: 400, textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239,159,39,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <i
            className="ti ti-wifi-off"
            style={{ fontSize: 32, color: 'var(--warning)' }}
          />
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 8,
            color: 'var(--text-primary)',
          }}
        >
          {t('networkErrorTitle')}
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          {t('networkErrorDesc')}
        </div>

        <button
          className="btn-primary btn-lg"
          onClick={onClose}
          style={{ width: '100%', justifyContent: 'center' }}
          autoFocus
        >
          <i className="ti ti-check" /> {t('close')}
        </button>
      </div>
    </div>
  )
}

export default NetworkProvider