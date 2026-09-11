// src/plugins/myinstants/Discover.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Howl } from 'howler'
import { CATEGORIES, CATEGORIES_LIST, DEFAULT_CATEGORIES } from './categories'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function MyInstantsDiscover({ store, addToast }) {
  const { t, currentLang } = useLanguage()
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState(null)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('trending')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [showCategoryEditor, setShowCategoryEditor] = useState(false)
  const [tempSelectedCategories, setTempSelectedCategories] = useState([])
  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [preloadStatus, setPreloadStatus] = useState('')
  const [isPreloadComplete, setIsPreloadComplete] = useState(false)
  const [cacheInfo, setCacheInfo] = useState({})
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState('all')

  const previewHowlRef = useRef(null)
  const preloadAbortRef = useRef(false)

  const CATEGORIES_PREF_KEY = 'myinstants_selected_categories'

  const checkApi = useCallback(() => {
    if (!window.electronAPI?.fetchMyinstants) {
      console.error('❌ [Discover] window.electronAPI.fetchMyinstants non disponible')
      setError(t('myinstantsError') || 'API MyInstants non disponible')
      return false
    }
    return true
  }, [t])

  const loadCategoryPreferences = useCallback(() => {
    try {
      const saved = localStorage.getItem(CATEGORIES_PREF_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const validCategories = parsed.filter(id => CATEGORIES[id])
        if (validCategories.length > 0) {
          setSelectedCategories(validCategories)
          return validCategories
        }
      }
    } catch (e) {
      console.warn('Erreur chargement préférences catégories:', e)
    }
    const defaults = DEFAULT_CATEGORIES.map(cat => cat.id)
    setSelectedCategories(defaults)
    return defaults
  }, [])

  const saveCategoryPreferences = useCallback((categoryIds) => {
    try {
      localStorage.setItem(CATEGORIES_PREF_KEY, JSON.stringify(categoryIds))
      setSelectedCategories(categoryIds)
    } catch (e) {
      console.warn('Erreur sauvegarde préférences catégories:', e)
    }
  }, [])

  const getVisibleCategories = useCallback(() => {
    if (selectedCategories.length === 0) {
      return DEFAULT_CATEGORIES
    }
    return selectedCategories
      .map(id => CATEGORIES[id])
      .filter(Boolean)
  }, [selectedCategories])

  const loadCategory = useCallback(async (categoryId, forceRefresh = false) => {
    const category = CATEGORIES[categoryId]
    if (!category) return

    if (!checkApi()) return

    if (!forceRefresh && activeCategory === categoryId && results.length > 0) {
      return
    }

    if (!forceRefresh) {
      const cached = getCachedCategory(categoryId)
      if (cached && cached.length > 0) {
        setResults(cached)
        setError('')
        setActiveCategory(categoryId)
        setCacheInfo(getCacheInfo())
        return
      }
    }

    setLoading(true)
    setError('')
    setResults([])
    setActiveCategory(categoryId)

    try {
      let mode = category.mode
      let query = category.query

      const fetchWithTimeout = (promise, timeout = 200000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ])
      }

      let result

      if (mode === 'local' || mode === 'trending') {
        result = await fetchWithTimeout(window.electronAPI.fetchMyinstants('', mode === 'local' ? 'local' : 'trending', currentLang))
      } else if (mode === 'multi') {
        const terms = query.split(',').map(t => t.trim()).filter(Boolean)
        const allResults = []
        const seen = new Set()
        const limitedTerms = terms.slice(0, 3)
        for (const term of limitedTerms) {
          const r = await fetchWithTimeout(window.electronAPI.fetchMyinstants(term, 'search', currentLang))
          if (r.success) {
            for (const sound of r.sounds) {
              if (!seen.has(sound.slug)) {
                seen.add(sound.slug)
                allResults.push(sound)
              }
            }
          }
        }
        result = { success: true, sounds: allResults }
      } else {
        result = await fetchWithTimeout(window.electronAPI.fetchMyinstants(query, 'search', currentLang))
      }

      if (result.success) {
        setResults(result.sounds || [])
        if (result.sounds.length > 0) {
          setCachedCategory(categoryId, result.sounds)
        }
        if (result.sounds.length === 0) {
          setError(t('myinstantsNoResults'))
        }
      } else {
        setError(result.error || t('myinstantsError'))
      }
    } catch (e) {
      console.error('❌ [Discover] Erreur chargement catégorie:', e)
      setError(e.message || t('myinstantsError'))
    }

    setLoading(false)
    setCacheInfo(getCacheInfo())
  }, [currentLang, t, activeCategory, results.length, checkApi])

  const preloadAllCategories = useCallback(async (priorityIds = null) => {
    if (isPreloading || isPreloadComplete) return

    const categoryIds = CATEGORIES_LIST.map(cat => cat.id)

    const allCached = categoryIds.every(id => {
      const cached = getCachedCategory(id)
      return cached && cached.length > 0
    })

    if (allCached) {
      setIsPreloadComplete(true)
      setCacheInfo(getCacheInfo())
      return
    }

    if (!checkApi()) return

    setIsPreloading(true)
    preloadAbortRef.current = false

    const total = categoryIds.length
    let loaded = 0

    setPreloadStatus(t('myinstantsPreloading'))

    let priorityList = priorityIds
    if (!priorityList || priorityList.length === 0) {
      priorityList = getVisibleCategories().map(cat => cat.id)
    }

    const otherIds = categoryIds.filter(id => !priorityList.includes(id))
    const sortedIds = [...priorityList, ...otherIds]

    const loadOneCategory = async (id) => {
      if (preloadAbortRef.current) return false

      const cached = getCachedCategory(id)
      if (cached && cached.length > 0) return true

      const config = CATEGORIES[id]
      if (!config) return false

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 200000)
        )

        let result
        if (config.mode === 'local' || config.mode === 'trending') {
          result = await Promise.race([
            window.electronAPI.fetchMyinstants('', config.mode === 'local' ? 'local' : 'trending', currentLang),
            timeoutPromise
          ])
        } else if (config.mode === 'multi') {
          const terms = config.query.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2)
          const allResults = []
          const seen = new Set()
          for (const term of terms) {
            const r = await Promise.race([
              window.electronAPI.fetchMyinstants(term, 'search', currentLang),
              timeoutPromise
            ])
            if (r.success) {
              for (const sound of r.sounds) {
                if (!seen.has(sound.slug)) {
                  seen.add(sound.slug)
                  allResults.push(sound)
                }
              }
            }
          }
          result = { success: true, sounds: allResults }
        } else {
          result = await Promise.race([
            window.electronAPI.fetchMyinstants(config.query, 'search', currentLang),
            timeoutPromise
          ])
        }

        if (result.success && result.sounds.length > 0) {
          setCachedCategory(id, result.sounds)
          return true
        }
        return false
      } catch (e) {
        console.warn(`⚠️ [Discover] Échec préchargement de ${id}:`, e.message)
        return false
      }
    }

    const batchSize = 3
    for (let i = 0; i < sortedIds.length; i += batchSize) {
      if (preloadAbortRef.current) break

      const batch = sortedIds.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(id => loadOneCategory(id))
      )

      loaded += results.filter(Boolean).length
      setPreloadProgress(Math.round((loaded / total) * 100))
      setPreloadStatus(`${t('myinstantsCategoriesLoaded')}: ${loaded}/${total}`)
    }

    setIsPreloading(false)
    setPreloadProgress(100)
    setIsPreloadComplete(true)
    setPreloadStatus(`✅ ${t('myinstantsAllCategoriesLoaded')}`)
    setCacheInfo(getCacheInfo())

    if (!preloadAbortRef.current && priorityList.length > 0) {
      const firstCategory = priorityList[0]
      const cached = getCachedCategory(firstCategory)
      if (cached && cached.length > 0) {
        setResults(cached)
        setActiveCategory(firstCategory)
      } else {
        loadCategory(firstCategory)
      }
    }

  }, [currentLang, isPreloading, isPreloadComplete, t, loadCategory, getVisibleCategories, checkApi])

  const handleSearch = useCallback(async () => {
    if (!checkApi()) return

    if (!search.trim()) {
      loadCategory(activeCategory || 'trending')
      return
    }

    setLoading(true)
    setError('')
    setResults([])

    try {
      const result = await window.electronAPI.fetchMyinstants(search.trim(), 'search', currentLang)
      if (result.success) {
        setResults(result.sounds || [])
        if (result.sounds.length === 0) {
          setError(t('myinstantsNoResults'))
        }
      } else {
        setError(result.error || t('myinstantsError'))
      }
    } catch (e) {
      console.error('❌ [Discover] Erreur recherche:', e)
      setError(e.message || t('myinstantsError'))
    }
    setLoading(false)
  }, [search, currentLang, t, activeCategory, loadCategory, checkApi])

  const isSoundOwned = useCallback((soundName) => {
    return store.sounds.some(s => s.name.toLowerCase() === soundName.toLowerCase())
  }, [store.sounds])

  const openProfileModal = (sound) => {
    setShowProfileModal(sound)
    setSelectedProfile('all')
  }

  const confirmAddSound = useCallback(async () => {
    if (!showProfileModal) return

    setDownloading(prev => ({ ...prev, [showProfileModal.id]: true }))

    try {
      const sound = showProfileModal
      const profiles = selectedProfile === 'all'
        ? ['all']
        : [selectedProfile, ...(selectedProfile !== 'all' ? ['all'] : [])]

      await store.addSound({
        name: sound.name,
        path: sound.url || null,
        emoji: sound.emoji || '🔊',
        profiles: profiles
      })

      addToast(t('myinstantsAdded'), 'success')
      setShowProfileModal(null)
    } catch (e) {
      console.error('❌ [Discover] Erreur ajout:', e)
      addToast(t('myinstantsError') + ': ' + e.message, 'error')
    } finally {
      setDownloading(prev => ({ ...prev, [showProfileModal.id]: false }))
    }
  }, [showProfileModal, selectedProfile, store, addToast, t])

  const togglePreview = (sound) => {
    if (previewing === sound.id) {
      if (previewHowlRef.current) {
        previewHowlRef.current.stop()
        previewHowlRef.current.unload()
        previewHowlRef.current = null
      }
      setPreviewing(null)
      return
    }

    if (!sound.url) {
      addToast(t('myinstantsPreviewError'), 'error')
      return
    }

    try {
      if (previewHowlRef.current) {
        previewHowlRef.current.stop()
        previewHowlRef.current.unload()
      }

      const howl = new Howl({
        src: [sound.url],
        volume: 0.5,
        html5: true,
        onend: () => {
          setPreviewing(null)
          previewHowlRef.current = null
        },
        onloaderror: () => {
          addToast(t('myinstantsPreviewError'), 'error')
          setPreviewing(null)
          previewHowlRef.current = null
        }
      })

      previewHowlRef.current = howl
      setPreviewing(sound.id)
      howl.play()
    } catch (e) {
      console.error('❌ [Discover] Erreur preview:', e)
      addToast(t('myinstantsPreviewError'), 'error')
    }
  }

  const openCategoryEditor = () => {
    setTempSelectedCategories([...selectedCategories])
    setShowCategoryEditor(true)
  }

  const closeCategoryEditor = () => {
    setShowCategoryEditor(false)
  }

  const toggleCategoryInEditor = (categoryId) => {
    setTempSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
  }

  const saveCategoryEditor = () => {
    if (tempSelectedCategories.length === 0) {
      addToast(t('myinstantsSelectAtLeastOneCategory'), 'error')
      return
    }

    saveCategoryPreferences(tempSelectedCategories)
    setShowCategoryEditor(false)
    addToast(t('myinstantsCategoryEditorSaved'), 'success')
    setShowAllCategories(false)
    setCacheInfo(getCacheInfo())

    if (tempSelectedCategories.length > 0) {
      const firstCategory = tempSelectedCategories[0]
      const cached = getCachedCategory(firstCategory)
      if (cached && cached.length > 0) {
        setResults(cached)
        setActiveCategory(firstCategory)
        setError('')
      } else {
        loadCategory(firstCategory, true)
      }
    }
  }

  const resetCategoryEditor = () => {
    const defaults = DEFAULT_CATEGORIES.map(cat => cat.id)
    setTempSelectedCategories(defaults)
  }

  const selectAllCategories = () => {
    const allIds = CATEGORIES_LIST.map(cat => cat.id)
    setTempSelectedCategories(allIds)
  }

  const deselectAllCategories = () => {
    setTempSelectedCategories([])
  }

  const renderCategories = () => {
    const visibleCategories = getVisibleCategories()
    const displayCategories = showAllCategories ? visibleCategories : visibleCategories.slice(0, 8)

    if (visibleCategories.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '8px',
          color: 'var(--text-tertiary)',
          fontSize: 12
        }}>
          <i className="ti ti-category" style={{ marginRight: 4 }} />
          {t('myinstantsNoCategories')}
        </div>
      )
    }

    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <i className="ti ti-category" style={{ marginRight: 4 }} />
            {t('myinstantsCategories')} ({visibleCategories.length})
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              data-testid="discover-category-editor-button"
              className="btn-ghost btn-sm"
              onClick={openCategoryEditor}
              style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
            >
              <i className="ti ti-edit" /> {t('myinstantsCategoryEditor')}
            </button>
            {visibleCategories.length > 8 && (
              <button
                className="btn-ghost btn-sm"
                onClick={() => setShowAllCategories(!showAllCategories)}
                style={{ fontSize: 10, color: 'var(--text-tertiary)' }}
              >
                {showAllCategories ? t('myinstantsShowLess') : t('myinstantsShowMore')}
              </button>
            )}
          </div>
        </div>

        <div
          className="categories-container"
          data-testid="discover-categories"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            maxHeight: showAllCategories ? 'none' : '80px',
            overflow: 'hidden'
          }}
        >
          {displayCategories.map(cat => {
            const isActive = activeCategory === cat.id
            const isCached = cacheInfo[cat.id]?.count > 0
            const categoryLabel = t(cat.labelKey) || cat.labelKey

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSearch('')
                  const cached = getCachedCategory(cat.id)
                  if (cached && cached.length > 0) {
                    setResults(cached)
                    setActiveCategory(cat.id)
                    setError('')
                  } else {
                    loadCategory(cat.id)
                  }
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 11,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? cat.color : 'var(--border)'}`,
                  background: isActive ? `${cat.color}22` : 'var(--bg-tertiary)',
                  color: isActive ? cat.color : 'var(--text-secondary)',
                  fontWeight: isActive ? 500 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = cat.color
                    e.currentTarget.style.color = cat.color
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <span style={{ fontSize: 14 }}>{cat.emoji || cat.icon}</span>
                <span>{categoryLabel}</span>
                {isActive && <i className="ti ti-check" style={{ fontSize: 10, marginLeft: 2 }} />}
                {isCached && !isActive && (
                  <span style={{
                    fontSize: 8,
                    marginLeft: 2,
                    color: 'var(--success)',
                    opacity: 0.6
                  }}>
                    💾
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderCategoryEditor = () => {
    if (!showCategoryEditor) return null

    return (
      <div className="modal-overlay" onClick={closeCategoryEditor}>
        <div
          className="modal"
          data-testid="discover-category-editor-modal"
          style={{ width: 480, maxHeight: '80vh' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-title">
            <i className="ti ti-edit" style={{ color: 'var(--accent)' }} />
            {t('myinstantsCategoryEditor')}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {t('myinstantsCategoryEditorDesc')}
            <span style={{ marginLeft: 8, color: 'var(--text-tertiary)' }}>
              ({tempSelectedCategories.length} {t('myinstantsSelected')})
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: 4,
            marginBottom: 12,
            flexWrap: 'wrap'
          }}>
            <button className="btn-secondary btn-sm" onClick={selectAllCategories}>
              <i className="ti ti-checkbox" /> {t('myinstantsCategoryEditorSelectAll')}
            </button>
            <button className="btn-secondary btn-sm" onClick={deselectAllCategories}>
              <i className="ti ti-checkbox" /> {t('myinstantsCategoryEditorDeselectAll')}
            </button>
            <button className="btn-ghost btn-sm" onClick={resetCategoryEditor}>
              <i className="ti ti-refresh" /> {t('myinstantsCategoryEditorReset')}
            </button>
          </div>

          <div style={{
            maxHeight: 300,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
            padding: '4px 0'
          }}>
            {CATEGORIES_LIST.map(cat => {
              const isSelected = tempSelectedCategories.includes(cat.id)
              const categoryLabel = t(cat.labelKey) || cat.labelKey

              return (
                <label
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategoryInEditor(cat.id)}
                    style={{ accentColor: 'var(--accent)', width: 'auto' }}
                  />
                  <span style={{ fontSize: 14 }}>{cat.emoji || cat.icon}</span>
                  <span style={{ fontSize: 12 }}>{categoryLabel}</span>
                </label>
              )
            })}
          </div>

          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn-secondary btn-lg" onClick={closeCategoryEditor}>
              <i className="ti ti-x" /> {t('myinstantsCategoryEditorCancel')}
            </button>
            <button className="btn-primary btn-lg" onClick={saveCategoryEditor}>
              <i className="ti ti-check" /> {t('myinstantsCategoryEditorSave')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const init = async () => {
      const selected = loadCategoryPreferences()

      if (selected.length > 0) {
        const firstCategory = selected[0]
        await loadCategory(firstCategory)
      } else {
        await loadCategory('trending')
      }

      setCacheInfo(getCacheInfo())
      setIsInitialLoad(false)

      setTimeout(() => {
        preloadAllCategories(selected)
      }, 500)
    }

    init()

    return () => {
      preloadAbortRef.current = true
      if (previewHowlRef.current) {
        previewHowlRef.current.stop()
        previewHowlRef.current.unload()
        previewHowlRef.current = null
      }
    }
  }, [])

  if (isInitialLoad && results.length === 0 && !loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-tertiary)',
        gap: 12
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24 }} />
        <span>{t('myinstantsLoading')}</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* En-tête */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <div style={{
          fontWeight: 600,
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <i className="ti ti-compass" style={{ color: 'var(--accent)' }} />
          {t('myinstantsTitle')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {results.length > 0 && `${results.length} ${t('myinstantsSoundsAvailable')}`}
          {activeCategory && CATEGORIES[activeCategory] && ` · ${t(CATEGORIES[activeCategory].labelKey)}`}
          {search && ` · ${t('myinstantsResultsFor')} "${search}"`}
          {isPreloadComplete && (
            <span style={{ marginLeft: 8, color: 'var(--success)' }}>
              · ✅ {t('myinstantsAllCategoriesLoaded')}
            </span>
          )}
        </div>
      </div>

      {/* Barre de progression du préchargement */}
      {isPreloading && (
        <div style={{
          padding: '4px 20px',
          background: 'var(--accent-light)',
          borderBottom: '1px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 14, color: 'var(--accent)' }} />
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>
              {preloadStatus}
            </span>
          </div>
          <div style={{
            flex: 1,
            minWidth: 80,
            height: 4,
            background: 'var(--bg-tertiary)',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${preloadProgress}%`,
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            {preloadProgress}%
          </span>
        </div>
      )}

      {/* Barre de recherche */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 8 }}>
          <input
            data-testid="discover-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('myinstantsSearchPlaceholder')}
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={loading}
            style={{ minWidth: 80 }}
          >
            {loading ? (
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <><i className="ti ti-search" /> {t('myinstantsSearch')}</>
            )}
          </button>

          {search && (
            <button
              className="btn-clear-search"
              onClick={() => {
                setSearch('')
                loadCategory(activeCategory || 'trending')
              }}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '0 14px',
                minHeight: 40,
                minWidth: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                cursor: 'pointer',
                transition: 'all var(--transition-base) ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(224, 82, 82, 0.15)'
                e.currentTarget.style.color = 'var(--danger)'
                e.currentTarget.style.borderColor = 'var(--danger)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-tertiary)'
                e.currentTarget.style.color = 'var(--text-tertiary)'
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
              title={t('myinstantsClearSearch')}
            >
              <i className="ti ti-trash" />
            </button>
          )}
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => loadCategory(activeCategory || 'trending', true)}
          disabled={loading}
          style={{ fontSize: 11 }}
        >
          <i className={`ti ${loading ? 'ti-loader' : 'ti-refresh'}`}
            style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          {t('myinstantsRefresh')}
        </button>
      </div>

      {/* Catégories */}
      <div style={{
        padding: '8px 20px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        background: 'var(--bg-secondary)'
      }}>
        {renderCategories()}
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-tertiary)'
          }}>
            <i className="ti ti-loader" style={{
              animation: 'spin 1s linear infinite',
              fontSize: 32,
              display: 'block',
              marginBottom: 12
            }} />
            {t('myinstantsLoading')}
          </div>
        )}

        {error && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-tertiary)'
          }}>
            <i className="ti ti-alert-triangle" style={{
              fontSize: 32,
              display: 'block',
              marginBottom: 12,
              color: 'var(--warning)'
            }} />
            {error}
            <br />
            <button
              className="btn-secondary btn-sm"
              onClick={() => loadCategory(activeCategory || 'trending', true)}
              style={{ marginTop: 12 }}
            >
              {t('myinstantsRefresh')}
            </button>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-tertiary)'
          }}>
            <i className="ti ti-music-off" style={{
              fontSize: 48,
              display: 'block',
              marginBottom: 16,
              color: 'var(--border)'
            }} />
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              {t('myinstantsNoResults')}
            </div>
            <div style={{ fontSize: 13 }}>
              {search ? t('myinstantsTryDifferentSearch') : t('myinstantsSelectCategory')}
            </div>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12
          }}>
            {results.map((sound, index) => {
              const owned = isSoundOwned(sound.name)
              const isDownloading = downloading[sound.id]
              const isPreviewing = previewing === sound.id

              return (
                <div
                  key={sound.id}
                  data-testid={index === 0 ? "discover-sound-card" : undefined}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${owned ? 'var(--success)' : isPreviewing ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    textAlign: 'center',
                    transition: 'border-color 0.2s',
                    opacity: owned ? 0.8 : 1,
                    boxShadow: isPreviewing ? '0 0 20px rgba(124,111,247,0.2)' : 'none'
                  }}
                >
                  <div style={{
                    fontSize: 32,
                    marginBottom: 8,
                    opacity: owned ? 0.6 : 1
                  }}>
                    {sound.emoji || '🔊'}
                  </div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 8,
                    color: owned ? 'var(--text-tertiary)' : 'var(--text-primary)'
                  }}>
                    {sound.name}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      data-testid={index === 0 ? "discover-preview-button" : undefined}
                      className={`btn-${isPreviewing ? 'danger' : 'secondary'} btn-sm`}
                      style={{ flex: 1 }}
                      onClick={() => togglePreview(sound)}
                      disabled={owned}
                    >
                      <i className={`ti ${isPreviewing ? 'ti-player-stop-filled' : 'ti-player-play'}`} />
                    </button>
                    <button
                      data-testid={index === 0 ? "discover-add-button" : undefined}
                      className={`btn-${owned ? 'success' : 'primary'} btn-sm`}
                      style={{ flex: 1 }}
                      onClick={() => openProfileModal(sound)}
                      disabled={owned || isDownloading}
                    >
                      {owned ? (
                        <><i className="ti ti-check" /> {t('myinstantsAlreadyAdded')}</>
                      ) : isDownloading ? (
                        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <><i className="ti ti-download" /> {t('myinstantsAdd')}</>
                      )}
                    </button>
                  </div>
                  {owned && (
                    <div style={{
                      fontSize: 9,
                      color: 'var(--success)',
                      marginTop: 4
                    }}>
                      <i className="ti ti-check" /> {t('myinstantsAlreadyAdded')}
                    </div>
                  )}
                  {isPreviewing && !owned && (
                    <div style={{
                      fontSize: 9,
                      color: 'var(--accent)',
                      marginTop: 4
                    }}>
                      <i className="ti ti-volume" style={{ animation: 'pulse 1s ease infinite' }} /> {t('myinstantsPlaying')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Bouton "Charger plus" */}
        {!loading && results.length > 0 && results.length >= 20 && (
          <div style={{
            textAlign: 'center',
            padding: '20px 0 10px 0',
            borderTop: '1px solid var(--border)',
            marginTop: 16
          }}>
            <button
              data-testid="discover-load-more"
              className="btn-secondary"
              onClick={() => {
                addToast(t('myinstantsLoadingMore'), 'info')
              }}
              style={{
                fontSize: 12,
                padding: '6px 20px',
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className="ti ti-chevron-down" />
              {t('myinstantsShowMore')}
            </button>
          </div>
        )}
      </div>

      {/* Modal de sélection de profil */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(null)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <span style={{ fontSize: 22 }}>{showProfileModal.emoji || '🔊'}</span>
              {t('myinstantsAddToLibrary')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {store.profiles.map(p => {
                const isSelected = selectedProfile === p.id
                return (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--accent-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <input
                      type="radio"
                      name="profile"
                      value={p.id}
                      checked={isSelected}
                      onChange={() => setSelectedProfile(p.id)}
                      style={{ accentColor: 'var(--accent)', width: 'auto' }}
                    />
                    <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: 13 }}>{p.id === 'all' ? t('allSounds') : p.name}</span>
                  </label>
                )
              })}
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary btn-lg" onClick={() => setShowProfileModal(null)} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
                <i className="ti ti-x" /> {t('myinstantsCancel')}
              </button>
              <button className="btn-primary btn-lg" onClick={confirmAddSound} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
                <i className="ti ti-download" /> {t('myinstantsAdd')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition des catégories */}
      {renderCategoryEditor()}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

// ─── FONCTIONS DE CACHE ──────────────────────────────────────────────────

const categoryCache = new Map()

function getCachedCategory(categoryId) {
  return categoryCache.get(categoryId) || null
}

function setCachedCategory(categoryId, sounds) {
  categoryCache.set(categoryId, sounds)
}

function getCacheInfo() {
  const info = {}
  for (const [key, value] of categoryCache) {
    info[key] = { count: value.length, cached: true }
  }
  return info
}