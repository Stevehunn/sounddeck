// src/features/presentation/Presentation.jsx
import { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { playSound, stopSound, isPlaying, getSoundProgress } from '@core/services/AudioService'
import HelpButton from '@shared/components/ui/HelpButton'
import { formatTime } from '@shared/utils/format'
import { buildFileUrl } from '@shared/utils/fileUrl'

export default function Presentation({ store, onExit }) {
  const { t } = useLanguage()
  const [playingId, setPlayingId] = useState(null)
  const [search, setSearch] = useState('')

  const currentSounds = store.currentSounds || []

  // Récupérer les favoris directement depuis les sons
  const currentProfileId = store.currentProfileId
  const favoriteSounds = (store.sounds || []).filter(s =>
    s.favorites && s.favorites.includes(currentProfileId)
  )

  const shortcuts = store.shortcuts || {}
  const audioDevice = store.audioDevice || 'default'
  const volume = store.volume || 80
  const loopEnabled = store.loopEnabled || false

  const filtered = search
    ? currentSounds.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()))
    : currentSounds

  const currentProfile = store.profiles?.find(p => p.id === currentProfileId)

  // Exposer le store pour le tutoriel
  useEffect(() => {
    window.__storeRef = { current: store }
    return () => {
      delete window.__storeRef
    }
  }, [store])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onExit() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onExit])

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
    if (store.incrementPlayCount) {
      store.incrementPlayCount(sound.id)
    }
    setPlayingId(sound.id)
  }

  const cardSize = store.cardSize || 'medium'

  const handleHelpClick = () => {
    if (window.__startTutorial) {
      window.__startTutorial('presentation');
    }
  }

  return (
    <div
      data-testid="presentation-container"
      className="presentation-overlay"
    >
      <div className="presentation-header">
        <i className="ti ti-speakerphone" style={{ fontSize: 22, color: 'var(--accent)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {t('presentationTitle')} — {currentProfile?.id === 'all' ? t('allSounds') : currentProfile?.name || t('mySounds')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {filtered.length} {t('sounds')} · {t('exitTip')} <kbd>Esc</kbd>
          </div>
        </div>

        <input
          data-testid="presentation-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('presentationSearch')}
          style={{ width: 200, fontSize: 13 }}
          autoFocus
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {loopEnabled && (
            <div className="presentation-badge success">
              <i className="ti ti-repeat" /> {t('presentationLoopOn')}
            </div>
          )}
          {playingId && (
            <div className="presentation-badge accent">
              <i className="ti ti-volume" style={{ animation: 'pulse 1s ease infinite' }} /> {t('presentationPlaying')}
            </div>
          )}
        </div>

        <HelpButton onClick={handleHelpClick} />

        <button
          data-testid="presentation-exit"
          className="btn-secondary btn-lg"
          onClick={onExit}
          style={{ minWidth: 120 }}
        >
          <i className="ti ti-x" /> {t('presentationExit')}
        </button>
      </div>

      {/* SECTION FAVORIS */}
      {favoriteSounds.length > 0 && !search && (
        <div
          data-testid="presentation-favorites"
          className="presentation-favorites"
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-star-filled" /> {t('favorites')}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {favoriteSounds.map(s => (
              <PresentationCard
                key={s.id}
                sound={s}
                shortcut={shortcuts[s.id]}
                playing={playingId === s.id}
                onPlay={() => handlePlay(s)}
                size="large"
              />
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0 0' }} />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: 60, fontSize: 14 }}>
            {t('noSounds')}
          </div>
        )}
        <div
          data-testid="presentation-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize === 'small' ? 130 : cardSize === 'large' ? 180 : 150}px, 1fr))`,
            gap: 12
          }}
        >
          {filtered.map(s => (
            <PresentationCard
              key={s.id}
              sound={s}
              shortcut={shortcuts[s.id]}
              playing={playingId === s.id}
              onPlay={() => handlePlay(s)}
              size={cardSize}
            />
          ))}
        </div>
      </div>

    </div>
  )
}

function formatShortcut(shortcut) {
  if (!shortcut) return []
  return shortcut
    .split('+')
    .map(k => {
      if (k === 'CommandOrControl') return '⌘/Ctrl'
      if (k === 'Command') return '⌘'
      if (k === 'Control') return 'Ctrl'
      if (k === 'Shift') return '⇧'
      if (k === 'Alt') return 'Alt'
      if (k === 'Return') return '↵'
      if (k === 'Space') return '␣'
      if (k === 'Up') return '↑'
      if (k === 'Down') return '↓'
      if (k === 'Left') return '←'
      if (k === 'Right') return '→'
      return k
    })
}

function PresentationCard({ sound, shortcut, playing, onPlay, size }) {
  const { t, currentLang } = useLanguage()
  const [imgError, setImgError] = useState(false)
  const [progress, setProgress] = useState(null)

  const imageUrl = sound.image && !imgError ? buildFileUrl(sound.image) : null

  useEffect(() => {
    if (!playing) { setProgress(null); return }
    const interval = setInterval(() => {
      const p = getSoundProgress(sound.id)
      if (p && p.duration > 3) setProgress(p)
      else setProgress(null)
    }, 100)
    return () => clearInterval(interval)
  }, [playing, sound.id])

  const sizeConfigs = {
    small: { cardSize: 120, emojiSize: 32, nameSize: 11, shortcutSize: 9, gap: 6 },
    medium: { cardSize: 140, emojiSize: 38, nameSize: 12, shortcutSize: 10, gap: 8 },
    large: { cardSize: 170, emojiSize: 48, nameSize: 14, shortcutSize: 11, gap: 10 }
  }

  const config = sizeConfigs[size] || sizeConfigs.medium
  const cardSize = config.cardSize
  const emojiSize = config.emojiSize

  return (
    <div
      data-testid="presentation-card"
      data-sound-id={sound.id}
      className={`presentation-card ${playing ? 'playing' : ''}`}
      onClick={onPlay}
      style={{ width: cardSize }}
    >
      <div className="preview" style={{ fontSize: emojiSize }}>
        {imageUrl
          ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
          : <span>{sound.emoji || '🔊'}</span>
        }
        {playing && (
          <div className="waves">
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

      <div className="name" style={{ fontSize: config.nameSize }}>
        {sound.name}
      </div>

      {shortcut && (
        <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', marginTop: 2 }}>
          {formatShortcut(shortcut).map((key, i) => (
            <kbd key={i} style={{
              fontSize: config.shortcutSize,
              border: `1px solid ${playing ? 'var(--accent)' : 'var(--border)'}`,
              borderBottom: `2px solid ${playing ? 'var(--accent)' : 'var(--text-tertiary)'}`,
              color: playing ? 'var(--accent)' : 'var(--text-secondary)',
              background: playing ? 'rgba(124,111,247,0.3)' : 'var(--bg-tertiary)'
            }}>
              {key}
            </kbd>
          ))}
        </div>
      )}

      {sound.playCount > 0 && (
        <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 3 }}>
          <i className="ti ti-player-play" style={{ fontSize: 8 }} /> {sound.playCount}
        </div>
      )}

      {progress && (
        <div className="progress-bar" style={{ marginTop: 6 }}>
          <div className="track">
            <div className={`fill ${playing ? 'accent' : ''}`} style={{ width: `${progress.ratio * 100}%` }} />
          </div>
          <div className="time">
            <span>{formatTime(progress.current)}</span>
            <span>{formatTime(progress.duration)}</span>
          </div>
        </div>
      )}
    </div>
  )
}