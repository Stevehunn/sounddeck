import { useState, useEffect } from 'react'

const PRESET_QUERIES = [
  { label: '🔥 Tendances', query: 'meme' },
  { label: '💥 Viral', query: 'vine boom bruh' },
  { label: '😂 Réactions', query: 'laugh reaction' },
  { label: '🎮 Gaming', query: 'gaming' },
  { label: '🎬 Cinéma', query: 'movie' },
  { label: '🇫🇷 Français', query: 'francais' },
  { label: '😱 Choc', query: 'wtf shock' },
  { label: '🏆 Win', query: 'win epic' },
]

// Sons de secours si le scraping échoue
const FALLBACK_SOUNDS = [
  { id: 'f1', name: 'Vine Boom', emoji: '💥', url: 'https://www.myinstants.com/media/sounds/vine-boom.mp3' },
  { id: 'f2', name: 'Bruh', emoji: '😐', url: 'https://www.myinstants.com/media/sounds/bruh.mp3' },
  { id: 'f3', name: 'Airhorn', emoji: '📣', url: 'https://www.myinstants.com/media/sounds/air-horn.mp3' },
  { id: 'f4', name: 'Sad Trombone', emoji: '🎺', url: 'https://www.myinstants.com/media/sounds/sadtrombone.swf.mp3' },
  { id: 'f5', name: 'Oof', emoji: '😬', url: 'https://www.myinstants.com/media/sounds/oof.mp3' },
  { id: 'f6', name: 'Noot Noot', emoji: '🐧', url: 'https://www.myinstants.com/media/sounds/noot-noot.mp3' },
  { id: 'f7', name: 'Windows XP Error', emoji: '💻', url: 'https://www.myinstants.com/media/sounds/erro.mp3' },
  { id: 'f8', name: 'Ba Dum Tss', emoji: '🥁', url: 'https://www.myinstants.com/media/sounds/ba-dum-tss.mp3' },
  { id: 'f9', name: 'Applause', emoji: '👏', url: 'https://www.myinstants.com/media/sounds/aplausos.mp3' },
  { id: 'f10', name: 'Dramatic Chipmunk', emoji: '🐿️', url: 'https://www.myinstants.com/media/sounds/dramatic-chipmunk.mp3' },
  { id: 'f11', name: 'Mission Impossible', emoji: '🕵️', url: 'https://www.myinstants.com/media/sounds/mission-impossible-theme.mp3' },
  { id: 'f12', name: 'Trollface', emoji: '😏', url: 'https://www.myinstants.com/media/sounds/problemhmm.mp3' },
]

export default function Discover({ store, addToast }) {
  const [sounds, setSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeQuery, setActiveQuery] = useState('meme')
  const [customSearch, setCustomSearch] = useState('')
  const [downloading, setDownloading] = useState({})
  const [showProfileModal, setShowProfileModal] = useState(null)
  const [usedFallback, setUsedFallback] = useState(false)

  const downloadedNames = store.sounds.map(s => s.name.toLowerCase())

  const fetchSounds = async (query) => {
    setLoading(true)
    setUsedFallback(false)
    setSounds([])
    try {
      const result = await window.electronAPI.fetchMyinstants(query)
      if (result.success && result.sounds.length > 0) {
        setSounds(result.sounds)
      } else {
        setSounds(FALLBACK_SOUNDS)
        setUsedFallback(true)
      }
    } catch (e) {
      setSounds(FALLBACK_SOUNDS)
      setUsedFallback(true)
    }
    setLoading(false)
  }

  useEffect(() => { fetchSounds('meme') }, [])

  const handleQueryClick = (query, label) => {
    setActiveQuery(label)
    fetchSounds(query)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (!customSearch.trim()) return
    setActiveQuery(customSearch)
    fetchSounds(customSearch)
  }

  const handleDownload = (sound) => setShowProfileModal(sound)

  const confirmDownload = async (sound, profileId) => {
    setShowProfileModal(null)
    setDownloading(d => ({ ...d, [sound.id]: true }))
    const fileName = sound.name.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now() + '.mp3'
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
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Découverte</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Sons mèmes populaires depuis MyInstants</div>
      </div>

      {/* Recherche + filtres */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={customSearch} onChange={e => setCustomSearch(e.target.value)} placeholder="Rechercher un son... (ex: mario, discord, anime)" style={{ flex: 1 }} />
          <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>
            <i className="ti ti-search" /> Chercher
          </button>
        </form>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PRESET_QUERIES.map(({ label, query }) => (
            <button key={label} onClick={() => handleQueryClick(query, label)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${activeQuery === label ? 'var(--accent)' : 'var(--border)'}`,
                background: activeQuery === label ? 'var(--accent-light)' : 'transparent',
                color: activeQuery === label ? 'var(--accent)' : 'var(--text-secondary)'
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille de sons */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, flexDirection: 'column', gap: 12, color: 'var(--text-secondary)' }}>
            <i className="ti ti-loader" style={{ fontSize: 32, color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            Chargement des sons...
          </div>
        )}

        {!loading && usedFallback && (
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
            <i className="ti ti-wifi-off" style={{ marginRight: 6 }} />
            Impossible de contacter MyInstants — sons de secours affichés.
          </div>
        )}

        {!loading && sounds.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {sounds.map(sound => {
              const owned = downloadedNames.includes(sound.name.toLowerCase())
              const isDownloading = downloading[sound.id]
              return (
                <div key={sound.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                    {sound.emoji}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sound.name}>
                      {sound.name}
                    </div>
                    <button
                      onClick={() => !owned && !isDownloading && handleDownload(sound)}
                      disabled={owned || isDownloading}
                      style={{
                        width: '100%', padding: '6px 0', borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${owned ? 'var(--success)' : 'var(--accent)'}`,
                        background: 'transparent',
                        color: owned ? 'var(--success)' : 'var(--accent)',
                        fontSize: 12, cursor: owned ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        opacity: isDownloading ? 0.7 : 1
                      }}>
                      <i className={`ti ${owned ? 'ti-check' : isDownloading ? 'ti-loader' : 'ti-download'}`}
                        style={isDownloading ? { animation: 'spin 1s linear infinite' } : {}} />
                      {owned ? 'Déjà ajouté' : isDownloading ? 'En cours...' : 'Télécharger'}
                    </button>
                  </div>
                </div>
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
              borderRadius: 'var(--radius-md)', border: `1px solid ${selectedProfile === p.id ? 'var(--accent)' : 'var(--border)'}`,
              background: selectedProfile === p.id ? 'var(--accent-light)' : 'transparent', cursor: 'pointer'
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