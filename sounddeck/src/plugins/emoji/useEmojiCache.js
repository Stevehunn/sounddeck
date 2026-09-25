// src/plugins/emoji/useEmojiCache.js
import { useRef, useCallback, useMemo } from 'react'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Cache mémoire pour les catégories d'emojis.
 * ✅ Évite un Map au niveau module qui fuit entre les mounts.
 * ✅ Ajoute un TTL pour forcer un refresh toutes les 24h.
 */
export function useEmojiCache() {
  const cacheRef = useRef(new Map())

  const get = useCallback((categoryId) => {
    const entry = cacheRef.current.get(categoryId)
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      cacheRef.current.delete(categoryId)
      return null
    }
    return entry.emojis
  }, [])

  const set = useCallback((categoryId, emojis) => {
    cacheRef.current.set(categoryId, {
      emojis,
      fetchedAt: Date.now(),
    })
  }, [])

  const getInfo = useCallback(() => {
    const info = {}
    const now = Date.now()
    for (const [key, entry] of cacheRef.current) {
      if (now - entry.fetchedAt > CACHE_TTL_MS) continue
      info[key] = { count: entry.emojis.length, cached: true }
    }
    return info
  }, [])

  const clear = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  return useMemo(
    () => ({ get, set, getInfo, clear }),
    [get, set, getInfo, clear]
  )
}

export default useEmojiCache