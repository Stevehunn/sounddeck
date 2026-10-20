/**
 * @file Emoji Discovery plugin page.
 *
 * Fetches emojis from getemoji.com (via IPC `fetch-emojis`), groups them
 * by category, and lets the user add them one at a time or an entire
 * category at once to their personal collection (`useEmojis`).
 *
 * Responsibilities:
 * - **Category browsing** — sidebar with 9 categories (smileys, people,
 *   animals, …). Clicking a category shows its emoji grid.
 * - **Caching** — per-category emoji lists are cached in memory via
 *   `useEmojiCache` (TTL 24h, scoped to component lifetime). Cache hits
 *   are instant; misses trigger a fetch.
 * - **Preloading** — after 500ms, the page preloads all categories in the
 *   background (2 at a time, current category first) so switching feels
 *   instant. A thin progress bar at the top shows the progress.
 * - **Adding** — clicking an emoji calls `addEmoji(emoji, categoryId)`.
 *   A bulk "Add category" button adds all emojis of the current category
 *   at once.
 *
 * The component detects ownership (`hasEmoji`) and disables the add
 * button on already-owned emojis.
 *
 * @see ./categories.js — the list of EMOJI_DISCOVER_CATEGORIES
 * @see ./useEmojiCache.js — the per-instance cache hook
 * @see @shared/hooks/useEmojis.js — `addEmoji`, `addCategory`, `hasEmoji`
 * @see @shared/contexts — `useNetwork` (offline detection)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useEmojis } from '@shared/hooks/useEmojis'
import { useNetwork } from '@shared/contexts'
import { EMOJI_DISCOVER_CATEGORIES } from './categories'
import { useEmojiCache } from './useEmojiCache'

/** Number of categories fetched concurrently during preload. */
const PRELOAD_BATCH_SIZE = 2

/** Delay before starting the background preload, in milliseconds. */
const PRELOAD_START_DELAY = 500

/**
 * Emoji Discovery page.
 *
 * @param {Object} props
 * @param {Object} props.store - App store (unused here, kept for the
 *   plugin page contract — every plugin page receives `{ store, addToast }`).
 * @param {(msg: string, type?: string) => void} [props.addToast]
 * @returns {JSX.Element}
 */
