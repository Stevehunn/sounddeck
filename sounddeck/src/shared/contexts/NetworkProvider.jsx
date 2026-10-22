/**
 * @file Network provider + "no connection" modal.
 *
 * Tracks actual internet reachability (not just `navigator.onLine`), shows
 * a modal when the user goes offline or when a network error is detected,
 * and exposes imperative helpers via `NetworkContext`.
 *
 * Strategy:
 * - Subscribe to `window.online` / `window.offline` for fast state updates.
 * - On offline → show the modal immediately.
 * - On online  → hide the modal and reset the probe cache.
 * - `ensureOnline()` runs a full probe and can be called before any
 *   network operation (e.g. before fetching emojis from getemoji.com).
 *
 * The modal is rendered as a portal so it overlays everything.
 *
 * @see ./NetworkContext.js (context + `useNetwork` hook)
 * @see ./probeNetwork.js (the actual probe util)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@core/i18n/LanguageContext'
import { NetworkContext } from './NetworkContext'
import { probeNetwork, resetProbeCache } from './probeNetwork'

/**
 * Provides network context to its subtree.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function NetworkProvider({ children }) {
  const { t } = useLanguage()

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [showModal, setShowModal] = useState(false)
  const probingPromiseRef = useRef(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowModal(false)
      resetProbeCache()
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowModal(true)
      resetProbeCache()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const showNoConnection = useCallback(() => {
    setIsOnline(false)
    setShowModal(true)
  }, [])

  const hideNoConnection = useCallback(() => {
    setShowModal(false)
  }, [])

  const ensureOnline = useCallback(() => {
    if (probingPromiseRef.current) {
      return probingPromiseRef.current
    }

    const promise = (async () => {
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
        probingPromiseRef.current = null
      }
    })()

    probingPromiseRef.current = promise
    return promise
  }, [])

  const value = useMemo(
    () => ({
      isOnline,
      showNoConnection,
      hideNoConnection,
      ensureOnline,
      probeNetwork,
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

/**
 * Modal shown when the user is (or appears to be) offline.
 *
 * @param {Object} props
 * @param {(key: string) => string} props.t - i18n function.
 * @param {() => void} props.onClose - Called when the user dismisses the modal.
 * @returns {JSX.Element}
 */
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