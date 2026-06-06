import { useState, useEffect, useRef } from 'react'
import { Howl } from 'howler'

// Catégories — les pages trending/best chargent via JS donc on utilise
// des recherches équivalentes qui retournent du HTML statique parsable
const CATEGORIES = [
  // Sélections populaires (via recherche)
  { id: 'trending',    label: '🔥 Tendances',        mode: 'search',    query: 'meme' },
  { id: 'best',        label: '🏆 Classiques',        mode: 'search',    query: 'vine boom bruh airhorn oof' },
  { id: 'french',      label: '🇫🇷 Sons français',    mode: 'search',    query: 'francais' },
  { id: 'discord',     label: '💬 Discord',           mode: 'search',    query: 'discord' },
  // Catégories officielles myinstants (HTML statique)
  { id: 'anime',       label: '⛩️ Anime & Manga',     mode: 'category',  query: 'anime & manga' },
  { id: 'games',       label: '🎮 Jeux vidéo',        mode: 'category',  query: 'games' },
  { id: 'memes',       label: '😂 Memes',             mode: 'category',  query: 'memes' },
  { id: 'movies',      label: '🎬 Films',             mode: 'category',  query: 'movies' },
  { id: 'music',       label: '🎵 Musique',           mode: 'category',  query: 'music' },
  { id: 'politics',    label: '🗳️ Politique',         mode: 'category',  query: 'politics' },
  { id: 'pranks',      label: '🤣 Canulars',          mode: 'category',  query: 'pranks' },
  { id: 'reactions',   label: '😱 Réactions',         mode: 'category',  query: 'reactions' },
  { id: 'sfx',         label: '🔊 Effets sonores',    mode: 'category',  query: 'sound effects' },
  { id: 'sports',      label: '⚽ Sports',            mode: 'category',  query: 'sports' },
  { id: 'tv',          label: '📺 Télévision',        mode: 'category',  query: 'television' },
  { id: 'tiktok',      label: '📱 TikTok Trends',     mode: 'category',  query: 'tiktok trends' },
  { id: 'viral',       label: '📣 Viral',             mode: 'category',  query: 'viral' },
  { id: 'whatsapp',    label: '💬 Whatsapp',          mode: 'category',  query: 'whatsapp audios' },
]

