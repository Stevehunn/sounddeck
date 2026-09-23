// src/plugins/myinstants/useMyInstantsCache.js
// Cache persistant des catégories MyInstants (electron-store + mémoire)
import { getItem, setItem } from '@shared/utils/appStorage'
import { logWarn } from '@shared/utils/logger'

const STORE_KEY_CACHE = 'myinstantsCategoryCache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

// Cache mémoire (rapide, source de vérité à la lecture)
const categoryCache = new Map()
let cacheLoaded = false
let persistTimer = null

/**
 * Charge le cache depuis electron-store (une seule fois par session).
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
      categoryCache.set(key, entry.sounds)
    }
  } catch (e) {
    logWarn('Discover', 'Erreur chargement cache', e)
  }
}

/**
 * Persiste le cache (debounce 1s pour éviter les writes spam).
 */
function persistCache() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(async () => {
    persistTimer = null
    try {
      const now = Date.now()
      const toStore = {}
      for (const [key, sounds] of categoryCache) {
        toStore[key] = { sounds, fetchedAt: now }
      }
      await setItem(STORE_KEY_CACHE, JSON.stringify(toStore))
    } catch (e) {
      logWarn('Discover', 'Erreur persistance cache', e)
    }
  }, 1000)
}

export function getCachedCategory(categoryId) {
  return categoryCache.get(categoryId) || null
}

export function setCachedCategory(categoryId, sounds) {
  categoryCache.set(categoryId, sounds)
  persistCache()
}

export function getCacheInfo() {
  const info = {}
  for (const [key, value] of categoryCache) {
    info[key] = { count: value.length, cached: true }
  }
  return info
}