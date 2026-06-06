import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'

const EMOJIS = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋','🤡','👾','🎤','🦄','💯']

export default function Editor({ store, addToast }) {
  const [selectedSound, setSelectedSound] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = store.sounds.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Panneau gauche — liste des sons */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            <i className="ti ti-cut" style={{ color: 'var(--accent)', marginRight: 6 }} />
            Éditeur de sons
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{ fontSize: 12, padding: '5px 8px' }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
              Aucun son trouvé
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

      {/* Panneau droit — éditeur */}
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
  const imageUrl = sound.image
    ? (sound.image.startsWith('file://') ? sound.image : `file:///${sound.image.replace(/\\/g, '/')}`)
    : null

  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 12px', background: active ? 'var(--accent-light)' : 'transparent',
      border: 'none', borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
      color: active ? 'var(--accent)' : 'var(--text-primary)',
      fontSize: 13, cursor: 'pointer', textAlign: 'left'
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6, background: 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, flexShrink: 0, overflow: 'hidden'
      }}>
        {imageUrl
          ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : sound.emoji || '🔊'}
      </div>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
        {sound.name}
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 12, color: 'var(--text-tertiary)'
    }}>
      <i className="ti ti-cut" style={{ fontSize: 48, color: 'var(--border)' }} />
      <div style={{ fontWeight: 500, fontSize: 14 }}>Sélectionnez un son à éditer</div>
      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
        Choisissez un son dans la liste de gauche pour le rogner, le renommer et personnaliser son apparence.
      </div>
    </div>
  )
}

