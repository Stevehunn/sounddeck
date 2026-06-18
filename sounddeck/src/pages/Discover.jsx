// sounddeck/src/pages/Discover.jsx
import { useState, useEffect, useRef } from 'react'
import { Howl } from 'howler'
import { LANGUAGES, useTranslation } from '../i18n'

// Helper pour récupérer les catégories avec leurs requêtes selon la langue
function getCategories(lang) {
  const langData = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]
  const country = langData.country || 'fr'
  
  const queries = {
    fr: {
      local: 'fr',
      best: 'vine boom,bruh,airhorn,oof',
      french: 'francais',
      discord: 'discord,notification,ping',
      anime: 'anime & manga',
      games: 'games',
      memes: 'memes',
      movies: 'movies',
      music: 'music',
      politics: 'politics',
      pranks: 'pranks',
      reactions: 'reactions',
      sfx: 'sound effects',
      sports: 'sports',
      tv: 'television',
      tiktok: 'tiktok trends',
      viral: 'viral',
      whatsapp: 'whatsapp audios',
    },
    en: {
      local: 'us',
      best: 'vine boom,bruh,airhorn,oof',
      french: 'us',
      discord: 'discord,notification,ping',
      anime: 'anime & manga',
      games: 'games',
      memes: 'memes',
      movies: 'movies',
      music: 'music',
      politics: 'politics',
      pranks: 'pranks',
      reactions: 'reactions',
      sfx: 'sound effects',
      sports: 'sports',
      tv: 'television',
      tiktok: 'tiktok trends',
      viral: 'viral',
      whatsapp: 'whatsapp audios',
    },
    es: {
      local: 'es',
      best: 'vine boom,bruh,airhorn,oof',
      french: 'es',
      discord: 'discord,notification,ping',
      anime: 'anime & manga',
      games: 'games',
      memes: 'memes',
      movies: 'movies',
      music: 'music',
      politics: 'politics',
      pranks: 'pranks',
      reactions: 'reactions',
      sfx: 'sound effects',
      sports: 'sports',
      tv: 'television',
      tiktok: 'tiktok trends',
      viral: 'viral',
      whatsapp: 'whatsapp audios',
    }
  }

  const q = queries[lang] || queries.fr

  const labels = {
    fr: {
      catLocalTrending: 'Tendances',
      catTrending: 'Tendances',
      catBest: 'Classiques',
      catFrench: 'Sons français',
      catDiscord: 'Discord',
      catAnime: 'Anime & Manga',
      catGames: 'Jeux vidéo',
      catMemes: 'Memes',
      catMovies: 'Films',
      catMusic: 'Musique',
      catPolitics: 'Politique',
      catPranks: 'Canulars',
      catReactions: 'Réactions',
      catSfx: 'Effets sonores',
      catSports: 'Sports',
      catTv: 'Télévision',
      catTiktok: 'TikTok Trends',
      catViral: 'Viral',
      catWhatsapp: 'Whatsapp',
    },
    en: {
      catLocalTrending: 'Trending',
      catTrending: 'Trending',
      catBest: 'Classics',
      catFrench: 'US Sounds',
      catDiscord: 'Discord',
      catAnime: 'Anime & Manga',
      catGames: 'Video games',
      catMemes: 'Memes',
      catMovies: 'Movies',
      catMusic: 'Music',
      catPolitics: 'Politics',
      catPranks: 'Pranks',
      catReactions: 'Reactions',
      catSfx: 'Sound effects',
      catSports: 'Sports',
      catTv: 'Television',
      catTiktok: 'TikTok Trends',
      catViral: 'Viral',
      catWhatsapp: 'Whatsapp',
    },
    es: {
      catLocalTrending: 'Tendencias',
      catTrending: 'Tendencias',
      catBest: 'Clásicos',
      catFrench: 'Sonidos ES',
      catDiscord: 'Discord',
      catAnime: 'Anime & Manga',
      catGames: 'Videojuegos',
      catMemes: 'Memes',
      catMovies: 'Películas',
      catMusic: 'Música',
      catPolitics: 'Política',
      catPranks: 'Bromas',
      catReactions: 'Reacciones',
      catSfx: 'Efectos de sonido',
      catSports: 'Deportes',
      catTv: 'Televisión',
      catTiktok: 'TikTok Trends',
      catViral: 'Viral',
      catWhatsapp: 'Whatsapp',
    }
  }

  const label = labels[lang] || labels.fr

  return [
    { id: 'local',      label: `📍 ${label.catLocalTrending} ${langData.flag}`, mode: 'local', query: q.local },
    { id: 'trending',   label: `🔥 ${label.catTrending}`,                       mode: 'trending',  query: '' },
    { id: 'best',       label: `🏆 ${label.catBest}`,                           mode: 'multi',     query: q.best },
    { id: 'french',     label: `🇫🇷 ${label.catFrench}`,                        mode: 'search',    query: q.french },
    { id: 'discord',    label: `💬 ${label.catDiscord}`,                        mode: 'multi',     query: q.discord },
    { id: 'anime',      label: `⛩️ ${label.catAnime}`,                          mode: 'category',  query: q.anime },
    { id: 'games',      label: `🎮 ${label.catGames}`,                          mode: 'category',  query: q.games },
    { id: 'memes',      label: `😂 ${label.catMemes}`,                          mode: 'category',  query: q.memes },
    { id: 'movies',     label: `🎬 ${label.catMovies}`,                         mode: 'category',  query: q.movies },
    { id: 'music',      label: `🎵 ${label.catMusic}`,                          mode: 'category',  query: q.music },
    { id: 'politics',   label: `🗳️ ${label.catPolitics}`,                      mode: 'category',  query: q.politics },
    { id: 'pranks',     label: `🤣 ${label.catPranks}`,                         mode: 'category',  query: q.pranks },
    { id: 'reactions',  label: `😱 ${label.catReactions}`,                      mode: 'category',  query: q.reactions },
    { id: 'sfx',        label: `🔊 ${label.catSfx}`,                            mode: 'category',  query: q.sfx },
    { id: 'sports',     label: `⚽ ${label.catSports}`,                          mode: 'category',  query: q.sports },
    { id: 'tv',         label: `📺 ${label.catTv}`,                             mode: 'category',  query: q.tv },
    { id: 'tiktok',     label: `📱 ${label.catTiktok}`,                         mode: 'category',  query: q.tiktok },
    { id: 'viral',      label: `📣 ${label.catViral}`,                          mode: 'category',  query: q.viral },
    { id: 'whatsapp',   label: `💬 ${label.catWhatsapp}`,                       mode: 'category',  query: q.whatsapp },
  ]
}

