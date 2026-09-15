// src/features/sequencer/Sequencer.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react'
import { Howl } from 'howler'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'
import { 
  registerStopSequencerCallback, 
  getSoundProgress,
  setCurrentPlayingSound,
  setCurrentPlayingProgress,
  getFinalVolumeForSound,
  analyzeGain,
} from '@core/services/AudioService'
import useConfirm from '@shared/hooks/useConfirm'
import { formatTime } from '@shared/utils/format'
import { buildFileUrl } from '@shared/utils/fileUrl'

export default function Sequencer({ store, addToast, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang })
  const [playlists, setPlaylists] = useState([])
  const [activePlaylistId, setActivePlaylistId] = useState(null)
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const activePlaylistIdRef = useRef(null)
  const playlistsRef = useRef(playlists)
  
  useEffect(() => {
    playlistsRef.current = playlists
  }, [playlists])

  const activePlaylist = useMemo(() => {
    if (!activePlaylistId) return null
    return playlists.find(p => p.id === activePlaylistId) || null
  }, [playlists, activePlaylistId])

  useLayoutEffect(() => {
    activePlaylistIdRef.current = activePlaylistId
  }, [activePlaylistId])

  useEffect(() => {
    window.electronAPI.storeGet('playlists').then(saved => {
      if (saved) {
        setPlaylists(saved)
        playlistsRef.current = saved
        if (activePlaylistIdRef.current) {
          const exists = saved.some(p => p.id === activePlaylistIdRef.current)
          if (!exists) {
            setActivePlaylistId(null)
            activePlaylistIdRef.current = null
          }
        }
      }
    })
  }, [])

  const savePlaylists = async (updated) => {
    setPlaylists(updated)
    playlistsRef.current = updated
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
    setActivePlaylistId(playlist.id)
    activePlaylistIdRef.current = playlist.id
    setNewPlaylistName('')
    setShowNewPlaylist(false)
  }

  const cancelCreatePlaylist = () => {
    setNewPlaylistName('')
    setShowNewPlaylist(false)
  }

  const deletePlaylist = async (id) => {
    const confirmed = await confirm({
      title: t('deletePlaylist'),
      message: t('deletePlaylistConfirm'),
      type: 'danger',
      confirmText: t('delete'),
      cancelText: t('cancel')
    })
    
    if (!confirmed) return
    
    const updated = playlists.filter(p => p.id !== id)
    await savePlaylists(updated)
    if (activePlaylistId === id) {
      setActivePlaylistId(null)
      activePlaylistIdRef.current = null
    }
  }

  const updatePlaylist = async (updated) => {
    const index = playlists.findIndex(p => p.id === updated.id)
    if (index !== -1) {
      const updatedPlaylists = [...playlists]
      updatedPlaylists[index] = updated
      await savePlaylists(updatedPlaylists)
    }
  }

  const savePlaylistItems = async (playlistId, items) => {
    const currentActiveId = activePlaylistIdRef.current || activePlaylistId
    
    const index = playlistsRef.current.findIndex(p => p.id === playlistId)
    if (index !== -1) {
      const updatedPlaylists = [...playlistsRef.current]
      updatedPlaylists[index] = { ...updatedPlaylists[index], items }
      
      setPlaylists(updatedPlaylists)
      playlistsRef.current = updatedPlaylists
      
      if (currentActiveId) {
        setActivePlaylistId(currentActiveId)
        activePlaylistIdRef.current = currentActiveId
      }
      
      await window.electronAPI.storeSet('playlists', updatedPlaylists)
    }
  }

  const handleSelectPlaylist = (id) => {
    setActivePlaylistId(id)
    activePlaylistIdRef.current = id
  }

  const renderSidebar = useCallback(() => {
    return (
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-playlist" style={{ color: 'var(--accent)' }} /> {t('sequencerTitle')}
          </div>
          
          {showNewPlaylist ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 6,
              padding: '6px 0'
            }}>
              <input 
                autoFocus 
                value={newPlaylistName} 
                onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createPlaylist()
                  if (e.key === 'Escape') cancelCreatePlaylist()
                }}
                placeholder={t('playlistName')} 
                className="input-sm" 
                style={{ 
                  flex: 1,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  minHeight: 32
                }} 
              />
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button 
                  className="btn-secondary btn-sm" 
                  onClick={cancelCreatePlaylist}
                  style={{ 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                    padding: '4px 12px',
                    minHeight: 28
                  }}
                >
                  <i className="ti ti-x" /> {t('cancel')}
                </button>
                <button 
                  className="btn-primary btn-sm" 
                  onClick={createPlaylist}
                  disabled={!newPlaylistName.trim()}
                  style={{ 
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                    padding: '4px 12px',
                    minHeight: 28,
                    opacity: newPlaylistName.trim() ? 1 : 0.5
                  }}
                  data-testid="new-playlist-button"
                >
                  <i className="ti ti-check" /> {t('add')}
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="btn-primary btn-sm" 
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                padding: '6px 12px',
                minHeight: 34
              }}
              onClick={() => setShowNewPlaylist(true)}
              data-testid="new-playlist-button"
            >
              <i className="ti ti-plus" /> {t('newPlaylist')}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {playlists.length === 0 && (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
              {t('noPlaylist')}
            </div>
          )}
          {playlists.map(pl => {
            const isActive = activePlaylistId === pl.id || activePlaylistIdRef.current === pl.id
            return (
              <div 
                key={pl.id}
                onClick={() => handleSelectPlaylist(pl.id)}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                style={{ 
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent)' : undefined
                }}
                data-testid={`playlist-item-${pl.id}`}
              >
                <i className="ti ti-playlist" style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: 15 }} />
                <div className="label">
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {pl.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                    {pl.items.length} {t('sounds')}
                  </div>
                </div>
                
                <DeleteButton
                  onDelete={() => deletePlaylist(pl.id)}
                  confirmTitle={t('deletePlaylist')}
                  confirmMessage={t('deletePlaylistConfirm')}
                  itemName={pl.name}
                  size="sm"
                  variant="ghost-danger"
                  icon="ti-trash"
                  showLabel={false}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }, [playlists, activePlaylistId, showNewPlaylist, newPlaylistName, t, createPlaylist, cancelCreatePlaylist, deletePlaylist, handleSelectPlaylist])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {renderSidebar()}

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activePlaylist ? (
          <PlaylistEditor
            key={activePlaylist.id}
            playlist={activePlaylist}
            sounds={store.sounds}
            audioDevice={store.audioDevice}
            volume={store.volume}
            onUpdate={updatePlaylist}
            onSaveItems={savePlaylistItems}
            addToast={addToast}
            lang={lang}
            onPlaylistChange={(playlist) => {
              if (playlist && playlist.id) {
                setActivePlaylistId(playlist.id)
                activePlaylistIdRef.current = playlist.id
              }
            }}
          />
        ) : (
          <EmptyState lang={lang} />
        )}
      </div>
      <ConfirmWrapper />
    </div>
  )
}