export default function EmojiDiscover({ store: _store, addToast }) {
  const { t } = useLanguage()
  const { showNoConnection, ensureOnline } = useNetwork()
  const { addEmoji, addCategory, hasEmoji } = useEmojis()

  // Per-mount isolated cache (TTL 24h). No leak between mounts.
  const emojiCache = useEmojiCache()

  const [activeCategory, setActiveCategory] = useState('smileys')

  // Initial emojis and cache info are read from the cache synchronously
  // via the useState initializer (avoids a setState-in-effect warning).
  const [emojis, setEmojis] = useState(() => emojiCache.get('smileys') || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedFlash, setAddedFlash] = useState(null)
  const [cacheInfo, setCacheInfo] = useState(() => emojiCache.getInfo())

  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [preloadStatus, setPreloadStatus] = useState('')
  const [isPreloadComplete, setIsPreloadComplete] = useState(false)

  // Lifecycle guards
  const isMountedRef = useRef(true)
  const preloadAbortRef = useRef(false)
  const currentCategoryRef = useRef('smileys')

  // Track mount status so async callbacks can bail out if the component
  // was unmounted (avoid state updates on unmounted components).
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      preloadAbortRef.current = true
    }
  }, [])

  // Keep a ref of the current category so async callbacks always know
  // whether their result is still relevant.
  useEffect(() => {
    currentCategoryRef.current = activeCategory
  }, [activeCategory])

  // ─── LOAD ONE CATEGORY ──────────────────────────────────────────────
  /**
   * Loads the emoji list for a category.
   *
   * Behavior:
   * - If the cache has the category and `forceRefresh` is false → use cache.
   * - Otherwise fetch via IPC `fetchEmojis`. On network error, calls
   *   `showNoConnection()` (silent UI). On other errors, shows the error.
   *
   * @param {string} categoryId
   * @param {boolean} [forceRefresh=false] - Bypass cache (used by refresh button).
   * @returns {Promise<void>}
   */
  const loadCategory = useCallback(
    async (categoryId, forceRefresh = false) => {
      if (!forceRefresh) {
        const cached = emojiCache.get(categoryId)
        if (cached) {
          setEmojis(cached)
          setError('')
          setCacheInfo(emojiCache.getInfo())
          return
        }
      }

      setLoading(true)
      setError('')
      setEmojis([])

      try {
        const result = await window.electronAPI.fetchEmojis?.(categoryId)
        if (!isMountedRef.current) return

        if (result?.success) {
          const list = result.emojis || []
          emojiCache.set(categoryId, list)
          if (currentCategoryRef.current === categoryId) {
            setEmojis(list)
          }
          if (list.length === 0 && currentCategoryRef.current === categoryId) {
            setError(t('emojiDiscoverEmpty'))
          }
        } else if (result?.isNetworkError) {
          if (currentCategoryRef.current === categoryId) setError('')
          showNoConnection()
        } else if (currentCategoryRef.current === categoryId) {
          setError(result?.error || t('emojiDiscoverError'))
        }
      } catch (e) {
        if (!isMountedRef.current) return
        if (e?.isNetworkError) {
          if (currentCategoryRef.current === categoryId) setError('')
          showNoConnection()
        } else if (currentCategoryRef.current === categoryId) {
          setError(e.message || t('emojiDiscoverError'))
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
          setCacheInfo(emojiCache.getInfo())
        }
      }
    },
    [t, emojiCache, showNoConnection]
  )

  // ─── PRELOAD ALL CATEGORIES ────────────────────────────────────────
  /**
   * Preloads every category in the background (2 at a time), current
   * category first.
   *
   * Aborts cleanly on unmount or on a network error. Progress is
   * mirrored into the top progress bar.
   *
   * @returns {Promise<void>}
   */
  const preloadAllCategories = useCallback(async () => {
    if (isPreloading || isPreloadComplete) return

    const online = await ensureOnline()
    if (!online) {
      setIsPreloadComplete(true)
      return
    }

    const categoryIds = EMOJI_DISCOVER_CATEGORIES.map((c) => c.id)

    // Already fully cached? Nothing to do.
    const allCached = categoryIds.every((id) => {
      const cached = emojiCache.get(id)
      return cached && cached.length > 0
    })

    if (allCached) {
      setIsPreloadComplete(true)
      setCacheInfo(emojiCache.getInfo())
      return
    }

    setIsPreloading(true)
    preloadAbortRef.current = false

    const total = categoryIds.length
    let loaded = 0

    // Prioritize the currently visible category
    const priority = [currentCategoryRef.current]
    const others = categoryIds.filter((id) => !priority.includes(id))
    const sortedIds = [...priority, ...others]

    setPreloadStatus(t('emojiDiscoverPreloading') || 'Préchargement...')

    /**
     * Loads a single category for the preloader. Returns `true` if the
     * category ended up cached (either already there or fetched now).
     *
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    const loadOne = async (id) => {
      if (preloadAbortRef.current) return false

      const cached = emojiCache.get(id)
      if (cached && cached.length > 0) return true

      try {
        const result = await window.electronAPI.fetchEmojis?.(id)
        if (
          result?.success &&
          Array.isArray(result.emojis) &&
          result.emojis.length > 0
        ) {
          emojiCache.set(id, result.emojis)
          return true
        }
        if (result?.isNetworkError) {
          preloadAbortRef.current = true
          if (isMountedRef.current) showNoConnection()
        }
        return false
      } catch (e) {
        console.warn(
          `⚠️ [EmojiDiscover] Failed to preload ${id}:`,
          e.message
        )
        if (e?.isNetworkError) {
          preloadAbortRef.current = true
          if (isMountedRef.current) showNoConnection()
        }
        return false
      }
    }

    // Run in small batches so we don't hammer the network
    for (let i = 0; i < sortedIds.length; i += PRELOAD_BATCH_SIZE) {
      if (preloadAbortRef.current) break

      const batch = sortedIds.slice(i, i + PRELOAD_BATCH_SIZE)
      const results = await Promise.all(batch.map((id) => loadOne(id)))

      loaded += results.filter(Boolean).length
      const progress = Math.round((loaded / total) * 100)
      setPreloadProgress(progress)
      setPreloadStatus(
        `${t('emojiDiscoverCategoriesLoaded') || 'Categories loaded'}: ${loaded}/${total}`
      )
      setCacheInfo(emojiCache.getInfo())
    }

    if (!isMountedRef.current) return

    setIsPreloading(false)
    setPreloadProgress(100)
    setIsPreloadComplete(true)
    setPreloadStatus(`✅ ${t('emojiDiscoverAllCategoriesLoaded')}`)
    setCacheInfo(emojiCache.getInfo())
  }, [isPreloading, isPreloadComplete, emojiCache, t, showNoConnection, ensureOnline])

  // ─── INITIAL EFFECT ─────────────────────────────────────────────────
  // The initial emojis + cache info are already read from the cache via
  // `useState` initializers above. This effect only triggers a fetch
  // when the cache was empty, and schedules the background preload.
  //
  // Both calls are deferred via `setTimeout` so that the `setState` calls
  // inside `loadCategory()` don't run synchronously within the effect body
  // (would trip React 19's `set-state-in-effect` rule).
  useEffect(() => {
    const initTimer = setTimeout(() => {
      if (emojis.length === 0) {
        loadCategory(activeCategory)
      }
    }, 0)

    const preloadTimer = setTimeout(() => {
      preloadAllCategories()
    }, PRELOAD_START_DELAY)

    return () => {
      clearTimeout(initTimer)
      clearTimeout(preloadTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── CATEGORY SELECTION ────────────────────────────────────────────
  /**
   * Handles a click on a category in the sidebar.
   *
   * @param {string} categoryId
   * @returns {void}
   */
  const handleSelectCategory = useCallback(
    (categoryId) => {
      if (categoryId === activeCategory) return
      setActiveCategory(categoryId)

      const cached = emojiCache.get(categoryId)
      if (cached) {
        setEmojis(cached)
        setError('')
        setCacheInfo(emojiCache.getInfo())
      } else {
        loadCategory(categoryId)
      }
    },
    [activeCategory, emojiCache, loadCategory]
  )

  // ─── ACTIONS ────────────────────────────────────────────────────────
  /**
   * Adds a single emoji to the user's collection.
   *
   * @param {string} emoji
   * @returns {Promise<void>}
   */
  const handleAddEmoji = useCallback(
    async (emoji) => {
      const result = await addEmoji(emoji, activeCategory)
      if (result.success) {
        // Brief flash on the card to confirm
        setAddedFlash(emoji)
        setTimeout(() => setAddedFlash(null), 800)
      } else {
        addToast?.(result.error || t('error'), 'error')
      }
    },
    [addEmoji, activeCategory, addToast, t]
  )

  /**
   * Adds every emoji of the current category at once.
   *
   * @returns {Promise<void>}
   */
  const handleAddCategory = useCallback(async () => {
    const result = await addCategory(activeCategory, emojis)
    if (result.success) {
      addToast?.(
        t('emojiDiscoverCategoryAdded').replace('{count}', result.added),
        'success'
      )
    } else {
      addToast?.(t('emojiDiscoverCategoryAlreadyOwned'), 'info')
    }
  }, [addCategory, activeCategory, emojis, addToast, t])

  // ─── RENDER ─────────────────────────────────────────────────────────
  const ownedCount = emojis.filter((e) => hasEmoji(e)).length
  const allOwned = emojis.length > 0 && ownedCount === emojis.length

  return (
    <div
      data-testid="emoji-discover-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Preload progress bar */}
      {isPreloading && (
        <div
          data-testid="emoji-discover-preload-bar"
          style={{
            padding: '4px 20px',
            background: 'var(--accent-light)',
            borderBottom: '1px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <i
              className="ti ti-loader"
              style={{
                animation: 'spin 1s linear infinite',
                fontSize: 14,
                color: 'var(--accent)',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>
              {preloadStatus}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 80,
              height: 4,
              background: 'var(--bg-tertiary)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${preloadProgress}%`,
                height: '100%',
                background: 'var(--accent)',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {preloadProgress}%
          </span>
        </div>
      )}

      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Categories sidebar */}
        <div
          data-testid="emoji-discover-categories"
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 12px 8px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i
                className="ti ti-mood-smile-beam"
                style={{ color: 'var(--accent)' }}
              />
              {t('emojiDiscoverTitle')}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                marginTop: 2,
              }}
            >
              {t('emojiDiscoverSub')}
              {isPreloadComplete && (
                <span style={{ marginLeft: 6, color: 'var(--success)' }}>
                  · ✅
                </span>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {EMOJI_DISCOVER_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id
              const isCached = cacheInfo[cat.id]?.count > 0

              return (
                <button
                  key={cat.id}
                  data-testid={`emoji-discover-cat-${cat.id}`}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  style={{
                    borderLeft: `2px solid ${
                      isActive ? 'var(--accent)' : 'transparent'
                    }`,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                  <span className="label" style={{ fontSize: 12 }}>
                    {t(cat.labelKey) || cat.id}
                  </span>
                  {isCached && !isActive && (
                    <span
                      style={{
                        fontSize: 9,
                        marginLeft: 'auto',
                        opacity: 0.5,
                      }}
                      title="Cached"
                    >
                      💾
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {t('emojiDiscoverTitle')}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                }}
              >
                {emojis.length > 0 &&
                  t('emojiDiscoverCategoryEmojiCount').replace(
                    '{count}',
                    emojis.length
                  )}
                {emojis.length > 0 &&
                  ` · ${ownedCount}/${emojis.length} ${t(
                    'emojiDiscoverAdded'
                  ).toLowerCase()}`}
              </div>
            </div>

            <button
              data-testid="emoji-discover-add-category-button"
              className="btn-primary btn-sm"
              onClick={handleAddCategory}
              disabled={loading || emojis.length === 0 || allOwned}
              style={{ minHeight: 34 }}
            >
              <i className="ti ti-plus" />
              {t('emojiDiscoverAddCategory')}
            </button>

            <button
              data-testid="emoji-discover-refresh-button"
              className="btn-secondary btn-sm"
              onClick={() => loadCategory(activeCategory, true)}
              disabled={loading}
              style={{ minHeight: 34 }}
              title={t('emojiDiscoverRetry')}
            >
              <i
                className={`ti ${loading ? 'ti-loader' : 'ti-refresh'}`}
                style={
                  loading ? { animation: 'spin 1s linear infinite' } : {}
                }
              />
            </button>
          </div>

          <div
            data-testid="emoji-discover-grid"
            style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}
          >
            {loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 40,
                  color: 'var(--text-tertiary)',
                }}
              >
                <i
                  className="ti ti-loader"
                  style={{
                    animation: 'spin 1s linear infinite',
                    fontSize: 32,
                    display: 'block',
                    marginBottom: 12,
                  }}
                />
                {t('emojiDiscoverLoading')}
              </div>
            )}

            {error && !loading && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 40,
                  color: 'var(--text-tertiary)',
                }}
              >
                <i
                  className="ti ti-alert-triangle"
                  style={{ fontSize: 32, color: 'var(--warning)' }}
                />
                <div style={{ marginTop: 12 }}>{error}</div>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => loadCategory(activeCategory, true)}
                  style={{ marginTop: 12 }}
                >
                  {t('emojiDiscoverRetry')}
                </button>
              </div>
            )}

            {!loading && emojis.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
                  gap: 8,
                }}
              >
                {emojis.map((emoji) => {
                  const isOwned = hasEmoji(emoji)
                  const isFlashing = addedFlash === emoji
                  return (
                    <button
                      key={emoji}
                      data-testid={`emoji-discover-item-${emoji}`}
                      onClick={() => !isOwned && handleAddEmoji(emoji)}
                      disabled={isOwned}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        background: isOwned
                          ? 'var(--bg-tertiary)'
                          : 'var(--bg-secondary)',
                        border: `1px solid ${
                          isFlashing
                            ? 'var(--success)'
                            : isOwned
                              ? 'var(--success)'
                              : 'var(--border)'
                        }`,
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 26,
                        cursor: isOwned ? 'default' : 'pointer',
                        opacity: isOwned ? 0.55 : 1,
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (!isOwned) {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.transform = 'scale(1.08)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isOwned) {
                          e.currentTarget.style.borderColor = 'var(--border)'
                          e.currentTarget.style.transform = 'scale(1)'
                        }
                      }}
                      title={
                        isOwned
                          ? t('emojiDiscoverAdded')
                          : t('emojiDiscoverAddEmoji')
                      }
                    >
                      {emoji}
                      {isOwned && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 2,
                            fontSize: 8,
                            color: 'var(--success)',
                          }}
                        >
                          <i className="ti ti-check" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}