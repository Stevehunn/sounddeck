import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import { LANGUAGES, useTranslation } from '../i18n'
import ConfirmModal from '../components/ConfirmModal'

// ─── CONFIGURATION DES CATÉGORIES SIMPLIFIÉE ────────────────────────────────
const CATEGORY_CONFIG = {
  trending: { 
    icon: '🔥', 
    key: 'catTrending', 
    mode: 'local', 
    query: '',
  },
  best: { 
    icon: '🏆', 
    key: 'catBest', 
    mode: 'multi', 
    query: 'vine boom,bruh,airhorn,oof',
  },
  multimedia: { 
    icon: '🎬', 
    key: 'catMultimedia', 
    mode: 'multi', 
    query: 'movies,television,music,sound effects,sound effect',
  },
  memes: { 
    icon: '😂', 
    key: 'catMemes', 
    mode: 'multi', 
    query: 'memes,viral',
  },
  gaming: { 
    icon: '🎮', 
    key: 'catGaming', 
    mode: 'multi', 
    query: 'games,discord,notification,ping',
  },
  anime: { 
    icon: '⛩️', 
    key: 'catAnime', 
    mode: 'search', 
    query: 'anime & manga',
  },
}

// URLs par pays pour le mode local
const BASE_URLS = {
  fr: 'https://www.myinstants.com/fr/index/fr/',
  en: 'https://www.myinstants.com/fr/index/us/',
  es: 'https://www.myinstants.com/fr/index/es/',
}

// ─── CACHE ──────────────────────────────────────────────────────────────────
const CACHE_KEY = 'sounddeck_discover_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 heures

function getCachedCategory(categoryId) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const entry = cache[categoryId]
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      delete cache[categoryId]
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
      return null
    }
    
    return entry.data
  } catch (e) {
    return null
  }
}

function setCachedCategory(categoryId, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    cache[categoryId] = {
      timestamp: Date.now(),
      data: data
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('Erreur sauvegarde cache:', e)
  }
}

function getCacheInfo() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
    const info = {}
    for (const [key, entry] of Object.entries(cache)) {
      const age = Date.now() - entry.timestamp
      const hours = Math.floor(age / (60 * 60 * 1000))
      info[key] = {
        age: hours,
        expired: age > CACHE_DURATION,
        count: entry.data?.length || 0
      }
    }
    return info
  } catch (e) {
    return {}
  }
}

