import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { playSound, stopSound, isPlaying, getSoundProgress } from '../utils/audio'
import ShortcutRecorder from './ShortcutRecorder'

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function SoundCard({ sound, shortcut, audioDevice, volume, loopEnabled, playLocally, onToggleFavorite, onSetShortcut, onDelete, onRemoveFromProfile, onRename, onVolumeChange, onPlay, currentProfileId }) {
  const [playing, setPlaying] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(sound.name)
  const [localVolume, setLocalVolume] = useState(sound.volume ?? 100)
  const [imgError, setImgError] = useState(false)
  const [fileError, setFileError] = useState(false)
  const [progress, setProgress] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

  const cardRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => { setLocalVolume(sound.volume ?? 100) }, [sound.volume])
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
    onVolumeChange(sound.id, val)
  }, [sound.id, onVolumeChange])

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

  // Ouvrir le menu contextuel
  const handleMenuToggle = (e) => {
    e.stopPropagation()
    if (showMenu) {
      setShowMenu(false)
      return
    }
    
    // Calculer la position du menu par rapport au bouton
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      let top = rect.bottom + 4
      let left = rect.left - 10
      
      // S'assurer que le menu ne sort pas de l'écran
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

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMenu && cardRef.current && !cardRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  return (
    <>
      <div ref={cardRef} style={{
        background: 'var(--bg-secondary)',
        border: `1px solid ${fileError ? 'var(--danger)' : playing ? (loopEnabled ? 'var(--success)' : 'var(--accent)') : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)', padding: 8, position: 'relative',
        transition: 'border-color 0.15s'
      }} className={playing ? 'playing-pulse' : ''}>

        {/* Barre du haut */}
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

        {showVolume && (
          <VolumePanel volume={localVolume} onChange={val => setLocalVolume(val)}
            onCommit={handleVolumeCommit} onClose={() => setShowVolume(false)} />
        )}

        {/* Image/emoji + overlay play/stop */}
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

        {/* Nom */}
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
            {sound.playCount} fois
          </div>
        )}
      </div>

      {/* Menu contextuel en portail - sort du DOM de la carte */}
      {showMenu && createPortal(
        <ContextMenuPortal
          sound={sound}
          currentProfileId={currentProfileId}
          onClose={() => setShowMenu(false)}
          onToggleFavorite={() => { onToggleFavorite(sound.id); setShowMenu(false) }}
          onRename={() => { setEditingName(true); setShowMenu(false) }}
          onVolumeOpen={() => { setShowVolume(true); setShowMenu(false) }}
          onRemoveFromProfile={onRemoveFromProfile ? () => { onRemoveFromProfile(sound.id); setShowMenu(false) } : null}
          onDelete={() => { onDelete(sound.id); setShowMenu(false) }}
          position={menuPosition}
        />,
        document.body
      )}
    </>
  )
}

function VolumePanel({ volume, onChange, onCommit, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 36, left: 0, right: 0, zIndex: 100,
      background: 'var(--bg-secondary)', border: '1px solid var(--accent)',
      borderRadius: 'var(--radius-md)', padding: '10px 12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-volume" /> Volume
        </span>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{volume}%</span>
      </div>
      <input type="range" min="0" max="100" value={volume}
        onChange={e => onChange(Number(e.target.value))}
        onMouseUp={e => onCommit(Number(e.target.value))}
        onTouchEnd={e => onCommit(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
      <button onClick={onClose} className="btn-secondary"
        style={{ width: '100%', marginTop: 8, padding: '4px 0', justifyContent: 'center', fontSize: 11 }}>
        Fermer
      </button>
    </div>
  )
}

// Menu contextuel en portail
function ContextMenuPortal({ sound, currentProfileId, onClose, onToggleFavorite, onRename, onVolumeOpen, onRemoveFromProfile, onDelete, position }) {
  const menuRef = useRef(null)

  // Réajuster la position si le menu sort de l'écran
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

  return (
    <div ref={menuRef} style={{
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
    }}>
      <MenuItem icon={sound.favorite ? 'ti-star' : 'ti-star-filled'} label={sound.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={onToggleFavorite} />
      <MenuItem icon="ti-pencil" label="Renommer" onClick={onRename} />
      <MenuItem icon="ti-volume" label="Régler le volume" onClick={onVolumeOpen} />
      {onRemoveFromProfile && currentProfileId !== 'all' && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <MenuItem icon="ti-folder-minus" label="Retirer du profil" onClick={onRemoveFromProfile} warning />
        </>
      )}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <MenuItem icon="ti-trash" label="Supprimer définitivement" onClick={onDelete} danger />
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger, warning }) {
  return (
    <button onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', background: 'transparent', border: 'none',
        color: danger ? 'var(--danger)' : warning ? 'var(--warning)' : 'var(--text-primary)',
        fontSize: 13, borderRadius: 6, cursor: 'pointer', textAlign: 'left'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <i className={`ti ${icon}`} />{label}
    </button>
  )
}