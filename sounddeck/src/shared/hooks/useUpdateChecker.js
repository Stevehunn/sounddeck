// src/shared/hooks/useUpdateChecker.js
import { useState, useEffect } from 'react'
import { logWarn } from '@shared/utils/logger'

const GITHUB_REPO = 'Stevehunn/sounddeck'

const CACHE_KEY_LAST_CHECK = 'updateLastCheck'
const CACHE_KEY_DATA = 'updateLatestRelease'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Compare deux versions sémantiques "1.2.3" (avec ou sans préfixe "v").
 * @returns 1 si a > b, -1 si a < b, 0 si égal
 */
function compareVersions(a, b) {
  const pa = String(a || '0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b || '0').replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

/**
 * Vérifie si une nouvelle version de SoundDeck est disponible sur GitHub.
 * Cache le résultat pendant 24h pour ne pas spammer l'API GitHub.
 *
 * @returns {{
 *   updateAvailable: boolean,
 *   latestVersion: string | null,
 *   downloadUrl: string | null,
 *   currentVersion: string | null,
 *   isChecking: boolean,
 * }}
 */
export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [latestVersion, setLatestVersion] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        // 1. Version actuelle (depuis le store Electron, déjà rempli par main.js)
        let version = null
        try {
          version = await window.electronAPI?.storeGet?.('appVersion')
        } catch (e) {
          // silencieux
        }
        if (!version) version = '0.0.0'
        if (cancelled) return
        setCurrentVersion(version)

        // 2. Cache ? (ne re-check pas + de 1x / 24h)
        let cachedData = null
        try {
          const lastCheck = await window.electronAPI?.storeGet?.(CACHE_KEY_LAST_CHECK)
          const cache = await window.electronAPI?.storeGet?.(CACHE_KEY_DATA)
          if (lastCheck && cache && Date.now() - lastCheck < CHECK_INTERVAL_MS) {
            cachedData = cache
          }
        } catch (e) {
          // silencieux
        }

        let data = cachedData

        // 3. Sinon, fetch GitHub
        if (!data) {
          try {
            const res = await fetch(
              `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
              {
                headers: {
                  Accept: 'application/vnd.github+json',
                },
              }
            )

            if (!res.ok) {
              logWarn('useUpdateChecker', `GitHub API HTTP ${res.status}`)
              setIsChecking(false)
              return
            }

            const json = await res.json()
            data = {
              tag_name: json.tag_name,
              html_url: json.html_url,
            }

            // Persiste le cache (ignore les erreurs : ne doit jamais bloquer)
            try {
              await window.electronAPI?.storeSet?.(CACHE_KEY_DATA, data)
              await window.electronAPI?.storeSet?.(CACHE_KEY_LAST_CHECK, Date.now())
            } catch (e) {
              // silencieux
            }
          } catch (e) {
            logWarn('useUpdateChecker', 'Fetch GitHub échoué', e)
            setIsChecking(false)
            return
          }
        }

        if (cancelled) return

        const latest = data?.tag_name?.replace(/^v/, '')
        if (!latest) {
          setIsChecking(false)
          return
        }

        if (compareVersions(latest, version) > 0) {
          setUpdateAvailable(true)
          setLatestVersion(latest)
          setDownloadUrl(data.html_url)
        }
      } catch (e) {
        logWarn('useUpdateChecker', 'Erreur globale', e)
      } finally {
        if (!cancelled) setIsChecking(false)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    updateAvailable,
    latestVersion,
    downloadUrl,
    currentVersion,
    isChecking,
  }
}

export default useUpdateChecker