export default function Discover({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const CATEGORIES = getCategories(lang)
  const [sounds, setSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(null)
  const [error, setError] = useState('')
  
  // Volume de preview : 0-100% du volume global (50% = volume global)
  const [previewLevel, setPreviewLevel] = useState(store.previewVolume ?? 50)
  const previewHowlRef = useRef(null)

  // Calculer le volume effectif en pourcentage
  const getEffectiveVolume = () => {
    return Math.round((store.volume * previewLevel) / 100)
  }

  // Mettre à jour le volume du howl en cours si actif
  const updateHowlVolume = (level) => {
    if (previewHowlRef.current && previewing) {
      const effectiveVolume = Math.round((store.volume * level) / 100)
      const volumeRatio = Math.max(0.01, effectiveVolume / 100)
      previewHowlRef.current.volume(volumeRatio)
    }
  }

  const downloadedNames = store.sounds.map(s => s.name.toLowerCase().trim())

  const fetchSounds = async (category, search = '') => {
    setLoading(true)
    setError('')
    setSounds([])
    try {
      let mode = search ? 'search' : category.mode
      let query = search || category.query
      if (mode === 'local') {
        mode = 'local'
        query = category.query
      }
      const result = await window.electronAPI.fetchMyinstants(query, mode, lang)
      if (result.success && result.sounds.length > 0) {
        setSounds(result.sounds)
      } else {
        setError(result.error || tr('noResult'))
      }
    } catch (e) {
      setError(tr('connectionError'))
    }
    setLoading(false)
  }

  useEffect(() => {
    const cats = getCategories(lang)
    setActiveCategory(cats[0])
    fetchSounds(cats[0])
    return () => stopPreview()
  }, [lang])

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat)
    setSearchQuery('')
    fetchSounds(cat)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    fetchSounds(activeCategory, searchQuery.trim())
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
    
    const effectiveVolume = getEffectiveVolume()
    const volumeRatio = Math.max(0.01, effectiveVolume / 100)
    
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

  const decreaseVolume = () => {
    handlePreviewLevelChange(previewLevel - 5)
  }

  const increaseVolume = () => {
    handlePreviewLevelChange(previewLevel + 5)
  }

  // Réinitialiser au volume global (50%)
  const resetPreviewVolume = () => {
    handlePreviewLevelChange(50)
  }

  const handleDownload = (sound) => {
    stopPreview()
    setShowProfileModal(sound)
  }

  const confirmDownload = async (sound, profileId) => {
    setShowProfileModal(null)
    setDownloading(d => ({ ...d, [sound.id]: true }))
    const fileName = sound.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) + '_' + Date.now() + '.mp3'
    const result = await window.electronAPI.downloadSoundUrl(sound.url, fileName)
    if (result.success) {
      await store.addSound({ name: sound.name, path: result.path, emoji: sound.emoji || '🔊', profiles: [profileId] })
      addToast(`"${sound.name}" ${tr('added')} !`, 'success')
    } else {
      addToast(`${tr('error')} : ${result.error}`, 'error')
    }
    setDownloading(d => ({ ...d, [sound.id]: false }))
  }

  const isMuted = previewLevel === 0
  const isAtGlobal = previewLevel === 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{tr('discoverTitle')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {tr('discoverSub')} <strong>MyInstants</strong> · {sounds.length} {tr('discoverResults')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Contrôle du volume avec barre de progression */}
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
              {/* Bouton Diminuer */}
              <button
                onClick={decreaseVolume}
                disabled={previewLevel <= 0}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  color: previewLevel <= 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  cursor: previewLevel <= 0 ? 'default' : 'pointer',
                  padding: '4px 6px',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                  opacity: previewLevel <= 0 ? 0.4 : 1
                }}
                onMouseEnter={e => {
                  if (previewLevel > 0) {
                    e.currentTarget.style.color = 'var(--danger)'
                    e.currentTarget.style.background = 'rgba(224,82,82,0.1)'
                  }
                }}
                onMouseLeave={e => {
                  if (previewLevel > 0) {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
                title="Diminuer le volume (-5%)"
              >
                <i className="ti ti-minus" />
              </button>

              {/* Barre de progression du volume */}
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
                  const newLevel = Math.max(0, Math.min(100, Math.round(x * 100)))
                  handlePreviewLevelChange(newLevel)
                }}
                title="Cliquez pour régler le volume"
              >
                {/* Fond de la barre */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '100%',
                  background: 'var(--bg-hover)',
                  borderRadius: 3,
                  opacity: 0.3
                }} />
                
                {/* Barre de progression */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${previewLevel}%`,
                  background: isMuted 
                    ? 'var(--danger)' 
                    : previewLevel < 30 
                      ? 'var(--warning)' 
                      : 'var(--accent)',
                  borderRadius: 3,
                  transition: 'width 0.15s ease, background 0.3s ease',
                  boxShadow: isMuted ? 'none' : '0 0 8px rgba(124,111,247,0.2)'
                }} />

                {/* Indicateur du milieu (50% = volume global) */}
                <div style={{
                  position: 'absolute',
                  top: -4,
                  left: '50%',
                  width: 2,
                  height: 14,
                  background: 'rgba(255,255,255,0.4)',
                  borderRadius: 1,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                  zIndex: 2
                }} />
                <div style={{
                  position: 'absolute',
                  top: 11,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 7,
                  color: 'rgba(255,255,255,0.3)',
                  pointerEvents: 'none',
                  zIndex: 2,
                  whiteSpace: 'nowrap',
                  fontWeight: 500
                }}>
                  GLOBAL
                </div>

                {/* Repère du volume actuel - petit point lumineux */}
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

              {/* Bouton Augmenter */}
              <button
                onClick={increaseVolume}
                disabled={previewLevel >= 100}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  color: previewLevel >= 100 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                  cursor: previewLevel >= 100 ? 'default' : 'pointer',
                  padding: '4px 6px',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                  opacity: previewLevel >= 100 ? 0.4 : 1
                }}
                onMouseEnter={e => {
                  if (previewLevel < 100) {
                    e.currentTarget.style.color = 'var(--success)'
                    e.currentTarget.style.background = 'rgba(29,158,117,0.1)'
                  }
                }}
                onMouseLeave={e => {
                  if (previewLevel < 100) {
                    e.currentTarget.style.color = 'var(--text-secondary)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
                title="Augmenter le volume (+5%)"
              >
                <i className="ti ti-plus" />
              </button>

              {/* Boutons Mute et Reset */}
              <div style={{ display: 'flex', gap: 2, marginLeft: 2 }}>
                <button
                  onClick={() => handlePreviewLevelChange(isMuted ? 50 : 0)}
                  style={{
                    background: isMuted ? 'rgba(224,82,82,0.15)' : 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    color: isMuted ? 'var(--danger)' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: '4px 4px',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={e => {
                    if (!isMuted) e.currentTarget.style.background = 'transparent'
                  }}
                  title={isMuted ? 'Activer le son' : 'Couper le son'}
                >
                  <i className={`ti ${isMuted ? 'ti-volume-off' : previewLevel < 30 ? 'ti-volume-2' : 'ti-volume'}`} />
                </button>

                {!isAtGlobal && !isMuted && (
                  <button
                    onClick={resetPreviewVolume}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      padding: '4px 4px',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--accent)'
                      e.currentTarget.style.background = 'var(--bg-hover)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text-tertiary)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                    title="Réinitialiser au volume global"
                  >
                    <i className="ti ti-refresh" />
                  </button>
                )}
              </div>
            </div>

            <a href="https://www.myinstants.com" target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-external-link" /> myinstants.com
            </a>
          </div>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tr('searchSound')}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>
            <i className="ti ti-search" /> {tr('searchBtn')}
          </button>
          {(searchQuery || loading) && (
            <button type="button" className="btn-secondary" onClick={() => { setSearchQuery(''); fetchSounds(activeCategory) }}>
              <i className="ti ti-x" />
            </button>
          )}
        </form>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => handleCategoryClick(cat)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', flexShrink: 0,
                border: `1px solid ${activeCategory.id === cat.id ? 'var(--accent)' : 'var(--border)'}`,
                background: activeCategory.id === cat.id ? 'var(--accent-light)' : 'transparent',
                color: activeCategory.id === cat.id ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeCategory.id === cat.id ? 500 : 400
              }}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 14, color: 'var(--text-secondary)' }}>
            <i className="ti ti-loader" style={{ fontSize: 36, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 13 }}>{tr('loading')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{tr('resolvingLinks')}</div>
          </div>
        )}

        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
            <i className="ti ti-wifi-off" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
            <div style={{ fontWeight: 500, marginBottom: 6 }}>{error}</div>
            <button className="btn-secondary" onClick={() => fetchSounds(activeCategory, searchQuery)}>
              <i className="ti ti-refresh" /> {tr('retry')}
            </button>
          </div>
        )}

        {!loading && sounds.length > 0 && (
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
                  onPreview={() => togglePreview(sound)}
                  onDownload={() => handleDownload(sound)}
                  lang={lang}
                />
              )
            })}
          </div>
        )}
      </div>

      {showProfileModal && (
        <ProfilePickerModal
          sound={showProfileModal}
          profiles={store.profiles}
          onConfirm={(profileId) => confirmDownload(showProfileModal, profileId)}
          onClose={() => setShowProfileModal(null)}
          lang={lang}
        />
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { height: 4px; width: 6px; }
      `}</style>
    </div>
  )
}