function formatCacheAge(hours, tr) {
  if (hours < 1) return tr('discoverCacheRecent')
  if (hours === 1) return `1${tr('discoverCacheAge')}`
  return `${hours}${tr('discoverCacheAge')}`
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────

export default function Discover({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  
  const [sounds, setSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [error, setError] = useState('')
  const [previewLevel, setPreviewLevel] = useState(store.previewVolume ?? 50)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [cacheInfo, setCacheInfo] = useState({})
  const [isPreloading, setIsPreloading] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState(0)
  const [preloadTotal, setPreloadTotal] = useState(0)
  const [preloadStatus, setPreloadStatus] = useState('')
  const [isPreloadComplete, setIsPreloadComplete] = useState(false)
  
  const previewHowlRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  const getEffectiveVolume = () => Math.round((store.volume * previewLevel) / 100)

  const updateHowlVolume = (level) => {
    if (previewHowlRef.current && previewing) {
      const effectiveVolume = Math.round((store.volume * level) / 100)
      const volumeRatio = Math.max(0.01, effectiveVolume / 100)
      previewHowlRef.current.volume(volumeRatio)
    }
  }

  // ─── CHARGEMENT DES SONS ──────────────────────────────────────────────────

  const fetchSounds = async (categoryId, query = '', forceRefresh = false) => {
    const category = CATEGORY_CONFIG[categoryId]
    if (!category) return

    if (!forceRefresh && !query) {
      const cached = getCachedCategory(categoryId)
      if (cached && cached.length > 0) {
        setSounds(cached)
        setError('')
        setLastRefresh(Date.now())
        setCacheInfo(getCacheInfo())
        return
      }
    }

    setLoading(true)
    setError('')
    setSounds([])

    try {
      let mode = category.mode
      let search = query || category.query

      if (mode === 'local' && query && query.trim()) {
        mode = 'search'
        search = query.trim()
      }

      if (mode === 'local') {
        const langData = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]
        const country = langData.country || 'fr'
        search = BASE_URLS[country] || BASE_URLS.fr
      }

      if (mode === 'multi') {
        const terms = search.split(',').map(t => t.trim()).filter(Boolean)
        const results = []
        const seen = new Set()
        
        for (const term of terms) {
          const result = await window.electronAPI.fetchMyinstants(term, 'search', lang)
          if (result.success) {
            for (const sound of result.sounds) {
              if (!seen.has(sound.slug)) {
                seen.add(sound.slug)
                results.push(sound)
              }
            }
          }
          await new Promise(r => setTimeout(r, 200))
        }
        
        setSounds(results)
        if (!query) {
          setCachedCategory(categoryId, results)
        }
        if (results.length === 0) setError(tr('noResult'))
        setLoading(false)
        setLastRefresh(Date.now())
        setCacheInfo(getCacheInfo())
        return
      }

      const result = await window.electronAPI.fetchMyinstants(search, mode, lang)
      
      if (result.success && result.sounds.length > 0) {
        setSounds(result.sounds)
        if (!query) {
          setCachedCategory(categoryId, result.sounds)
        }
        setLastRefresh(Date.now())
        setCacheInfo(getCacheInfo())
      } else {
        setError(result.error || tr('noResult'))
      }
    } catch (e) {
      console.error('Error fetching sounds:', e)
      setError(tr('connectionError'))
    }
    
    setLoading(false)
  }

  // ─── PRÉCHARGEMENT ────────────────────────────────────────────────────────

  const preloadAllCategories = useCallback(async () => {
    if (isPreloadComplete || isPreloading) return
    
    // Vérifier si toutes les catégories sont déjà en cache
    const allCached = Object.keys(CATEGORY_CONFIG).every(id => {
      const cached = getCachedCategory(id)
      return cached && cached.length > 0
    })
    
    if (allCached) {
      setIsPreloadComplete(true)
      return
    }

    setIsPreloading(true)
    
    const categories = Object.entries(CATEGORY_CONFIG)
    const total = categories.length
    let loaded = 0
    
    setPreloadTotal(total)
    setPreloadStatus(tr('discoverPreloading'))
    
    for (const [id, config] of categories) {
      // Vérifier si déjà en cache
      const cached = getCachedCategory(id)
      if (cached && cached.length > 0) {
        loaded++
        setPreloadProgress(Math.round((loaded / total) * 100))
        continue
      }
      
      try {
        let mode = config.mode
        let search = config.query
        
        if (mode === 'local') {
          const langData = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]
          const country = langData.country || 'fr'
          search = BASE_URLS[country] || BASE_URLS.fr
        }
        
        if (mode === 'multi') {
          const terms = search.split(',').map(t => t.trim()).filter(Boolean)
          const results = []
          const seen = new Set()
          
          for (const term of terms) {
            const result = await window.electronAPI.fetchMyinstants(term, 'search', lang)
            if (result.success) {
              for (const sound of result.sounds) {
                if (!seen.has(sound.slug)) {
                  seen.add(sound.slug)
                  results.push(sound)
                }
              }
            }
            await new Promise(r => setTimeout(r, 200))
          }
          
          if (results.length > 0) {
            setCachedCategory(id, results)
          }
        } else {
          const result = await window.electronAPI.fetchMyinstants(search, mode, lang)
          if (result.success && result.sounds.length > 0) {
            setCachedCategory(id, result.sounds)
          }
        }
        
        loaded++
        setPreloadProgress(Math.round((loaded / total) * 100))
        setPreloadStatus(`${tr('discoverPreloadProgress')} ${loaded}/${total}`)
        
        await new Promise(r => setTimeout(r, 300))
        
      } catch (e) {
        console.warn(`⚠️ Échec préchargement de ${id}:`, e)
        loaded++
        setPreloadProgress(Math.round((loaded / total) * 100))
      }
    }
    
    setIsPreloading(false)
    setPreloadProgress(100)
    setIsPreloadComplete(true)
    setPreloadStatus(`✅ ${tr('discoverPreloadComplete')}`)
    setCacheInfo(getCacheInfo())
    
  }, [lang, tr, isPreloadComplete, isPreloading])

  // ─── INITIALISATION ──────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await fetchSounds('trending')
      setCacheInfo(getCacheInfo())
      
      // Lancer le préchargement en arrière-plan
      setTimeout(() => {
        preloadAllCategories()
      }, 1000)
    }
    
    init()
    return () => stopPreview()
  }, [lang])

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId)
    setSearchQuery('')
    fetchSounds(categoryId)
  }

  const handleRefresh = () => {
    fetchSounds(activeCategory, '', true)
    addToast(`🔄 ${tr('discoverRefreshed')}`, 'info')
  }

  const handleClearCache = () => {
    setShowConfirmModal(true)
  }

  const confirmClearCache = () => {
    localStorage.removeItem(CACHE_KEY)
    setCacheInfo({})
    setIsPreloadComplete(false)
    fetchSounds(activeCategory, '', true)
    addToast(`🗑️ ${tr('discoverCacheCleared')}`, 'info')
    setShowConfirmModal(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) {
      fetchSounds(activeCategory)
      return
    }
    fetchSounds(activeCategory, query)
  }

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSounds(activeCategory, value.trim())
      }, 500)
    }
  }

  const stopPreview = () => {
    if (previewHowlRef.current) {
      previewHowlRef.current.stop()
      previewHowlRef.current.unload()
      previewHowlRef.current = null
    }
    setPreviewing(null)
  }

  const togglePreview = (sound) => {
    if (previewing === sound.id) {
      stopPreview()
      return
    }
    
    stopPreview()
    setPreviewing(sound.id)
    
    const volumeRatio = Math.max(0.01, getEffectiveVolume() / 100)
    
    const howl = new Howl({
      src: [sound.url],
      html5: true,
      volume: volumeRatio,
      onend: () => setPreviewing(null),
      onloaderror: () => {
        setPreviewing(null)
        addToast(tr('previewError'), 'error')
      }
    })
    
    previewHowlRef.current = howl
    howl.play()
  }

  const handlePreviewLevelChange = (value) => {
    const newLevel = Math.max(0, Math.min(100, Number(value)))
    setPreviewLevel(newLevel)
    store.updatePreviewVolume?.(newLevel)
    updateHowlVolume(newLevel)
  }

  const handleDownload = (sound) => {
    stopPreview()
    setShowProfileModal(sound)
  }

  const confirmDownload = async (sound, profileId) => {
    setShowProfileModal(null)
    setDownloading(prev => ({ ...prev, [sound.id]: true }))
    
    const fileName = sound.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 40) + '_' + Date.now() + '.mp3'
    
    const result = await window.electronAPI.downloadSoundUrl(sound.url, fileName)
    
    if (result.success) {
      await store.addSound({
        name: sound.name,
        path: result.path,
        emoji: sound.emoji || '🔊',
        profiles: [profileId]
      })
      addToast(`"${sound.name}" ${tr('added')} !`, 'success')
    } else {
      addToast(`${tr('error')} : ${result.error}`, 'error')
    }
    
    setDownloading(prev => ({ ...prev, [sound.id]: false }))
  }

  // ─── AFFICHAGE ────────────────────────────────────────────────────────────

  const categories = Object.entries(CATEGORY_CONFIG).map(([id, config]) => ({
    id,
    ...config,
    label: `${config.icon} ${tr(config.key)}`
  }))

  const isMuted = previewLevel === 0
  const isAtGlobal = previewLevel === 50
  const cacheAge = lastRefresh ? Math.floor((Date.now() - lastRefresh) / (60 * 60 * 1000)) : null
  const isCached = cacheInfo[activeCategory]?.count > 0
  const isExpired = cacheInfo[activeCategory]?.expired || false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{tr('discoverTitle')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {tr('discoverSub')} · {sounds.length} {tr('discoverResults')}
              {isCached && (
                <span style={{ marginLeft: 8, color: 'var(--text-tertiary)' }}>
                  · 💾 {tr('discoverCache')} {formatCacheAge(cacheAge, tr)}
                  {isExpired && <span style={{ color: 'var(--warning)' }}> ⚠️ {tr('discoverCacheExpired')}</span>}
                </span>
              )}
              {isPreloadComplete && (
                <span style={{ marginLeft: 8, color: 'var(--success)' }}>
                  · ✅ {tr('discoverPreloadComplete')}
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Bouton Rafraîchir */}
            <button
              className="btn-secondary btn-sm"
              onClick={handleRefresh}
              disabled={loading}
              style={{ minHeight: 28, fontSize: 11 }}
            >
              <i className={`ti ${loading ? 'ti-loader' : 'ti-refresh'}`} 
                 style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
              {loading ? '...' : `🔄 ${tr('discoverRefresh')}`}
            </button>

            {/* Bouton Vider le cache avec effet de survol rouge */}
            <button
              className="btn-ghost btn-sm"
              onClick={handleClearCache}
              style={{ 
                minHeight: 28, 
                fontSize: 10, 
                color: 'var(--text-tertiary)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--danger)'
                e.currentTarget.style.borderColor = 'var(--danger)'
                e.currentTarget.style.background = 'rgba(224,82,82,0.1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-tertiary)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <i className="ti ti-trash" style={{ fontSize: 12 }} /> {tr('discoverClearCache')}
            </button>

            <VolumeControl
              previewLevel={previewLevel}
              isMuted={isMuted}
              isAtGlobal={isAtGlobal}
              onLevelChange={handlePreviewLevelChange}
              onMuteToggle={() => handlePreviewLevelChange(isMuted ? 50 : 0)}
              onReset={() => handlePreviewLevelChange(50)}
              tr={tr}
            />
          </div>
        </div>

        {/* Barre de recherche */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={tr('searchSound')}
            className="input-lg"
            style={{ flex: 1, borderRadius: 'var(--radius-md)' }}
          />
          <button type="submit" className="btn-primary btn-lg" style={{ borderRadius: 'var(--radius-md)' }}>
            <i className="ti ti-search" /> {tr('searchBtn')}
          </button>
          {(searchQuery || loading) && (
            <button 
              type="button" 
              className="btn-clear-search"
              onClick={() => {
                setSearchQuery('')
                fetchSounds(activeCategory)
              }}
              title="Effacer la recherche"
            >
              <i className="ti ti-trash" />
            </button>
          )}
        </form>

        {/* Catégories */}
        <div className="categories-scroll">
          {categories.map(cat => {
            const isCached = cacheInfo[cat.id]?.count > 0
            return (
              <button
                key={cat.id}
                className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
                style={isCached ? { borderColor: 'var(--success)' } : {}}
              >
                {cat.label}
                {isCached && (
                  <span style={{ 
                    fontSize: 8, 
                    marginLeft: 4, 
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

      {/* Barre de progression du préchargement */}
      {isPreloading && (
        <div style={{
          padding: '6px 20px',
          background: 'var(--accent-light)',
          borderBottom: '1px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 14, color: 'var(--accent)' }} />
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>
              {preloadStatus}
            </span>
          </div>
          <div style={{ 
            flex: 1, 
            minWidth: 100,
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

      {/* Liste des sons */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && <LoadingState tr={tr} />}
        
        {!loading && error && <ErrorState error={error} onRetry={() => fetchSounds(activeCategory, searchQuery, true)} tr={tr} />}
        
        {!loading && !error && sounds.length === 0 && (
          <EmptyState tr={tr} />
        )}

        {!loading && !error && sounds.length > 0 && (
          <>
            {isCached && !loading && (
              <div style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <i className="ti ti-database" style={{ fontSize: 12 }} />
                {tr('discoverFromCache')}
                {cacheAge !== null && (
                  <span>({cacheAge < 1 ? tr('discoverFromCacheLess') : `${cacheAge}${tr('discoverCacheAge')}`})</span>
                )}
                <span style={{ opacity: 0.5 }}>·</span>
                <button
                  onClick={handleRefresh}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontSize: 10,
                    textDecoration: 'underline'
                  }}
                >
                  <i className="ti ti-refresh" style={{ fontSize: 10 }} /> {tr('discoverRefresh')}
                </button>
              </div>
            )}

            <SoundGrid
              sounds={sounds}
              downloadedNames={store.sounds.map(s => s.name.toLowerCase().trim())}
              downloading={downloading}
              previewing={previewing}
              onPreview={togglePreview}
              onDownload={handleDownload}
              lang={lang}
              tr={tr}
            />
          </>
        )}
      </div>

      {/* Modal de confirmation pour vider le cache */}
      {showConfirmModal && (
        <ConfirmModal
          title={tr('discoverClearCache')}
          message={tr('discoverClearCacheConfirm')}
          confirmText={tr('confirm')}  // ← Utilise la traduction
          cancelText={tr('cancel')}    // ← Utilise la traduction
          onConfirm={confirmClearCache}
          onCancel={() => setShowConfirmModal(false)}
          type="danger"
          lang={lang}
        />
      )}

      {/* Modal de choix du profil pour le téléchargement */}
      {showProfileModal && (
        <ProfilePickerModal
          sound={showProfileModal}
          profiles={store.profiles}
          onConfirm={(profileId) => confirmDownload(showProfileModal, profileId)}
          onClose={() => setShowProfileModal(null)}
          lang={lang}
          tr={tr}
        />
      )}
    </div>
  )
}

// ─── SOUS-COMPOSANTS ──────────────────────────────────────────────────────────

function LoadingState({ tr }) {
  return (
    <div className="flex-center" style={{ flexDirection: 'column', height: 200, gap: 14, color: 'var(--text-secondary)' }}>
      <i className="ti ti-loader" style={{ fontSize: 36, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: 13 }}>{tr('loading')}</div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('resolvingLinks')}</div>
    </div>
  )
}

function ErrorState({ error, onRetry, tr }) {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
      <i className="ti ti-wifi-off" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
      <div style={{ fontWeight: 500, marginBottom: 6 }}>{error}</div>
      <button className="btn-secondary" onClick={onRetry}>
        <i className="ti ti-refresh" /> {tr('retry')}
      </button>
    </div>
  )
}

function EmptyState({ tr }) {
  return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
      <i className="ti ti-music-off" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 500 }}>{tr('noResult')}</div>
    </div>
  )
}

function VolumeControl({ previewLevel, isMuted, isAtGlobal, onLevelChange, onMuteToggle, onReset, tr }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 6,
      background: 'var(--bg-tertiary)',
      padding: '4px 10px 4px 6px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      minWidth: 160
    }}>
      <button
        onClick={() => onLevelChange(Math.max(0, previewLevel - 5))}
        disabled={previewLevel <= 0}
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          color: previewLevel <= 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          cursor: previewLevel <= 0 ? 'default' : 'pointer',
          padding: '4px 6px',
          fontSize: 16,
          opacity: previewLevel <= 0 ? 0.4 : 1
        }}
        title="Diminuer (-5%)"
      >
        <i className="ti ti-minus" />
      </button>

      <div 
        style={{ 
          flex: 1,
          height: 6,
          background: 'var(--bg-secondary)',
          borderRadius: 3,
          position: 'relative',
          cursor: 'pointer',
          minWidth: 60,
          border: '1px solid var(--border)',
          overflow: 'visible'
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - rect.left) / rect.width
          onLevelChange(Math.max(0, Math.min(100, Math.round(x * 100))))
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${previewLevel}%`,
          background: isMuted ? 'var(--danger)' : previewLevel < 30 ? 'var(--warning)' : 'var(--accent)',
          borderRadius: 3,
          transition: 'width 0.15s ease, background 0.3s ease',
          boxShadow: isMuted ? 'none' : '0 0 8px rgba(124,111,247,0.2)'
        }} />

        <div style={{
          position: 'absolute',
          top: -4,
          left: '50%',
          width: 2,
          height: 14,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 1,
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 2
        }} />

        {previewLevel > 0 && previewLevel < 100 && (
          <div style={{
            position: 'absolute',
            top: -3,
            left: `${previewLevel}%`,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isMuted ? 'var(--danger)' : 'var(--accent)',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 3,
            boxShadow: '0 0 10px rgba(124,111,247,0.4)',
            border: '2px solid var(--bg-tertiary)'
          }} />
        )}
      </div>

      <button
        onClick={() => onLevelChange(Math.min(100, previewLevel + 5))}
        disabled={previewLevel >= 100}
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          color: previewLevel >= 100 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          cursor: previewLevel >= 100 ? 'default' : 'pointer',
          padding: '4px 6px',
          fontSize: 16,
          opacity: previewLevel >= 100 ? 0.4 : 1
        }}
        title="Augmenter (+5%)"
      >
        <i className="ti ti-plus" />
      </button>

      <div style={{ display: 'flex', gap: 2, marginLeft: 2 }}>
        <button
          onClick={onMuteToggle}
          style={{
            background: isMuted ? 'rgba(224,82,82,0.15)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            color: isMuted ? 'var(--danger)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px 4px',
            fontSize: 14
          }}
          title={isMuted ? 'Activer le son' : 'Couper le son'}
        >
          <i className={`ti ${isMuted ? 'ti-volume-off' : previewLevel < 30 ? 'ti-volume-2' : 'ti-volume'}`} />
        </button>

        {!isAtGlobal && !isMuted && (
          <button
            onClick={onReset}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '4px 4px',
              fontSize: 13
            }}
            title="Réinitialiser au volume global"
          >
            <i className="ti ti-refresh" />
          </button>
        )}
      </div>
    </div>
  )
}

function SoundGrid({ sounds, downloadedNames, downloading, previewing, onPreview, onDownload, lang, tr }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
      {sounds.map(sound => {
        const owned = downloadedNames.includes(sound.name.toLowerCase().trim())
        const isDownloading = downloading[sound.id]
        const isPreviewing = previewing === sound.id
        
        return (
          <SoundDiscoverCard
            key={sound.id}
            sound={sound}
            owned={owned}
            isDownloading={isDownloading}
            isPreviewing={isPreviewing}
            onPreview={() => onPreview(sound)}
            onDownload={() => onDownload(sound)}
            lang={lang}
            tr={tr}
          />
        )
      })}
    </div>
  )
}

function SoundDiscoverCard({ sound, owned, isDownloading, isPreviewing, onPreview, onDownload, lang, tr }) {
  return (
    <div className={`discover-card ${isPreviewing ? 'previewing' : ''} ${owned ? 'owned' : ''}`}>
      <div className="preview" onClick={onPreview} title={tr('clickToListen')}>
        {sound.emoji}
        {isPreviewing && (
          <div className="waves">
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="bar"
                  style={{
                    animation: `wave ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                    height: `${40 + i * 15}%`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="info">
        <div className="name" title={sound.name}>
          {sound.name}
        </div>

        <div className="actions">
          <button
            onClick={onPreview}
            style={{
              flex: '0 0 auto',
              padding: '5px 8px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${isPreviewing ? 'var(--accent)' : 'var(--border)'}`,
              background: isPreviewing ? 'var(--accent-light)' : 'transparent',
              color: isPreviewing ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer'
            }}
            title={isPreviewing ? tr('stopBtn') : tr('previewBtn')}
          >
            <i className={`ti ${isPreviewing ? 'ti-player-stop-filled' : 'ti-player-play'}`} />
          </button>

          <button
            onClick={() => !owned && !isDownloading && onDownload()}
            disabled={owned || isDownloading}
            style={{
              flex: 1,
              padding: '5px 0',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${owned ? 'var(--success)' : 'var(--accent)'}`,
              background: 'transparent',
              color: owned ? 'var(--success)' : 'var(--accent)',
              fontSize: 12,
              cursor: owned ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              opacity: isDownloading ? 0.7 : 1
            }}
          >
            <i className={`ti ${owned ? 'ti-check' : isDownloading ? 'ti-loader' : 'ti-download'}`}
              style={isDownloading ? { animation: 'spin 1s linear infinite' } : {}} />
            {owned ? tr('alreadyAdded') : isDownloading ? '...' : tr('downloadBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProfilePickerModal({ sound, profiles, onConfirm, onClose, lang, tr }) {
  const [selectedProfile, setSelectedProfile] = useState('all')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span style={{ fontSize: 22 }}>{sound.emoji}</span>
          {tr('addTo').replace('{name}', sound.name)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {profiles.map(p => (
            <label
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${selectedProfile === p.id ? 'var(--accent)' : 'var(--border)'}`,
                background: selectedProfile === p.id ? 'var(--accent-light)' : 'transparent',
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="profile"
                value={p.id}
                checked={selectedProfile === p.id}
                onChange={() => setSelectedProfile(p.id)}
              />
              <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: 13 }}>{p.id === 'all' ? tr('allSounds') : p.name}</span>
            </label>
          ))}
        </div>
        <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary btn-lg" onClick={onClose} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
            <i className="ti ti-x" /> {tr('cancel')}
          </button>
          <button className="btn-primary btn-lg" onClick={() => onConfirm(selectedProfile)} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
            <i className="ti ti-download" /> {tr('downloadBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}