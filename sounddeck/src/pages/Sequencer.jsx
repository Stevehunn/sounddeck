import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import { registerStopSequencerCallback, getSoundProgress } from '../utils/audio'
import { useTranslation } from '../i18n'

export default function Sequencer({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [playlists, setPlaylists] = useState([])
  const [activePlaylist, setActivePlaylist] = useState(null)
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')

  // Charger les playlists depuis le store
  useEffect(() => {
    window.electronAPI.storeGet('playlists').then(saved => {
      if (saved) setPlaylists(saved)
    })
  }, [])

  const savePlaylists = async (updated) => {
    setPlaylists(updated)
    await window.electronAPI.storeSet('playlists', updated)
  }

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return
    const playlist = {
      id: crypto.randomUUID(),
      name: newPlaylistName.trim(),
      items: [],
      createdAt: Date.now()
    }
    const updated = [...playlists, playlist]
    await savePlaylists(updated)
    setActivePlaylist(playlist)
    setNewPlaylistName('')
    setShowNewPlaylist(false)
  }

  const deletePlaylist = async (id) => {
    const updated = playlists.filter(p => p.id !== id)
    await savePlaylists(updated)
    if (activePlaylist?.id === id) setActivePlaylist(null)
  }

  const updatePlaylist = async (updated) => {
    const all = playlists.map(p => p.id === updated.id ? updated : p)
    await savePlaylists(all)
    setActivePlaylist(updated)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Panneau gauche — liste des playlists */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-playlist" style={{ color: 'var(--accent)' }} /> {tr('sequencerTitle')}
          </div>
          {showNewPlaylist ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <input autoFocus value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createPlaylist(); if (e.key === 'Escape') setShowNewPlaylist(false) }}
                placeholder={tr('playlistName')} style={{ fontSize: 12, padding: '5px 8px', flex: 1 }} />
              <button className="btn-primary" style={{ padding: '5px 8px' }} onClick={createPlaylist}>
                <i className="ti ti-check" />
              </button>
            </div>
          ) : (
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
              onClick={() => setShowNewPlaylist(true)}>
              <i className="ti ti-plus" /> {tr('newPlaylist')}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {playlists.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
              {tr('noPlaylist')}
            </div>
          )}
          {playlists.map(pl => (
            <div key={pl.id}
              onClick={() => setActivePlaylist(pl)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                background: activePlaylist?.id === pl.id ? 'var(--accent-light)' : 'transparent',
                borderLeft: `2px solid ${activePlaylist?.id === pl.id ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.1s'
              }}
              onMouseEnter={e => { if (activePlaylist?.id !== pl.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (activePlaylist?.id !== pl.id) e.currentTarget.style.background = 'transparent' }}>
              <i className="ti ti-playlist" style={{ color: activePlaylist?.id === pl.id ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: 15 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: activePlaylist?.id === pl.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {pl.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {pl.items.length} {tr('sounds')}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); deletePlaylist(pl.id) }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', fontSize: 12, borderRadius: 4 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)' }}>
                <i className="ti ti-trash" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau droit — éditeur de playlist */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activePlaylist ? (
          <PlaylistEditor
            key={activePlaylist.id}
            playlist={activePlaylist}
            sounds={store.sounds}
            audioDevice={store.audioDevice}
            volume={store.volume}
            onUpdate={updatePlaylist}
            addToast={addToast}
            lang={lang}
          />
        ) : (
          <EmptyState lang={lang} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ lang = 'fr' }) {
  const tr = useTranslation(lang)
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-tertiary)' }}>
      <i className="ti ti-playlist" style={{ fontSize: 48, color: 'var(--border)' }} />
      <div style={{ fontWeight: 500, fontSize: 14 }}>{tr('selectPlaylist')}</div>
      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
        {tr('selectPlaylistDesc')}
      </div>
    </div>
  )
}

function PlaylistEditor({ playlist, sounds, audioDevice, volume, onUpdate, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [items, setItems] = useState(playlist.items || [])
  const [playing, setPlaying] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [showAddSound, setShowAddSound] = useState(false)
  const [loopPlaylist, setLoopPlaylist] = useState(playlist.loop || false)
  const sequenceRef = useRef(null)
  const howlRef = useRef(null)
  const playingRef = useRef(false)
  const [currentProgress, setCurrentProgress] = useState(null)
  const currentIdxRef = useRef(-1)
  const itemsRef = useRef(items)

  // Polling progression du son courant
  useEffect(() => {
    if (!playing || currentIdx < 0) { setCurrentProgress(null); return }
    const item = items[currentIdx]
    if (!item) return
    const interval = setInterval(() => {
      const p = getSoundProgress(item.soundId + '_seq') || getSoundProgress(item.soundId)
      // On cherche le howl actif via ref
      if (howlRef.current && howlRef.current.playing()) {
        const seek = howlRef.current.seek()
        const duration = howlRef.current.duration()
        if (typeof seek === 'number' && typeof duration === 'number' && duration > 0) {
          setCurrentProgress({ current: seek, duration, ratio: Math.min(1, seek / duration) })
        }
      } else {
        setCurrentProgress(null)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [playing, currentIdx, items])

  // Sync refs
  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])
  useEffect(() => { itemsRef.current = items }, [items])

  const saveItems = async (updated, loop = loopPlaylist) => {
    setItems(updated)
    await onUpdate({ ...playlist, items: updated, loop })
  }

  // ─── Lecture séquencielle ─────────────────────────────────────────────────
  const playFrom = useCallback(async (idx) => {
    if (idx >= items.length) {
      if (loopPlaylist) { playFrom(0); return }
      setPlaying(false)
      setCurrentIdx(-1)
      return
    }

    const item = items[idx]
    setCurrentIdx(idx)
    const sound = sounds.find(s => s.id === item.soundId)
    if (!sound) { playFrom(idx + 1); return }

    const fileUrl = sound.path.startsWith('file://')
      ? sound.path : 'file:///' + sound.path.replace(/\\/g, '/')

    const volumeRatio = ((sound.volume ?? 100) / 100) * (volume / 100)

    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload() }

    howlRef.current = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: false,
      onend: () => {
        // Délai avant le son suivant
        const delay = item.delay || 0
        sequenceRef.current = setTimeout(() => {
          if (sequenceRef.current !== null) playFrom(idx + 1)
        }, delay * 1000)
      }
    })
    howlRef.current.play()
  }, [items, sounds, volume, loopPlaylist])

  const startSequence = () => {
    if (items.length === 0) { addToast(tr('emptyPlaylist'), 'error'); return }
    setPlaying(true)
    playFrom(0)
  }

  const stopSequence = useCallback(() => {
    setPlaying(false)
    setCurrentIdx(-1)
    playingRef.current = false
    if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
  }, [])

  // Enregistrer le callback pour stopAllSounds
  useEffect(() => {
    registerStopSequencerCallback(stopSequence)
    return () => registerStopSequencerCallback(null)
  }, [stopSequence])

  // Raccourcis clavier next/prev (touches fléchées quand le séquenceur est actif)
  useEffect(() => {
    const handler = (e) => {
      if (!playingRef.current) return
      if (e.key === 'ArrowRight' || e.key === 'MediaTrackNext') {
        e.preventDefault()
        // Son suivant
        if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
        if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
        const next = currentIdxRef.current + 1
        if (next < itemsRef.current.length) playFrom(next)
        else if (loopPlaylist) playFrom(0)
        else stopSequence()
      }
      if (e.key === 'ArrowLeft' || e.key === 'MediaTrackPrevious') {
        e.preventDefault()
        // Son précédent
        if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
        if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
        const prev = Math.max(0, currentIdxRef.current - 1)
        playFrom(prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loopPlaylist, stopSequence])

  useEffect(() => () => stopSequence(), [stopSequence])

  // ─── Drag & drop réordonnement ────────────────────────────────────────────
  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData('text/plain', String(idx))
  }

  const handleDrop = (e, toIdx) => {
    e.preventDefault()
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'))
    if (fromIdx === toIdx) return
    const updated = [...items]
    const [moved] = updated.splice(fromIdx, 1)
    updated.splice(toIdx, 0, moved)
    setDragOverIdx(null)
    saveItems(updated)
  }

  // ─── Modifier un item ─────────────────────────────────────────────────────
  const updateItem = (idx, changes) => {
    const updated = items.map((item, i) => i === idx ? { ...item, ...changes } : item)
    saveItems(updated)
  }

  const removeItem = (idx) => {
    const updated = items.filter((_, i) => i !== idx)
    saveItems(updated)
  }

  const addSounds = (soundIds) => {
    const newItems = soundIds.map(id => ({
      id: crypto.randomUUID(),
      soundId: id,
      delay: 0
    }))
    saveItems([...items, ...newItems])
    setShowAddSound(false)
  }

  const totalDuration = items.reduce((acc, item) => {
    const sound = sounds.find(s => s.id === item.soundId)
    return acc + (item.delay || 0)
  }, 0)

  const fmtSeqTime = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{playlist.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {items.length} {tr('sounds')} · {totalDuration.toFixed(1)}s {tr('delayAfter').toLowerCase()}
          </div>
        </div>

        {/* Loop toggle */}
        <button onClick={() => { setLoopPlaylist(!loopPlaylist); saveItems(items, !loopPlaylist) }}
          style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            border: `1px solid ${loopPlaylist ? 'var(--success)' : 'var(--border)'}`,
            background: loopPlaylist ? 'rgba(29,158,117,0.1)' : 'transparent',
            color: loopPlaylist ? 'var(--success)' : 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', gap: 4
          }}>
          <i className="ti ti-repeat" /> {tr('loop')}
        </button>

        {/* Ajouter sons */}
        <button className="btn-secondary" onClick={() => setShowAddSound(true)} style={{ fontSize: 12 }}>
          <i className="ti ti-plus" /> {tr('addSounds')}
        </button>

        {/* Play / Stop */}
        {playing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Raccourcis next/prev */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => {
                if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
                if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
                const prev = Math.max(0, currentIdx - 1)
                playFrom(prev)
              }} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }} title={tr('previous')}>
                <i className="ti ti-player-skip-back" />
              </button>
              <button onClick={() => {
                if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
                if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
                const next = currentIdx + 1
                if (next < items.length) playFrom(next)
                else if (loopPlaylist) playFrom(0)
                else stopSequence()
              }} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }} title={tr('next')}>
                <i className="ti ti-player-skip-forward" />
              </button>
            </div>
            <button onClick={stopSequence} style={{ fontSize: 12, padding: '6px 14px', background: 'rgba(224,82,82,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-player-stop-filled" /> {tr('stop_seq')}
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={startSequence} style={{ fontSize: 12 }}>
            <i className="ti ti-player-play-filled" /> {tr('start_seq')}
          </button>
        )}
      </div>

      {/* Barre de progression globale */}
      {playing && currentProgress && (
        <div style={{ padding: '6px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-music" style={{ color: 'var(--accent)' }} />
              {currentIdx >= 0 && items[currentIdx] && (() => {
                const s = sounds.find(s => s.id === items[currentIdx].soundId)
                return s?.name || 'Son inconnu'
              })()}
            </span>
            <span style={{ fontFamily: 'monospace' }}>
              {fmtSeqTime(currentProgress.current)} / {fmtSeqTime(currentProgress.duration)}
            </span>
          </div>
          <div style={{ height: 5, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: `linear-gradient(90deg, var(--accent), var(--accent-hover))`,
              width: `${currentProgress.ratio * 100}%`,
              transition: 'width 0.1s linear',
              boxShadow: '0 0 8px var(--accent)'
            }} />
          </div>
          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 3 }}>
              <span>{tr('playing')} {currentIdx + 1} / {items.length}</span>
              <span>{items.filter((_, i) => i > currentIdx).length} {tr('remaining')}</span>
            </div>
          )}
        </div>
      )}

      {/* Indication raccourcis */}
      {playing && (
        <div style={{ padding: '6px 20px', background: 'var(--accent-light)', borderBottom: '1px solid var(--accent)', fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <i className="ti ti-keyboard" />
          <span>{tr('activeShortcuts')} :</span>
          <kbd style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace' }}>←</kbd>
          <span>{tr('previous')}</span>
          <kbd style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace' }}>→</kbd>
          <span>{tr('next')}</span>
          <kbd style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: 4, padding: '1px 6px', fontFamily: 'monospace' }}>{tr('stop_seq')}</kbd>
          <span>{tr('stopAll')}</span>
        </div>
      )}

      {/* Liste des items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
            <i className="ti ti-music-plus" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
            <div style={{ fontWeight: 500, marginBottom: 6 }}>{tr('emptyPlaylist')}</div>
            <div style={{ fontSize: 12, marginBottom: 16 }}>{tr('addSounds')}</div>
            <button className="btn-primary" onClick={() => setShowAddSound(true)}>
              <i className="ti ti-plus" /> {tr('addSounds')}
            </button>
          </div>
        )}

        {items.map((item, idx) => {
          const sound = sounds.find(s => s.id === item.soundId)
          const isActive = currentIdx === idx && playing
          return (
            <div key={item.id}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={e => handleDrop(e, idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 6,
                background: isActive ? 'var(--accent-light)' : dragOverIdx === idx ? 'var(--bg-hover)' : 'var(--bg-secondary)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', cursor: 'grab',
                transition: 'all 0.1s', boxShadow: isActive ? '0 0 12px rgba(124,111,247,0.2)' : 'none'
              }}>

              {/* Numéro + drag handle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 12, flexShrink: 0 }}>
                <i className="ti ti-grip-vertical" />
                <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {idx + 1}
                </span>
              </div>

              {/* Emoji / Image */}
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                {sound?.image
                  ? <img src={sound.image.startsWith('file://') ? sound.image : `file:///${sound.image.replace(/\\/g, '/')}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (sound?.emoji || '🔊')}
              </div>

              {/* Nom du son */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {sound?.name || <span style={{ color: 'var(--danger)', fontSize: 12 }}>{tr('editorNoSound')}</span>}
                </div>
                {isActive && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <i className="ti ti-volume" style={{ animation: 'pulse 1s ease infinite' }} /> {tr('playing')}
                    </div>
                    {currentProgress && (
                      <div style={{ height: 3, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden', width: '100%' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          background: 'var(--accent)',
                          width: `${currentProgress.ratio * 100}%`,
                          transition: 'width 0.1s linear'
                        }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Délai après */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <i className="ti ti-clock" style={{ fontSize: 13, color: 'var(--text-tertiary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 1 }}>{tr('delayAfter')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number" min="0" max="60" step="0.5"
                      value={item.delay || 0}
                      onChange={e => updateItem(idx, { delay: Math.max(0, Number(e.target.value)) })}
                      style={{ width: 55, fontSize: 12, padding: '3px 6px', textAlign: 'center' }}
                      onClick={e => e.stopPropagation()}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>s</span>
                  </div>
                </div>
              </div>

              {/* Supprimer */}
              <button onClick={() => removeItem(idx)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', borderRadius: 4, fontSize: 14 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>
                <i className="ti ti-x" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal ajout de sons */}
      {showAddSound && (
        <AddSoundModal
          sounds={sounds}
          existingIds={items.map(i => i.soundId)}
          onAdd={addSounds}
          onClose={() => setShowAddSound(false)}
          lang={lang}
        />
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

function AddSoundModal({ sounds, existingIds, onAdd, onClose, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')

  const filtered = sounds.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={{ width: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-music-plus" style={{ color: 'var(--accent)' }} />
          {tr('addSounds')}
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tr('search')} style={{ marginBottom: 10 }} autoFocus />

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {filtered.map(sound => {
            const isSelected = selected.includes(sound.id)
            const imageUrl = sound.image
              ? (sound.image.startsWith('file://') ? sound.image : `file:///${sound.image.replace(/\\/g, '/')}`)
              : null

            return (
              <label key={sound.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                background: isSelected ? 'var(--accent-light)' : 'transparent'
              }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggle(sound.id)}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }} />
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, overflow: 'hidden', flexShrink: 0 }}>
                  {imageUrl ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : sound.emoji}
                </div>
                <span style={{ fontSize: 13, flex: 1 }}>{sound.name}</span>
                {existingIds.includes(sound.id) && (
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 4 }}>{tr('alreadyAdded')}</span>
                )}
              </label>
            )
          })}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>{tr('cancel')}</button>
          <button className="btn-primary" onClick={() => onAdd(selected)} disabled={selected.length === 0}>
            <i className="ti ti-plus" /> {tr('add')} {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}