function SoundDiscoverCard({ sound, owned, isDownloading, isPreviewing, onPreview, onDownload, lang }) {
  const tr = useTranslation(lang || 'fr')
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: `1px solid ${isPreviewing ? 'var(--accent)' : owned ? 'var(--success)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      transition: 'border-color 0.15s',
      boxShadow: isPreviewing ? '0 0 0 3px rgba(124,111,247,0.2)' : 'none'
    }}>
      <div
        onClick={onPreview}
        style={{
          background: isPreviewing ? 'var(--accent-light)' : 'var(--bg-tertiary)',
          padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, cursor: 'pointer', position: 'relative', transition: 'background 0.15s'
        }}
        title={tr('clickToListen')}
      >
        {sound.emoji}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isPreviewing ? 'rgba(124,111,247,0.3)' : 'transparent', transition: 'background 0.15s'
        }}>
          {isPreviewing && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{
                  width: 4, borderRadius: 2, background: 'var(--accent)',
                  animation: `wave ${0.6 + i * 0.1}s ease-in-out infinite alternate`,
                  height: `${40 + i * 15}%`
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sound.name}>
          {sound.name}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onPreview}
            style={{
              flex: '0 0 auto', padding: '5px 8px', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${isPreviewing ? 'var(--accent)' : 'var(--border)'}`,
              background: isPreviewing ? 'var(--accent-light)' : 'transparent',
              color: isPreviewing ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer'
            }}
            title={isPreviewing ? tr('stopBtn') : tr('previewBtn')}>
            <i className={`ti ${isPreviewing ? 'ti-player-stop-filled' : 'ti-player-play'}`} />
          </button>

          <button
            onClick={() => !owned && !isDownloading && onDownload()}
            disabled={owned || isDownloading}
            style={{
              flex: 1, padding: '5px 0', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${owned ? 'var(--success)' : 'var(--accent)'}`,
              background: 'transparent',
              color: owned ? 'var(--success)' : 'var(--accent)',
              fontSize: 12, cursor: owned ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              opacity: isDownloading ? 0.7 : 1
            }}>
            <i className={`ti ${owned ? 'ti-check' : isDownloading ? 'ti-loader' : 'ti-download'}`}
              style={isDownloading ? { animation: 'spin 1s linear infinite' } : {}} />
            {owned ? tr('alreadyAdded') : isDownloading ? '...' : tr('downloadBtn')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

function ProfilePickerModal({ sound, profiles, onConfirm, onClose, lang }) {
  const tr = useTranslation(lang || 'fr')
  const [selectedProfile, setSelectedProfile] = useState('all')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span style={{ fontSize: 22 }}>{sound.emoji}</span>
          {tr('addTo').replace('{name}', sound.name)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {profiles.map(p => (
            <label key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${selectedProfile === p.id ? 'var(--accent)' : 'var(--border)'}`,
              background: selectedProfile === p.id ? 'var(--accent-light)' : 'transparent',
              cursor: 'pointer'
            }}>
              <input type="radio" name="profile" value={p.id} checked={selectedProfile === p.id}
                onChange={() => setSelectedProfile(p.id)} style={{ accentColor: 'var(--accent)', width: 'auto' }} />
              <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: 13 }}>{p.name}</span>
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>{tr('cancel')}</button>
          <button className="btn-primary" onClick={() => onConfirm(selectedProfile)}>
            <i className="ti ti-download" /> {tr('downloadBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}