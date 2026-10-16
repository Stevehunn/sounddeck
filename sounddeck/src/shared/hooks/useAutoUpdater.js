// src/shared/hooks/useAutoUpdater.js
import { useState, useEffect, useCallback } from 'react'
import { logWarn } from '@shared/utils/logger'

export function useAutoUpdater() {
  const [state, setState] = useState({
    status: 'idle',
    version: null,
    releaseNotes: null,
    progress: null,
    error: null,
  })

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    api.onUpdateChecking?.(() => {
      setState((s) => ({ ...s, status: 'checking', error: null }))
    })

    api.onUpdateAvailable?.((info) => {
      setState((s) => ({
        ...s,
        status: 'available',
        version: info.version,
        releaseNotes: info.releaseNotes || null,
        error: null,
      }))
    })

    api.onUpdateNotAvailable?.(() => {
      setState((s) => ({ ...s, status: 'idle' }))
    })

    api.onUpdateProgress?.((p) => {
      setState((s) => ({ ...s, status: 'downloading', progress: p }))
    })

    api.onUpdateDownloaded?.((info) => {
      setState((s) => ({
        ...s,
        status: 'downloaded',
        version: info.version,
        releaseNotes: info.releaseNotes || s.releaseNotes,
        progress: null,
      }))
    })

    api.onUpdateError?.((err) => {
      logWarn('useAutoUpdater', 'Erreur', err)
      setState((s) => ({ ...s, status: 'error', error: err.message }))
    })

    return () => {
      api.removeAllListeners?.('update:checking')
      api.removeAllListeners?.('update:available')
      api.removeAllListeners?.('update:not-available')
      api.removeAllListeners?.('update:progress')
      api.removeAllListeners?.('update:downloaded')
      api.removeAllListeners?.('update:error')
    }
  }, [])

  const download = useCallback(async () => {
    setState((s) => ({ ...s, status: 'downloading', progress: null, error: null }))
    const res = await window.electronAPI?.updateDownload?.()
    if (!res?.ok) {
      setState((s) => ({ ...s, status: 'error', error: res?.error || 'Download failed' }))
    }
  }, [])

  const install = useCallback(async () => {
    await window.electronAPI?.updateInstall?.()
  }, [])

  const openGithub = useCallback(async () => {
    await window.electronAPI?.updateOpenGithub?.()
  }, [])

  return { ...state, download, install, openGithub }
}

export default useAutoUpdater