function EmptyState({ lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
  return (
    <div className="flex-center" style={{ flexDirection: 'column', height: '100%', gap: 12, color: 'var(--text-tertiary)' }}>
      <i className="ti ti-playlist" style={{ fontSize: 48, color: 'var(--border)' }} />
      <div style={{ fontWeight: 500, fontSize: 14 }}>{t('selectPlaylist')}</div>
      <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
        {t('selectPlaylistDesc')}
      </div>
    </div>
  )
}

function PlaylistEditor({ playlist, sounds, audioDevice, volume, onUpdate, onSaveItems, addToast, lang = 'fr', onPlaylistChange }) {
  const { t, currentLang } = useLanguage()
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
  const playlistIdRef = useRef(playlist.id)

  useEffect(() => {
    playlistIdRef.current = playlist.id
  }, [playlist.id])

  useEffect(() => {
    if (!playing || currentIdx < 0) { setCurrentProgress(null); return }
    const item = items[currentIdx]
    if (!item) return
    const interval = setInterval(() => {
      if (howlRef.current && howlRef.current.playing()) {
        const seek = howlRef.current.seek()
        const duration = howlRef.current.duration()
        if (typeof seek === 'number' && typeof duration === 'number' && duration > 0) {
          setCurrentProgress({ current: seek, duration, ratio: Math.min(1, seek / duration) })
          setCurrentPlayingProgress(item.soundId, seek, duration)
        }
      } else {
        setCurrentProgress(null)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [playing, currentIdx, items])

  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])
  useEffect(() => { itemsRef.current = items }, [items])

  const saveItemsOnly = async (updatedItems) => {
    setItems(updatedItems)
    if (onSaveItems) {
      await onSaveItems(playlistIdRef.current, updatedItems)
    }
    if (onPlaylistChange) {
      onPlaylistChange({ ...playlist, items: updatedItems })
    }
  }

  const saveItems = async (updatedItems, loop = loopPlaylist) => {
    setItems(updatedItems)
    await onUpdate({ ...playlist, items: updatedItems, loop })
    if (onPlaylistChange) {
      onPlaylistChange({ ...playlist, items: updatedItems, loop })
    }
  }

  const playFrom = useCallback(async (idx) => {
    if (idx >= items.length) {
      if (loopPlaylist) { playFrom(0); return }
      setPlaying(false)
      setCurrentIdx(-1)
      setCurrentPlayingSound(null)
      return
    }

    const item = items[idx]
    setCurrentIdx(idx)
    const sound = sounds.find(s => s.id === item.soundId)
    if (!sound) { playFrom(idx + 1); return }

    // ✅ Notifier la sidebar qu'un nouveau son démarre
    setCurrentPlayingSound(item.soundId)

    const fileUrl = sound.path.startsWith('file://')
      ? sound.path : 'file:///' + sound.path.replace(/\\/g, '/')

    // ✅ Analyser le gain en arrière-plan (peuple le cache de normalisation)
    if (sound.path) {
      analyzeGain(sound.path).catch(() => {})
    }

    // ✅ Volume identique à la page Mes sons (normalisation + courbe ^1.8 + dB)
    const volumeRatio = getFinalVolumeForSound(sound, volume)

    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload() }

    howlRef.current = new Howl({
      src: [fileUrl],
      volume: volumeRatio,
      html5: false,
      onend: () => {
        const delay = item.delay || 0
        sequenceRef.current = setTimeout(() => {
          if (sequenceRef.current !== null) playFrom(idx + 1)
        }, delay * 1000)
      }
    })
    howlRef.current.play()
  }, [items, sounds, volume, loopPlaylist])

  const startSequence = () => {
    if (items.length === 0) { addToast(t('emptyPlaylist'), 'error'); return }
    setPlaying(true)
    playFrom(0)
  }

  const stopSequence = useCallback(() => {
    setPlaying(false)
    setCurrentIdx(-1)
    playingRef.current = false
    if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
    setCurrentPlayingSound(null)
  }, [])

  useEffect(() => {
    registerStopSequencerCallback(stopSequence)
    return () => registerStopSequencerCallback(null)
  }, [stopSequence])

  useEffect(() => {
    const handler = (e) => {
      if (!playingRef.current) return
      if (e.key === 'ArrowRight' || e.key === 'MediaTrackNext') {
        e.preventDefault()
        if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
        if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
        const next = currentIdxRef.current + 1
        if (next < itemsRef.current.length) playFrom(next)
        else if (loopPlaylist) playFrom(0)
        else stopSequence()
      }
      if (e.key === 'ArrowLeft' || e.key === 'MediaTrackPrevious') {
        e.preventDefault()
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

  const handleDragStart = (e, idx) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
    e.stopPropagation()
    setTimeout(() => {
      if (e.target) {
        e.target.style.opacity = '0.4'
        e.target.classList.add('dragging')
      }
    }, 0)
  }

  const handleDragEnd = (e) => {
    if (e.target) {
      e.target.style.opacity = '1'
      e.target.classList.remove('dragging')
    }
    setDragOverIdx(null)
    if (onPlaylistChange) {
      onPlaylistChange(playlist)
    }
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  const handleDragLeave = () => {
    setDragOverIdx(null)
  }

  const handleDrop = (e, toIdx) => {
    e.preventDefault()
    e.stopPropagation()
    
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'))
    if (isNaN(fromIdx) || fromIdx === toIdx) {
      setDragOverIdx(null)
      return
    }
    
    const updated = [...items]
    const [moved] = updated.splice(fromIdx, 1)
    updated.splice(toIdx, 0, moved)
    setDragOverIdx(null)
    
    saveItemsOnly(updated)
    addToast(t('soundMoved'), 'success')
    
    if (onPlaylistChange) {
      setTimeout(() => {
        onPlaylistChange({ ...playlist, items: updated })
      }, 50)
    }
  }

  const updateItem = (idx, changes) => {
    const updated = items.map((item, i) => i === idx ? { ...item, ...changes } : item)
    saveItemsOnly(updated)
  }

  const removeItem = (idx) => {
    const updated = items.filter((_, i) => i !== idx)
    saveItemsOnly(updated)
  }

  const addSounds = (soundIds) => {
    const newItems = soundIds.map(id => ({
      id: crypto.randomUUID(),
      soundId: id,
      delay: 0
    }))
    const updated = [...items, ...newItems]
    saveItems(updated)
    setShowAddSound(false)
  }

  const totalDuration = items.reduce((acc, item) => {
    return acc + (item.delay || 0)
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{playlist.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {items.length} {t('sounds')} · {totalDuration.toFixed(1)}s {t('delayAfter').toLowerCase()}
          </div>
        </div>

        <button 
          onClick={() => { setLoopPlaylist(!loopPlaylist); saveItems(items, !loopPlaylist) }}
          className={`btn-sm ${loopPlaylist ? 'btn-success' : 'btn-secondary'}`}
          style={{ 
            border: `1px solid ${loopPlaylist ? 'var(--success)' : 'var(--border)'}`, 
            minHeight: 28, 
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            padding: '4px 10px'
          }}
          data-testid="loop-sequence-button"
        >
          <i className="ti ti-repeat" style={{ fontSize: 14 }} /> {t('loop')}
        </button>

        <button 
          className="btn-secondary btn-sm" 
          style={{ 
            minHeight: 28, 
            padding: '4px 12px', 
            borderRadius: 'var(--radius-sm)',
            fontSize: 12
          }} 
          onClick={() => setShowAddSound(true)}
          data-testid="add-sounds-button"
        >
          <i className="ti ti-plus" style={{ fontSize: 14 }} /> {t('addSounds')}
        </button>

        {playing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button 
                onClick={() => {
                  if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
                  if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
                  const prev = Math.max(0, currentIdx - 1)
                  playFrom(prev)
                }} 
                className="btn-secondary btn-sm" 
                title={t('previous')}
                style={{ borderRadius: 'var(--radius-sm)', minHeight: 28, padding: '4px 8px' }}
              >
                <i className="ti ti-player-skip-back" style={{ fontSize: 14 }} />
              </button>
              <button 
                onClick={() => {
                  if (sequenceRef.current) { clearTimeout(sequenceRef.current); sequenceRef.current = null }
                  if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); howlRef.current = null }
                  const next = currentIdx + 1
                  if (next < items.length) playFrom(next)
                  else if (loopPlaylist) playFrom(0)
                  else stopSequence()
                }} 
                className="btn-secondary btn-sm" 
                title={t('next')}
                style={{ borderRadius: 'var(--radius-sm)', minHeight: 28, padding: '4px 8px' }}
              >
                <i className="ti ti-player-skip-forward" style={{ fontSize: 14 }} />
              </button>
            </div>
            <button 
              onClick={stopSequence} 
              className="btn-danger btn-sm"
              style={{ borderRadius: 'var(--radius-sm)', minHeight: 28, padding: '4px 10px', fontSize: 12 }}
            >
              <i className="ti ti-player-stop-filled" style={{ fontSize: 14 }} /> {t('stop_seq')}
            </button>
          </div>
        ) : (
          <button 
            className="btn-primary btn-sm" 
            onClick={startSequence} 
            style={{ borderRadius: 'var(--radius-sm)', minHeight: 28, padding: '4px 12px', fontSize: 12 }}
            data-testid="play-sequence-button"
          >
            <i className="ti ti-player-play-filled" style={{ fontSize: 14 }} /> {t('start_seq')}
          </button>
        )}
      </div>

      {playing && currentProgress && (
        <div className="sequencer-progress">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-music" style={{ color: 'var(--accent)' }} />
              {currentIdx >= 0 && items[currentIdx] && (() => {
                const s = sounds.find(s => s.id === items[currentIdx].soundId)
                return s?.name || t('unknownSound')
              })()}
            </span>
            <span style={{ fontFamily: 'monospace' }}>
              {formatTime(currentProgress.current)} / {formatTime(currentProgress.duration)}
            </span>
          </div>
          <div className="progress-bar">
            <div className="track">
              <div className="fill accent" style={{ width: `${currentProgress.ratio * 100}%` }} />
            </div>
          </div>
          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 3 }}>
              <span>{t('playing')} {currentIdx + 1} / {items.length}</span>
              <span>{items.filter((_, i) => i > currentIdx).length} {t('remaining')}</span>
            </div>
          )}
        </div>
      )}

      {playing && (
        <div className="sequencer-shortcuts">
          <i className="ti ti-keyboard" />
          <span>{t('activeShortcuts')} :</span>
          <kbd>←</kbd>
          <span>{t('previous')}</span>
          <kbd>→</kbd>
          <span>{t('next')}</span>
          <kbd>{t('stop_seq')}</kbd>
          <span>{t('stopAll')}</span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
            <i className="ti ti-music-plus" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
            <div style={{ fontWeight: 500, marginBottom: 6 }}>{t('emptyPlaylist')}</div>
            <div style={{ fontSize: 12, marginBottom: 16 }}>{t('addSounds')}</div>
            <button 
              className="btn-primary btn-lg" 
              onClick={() => setShowAddSound(true)} 
              style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 24px' }}
            >
              <i className="ti ti-plus" /> {t('addSounds')}
            </button>
          </div>
        )}

        {items.map((item, idx) => {
          const sound = sounds.find(s => s.id === item.soundId)
          const isActive = currentIdx === idx && playing
          const isDragOver = dragOverIdx === idx
          
          return (
            <div 
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              className={`sequencer-item ${isActive ? 'active' : ''} ${isDragOver ? 'drag-over' : ''}`}
              data-testid={`playlist-item-${item.id}`}
              style={{ 
                borderRadius: 'var(--radius-md)',
                transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
                cursor: 'grab',
                border: isDragOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: isDragOver ? 'rgba(124,111,247,0.08)' : isActive ? 'var(--accent-light)' : 'var(--bg-secondary)',
                boxShadow: isDragOver ? '0 0 20px rgba(124,111,247,0.15)' : 'none',
                position: 'relative',
                zIndex: isDragOver ? 10 : 1
              }}
            >
              {isDragOver && (
                <div style={{
                  position: 'absolute',
                  top: -2,
                  left: 4,
                  right: 4,
                  height: 3,
                  background: 'var(--accent)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                  zIndex: 5,
                  animation: 'slideIn 0.2s ease',
                  boxShadow: '0 0 10px var(--accent)'
                }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 12, flexShrink: 0 }}>
                <i className="ti ti-grip-vertical" style={{ opacity: 0.4 }} />
                <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                  {idx + 1}
                </span>
              </div>

              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                {sound?.image
                  ? <img src={buildFileUrl(sound.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (sound?.emoji || '🔊')}
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {sound?.name || <span style={{ color: 'var(--danger)', fontSize: 12 }}>{t('editorNoSound')}</span>}
                </div>
                {isActive && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <i className="ti ti-volume" style={{ animation: 'pulse 1s ease infinite' }} /> {t('playing')}
                    </div>
                    {currentProgress && (
                      <div className="progress-bar" style={{ height: 3 }}>
                        <div className="track">
                          <div className="fill accent" style={{ width: `${currentProgress.ratio * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <i className="ti ti-clock" style={{ fontSize: 13, color: 'var(--text-tertiary)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 1 }}>{t('delayAfter')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number" min="0" max="60" step="0.5"
                      value={item.delay || 0}
                      onChange={e => updateItem(idx, { delay: Math.max(0, Number(e.target.value)) })}
                      className="input-sm"
                      style={{ width: 55, textAlign: 'center', borderRadius: 'var(--radius-sm)' }}
                      onClick={e => e.stopPropagation()}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>s</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => removeItem(idx)}
                style={{
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(224, 82, 82, 0.1)'
                  e.currentTarget.style.color = 'var(--danger)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-tertiary)'
                }}
                title={t('delete')}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          )
        })}
      </div>

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
        @keyframes slideIn {
          from { transform: scaleX(0); opacity: 0; }
          to { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function AddSoundModal({ sounds, existingIds, onAdd, onClose, lang = 'fr' }) {
  const { t, currentLang } = useLanguage()
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
      <div className="modal" style={{ width: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-music-plus" style={{ color: 'var(--accent)' }} />
          {t('addSounds')}
        </div>

        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          placeholder={t('search')} 
          className="input-lg" 
          style={{ marginBottom: 10, borderRadius: 'var(--radius-md)' }} 
          autoFocus 
          data-testid="add-sounds-search"
        />

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
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 'var(--radius-sm)' }}>{t('alreadyAdded')}</span>
                )}
              </label>
            )
          })}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary btn-lg" onClick={onClose} style={{ borderRadius: 'var(--radius-md)' }}>
            {t('cancel')}
          </button>
          <button 
            className="btn-primary btn-lg" 
            onClick={() => onAdd(selected)} 
            disabled={selected.length === 0}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <i className="ti ti-plus" /> {t('add')} {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}