function SoundEditor({ sound, store, addToast, onDone }) {
  // États du trimmer
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [dragging, setDragging] = useState(null)

  // États du formulaire
  const [name, setName] = useState(sound.name + ' (copie)')
  const [emoji, setEmoji] = useState(sound.emoji || '🔊')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [targetProfiles, setTargetProfiles] = useState([sound.profiles?.[0] || 'all'])
  const [saving, setSaving] = useState(false)

  const audioRef = useRef(null)
  const timelineRef = useRef(null)

  const fileUrl = sound.path.startsWith('file://')
    ? sound.path
    : 'file:///' + sound.path.replace(/\\/g, '/')

  // Charger l'audio
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

  // Stopper si dépasse end
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

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const getPosFromEvent = useCallback((e) => {
    const tl = timelineRef.current
    if (!tl || !duration) return 0
    const rect = tl.getBoundingClientRect()
    return Math.max(0, Math.min(duration, ((e.clientX - rect.left) / rect.width) * duration))
  }, [duration])

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    const pos = getPosFromEvent(e)
    if (dragging === 'start') setStart(Math.min(pos, end - 0.1))
    else if (dragging === 'end') setEnd(Math.max(pos, start + 0.1))
    else if (dragging === 'playhead') {
      if (audioRef.current) audioRef.current.currentTime = pos
      setCurrentTime(pos)
    }
  }, [dragging, getPosFromEvent, start, end])

  const handleMouseUp = useCallback(() => setDragging(null), [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleTimelineClick = (e) => {
    if (dragging) return
    const pos = getPosFromEvent(e)
    if (audioRef.current) audioRef.current.currentTime = pos
    setCurrentTime(pos)
  }

  const handlePickImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) {
        setImage(result.path)
        setImagePreview(result.path.startsWith('file://')
          ? result.path
          : `file:///${result.path.replace(/\\/g, '/')}`)
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
    if (!name.trim()) { addToast('Le nom est requis', 'error'); return }
    if (targetProfiles.length === 0) { addToast('Sélectionnez au moins un profil', 'error'); return }

    setSaving(true)
    if (playing) { audioRef.current?.pause(); setPlaying(false) }

    // Rogner le son — crée un nouveau fichier, l'original est préservé
    const trimResult = await window.electronAPI.trimSoundFile(sound.path, start, end)

    if (!trimResult.success) {
      addToast('Erreur lors du rognage : ' + trimResult.error, 'error')
      setSaving(false)
      return
    }

    if (trimResult.warning) {
      addToast(trimResult.warning, 'info')
    }

    // Créer le nouveau son dans la bibliothèque
    await store.addSound({
      name: name.trim(),
      path: trimResult.path,
      image: image || null,
      emoji: image ? sound.emoji : emoji,
      profiles: targetProfiles
    })

    addToast(`"${name.trim()}" créé avec succès !`, 'success')
    setSaving(false)
    onDone()
  }

  const selLeft = `${(start / (duration || 1)) * 100}%`
  const selWidth = `${((end - start) / (duration || 1)) * 100}%`
  const playheadLeft = `${(currentTime / (duration || 1)) * 100}%`

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Édition de : <span style={{ color: 'var(--accent)' }}>{sound.name}</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>L'original sera conservé — un nouveau son sera créé</div>
        </div>
        <button className="btn-secondary" onClick={onDone}>
          <i className="ti ti-x" /> Annuler
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving
            ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Création...</>
            : <><i className="ti ti-check" /> Créer le son</>}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', gap: 20 }}>

        {/* Colonne gauche — Trimmer */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle icon="ti-cut" label="Rogner le son" />

          {/* Info durée sélection */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12, padding: '8px 12px', background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)', fontSize: 12
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              <i className="ti ti-clock" style={{ marginRight: 4 }} />
              Début : <strong>{fmt(start)}</strong>
            </span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Durée : {fmt(end - start)}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Fin : <strong>{fmt(end)}</strong>
            </span>
          </div>

          {/* Timeline */}
          <div style={{ position: 'relative', height: 70, userSelect: 'none', marginBottom: 10 }}>
            {/* Fond cliquable */}
            <div ref={timelineRef} onClick={handleTimelineClick}
              style={{
                position: 'absolute', inset: 0, background: 'var(--bg-tertiary)',
                borderRadius: 8, cursor: 'crosshair', overflow: 'hidden'
              }}>
              {/* Waveform */}
              <WaveformBars duration={duration} />
              {/* Zone sélectionnée */}
              <div style={{
                position: 'absolute', top: 0, bottom: 0,
                left: selLeft, width: selWidth,
                background: 'rgba(124,111,247,0.3)',
                borderLeft: '2px solid var(--accent)',
                borderRight: '2px solid var(--accent)',
                pointerEvents: 'none'
              }} />
              {/* Playhead */}
              <div
                onMouseDown={e => { e.stopPropagation(); setDragging('playhead') }}
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: playheadLeft, width: 2,
                  background: 'white', cursor: 'col-resize',
                  zIndex: 10, transform: 'translateX(-1px)'
                }}>
                <div style={{
                  position: 'absolute', top: -5, left: -5,
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'white', border: '2px solid var(--accent)'
                }} />
              </div>
            </div>

            {/* Poignée start */}
            <div onMouseDown={e => { e.stopPropagation(); setDragging('start') }}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: selLeft, width: 14,
                cursor: 'ew-resize', zIndex: 11,
                transform: 'translateX(-7px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <div style={{
                width: 5, height: '70%', background: 'var(--accent)',
                borderRadius: 3, boxShadow: '0 0 6px rgba(124,111,247,0.6)'
              }} />
            </div>

            {/* Poignée end */}
            <div onMouseDown={e => { e.stopPropagation(); setDragging('end') }}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `calc(${selLeft} + ${selWidth})`,
                width: 14, cursor: 'ew-resize', zIndex: 11,
                transform: 'translateX(-7px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <div style={{
                width: 5, height: '70%', background: 'var(--accent)',
                borderRadius: 3, boxShadow: '0 0 6px rgba(124,111,247,0.6)'
              }} />
            </div>
          </div>

          {/* Timestamps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            <span>0:00</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>

          {/* Sliders précis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Début : {fmt(start)}
              </label>
              <input type="range" min="0" max={duration} step="0.01" value={start}
                onChange={e => setStart(Math.min(Number(e.target.value), end - 0.1))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                Fin : {fmt(end)}
              </label>
              <input type="range" min="0" max={duration} step="0.01" value={end}
                onChange={e => setEnd(Math.max(Number(e.target.value), start + 0.1))}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
          </div>

          {/* Contrôles lecture */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={togglePlay} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
              <i className={`ti ${playing ? 'ti-player-pause' : 'ti-player-play'}`} />
              {playing ? 'Pause' : 'Écouter la sélection'}
            </button>
            <button onClick={() => { setStart(0); setEnd(duration) }} className="btn-ghost" title="Réinitialiser la sélection">
              <i className="ti ti-refresh" /> Tout sélectionner
            </button>
          </div>

          {/* Note ffmpeg */}
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary)', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
            Le rognage précis nécessite <strong>@ffmpeg-installer/ffmpeg</strong>. Sans lui, le fichier complet est dupliqué.
          </div>
        </div>

        {/* Colonne droite — Métadonnées */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Aperçu */}
          <div>
            <SectionTitle icon="ti-eye" label="Aperçu" />
            <div style={{
              background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
              padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 10, background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, overflow: 'hidden', border: '1px solid var(--border)'
              }}>
                {imagePreview
                  ? <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : emoji}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, textAlign: 'center', color: 'var(--text-primary)' }}>
                {name || 'Nom du son'}
              </div>
            </div>
          </div>

          {/* Nom */}
          <div>
            <SectionTitle icon="ti-pencil" label="Nom *" />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nom du nouveau son"
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Image */}
          <div>
            <SectionTitle icon="ti-photo" label="Image (optionnel)" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn-secondary" onClick={handlePickImage} style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}>
                <i className="ti ti-upload" /> {imagePreview ? 'Changer' : 'Choisir'}
              </button>
              {imagePreview && (
                <button className="btn-ghost" onClick={() => { setImage(null); setImagePreview(null) }} title="Supprimer l'image">
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
          </div>

          {/* Emoji (si pas d'image) */}
          {!imagePreview && (
            <div>
              <SectionTitle icon="ti-mood-smile" label="Emoji" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setEmoji(e)}
                    style={{
                      width: 32, height: 32, fontSize: 16, borderRadius: 6, cursor: 'pointer',
                      border: `1px solid ${emoji === e ? 'var(--accent)' : 'var(--border)'}`,
                      background: emoji === e ? 'var(--accent-light)' : 'var(--bg-tertiary)'
                    }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profils */}
          <div>
            <SectionTitle icon="ti-users" label="Ajouter au(x) profil(s)" />
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
                  {p.name}
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function SectionTitle({ icon, label }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
      <i className={`ti ${icon}`} />{label}
    </div>
  )
}

function WaveformBars({ duration }) {
  const bars = 60
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 1, padding: '6px 2px', pointerEvents: 'none' }}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 15 + Math.abs(Math.sin(i * 2.1 + duration * 0.1) * Math.cos(i * 1.9) * 75)
        return <div key={i} style={{ flex: 1, height: `${h}%`, background: 'rgba(124,111,247,0.4)', borderRadius: 1, minWidth: 1 }} />
      })}
    </div>
  )
}