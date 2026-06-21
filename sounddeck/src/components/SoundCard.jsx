// sounddeck/src/components/SoundCard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { playSound, stopSound, isPlaying, getSoundProgress } from '../utils/audio'
import ShortcutRecorder from './ShortcutRecorder'
import { useTranslation } from '../i18n'

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Convertir une ancienne valeur de volume (0-100) en dB (-24 à +24)
function convertOldVolumeToDb(oldVolume) {
  if (oldVolume === undefined || oldVolume === null) return 0
  if (oldVolume >= -24 && oldVolume <= 24) return oldVolume
  return Math.round(((oldVolume - 50) / 50) * 24 * 10) / 10
}

export default function SoundCard({ sound, shortcut, audioDevice, volume, loopEnabled, playLocally, onToggleFavorite, onSetShortcut, onDelete, onRemoveFromProfile, onRename, onVolumeChange, onPlay, currentProfileId, lang = 'fr', onDragStart, onDragEnd, draggable = true, layout = 'qwerty'}) {
  const tr = useTranslation(lang)
  const [playing, setPlaying] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(sound.name)
  
  const initialVolume = sound.volumeDb !== undefined ? sound.volumeDb : convertOldVolumeToDb(sound.volume)
  const [localVolume, setLocalVolume] = useState(initialVolume)
  const [imgError, setImgError] = useState(false)
  const [fileError, setFileError] = useState(false)
  const [progress, setProgress] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [volumePosition, setVolumePosition] = useState({ top: 0, left: 0 })
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)

  const cardRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => { 
    const newVolume = sound.volumeDb !== undefined ? sound.volumeDb : convertOldVolumeToDb(sound.volume)
    setLocalVolume(newVolume) 
  }, [sound.volume, sound.volumeDb])

  useEffect(() => { setImgError(false) }, [sound.image])

  useEffect(() => {
    if (!playing) { setProgress(null); return }
    const interval = setInterval(() => {
      if (!isPlaying(sound.id)) {
        setPlaying(false)
        setProgress(null)
      } else {
        const p = getSoundProgress(sound.id)
        if (p && p.duration > 3) setProgress(p)
        else setProgress(null)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [playing, sound.id])

  useEffect(() => {
    if (!loopEnabled && playing) {
      stopSound(sound.id)
      setPlaying(false)
    }
  }, [loopEnabled])

  const handlePlay = async (e) => {
    e?.stopPropagation()
    if (playing) {
      stopSound(sound.id)
      setPlaying(false)
      return
    }

    if (sound.path && !sound.path.startsWith('http')) {
      const exists = await window.electronAPI.fileExists(sound.path)
      if (!exists) {
        setFileError(true)
        return
      }
    }

    setFileError(false)
    playSound(sound, audioDevice, volume, loopEnabled, playLocally)
    setPlaying(true)
    onPlay?.(sound.id)
  }

  const handleRename = () => {
    if (nameValue.trim() && nameValue !== sound.name) onRename(sound.id, nameValue.trim())
    setEditingName(false)
  }

  const handleVolumeCommit = useCallback((val) => {
    const clampedVal = Math.max(-24, Math.min(24, val))
    onVolumeChange(sound.id, clampedVal)
  }, [sound.id, onVolumeChange])

  const handleVolumeDragStart = useCallback(() => {
    setIsDraggingVolume(true)
    if (cardRef.current) {
      cardRef.current.style.cursor = 'default'
    }
  }, [])

  const handleVolumeDragEnd = useCallback(() => {
    setIsDraggingVolume(false)
    if (cardRef.current) {
      cardRef.current.style.cursor = draggable ? 'grab' : 'default'
    }
  }, [draggable])

  const buildImageUrl = (imgPath) => {
    if (!imgPath) return null
    if (imgPath.startsWith('file://') || imgPath.startsWith('http')) return imgPath
    const normalized = imgPath.replace(/\\/g, '/')
    const parts = normalized.split('/')
    const encoded = parts.map((part) => {
      if (part === '' || /^[A-Za-z]:$/.test(part)) return part
      return encodeURIComponent(part)
    }).join('/')
    return 'file:///' + encoded
  }

  const imageUrl = buildImageUrl(sound.image)
  const showImage = !!(sound.image) && !imgError

  const handleMenuToggle = (e) => {
    e.stopPropagation()
    if (showMenu) {
      setShowMenu(false)
      return
    }
    
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      let top = rect.bottom + 4
      let left = rect.left - 10
      
      const menuWidth = 220
      const menuHeight = 280
      
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 10
      }
      if (left < 10) {
        left = 10
      }
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4
      }
      if (top < 10) {
        top = 10
      }
      
      setMenuPosition({ top, left })
    }
    setShowMenu(true)
    setShowVolume(false)
  }

  const handleVolumeOpen = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      const top = Math.max(10, Math.min(rect.top + rect.height / 2 - 150, window.innerHeight - 320))
      const left = Math.max(10, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 320))
      setVolumePosition({ top, left })
    }
    setShowVolume(true)
    setShowMenu(false)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target)) {
        if (buttonRef.current && buttonRef.current.contains(e.target)) {
          return
        }
        setShowMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleDragStart = (e) => {
    if (isDraggingVolume || showVolume) {
      e.preventDefault()
      return false
    }
    if (onDragStart) {
      onDragStart(e)
    }
  }

  const handleDragEnd = (e) => {
    if (isDraggingVolume || showVolume) return
    if (onDragEnd) {
      onDragEnd(e)
    }
  }

  return (
    <>
      <div 
        ref={cardRef} 
        draggable={draggable && !isDraggingVolume && !showVolume}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{
          background: 'var(--bg-secondary)',
          border: `1px solid ${fileError ? 'var(--danger)' : playing ? (loopEnabled ? 'var(--success)' : 'var(--accent)') : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)', padding: 8, position: 'relative',
          transition: 'border-color 0.15s',
          cursor: draggable && !isDraggingVolume && !showVolume ? 'grab' : 'default',
          userSelect: isDraggingVolume || showVolume ? 'none' : 'auto'
        }} 
        className={playing ? 'playing-pulse' : ''}
      >

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <button onClick={e => { e.stopPropagation(); onToggleFavorite(sound.id) }}
            style={{
              background: sound.favorite ? 'rgba(239,159,39,0.15)' : 'var(--bg-tertiary)',
              border: `1px solid ${sound.favorite ? 'var(--warning)' : 'var(--border)'}`,
              borderRadius: 6, fontSize: 12, color: sound.favorite ? 'var(--warning)' : 'var(--text-tertiary)',
              padding: '3px 7px', cursor: 'pointer', lineHeight: 1
            }}>
            <i className={`ti ${sound.favorite ? 'ti-star-filled' : 'ti-star'}`} />
          </button>

          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {loopEnabled && (
              <span title="Loop activé" style={{ fontSize: 11, color: 'var(--success)' }}>
                <i className="ti ti-repeat" />
              </span>
            )}
            <button ref={buttonRef} onClick={handleMenuToggle}
              style={{
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: 6, color: 'var(--text-secondary)', padding: '3px 7px',
                fontSize: 12, cursor: 'pointer', lineHeight: 1
              }}>
              <i className="ti ti-dots-vertical" />
            </button>
          </div>
        </div>

        <div onClick={handlePlay}
          style={{
            width: '100%', aspectRatio: '1', background: 'var(--bg-tertiary)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, marginBottom: 7, position: 'relative', overflow: 'hidden', cursor: 'pointer'
          }}
          onMouseEnter={e => { const o = e.currentTarget.querySelector('.play-overlay'); if (o) o.style.opacity = 1 }}
          onMouseLeave={e => { const o = e.currentTarget.querySelector('.play-overlay'); if (o && !playing) o.style.opacity = 0 }}
        >
          {showImage && (
            <img
              src={imageUrl}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
          )}
          {!showImage && (
            <span style={{ fontSize: 26 }}>{sound.emoji || '🔊'}</span>
          )}
          <div className="play-overlay" style={{
            position: 'absolute', inset: 0,
            background: playing
              ? (loopEnabled ? 'rgba(29,158,117,0.85)' : 'rgba(224,82,82,0.85)')
              : 'rgba(124,111,247,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: playing ? 1 : 0, transition: 'opacity 0.15s, background 0.15s', borderRadius: 8
          }}>
            <i className={`ti ${playing ? 'ti-player-stop-filled' : 'ti-player-play-filled'}`} style={{ fontSize: 26, color: 'white' }} />
            {playing && loopEnabled && (
              <i className="ti ti-repeat" style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 12, color: 'white', opacity: 0.8 }} />
            )}
          </div>
        </div>

        {editingName ? (
          <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
            style={{ fontSize: 11, padding: '3px 6px', marginBottom: 4 }}
            onClick={e => e.stopPropagation()} />
        ) : (
          <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
            {sound.name}
          </div>
        )}

        <ShortcutRecorder
          value={shortcut || ''}
          onSave={(acc) => onSetShortcut(sound.id, acc)}
          onClear={() => onSetShortcut(sound.id, '')}
          compact
          lang={lang}
          layout={layout}
        />

        {progress && (
          <div style={{ marginTop: 4 }}>
            <div style={{
              height: 4, background: 'var(--bg-tertiary)',
              borderRadius: 2, overflow: 'hidden',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: loopEnabled ? 'var(--success)' : 'var(--accent)',
                width: `${progress.ratio * 100}%`,
                transition: 'width 0.1s linear',
                boxShadow: `0 0 4px ${loopEnabled ? 'var(--success)' : 'var(--accent)'}`
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-tertiary)', marginTop: 1 }}>
              <span>{fmtTime(progress.current)}</span>
              <span>{fmtTime(progress.duration)}</span>
            </div>
          </div>
        )}
        {sound.playCount > 0 && (
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <i className="ti ti-player-play" style={{ fontSize: 8 }} />
            {sound.playCount} {tr('playCount')}
          </div>
        )}
      </div>

      {showMenu && createPortal(
        <div ref={menuRef}>
          <ContextMenuPortal
            sound={sound}
            currentProfileId={currentProfileId}
            onClose={() => setShowMenu(false)}
            onToggleFavorite={() => { onToggleFavorite(sound.id); setShowMenu(false) }}
            onRename={() => { setEditingName(true); setShowMenu(false) }}
            onVolumeOpen={handleVolumeOpen}
            onRemoveFromProfile={onRemoveFromProfile ? () => { onRemoveFromProfile(sound.id); setShowMenu(false) } : null}
            onDelete={() => { onDelete(sound.id); setShowMenu(false) }}
            position={menuPosition}
            lang={lang}
          />
        </div>,
        document.body
      )}

      {showVolume && createPortal(
        <VolumePanel
          volume={localVolume}
          onChange={setLocalVolume}
          onCommit={handleVolumeCommit}
          onClose={() => {
            setShowVolume(false)
            handleVolumeDragEnd()
          }}
          onDragStart={handleVolumeDragStart}
          onDragEnd={handleVolumeDragEnd}
          soundName={sound.name}
          lang={lang}
          position={volumePosition}
        />,
        document.body
      )}
    </>
  )
}

// VolumePanel simplifié - sans barre de progression supplémentaire
function VolumePanel({ volume, onChange, onCommit, onClose, lang = 'fr', onDragStart, onDragEnd, soundName, position }) {
  const tr = useTranslation(lang)
  const [localVolume, setLocalVolume] = useState(volume)
  
  useEffect(() => {
    setLocalVolume(volume)
  }, [volume])
  
  const handleSliderChange = (e) => {
    const newVal = parseFloat(e.target.value)
    if (!isNaN(newVal)) {
      setLocalVolume(newVal)
      onChange(newVal)
    }
  }

  const handleSliderMouseUp = () => {
    onCommit(localVolume)
    if (onDragEnd) onDragEnd()
  }

  const handleSliderMouseDown = () => {
    if (onDragStart) onDragStart()
  }

  const resetToZero = () => {
    setLocalVolume(0)
    onChange(0)
    onCommit(0)
  }

  // Fermer le panneau quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      const panel = document.getElementById('volume-panel')
      if (panel && !panel.contains(e.target)) {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div 
      id="volume-panel"
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: position?.top || '50%',
        left: position?.left || '50%',
        transform: position?.top ? 'none' : 'translate(-50%, -50%)',
        zIndex: 99999,
        background: 'var(--bg-secondary)',
        border: '2px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        width: 320,
        maxWidth: '90vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      {/* En-tête avec le nom du son */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16
          }}>
            {soundName?.charAt(0)?.toUpperCase() || '🔊'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {tr('menuVolume')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {soundName || ''}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 4,
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
        >
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Valeur du volume en grand */}
      <div style={{ 
        textAlign: 'center',
        marginBottom: 16,
        padding: '8px 0',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
      }}>
        <span style={{ 
          fontSize: 32, 
          fontWeight: 700,
          color: localVolume === 0 ? 'var(--accent)' : localVolume > 0 ? 'var(--success)' : 'var(--danger)'
        }}>
          {localVolume > 0 ? '+' : ''}{localVolume}
        </span>
        <span style={{ fontSize: 16, color: 'var(--text-tertiary)', marginLeft: 4 }}>dB</span>
      </div>

      {/* Slider uniquement - sans barre de progression supplémentaire */}
      <div style={{ padding: '4px 0' }}>
        <input 
          type="range" 
          min="-24" 
          max="24" 
          step="0.5" 
          value={localVolume}
          onChange={handleSliderChange}
          onMouseDown={handleSliderMouseDown}
          onMouseUp={handleSliderMouseUp}
          onTouchStart={handleSliderMouseDown}
          onTouchEnd={handleSliderMouseUp}
          style={{ 
            width: '100%', 
            accentColor: 'var(--accent)', 
            background: 'transparent', 
            border: 'none', 
            padding: 0, 
            cursor: 'pointer',
            height: 6
          }}
        />
      </div>

      {/* Labels du slider */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 16 }}>
        <span>-24 dB</span>
        <span style={{ 
          color: localVolume === 0 ? 'var(--accent)' : 'var(--text-tertiary)', 
          fontWeight: localVolume === 0 ? 600 : 400,
          background: localVolume === 0 ? 'var(--accent-light)' : 'transparent',
          padding: '1px 8px',
          borderRadius: 10,
          fontSize: 9
        }}>
          ▸ 0 dB {tr('volumeDefault')}
        </span>
        <span>+24 dB</span>
      </div>

      {/* Boutons d'action */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={(e) => { e.stopPropagation(); resetToZero(); }}
          style={{
            flex: 1,
            background: localVolume === 0 ? 'var(--accent-light)' : 'var(--bg-tertiary)',
            border: `1px solid ${localVolume === 0 ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            color: localVolume === 0 ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => {
            if (localVolume !== 0) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-light)'
            }
          }}
          onMouseLeave={e => {
            if (localVolume !== 0) {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.background = 'var(--bg-tertiary)'
            }
          }}
          title={tr('volumeReset')}
        >
          <i className="ti ti-refresh" style={{ fontSize: 14 }} />
          <span>{tr('reset')}</span>
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="btn-primary"
          style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
        >
          <i className="ti ti-check" /> {tr('volumePanelClose')}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

function ContextMenuPortal({ sound, currentProfileId, onClose, onToggleFavorite, onRename, onVolumeOpen, onRemoveFromProfile, onDelete, position, lang = 'fr' }) {
  const tr = useTranslation(lang)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    let { top, left } = position
    
    if (rect.right > window.innerWidth) {
      left = position.left - rect.width
    }
    if (rect.bottom > window.innerHeight) {
      top = position.top - rect.height
    }
    if (left < 10) {
      left = 10
    }
    if (top < 10) {
      top = 10
    }
    
    menuRef.current.style.top = top + 'px'
    menuRef.current.style.left = left + 'px'
  }, [position])

  const handleMenuClick = (e) => {
    e.stopPropagation()
  }

  const handleAction = (action) => {
    action()
    onClose()
  }

  return (
    <div 
      ref={menuRef} 
      onClick={handleMenuClick}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 4,
        zIndex: 9999,
        minWidth: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <MenuItem 
        icon={sound.favorite ? 'ti-star' : 'ti-star-filled'} 
        label={sound.favorite ? tr('menuFavoriteRemove') : tr('menuFavoriteAdd')} 
        onClick={() => handleAction(onToggleFavorite)}
        lang={lang}
      />
      <MenuItem 
        icon="ti-pencil" 
        label={tr('menuRename')} 
        onClick={() => handleAction(onRename)}
        lang={lang}
      />
      <MenuItem 
        icon="ti-volume" 
        label={tr('menuVolume')} 
        onClick={() => handleAction(onVolumeOpen)}
        lang={lang}
      />
      {onRemoveFromProfile && currentProfileId !== 'all' && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <MenuItem 
            icon="ti-folder-minus" 
            label={tr('menuRemoveFromProfile')} 
            onClick={() => handleAction(onRemoveFromProfile)}
            warning 
            lang={lang}
          />
        </>
      )}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <MenuItem 
        icon="ti-trash" 
        label={tr('menuDelete')} 
        onClick={() => handleAction(onDelete)}
        danger 
        lang={lang}
      />
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger, warning, lang = 'fr' }) {
  return (
    <button 
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', background: 'transparent', border: 'none',
        color: danger ? 'var(--danger)' : warning ? 'var(--warning)' : 'var(--text-primary)',
        fontSize: 13, borderRadius: 6, cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.1s'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 16, minWidth: 20 }} />{label}
    </button>
  )
}