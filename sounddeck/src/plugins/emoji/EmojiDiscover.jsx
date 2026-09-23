// src/plugins/emoji/EmojiDiscover.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { useEmojis } from '@shared/hooks/useEmojis'
import { useNetwork } from '@shared/contexts'
import { EMOJI_DISCOVER_CATEGORIES } from './categories'

const emojiCache = new Map()

export default function EmojiDiscover({ store, addToast }) {
  const { t, currentLang } = useLanguage()
  const { showNoConnection, ensureOnline } = useNetwork()
  const {
    addEmoji,
    addCategory,
    hasEmoji,
    hasCategory,
    customEmojis,
  } = useEmojis()

  const [activeCategory, setActiveCategory] = useState('smileys')
  const [emojis, setEmojis] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addedFlash, setAddedFlash] = useState(null)

  // ✅ NOUVEAU : état de préchargement
  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [preloadStatus, setPreloadStatus] = useState('')
  const [isPreloadComplete, setIsPreloadComplete] = useState(false)

  // ✅ NOUVEAU : info cache (pour afficher l'état "💾" sur les catégories)
  const [cacheInfo, setCacheInfo] = useState({})

  const isMountedRef = useRef(true)
  const preloadAbortRef = useRef(false)
  const currentCategoryRef = useRef('smileys')

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      preloadAbortRef.current = true
    }
  }, [])

  useEffect(() => {
    currentCategoryRef.current = activeCategory
  }, [activeCategory])

  // ─── HELPERS CACHE ─────────────────────────────────────────────────────
  const getCacheInfo = useCallback(() => {
    const info = {}
    for (const [key, value] of emojiCache) {
      info[key] = { count: value.length, cached: true }
    }
    return info
  }, [])

  const getCachedCategory = useCallback((categoryId) => {
    return emojiCache.get(categoryId) || null
  }, [])

  // ─── CHARGEMENT D'UNE CATÉGORIE ────────────────────────────────────────
  const loadCategory = useCallback(
    async (categoryId, forceRefresh = false) => {
      if (!forceRefresh && emojiCache.has(categoryId)) {
        const cached = emojiCache.get(categoryId)
        setEmojis(cached)
        setError('')
        setCacheInfo(getCacheInfo())
        return
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
          // N'afficher la grille que si c'est toujours la catégorie active
          if (currentCategoryRef.current === categoryId) {
            setEmojis(list)
          }
          if (list.length === 0 && currentCategoryRef.current === categoryId) {
            setError(t('emojiDiscoverEmpty'))
          }
        } else {
          if (result?.isNetworkError) {
            if (currentCategoryRef.current === categoryId) {
              setError('')
            }
            showNoConnection()
          } else {
            if (currentCategoryRef.current === categoryId) {
              setError(result?.error || t('emojiDiscoverError'))
            }
          }
        }
      } catch (e) {
        if (!isMountedRef.current) return
        if (e?.isNetworkError) {
          if (currentCategoryRef.current === categoryId) {
            setError('')
          }
          showNoConnection()
        } else {
          if (currentCategoryRef.current === categoryId) {
            setError(e.message || t('emojiDiscoverError'))
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
          setCacheInfo(getCacheInfo())
        }
      }
    },
    [t, getCacheInfo, showNoConnection]
  )

  // ─── PRÉCHARGEMENT DE TOUTES LES CATÉGORIES ────────────────────────────
  const preloadAllCategories = useCallback(async () => {
    if (isPreloading || isPreloadComplete) return

    const online = await ensureOnline()
    if (!online) {
      setIsPreloadComplete(true)
      return
    }

    const categoryIds = EMOJI_DISCOVER_CATEGORIES.map((c) => c.id)

    // Déjà tout en cache ?
    const allCached = categoryIds.every((id) => {
      const cached = getCachedCategory(id)
      return cached && cached.length > 0
    })

    if (allCached) {
      setIsPreloadComplete(true)
      setCacheInfo(getCacheInfo())
      return
    }

    setIsPreloading(true)
    preloadAbortRef.current = false

    const total = categoryIds.length
    let loaded = 0

    // Priorité : la catégorie active d'abord
    const priority = [currentCategoryRef.current]
    const others = categoryIds.filter((id) => !priority.includes(id))
    const sortedIds = [...priority, ...others]

    setPreloadStatus(
      t('emojiDiscoverPreloading') || 'Préchargement des catégories...'
    )

    const loadOne = async (id) => {
      if (preloadAbortRef.current) return false

      const cached = getCachedCategory(id)
      if (cached && cached.length > 0) return true

      try {
        const result = await window.electronAPI.fetchEmojis?.(id)
        if (result?.success && Array.isArray(result.emojis) && result.emojis.length > 0) {
          emojiCache.set(id, result.emojis)
          return true
        }
        if (result?.isNetworkError) {
          preloadAbortRef.current = true
          if (isMountedRef.current) {
            showNoConnection()
          }
        }
        return false
      } catch (e) {
        console.warn(`⚠️ [EmojiDiscover] Échec préchargement de ${id}:`, e.message)
        if (e?.isNetworkError) {
          preloadAbortRef.current = true
          if (isMountedRef.current) {
            showNoConnection()
          }
        }
        return false
      }
    }

    // Batch de 2 (le scraper fait une requête HTTP par catégorie,
    // trop de parallélisme = rate limiting potentiel sur getemoji.com)
    const batchSize = 2
    for (let i = 0; i < sortedIds.length; i += batchSize) {
      if (preloadAbortRef.current) break

      const batch = sortedIds.slice(i, i + batchSize)
      const results = await Promise.all(batch.map((id) => loadOne(id)))

      loaded += results.filter(Boolean).length
      const progress = Math.round((loaded / total) * 100)
      setPreloadProgress(progress)
      setPreloadStatus(
        `${t('emojiDiscoverCategoriesLoaded') || 'Catégories chargées'} : ${loaded}/${total}`
      )
      setCacheInfo(getCacheInfo())
    }

    if (!isMountedRef.current) return

    setIsPreloading(false)
    setPreloadProgress(100)
    setIsPreloadComplete(true)
    setPreloadStatus(
      `✅ ${t('emojiDiscoverAllCategoriesLoaded')}`
    )
    setCacheInfo(getCacheInfo())
  }, [isPreloading, isPreloadComplete, getCachedCategory, getCacheInfo, t, showNoConnection])

  // ─── EFFET INITIAL : charge la catégorie active + lance le preload ─────
  useEffect(() => {
    // 1. Charge immédiatement la catégorie active (depuis cache si possible)
    const cached = getCachedCategory(activeCategory)
    if (cached) {
      setEmojis(cached)
      setCacheInfo(getCacheInfo())
    } else {
      loadCategory(activeCategory)
    }

    // 2. Lance le preload des autres catégories en arrière-plan
    const timer = setTimeout(() => {
      preloadAllCategories()
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── CHANGEMENT DE CATÉGORIE (rapide si en cache) ──────────────────────
  const handleSelectCategory = useCallback(
    (categoryId) => {
      if (categoryId === activeCategory) return
      setActiveCategory(categoryId)

      const cached = getCachedCategory(categoryId)
      if (cached) {
        setEmojis(cached)
        setError('')
        setCacheInfo(getCacheInfo())
      } else {
        // Fallback : charge à la volée (si preload raté)
        loadCategory(categoryId)
      }
    },
    [activeCategory, getCachedCategory, getCacheInfo, loadCategory]
  )

  // ─── ACTIONS ───────────────────────────────────────────────────────────
  const handleAddEmoji = useCallback(
    async (emoji) => {
      const result = await addEmoji(emoji, activeCategory)
      if (result.success) {
        setAddedFlash(emoji)
        setTimeout(() => setAddedFlash(null), 800)
      } else {
        addToast?.(result.error || t('error'), 'error')
      }
    },
    [addEmoji, activeCategory, addToast, t]
  )

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

  // ─── RENDER ────────────────────────────────────────────────────────────
  const ownedCount = emojis.filter((e) => hasEmoji(e)).length
  const allOwned = emojis.length > 0 && ownedCount === emojis.length

  return (
    <div
      data-testid="emoji-discover-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      {/* ✅ NOUVEAU : Barre de progression du préchargement */}
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

      <div
        style={{ display: 'flex', height: '100%', overflow: 'hidden' }}
      >
        {/* Sidebar catégories */}
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
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
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
                  {/* ✅ NOUVEAU : badge cache */}
                  {isCached && !isActive && (
                    <span
                      style={{
                        fontSize: 9,
                        marginLeft: 'auto',
                        opacity: 0.5,
                      }}
                      title="En cache"
                    >
                      💾
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenu principal */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
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
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {emojis.length > 0 &&
                  t('emojiDiscoverCategoryEmojiCount').replace(
                    '{count}',
                    emojis.length
                  )}
                {emojis.length > 0 &&
                  ` · ${ownedCount}/${emojis.length} ${t('emojiDiscoverAdded').toLowerCase()}`}
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
                style={loading ? { animation: 'spin 1s linear infinite' } : {}}
              />
            </button>
          </div>

          {/* Grille */}
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