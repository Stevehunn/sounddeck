// src/features/trimmer/Trimmer.jsx
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import Waveform, { formatTime } from '@shared/components/audio/Waveform'
import useConfirm from '@shared/hooks/useConfirm'
import { buildFileUrl } from '@shared/utils/fileUrl'

const EMOJIS = [
  '🔊','🎵','🎶','🎼','🎧','🎤','🎸','🎹','🎺','🎻','🥁','🪗','🪘','🎷','🪕',
  '😂','🤣','😱','😬','🤡','👾','🦄','💥','🔥','⭐','🌟','✨','💫','🌈','⚡',
  '🔔','📢','📣','💬','🗣️','👏','🙌','🤘','👍','👎','💀','👻','🎃','🤖','👽',
  '🐸','🐧','🐱','🐶','🦊','🐻','🐼','🐨','🦁','🐮','🐷','🐒','🐲','🐉','🦕',
  '🎮','🕹️','🎯','🎱','🎳','🎰','🧩','🃏','🎴','♠️','♥️','♦️','♣️','🀄','🎲',
  '🍕','🍔','🌮','🌯','🍣','🍜','🍩','🍪','🎂','🧁','🍫','🍭','🍬','🍺','🍻',
  '🚀','🛸','💎','💰','💵','💶','💷','💴','🪙','🧿','🔮','🪄','⚔️','🛡️','🏹'
]

