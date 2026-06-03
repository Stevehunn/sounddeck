import { useState } from 'react'
import { playSound } from '../utils/audio'

export default function SoundCard({ sound, shortcut, audioDevice, volume, onToggleFavorite, onSetShortcut, onDelete, onRename }) {
  const [playing, setPlaying] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(sound.name)

  const handlePlay = (e) => {
    e?.stopPropagation()
    setPlaying(true)
    playSound(sound, audioDevice, volume)
    setTimeout(() => setPlaying(false), 800)
  }

  const handleRename = () => {
    if (nameValue.trim() && nameValue !== sound.name) onRename(sound.id, nameValue.trim())
    setEditingName(false)
  }

  // Construire l'URL de l'image si elle existe
  const imageUrl = sound.image
    ? (sound.image.startsWith('file://') ? sound.image : `file:///${sound.image.replace(/\\/g, '/')}`)
    : null

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: `1px solid ${playing ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)', padding: 10, position: 'relative',
      transition: 'border-color 0.15s'
    }}
      className={playing ? 'playing-pulse' : ''}
    >
      {/* Menu contextuel */}
      <button onClick={e => { e.stopPropagation(); setShowMenu(!showMenu) }}
        style={{ position: 'absolute', top: 6, right: 6, background: 'transparent', border: 'none', color: 'var(--text-tertiary)', padding: '2px 4px', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
        <i className="ti ti-dots-vertical" />
      </button>

      {showMenu && (
        <ContextMenu sound={sound} onClose={() => setShowMenu(false)}
          onToggleFavorite={() => { onToggleFavorite(sound.id); setShowMenu(false) }}
          onRename={() => { setEditingName(true); setShowMenu(false) }}
          onDelete={() => { onDelete(sound.id); setShowMenu(false) }}
        />
      )}

      {/* Étoile favori */}
      <button onClick={e => { e.stopPropagation(); onToggleFavorite(sound.id) }}
        style={{ position: 'absolute', top: 6, left: 6, background: 'transparent', border: 'none', fontSize: 13, color: sound.favorite ? 'var(--warning)' : 'var(--text-tertiary)', padding: '2px', cursor: 'pointer' }}
        title={sound.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
        <i className={`ti ${sound.favorite ? 'ti-star-filled' : 'ti-star'}`} />
      </button>

      {/* Image/emoji + overlay play */}
      <div onClick={handlePlay}
        style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 8, marginTop: 2, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.querySelector('.play-overlay').style.opacity = 1}
        onMouseLeave={e => e.currentTarget.querySelector('.play-overlay').style.opacity = 0}
      >
        {imageUrl
          ? <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
          : null
        }
        <span style={{ display: imageUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{sound.emoji || '🔊'}</span>
        <div className="play-overlay" style={{
          position: 'absolute', inset: 0, background: 'rgba(124,111,247,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.15s', borderRadius: 8
        }}>
          <i className="ti ti-player-play-filled" style={{ fontSize: 28, color: 'white' }} />
        </div>
      </div>

      {/* Nom */}
      {editingName ? (
        <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
          onBlur={handleRename} onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
          style={{ fontSize: 12, padding: '3px 6px', marginBottom: 4 }} onClick={e => e.stopPropagation()} />
      ) : (
        <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
          {sound.name}
        </div>
      )}

      {/* Raccourci */}
      <ShortcutInput soundId={sound.id} shortcut={shortcut} onSetShortcut={onSetShortcut} />
    </div>
  )
}

function ShortcutInput({ soundId, shortcut, onSetShortcut }) {
  const [recording, setRecording] = useState(false)

  const handleKeyDown = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (e.key === 'Escape') { setRecording(false); return }
    if (e.key === 'Backspace' || e.key === 'Delete') { onSetShortcut(soundId, ''); setRecording(false); return }

    const parts = []
    if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
    if (!['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
      parts.push(key)
      if (parts.length >= 1) { onSetShortcut(soundId, parts.join('+')); setRecording(false) }
    }
  }

  if (recording) {
    return (
      <div tabIndex={0} onKeyDown={handleKeyDown} onBlur={() => setRecording(false)}
        autoFocus
        ref={el => el && el.focus()}
        style={{ fontSize: 10, textAlign: 'center', background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 4, padding: '3px 6px', color: 'var(--accent)', cursor: 'pointer', outline: 'none' }}>
        Appuyez sur une touche...
      </div>
    )
  }

  return (
    <div onClick={e => { e.stopPropagation(); setRecording(true) }}
      className="shortcut-badge"
      style={{ display: 'block', textAlign: 'center', cursor: 'pointer', fontSize: 10, padding: '3px 6px' }}
      title="Cliquer pour définir un raccourci">
      {shortcut || '+ Raccourci'}
    </div>
  )
}

function ContextMenu({ sound, onClose, onToggleFavorite, onRename, onDelete }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
      <div style={{ position: 'absolute', top: 28, right: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4, zIndex: 100, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
        <MenuItem icon="ti-star" label={sound.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={onToggleFavorite} />
        <MenuItem icon="ti-pencil" label="Renommer" onClick={onRename} />
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
        <MenuItem icon="ti-trash" label="Supprimer" onClick={onDelete} danger />
      </div>
    </>
  )
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'transparent', border: 'none', color: danger ? 'var(--danger)' : 'var(--text-primary)', fontSize: 13, borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <i className={`ti ${icon}`} />{label}
    </button>
  )
}