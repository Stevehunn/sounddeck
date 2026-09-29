// src/plugins/myinstants/useMyInstantsCache.js
// Cache persistant des catégories MyInstants (electron-store + mémoire)
import { getItem, setItem } from '@shared/utils/appStorage'
import { logWarn } from '@shared/utils/logger'

const STORE_KEY_CACHE = 'myinstantsCategoryCache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

const categoryCache = new Map()
let cacheLoaded = false
let persistTimer = null

/**
 * Charge le cache depuis electron-store (une seule fois par session).
 * Ignore les entrées expirées.
 */
export async function ensureCacheLoaded() {
  if (cacheLoaded) return
  cacheLoaded = true

  try {
    const raw = await getItem(STORE_KEY_CACHE)
    if (!raw) return

    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return

    const now = Date.now()
    for (const [key, entry] of Object.entries(parsed)) {
      if (!entry?.sounds || !entry?.fetchedAt) continue
      if (now - entry.fetchedAt > CACHE_TTL_MS) continue // expiré
      categoryCache.set(key, {
        sounds: entry.sounds,
        fetchedAt: entry.fetchedAt,
      })
    }
  } catch (e) {
    logWarn('Discover', 'Erreur chargement cache', e)
  }
}

/**
 * Persiste le cache (debounce 1s pour éviter les writes spam).
 * chaque entrée conserve SON fetchedAt (plus d'écrasement global).
 */
function persistCache() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(async () => {
    persistTimer = null
    try {
      const toStore = {}
      for (const [key, entry] of categoryCache) {
        toStore[key] = {
          sounds: entry.sounds,
          fetchedAt: entry.fetchedAt,
        }
      }
      await setItem(STORE_KEY_CACHE, JSON.stringify(toStore))
    } catch (e) {
      logWarn('Discover', 'Erreur persistance cache', e)
    }
  }, 1000)
}

export function getCachedCategory(categoryId) {
  const entry = categoryCache.get(categoryId)
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    categoryCache.delete(categoryId)
    return null
  }
  return entry.sounds
}

export function setCachedCategory(categoryId, sounds) {
  categoryCache.set(categoryId, {
    sounds,
    fetchedAt: Date.now(),
  })
  persistCache()
}

export function getCacheInfo() {
  const info = {}
  const now = Date.now()
  for (const [key, entry] of categoryCache) {
    if (now - entry.fetchedAt > CACHE_TTL_MS) continue
    info[key] = {
      count: entry.sounds.length,
      cached: true,
      age: now - entry.fetchedAt,
    }
  }
  return info
}