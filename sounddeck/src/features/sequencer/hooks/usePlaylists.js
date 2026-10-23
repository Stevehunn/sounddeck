/**
 * @file Playlists persistence hook — load / save / create / delete.
 *
 * Playlists are stored in electron-store under `playlists` as an array of:
 *
 *   { id, name, items: [{ id, soundId, delay }], loop, createdAt }
 *
 * Two refs are kept in sync with the state (`playlistsRef`,
 * `activePlaylistIdRef`) so async callbacks always see the latest values
 * without re-creating dependencies. `persist()` writes the whole array
 * back to the store on every mutation.
 *
 * @see ./useSequencePlayer.js (consumes `activePlaylist`)
 * @see src/features/sequencer/Sequencer.jsx
 */

import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
} from 'react'
import { uuid } from '@shared/utils/uuid'
import { logWarn } from '@shared/utils/logger'

const STORE_KEY = 'playlists'

/**
 * Playlists state + mutations.
 *
 * @returns {{
 *   playlists: Array<Object>,
 *   activePlaylistId: string|null,
 *   activePlaylistIdRef: {current: string|null},
 *   activePlaylist: Object|null,
 *   createPlaylist: (name: string) => Promise<Object|null>,
 *   deletePlaylist: (id: string) => Promise<void>,
 *   updatePlaylist: (updated: Object) => Promise<void>,
 *   savePlaylistItems: (
 *     playlistId: string,
 *     items: Array,
 *     loop?: boolean
 *   ) => Promise<void>,
 *   selectPlaylist: (id: string) => void,
 * }}
 */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState([])
  const [activePlaylistId, setActivePlaylistId] = useState(null)

  const playlistsRef = useRef(playlists)
  const activePlaylistIdRef = useRef(null)

  useEffect(() => {
    playlistsRef.current = playlists
  }, [playlists])

  // `useLayoutEffect` so the ref is updated before any paint — some async
  // callbacks fire immediately after a click, and we need them to see the
  // latest `activePlaylistId` synchronously.
  useLayoutEffect(() => {
    activePlaylistIdRef.current = activePlaylistId
  }, [activePlaylistId])

  // Initial load from the store.
  useEffect(() => {
    let mounted = true
    window.electronAPI
      .storeGet(STORE_KEY)
      .then((saved) => {
        if (!mounted) return
        if (saved) {
          setPlaylists(saved)
          playlistsRef.current = saved

          // Auto-clear the active playlist if it no longer exists.
          const activeId = activePlaylistIdRef.current
          if (activeId && !saved.some((p) => p.id === activeId)) {
            setActivePlaylistId(null)
            activePlaylistIdRef.current = null
          }
        }
      })
      .catch((e) => logWarn('usePlaylists', 'Load error', e))

    return () => {
      mounted = false
    }
  }, [])

  /**
   * Persists the playlist list to the store and updates the local state.
   * @param {Array<Object>} updated
   * @returns {Promise<void>}
   */
  const persist = useCallback(async (updated) => {
    setPlaylists(updated)
    playlistsRef.current = updated
    await window.electronAPI.storeSet(STORE_KEY, updated)
  }, [])

  /**
   * Creates a new (empty) playlist and selects it.
   * @param {string} name
   * @returns {Promise<Object|null>} The new playlist, or `null` if name is empty.
   */
  const createPlaylist = useCallback(
    async (name) => {
      if (!name?.trim()) return null
      const playlist = {
        id: uuid(),
        name: name.trim(),
        items: [],
        loop: false,
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

  /**
   * Deletes a playlist (and clears the selection if it was active).
   * @param {string} id
   * @returns {Promise<void>}
   */
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

  /**
   * Replaces a playlist by ID (no-op if the ID doesn't exist).
   * @param {Object} updated
   * @returns {Promise<void>}
   */
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

  /**
   * Saves only the `items` (and optionally `loop`) of a playlist.
   * Skips the extra `persist()` call because it's called on every drag /
   * edit — we write once with the merged patch.
   *
   * @param {string} playlistId
   * @param {Array<{id: string, soundId: string, delay: number}>} items
   * @param {boolean} [loop] - Optional, updates the loop flag too.
   * @returns {Promise<void>}
   */
  const savePlaylistItems = useCallback(
    async (playlistId, items, loop) => {
      const index = playlistsRef.current.findIndex((p) => p.id === playlistId)
      if (index === -1) return

      const next = [...playlistsRef.current]
      const patch = { items }
      if (typeof loop === 'boolean') patch.loop = loop
      next[index] = { ...next[index], ...patch }

      setPlaylists(next)
      playlistsRef.current = next

      await window.electronAPI.storeSet(STORE_KEY, next)
    },
    []
  )

  /**
   * Selects a playlist by ID.
   * @param {string} id
   * @returns {void}
   */
  const selectPlaylist = useCallback((id) => {
    setActivePlaylistId(id)
    activePlaylistIdRef.current = id
  }, [])

  /**
   * The currently selected playlist object (or `null`).
   * @type {Object|null}
   */
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