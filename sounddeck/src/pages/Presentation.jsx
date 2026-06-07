import { useState, useEffect, useRef } from 'react'
import { playSound, stopSound, isPlaying } from '../utils/audio'

export default function Presentation({ store, onExit }) {
  const [playingId, setPlayingId] = useState(null)
  const [search, setSearch] = useState('')

  const { currentSounds, favoriteSounds, shortcuts, audioDevice, volume, loopEnabled } = store

  const filtered = search
    ? currentSounds.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : currentSounds

  const currentProfile = store.profiles.find(p => p.id === store.currentProfileId)

  // Raccourci Échap pour quitter
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onExit() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onExit])

  // Polling état lecture
  useEffect(() => {
    if (!playingId) return
    const interval = setInterval(() => {
      if (!isPlaying(playingId)) setPlayingId(null)
    }, 200)
    return () => clearInterval(interval)
  }, [playingId])

  const handlePlay = async (sound) => {
    if (playingId === sound.id) {
      stopSound(sound.id)
      setPlayingId(null)
      return
    }
    if (sound.path) {
      const exists = await window.electronAPI.fileExists(sound.path)
      if (!exists) return
    }
    if (playingId) stopSound(playingId)
    playSound(sound, audioDevice, volume, loopEnabled, store.playLocally)
    store.incrementPlayCount(sound.id)
    setPlayingId(sound.id)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        background: 'var(--bg-secondary)'
      }}>
        <i className="ti ti-speakerphone" style={{ fontSize: 22, color: 'var(--accent)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            Mode Présentation — {currentProfile?.name || 'Tous les sons'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {filtered.length} sons · Appuyez sur <kbd style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>Échap</kbd> pour quitter
          </div>
        </div>

        {/* Barre de recherche */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          style={{ width: 200, fontSize: 13 }}
          autoFocus
        />

        {/* Indicateurs */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loopEnabled && (
            <div style={{ padding: '3px 8px', borderRadius: 20, background: 'rgba(29,158,117,0.15)', border: '1px solid var(--success)', color: 'var(--success)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-repeat" /> Loop ON
            </div>
          )}
          {playingId && (
            <div style={{ padding: '3px 8px', borderRadius: 20, background: 'var(--accent-light)', border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-volume" style={{ animation: 'pulse 1s ease infinite' }} /> En cours
            </div>
          )}
        </div>

        <button className="btn-secondary" onClick={onExit} style={{ flexShrink: 0 }}>
          <i className="ti ti-x" /> Quitter
        </button>
      </div>

      {/* Favoris */}
      {favoriteSounds.length > 0 && !search && (
        <div style={{ padding: '14px 24px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-star-filled" /> Favoris
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {favoriteSounds.map(s => (
              <PresentationCard
                key={s.id}
                sound={s}
                shortcut={store.shortcuts[s.id]}
                playing={playingId === s.id}
                onPlay={() => handlePlay(s)}
                size="large"
              />
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0 0' }} />
        </div>
      )}

      {/* Grille principale */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: 60, fontSize: 14 }}>
            Aucun son trouvé
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
          {filtered.map(s => (
            <PresentationCard
              key={s.id}
              sound={s}
              shortcut={store.shortcuts[s.id]}
              playing={playingId === s.id}
              onPlay={() => handlePlay(s)}
              size="normal"
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

function PresentationCard({ sound, shortcut, playing, onPlay, size }) {
  const [imgError, setImgError] = useState(false)

  const imageUrl = sound.image && !imgError
    ? (sound.image.startsWith('file://') ? sound.image : `file:///${sound.image.replace(/\\/g, '/')}`)
    : null

  const isLarge = size === 'large'
  const cardSize = isLarge ? 140 : 120
  const emojiSize = isLarge ? 40 : 32

  return (
    <div
      onClick={onPlay}
      style={{
        width: cardSize, cursor: 'pointer',
        background: playing ? 'var(--accent-light)' : 'var(--bg-secondary)',
        border: `2px solid ${playing ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)', padding: 10,
        transition: 'all 0.15s', textAlign: 'center',
        boxShadow: playing ? '0 0 20px rgba(124,111,247,0.3)' : 'none',
        transform: playing ? 'scale(1.02)' : 'scale(1)'
      }}
      onMouseEnter={e => { if (!playing) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.03)' } }}
      onMouseLeave={e => { if (!playing) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)' } }}
    >
      {/* Image/Emoji */}
      <div style={{
        width: '100%', aspectRatio: '1', borderRadius: 10,
        background: 'var(--bg-tertiary)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: emojiSize, marginBottom: 8, overflow: 'hidden', position: 'relative'
      }}>
        {imageUrl
          ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
          : <span>{sound.emoji || '🔊'}</span>
        }
        {playing && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(124,111,247,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10
          }}>
            {/* Equalizer animé */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24 }}>
              {[1,2,3,4,3].map((h, i) => (
                <div key={i} style={{
                  width: 4, borderRadius: 2, background: 'white',
                  animation: `wave${i} ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                  height: `${h * 20}%`
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nom */}
      <div style={{
        fontSize: isLarge ? 13 : 12, fontWeight: 600,
        color: playing ? 'var(--accent)' : 'var(--text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginBottom: 4
      }}>
        {sound.name}
      </div>

      {/* Raccourci */}
      {shortcut && (
        <div style={{
          display: 'inline-block', fontSize: 10, fontFamily: 'monospace',
          background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
          borderRadius: 4, padding: '2px 6px', color: 'var(--text-secondary)'
        }}>
          {shortcut}
        </div>
      )}

      {/* Compteur */}
      {sound.playCount > 0 && (
        <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 3 }}>
          <i className="ti ti-player-play" style={{ fontSize: 8 }} /> {sound.playCount}
        </div>
      )}
    </div>
  )
}