export default function Discover({ store, addToast }) {
  const [sounds, setSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [downloading, setDownloading] = useState({})
  const [previewing, setPreviewing] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(null)
  const [error, setError] = useState('')
  const [previewVolume, setPreviewVolume] = useState(70)
  const previewHowlRef = useRef(null)

  const downloadedNames = store.sounds.map(s => s.name.toLowerCase().trim())

  const fetchSounds = async (category, search = '') => {
    setLoading(true)
    setError('')
    setSounds([])
    try {
      const mode = search ? 'search' : category.mode
      const query = search || category.query
      const result = await window.electronAPI.fetchMyinstants(query, mode)
      if (result.success && result.sounds.length > 0) {
        setSounds(result.sounds)
      } else {
        setError(result.error || 'Aucun son trouvé pour cette recherche.')
      }
    } catch (e) {
      setError('Erreur de connexion à MyInstants.')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSounds(CATEGORIES[0])
    return () => stopPreview()
  }, [])

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

  // Aperçu du son avant téléchargement
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
    const howl = new Howl({
      src: [sound.url],
      html5: true,
      volume: previewVolume / 100,
      onend: () => setPreviewing(null),
      onloaderror: () => {
        setPreviewing(null)
        addToast('Impossible de prévisualiser ce son', 'error')
      }
    })
    previewHowlRef.current = howl
    howl.play()
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
      addToast(`"${sound.name}" ajouté !`, 'success')
    } else {
      addToast(`Erreur : ${result.error}`, 'error')
    }
    setDownloading(d => ({ ...d, [sound.id]: false }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Découverte</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Sons depuis <strong>MyInstants</strong> · {sounds.length} résultats
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Volume aperçu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-volume" style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />
              <input type="range" min="0" max="100" value={previewVolume}
                onChange={e => {
                  const v = Number(e.target.value)
                  setPreviewVolume(v)
                  if (previewHowlRef.current) previewHowlRef.current.volume(v / 100)
                }}
                style={{ width: 80, accentColor: 'var(--accent)', cursor: 'pointer' }}
                title={`Volume aperçu : ${previewVolume}%`}
              />
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 28 }}>{previewVolume}%</span>
            </div>
            <a href="https://www.myinstants.com" target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-external-link" /> myinstants.com
            </a>
          </div>
        </div>

        {/* Barre de recherche */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un son... (ex: vine boom, discord, anime)"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>
            <i className="ti ti-search" /> Chercher
          </button>
          {(searchQuery || loading) && (
            <button type="button" className="btn-secondary" onClick={() => { setSearchQuery(''); fetchSounds(activeCategory) }}>
              <i className="ti ti-x" />
            </button>
          )}
        </form>

        {/* Catégories scrollables */}
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

      {/* Contenu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Chargement */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 14, color: 'var(--text-secondary)' }}>
            <i className="ti ti-loader" style={{ fontSize: 36, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 13 }}>Chargement depuis MyInstants...</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Résolution des liens audio en cours</div>
          </div>
        )}

        {/* Erreur */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
            <i className="ti ti-wifi-off" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
            <div style={{ fontWeight: 500, marginBottom: 6 }}>{error}</div>
            <button className="btn-secondary" onClick={() => fetchSounds(activeCategory, searchQuery)}>
              <i className="ti ti-refresh" /> Réessayer
            </button>
          </div>
        )}

        {/* Grille de sons */}
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
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Modal choix profil */}
      {showProfileModal && (
        <ProfilePickerModal
          sound={showProfileModal}
          profiles={store.profiles}
          onConfirm={(profileId) => confirmDownload(showProfileModal, profileId)}
          onClose={() => setShowProfileModal(null)}
        />
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { height: 4px; width: 6px; }
      `}</style>
    </div>
  )
}

function SoundDiscoverCard({ sound, owned, isDownloading, isPreviewing, onPreview, onDownload }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: `1px solid ${isPreviewing ? 'var(--accent)' : owned ? 'var(--success)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      transition: 'border-color 0.15s',
      boxShadow: isPreviewing ? '0 0 0 3px rgba(124,111,247,0.2)' : 'none'
    }}>
      {/* Zone emoji / aperçu */}
      <div
        onClick={onPreview}
        style={{
          background: isPreviewing ? 'var(--accent-light)' : 'var(--bg-tertiary)',
          padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, cursor: 'pointer', position: 'relative', transition: 'background 0.15s'
        }}
        title="Cliquer pour écouter"
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
        {/* Nom */}
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sound.name}>
          {sound.name}
        </div>

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Bouton aperçu */}
          <button
            onClick={onPreview}
            style={{
              flex: '0 0 auto', padding: '5px 8px', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${isPreviewing ? 'var(--accent)' : 'var(--border)'}`,
              background: isPreviewing ? 'var(--accent-light)' : 'transparent',
              color: isPreviewing ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12, cursor: 'pointer'
            }}
            title={isPreviewing ? 'Arrêter' : 'Écouter'}>
            <i className={`ti ${isPreviewing ? 'ti-player-stop-filled' : 'ti-player-play'}`} />
          </button>

          {/* Bouton télécharger */}
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
            {owned ? 'Ajouté' : isDownloading ? '...' : 'Ajouter'}
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

function ProfilePickerModal({ sound, profiles, onConfirm, onClose }) {
  const [selectedProfile, setSelectedProfile] = useState('all')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span style={{ fontSize: 22 }}>{sound.emoji}</span>
          Ajouter "{sound.name}" à...
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
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={() => onConfirm(selectedProfile)}>
            <i className="ti ti-download" /> Télécharger
          </button>
        </div>
      </div>
    </div>
  )
}