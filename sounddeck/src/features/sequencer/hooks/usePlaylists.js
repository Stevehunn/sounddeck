// src/features/sequencer/hooks/usePlaylists.js
import { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react'
import { uuid } from '@shared/utils/uuid'
import { logWarn } from '@shared/utils/logger'

const STORE_KEY = 'playlists'

export function usePlaylists() {
  const [playlists, setPlaylists] = useState([])
  const [activePlaylistId, setActivePlaylistId] = useState(null)

  const playlistsRef = useRef(playlists)
  const activePlaylistIdRef = useRef(null)

  useEffect(() => {
    playlistsRef.current = playlists
  }, [playlists])

  useLayoutEffect(() => {
    activePlaylistIdRef.current = activePlaylistId
  }, [activePlaylistId])

  // ─── CHARGEMENT INITIAL ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    window.electronAPI
      .storeGet(STORE_KEY)
      .then((saved) => {
        if (!mounted) return
        if (saved) {
          setPlaylists(saved)
          playlistsRef.current = saved

          const activeId = activePlaylistIdRef.current
          if (activeId && !saved.some((p) => p.id === activeId)) {
            setActivePlaylistId(null)
            activePlaylistIdRef.current = null
          }
        }
      })
      .catch((e) => logWarn('usePlaylists', 'Erreur chargement', e))

    return () => {
      mounted = false
    }
  }, [])

  // ─── PERSISTANCE ─────────────────────────────────────────────────────
  const persist = useCallback(async (updated) => {
    setPlaylists(updated)
    playlistsRef.current = updated
    await window.electronAPI.storeSet(STORE_KEY, updated)
  }, [])

  // ─── CRUD ────────────────────────────────────────────────────────────
  const createPlaylist = useCallback(
    async (name) => {
      if (!name?.trim()) return null
      const playlist = {
        id: uuid(),
        name: name.trim(),
        items: [],
        createdAt: Date.now(),
      }
      const updated = [...playlistsRef.current, playlist]
      await persist(updated)
      setActivePlaylistId(playlist.id)
      activePlaylistIdRef.current = playlist.id
      return playlist
    },
    [persist]
  )

  const deletePlaylist = useCallback(
    async (id) => {
      const updated = playlistsRef.current.filter((p) => p.id !== id)
      await persist(updated)
      if (activePlaylistIdRef.current === id) {
        setActivePlaylistId(null)
        activePlaylistIdRef.current = null
      }
    },
    [persist]
  )

  const updatePlaylist = useCallback(
    async (updated) => {
      const index = playlistsRef.current.findIndex((p) => p.id === updated.id)
      if (index === -1) return
      const next = [...playlistsRef.current]
      next[index] = updated
      await persist(next)
    },
    [persist]
  )

  const savePlaylistItems = useCallback(
    async (playlistId, items) => {
      const currentActiveId =
        activePlaylistIdRef.current || activePlaylistId

      const index = playlistsRef.current.findIndex((p) => p.id === playlistId)
      if (index === -1) return

      const next = [...playlistsRef.current]
      next[index] = { ...next[index], items }

      setPlaylists(next)
      playlistsRef.current = next

      if (currentActiveId) {
        setActivePlaylistId(currentActiveId)
        activePlaylistIdRef.current = currentActiveId
      }

      await window.electronAPI.storeSet(STORE_KEY, next)
    },
    [activePlaylistId]
  )

  const selectPlaylist = useCallback((id) => {
    setActivePlaylistId(id)
    activePlaylistIdRef.current = id
  }, [])

  // ─── MÉMOÏSATION ─────────────────────────────────────────────────────
  const activePlaylist = useMemo(() => {
    if (!activePlaylistId) return null
    return playlists.find((p) => p.id === activePlaylistId) || null
  }, [playlists, activePlaylistId])

  return {
    playlists,
    activePlaylistId,
    activePlaylistIdRef,
    activePlaylist,
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    savePlaylistItems,
    selectPlaylist,
  }
}

export default usePlaylists