export default function Trimmer({ store, addToast }) {
  const { t } = useLanguage()
  const [selectedSound, setSelectedSound] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = store.sounds.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  // ✅ Expose une fonction globale pour le tutoriel : sélectionne automatiquement
  // le premier son de la liste (déclenché par afterNextStep de l'étape 1).
  useEffect(() => {
    window.__trimmerSelectFirstSound = () => {
      const list = store.sounds || []
      if (list.length === 0) return false
      setSearch('') // Reset la recherche pour que le son soit visible
      setSelectedSound(list[0])
      return true
    }
    return () => {
      delete window.__trimmerSelectFirstSound
    }
  }, [store.sounds])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-cut" style={{ color: 'var(--accent)' }} />
            {t('trimmerTitle')}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('editorSearch')}
            className="input-sm"
            style={{ borderRadius: 'var(--radius-md)' }}
            data-testid="trimmer-search-input"
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
              {t('editorNoSound')}
            </div>
          )}
          {filtered.map(sound => (
            <SoundListItem
              key={sound.id}
              sound={sound}
              active={selectedSound?.id === sound.id}
              onClick={() => setSelectedSound(sound)}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedSound ? (
          <SoundEditor
            key={selectedSound.id}
            sound={selectedSound}
            store={store}
            addToast={addToast}
            onDone={() => setSelectedSound(null)}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function SoundListItem({ sound, active, onClick }) {
  const imageUrl = sound.image ? buildFileUrl(sound.image) : null

  return (
    <button
      onClick={onClick}
      className={`sidebar-item ${active ? 'active' : ''}`}
      style={{ borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}` }}
      data-testid={`sound-list-item-${sound.id}`}
      data-sound-id={sound.id}
      data-active={active ? 'true' : 'false'}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 6, background: 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, flexShrink: 0, overflow: 'hidden'
      }}>
        {imageUrl
          ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
          : sound.emoji || '🔊'}
      </div>
      <span className="label" style={{ fontSize: 12 }}>
        {sound.name}
      </span>
    </button>
  )
}

function EmptyState() {
  const { t } = useLanguage()
  return (
    <div className="flex-center" data-testid="trimmer-empty-state" style={{ flexDirection: 'column', height: '100%', gap: 12, color: 'var(--text-tertiary)' }}>
      <i className="ti ti-cut" style={{ fontSize: 48, color: 'var(--border)' }} />
      <div style={{ fontWeight: 500, fontSize: 14 }}>{t('selectSound')}</div>
      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
        {t('selectSoundDesc')}
      </div>
    </div>
  )
}

function SoundEditor({ sound, store, addToast, onDone }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [name, setName] = useState(sound.name + ' (copie)')
  const [emoji, setEmoji] = useState(sound.emoji || '🔊')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [targetProfiles, setTargetProfiles] = useState([sound.profiles?.[0] || 'all'])
  const [saving, setSaving] = useState(false)

  const audioRef = useRef(null)

  const fileUrl = buildFileUrl(sound.path)

  useEffect(() => {
    const audio = new Audio(fileUrl)
    audioRef.current = audio
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
      setEnd(audio.duration)
    })
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('ended', () => { setPlaying(false) })
    return () => { audio.pause(); audio.src = '' }
  }, [fileUrl])

  useEffect(() => {
    if (audioRef.current && playing && currentTime >= end) {
      audioRef.current.pause()
      audioRef.current.currentTime = start
      setCurrentTime(start)
      setPlaying(false)
    }
  }, [currentTime, end, start, playing])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.currentTime = start
      audio.play()
      setPlaying(true)
    }
  }

  const fmt = formatTime

  const handlePickImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) {
        setImage(result.path)
        setImagePreview(buildFileUrl(result.path))
      }
    }
  }

  const toggleProfile = (profileId) => {
    setTargetProfiles(prev =>
      prev.includes(profileId)
        ? prev.filter(p => p !== profileId)
        : [...prev, profileId]
    )
  }

  const handleSave = async () => {
    if (!name.trim()) { addToast(t('editorNameRequired'), 'error'); return }
    if (targetProfiles.length === 0) { addToast(t('editorProfileRequired'), 'error'); return }

    const existingSound = store.sounds.find(s => s.name.toLowerCase() === name.trim().toLowerCase())
    if (existingSound) {
      const confirmed = await confirm({
        title: t('soundExists'),
        message: t('soundExistsConfirm').replace('{name}', name.trim()),
        type: 'warning'
      })
      if (!confirmed) return
    }

    setSaving(true)
    if (playing) { audioRef.current?.pause(); setPlaying(false) }

    const trimResult = await window.electronAPI.trimSoundFile(sound.path, start, end)

    if (!trimResult.success) {
      addToast(`${t('trimmerError')} ${trimResult.error}`, 'error')
      setSaving(false)
      return
    }

    if (trimResult.warning) {
      addToast(trimResult.warning, 'info')
    }

    await store.addSound({
      name: name.trim(),
      path: trimResult.path,
      image: image || null,
      emoji: image ? sound.emoji : emoji,
      profiles: targetProfiles
    })

    addToast(`"${name.trim()}" ${t('editorCreated')}`, 'success')
    setSaving(false)
    onDone()
  }

  const previewImageUrl = imagePreview ? buildFileUrl(imagePreview) : null

  return (
    <>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('editingOf')} <span style={{ color: 'var(--accent)' }}>{sound.name}</span></div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{t('originalKept')}</div>
          </div>
          <button className="btn-secondary btn-lg" onClick={onDone} style={{ borderRadius: 'var(--radius-md)' }}>
            <i className="ti ti-x" /> {t('cancel')}
          </button>
          <button
            className="btn-primary btn-lg"
            onClick={handleSave}
            disabled={saving}
            style={{ borderRadius: 'var(--radius-md)' }}
            data-testid="trimmer-create-button"
          >
            {saving
              ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('creating')}</>
              : <><i className="ti ti-check" /> {t('createSound')}</>}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>

          <div style={{ flex: 1, minWidth: 300 }}>
            <SectionTitle icon="ti-cut" label={t('trimSound')} />

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 12, padding: '8px 12px', background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)', fontSize: 12
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                <i className="ti ti-clock" style={{ marginRight: 4 }} />
                {t('start')} : <strong>{fmt(start)}</strong>
              </span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {t('duration')} : {fmt(end - start)}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {t('end')} : <strong>{fmt(end)}</strong>
              </span>
            </div>

            <div style={{ marginBottom: 24 }} data-testid="trimmer-waveform-container">
              <Waveform
                filePath={sound.path}
                start={start}
                end={end}
                currentTime={currentTime}
                duration={duration}
                height={80}
                showHandles
                onSeek={(pos) => {
                  if (audioRef.current) audioRef.current.currentTime = pos
                  setCurrentTime(pos)
                }}
                onStartChange={(pos) => setStart(Math.max(0, pos))}
                onEndChange={(pos) => setEnd(Math.min(duration, pos))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {t('start')} : {fmt(start)}
                </label>
                <input type="range" min="0" max={duration} step="0.01" value={start}
                  onChange={e => setStart(Math.min(Number(e.target.value), end - 0.1))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {t('end')} : {fmt(end)}
                </label>
                <input type="range" min="0" max={duration} step="0.01" value={end}
                  onChange={e => setEnd(Math.max(Number(e.target.value), start + 0.1))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={togglePlay}
                className="btn-secondary btn-lg"
                style={{ flex: 1, justifyContent: 'center', borderRadius: 'var(--radius-md)', minWidth: 120 }}
                data-testid="trimmer-listen-button"
              >
                <i className={`ti ${playing ? 'ti-player-pause' : 'ti-player-play'}`} />
                {playing ? t('trimmerPause') : t('listenSelection')}
              </button>
              <button
                onClick={() => { setStart(0); setEnd(duration) }}
                className="btn-ghost btn-lg"
                title={t('selectAll')}
                style={{ borderRadius: 'var(--radius-md)' }}
                data-testid="trimmer-reset-button"
              >
                <i className="ti ti-refresh" /> {t('selectAll')}
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary)', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
              {t('editorTrimNote')}
            </div>
          </div>

          <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <SectionTitle icon="ti-eye" label={t('editorPreview')} />
              <div style={{
                background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, overflow: 'hidden', border: '1px solid var(--border)'
                }}>
                  {previewImageUrl
                    ? <img src={previewImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
                    : emoji}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, textAlign: 'center', color: 'var(--text-primary)' }}>
                  {name || t('editorNamePlaceholder')}
                </div>
              </div>
            </div>

            <div>
              <SectionTitle icon="ti-pencil" label={t('editorNameLabel')} />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('editorNamePlaceholder')}
                className="input-lg"
                style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
                data-testid="trimmer-name-input"
              />
            </div>

            <div>
              <SectionTitle icon="ti-photo" label={t('editorImageLabel')} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-secondary" onClick={handlePickImage} style={{ flex: 1, justifyContent: 'center', fontSize: 12, borderRadius: 'var(--radius-md)', minHeight: 34 }}>
                  <i className="ti ti-upload" /> {imagePreview ? t('editorImageChange') : t('editorImageChoose')}
                </button>
                {imagePreview && (
                  <button className="btn-ghost" onClick={() => { setImage(null); setImagePreview(null) }} title={t('menuDelete')} style={{ borderRadius: 'var(--radius-sm)', minHeight: 34 }}>
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>
            </div>

            {!imagePreview && (
              <div>
                <SectionTitle icon="ti-mood-smile" label={t('editorEmojiLabel')} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      style={{
                        width: 34, height: 34, fontSize: 16, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        border: `1px solid ${emoji === e ? 'var(--accent)' : 'var(--border)'}`,
                        background: emoji === e ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                        transition: 'all var(--transition-base) ease'
                      }}
                      onMouseEnter={ev => {
                        if (emoji !== e) ev.currentTarget.style.borderColor = 'var(--accent)'
                      }}
                      onMouseLeave={ev => {
                        if (emoji !== e) ev.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <SectionTitle icon="ti-users" label={t('editorProfilesLabel')} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {store.profiles.map(p => (
                  <label key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: `1px solid ${targetProfiles.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                    background: targetProfiles.includes(p.id) ? 'var(--accent-light)' : 'transparent',
                    fontSize: 12
                  }}>
                    <input type="checkbox" checked={targetProfiles.includes(p.id)}
                      onChange={() => toggleProfile(p.id)}
                      style={{ accentColor: 'var(--accent)', width: 'auto' }} />
                    <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
                    {p.id === 'all' ? t('allSounds') : p.name}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
      <ConfirmWrapper />
    </>
  )
}

function SectionTitle({ icon, label }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
      <i className={`ti ${icon}`} />{label}
    </div>
  )
}