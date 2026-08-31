// src/shared/components/audio/SoundCard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { playSound, stopSound, isPlaying, getSoundProgress } from '@core/services/AudioService'
import ShortcutRecorder from "@shared/components/settings/ShortcutRecorder"
import { useLanguage } from '@core/i18n/LanguageContext'
import useConfirm from '@shared/hooks/useConfirm'

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

// Liste d'emojis prédéfinis
const EMOJI_LIST = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋','🎤','🦄','💯','🤡','👾','🪇','🪘','🎸','🎹','🎷','🎺','🎻','🥁','🪗','🎼','🎧','📢','📣','🔇','🔈','🔉','🔊','💬','🗣️','👥','👤','🎭','🎪','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🎻','🪕','🎮','🕹️','🎲','🧩','🎯','🎱','🎳','🎰','🧨','💣','🔫','🗡️','⚔️','🛡️','🏹','🪃','🪄','🔮','🧿','🪬','💎','🪙','💰','💵','💶','💷','💴','🪪','📱','📲','💻','🖥️','🖨️','⌨️','🖱️','🖲️','💽','💾','💿','📀','🧮','📟','☎️','📞','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏰','⏳','⌛️']

export default function SoundCard({ 
  sound, 
  shortcut, 
  audioDevice, 
  volume, 
  loopEnabled, 
  playLocally, 
  onToggleFavorite, 
  onSetShortcut, 
  onDelete, 
  onRemoveFromProfile, 
  onRename, 
  onVolumeChange, 
  onPlay, 
  currentProfileId, 
  lang = 'fr', 
  onDragStart, 
  onDragEnd, 
  draggable = true, 
  layout = 'qwerty',
  onChangeImage,
  onChangeEmoji,
  tags = [],
  onAddTag,
  onRemoveTag,
  size = 'medium'
}) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  const [playing, setPlaying] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(sound.name)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 })
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')
  
  const initialVolume = sound.volumeDb !== undefined ? sound.volumeDb : convertOldVolumeToDb(sound.volume)
  const [localVolume, setLocalVolume] = useState(initialVolume)
  const [imgError, setImgError] = useState(false)
  const [fileError, setFileError] = useState(false)
  const [progress, setProgress] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [volumePosition, setVolumePosition] = useState({ top: 0, left: 0 })
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)
  const [menuHeight, setMenuHeight] = useState(0)

  const cardRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  const cardSizes = {
    small: { padding: 6, fontSize: 9, emojiSize: 20, nameSize: 10 },
    medium: { padding: 8, fontSize: 11, emojiSize: 26, nameSize: 11 },
    large: { padding: 10, fontSize: 13, emojiSize: 32, nameSize: 13 }
  }
  const sizeConfig = cardSizes[size] || cardSizes.medium

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

  // Fonction pour calculer la position du menu
  const calculateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 220
    
    let left = rect.left - 10
    const spaceRight = window.innerWidth - left - menuWidth
    if (spaceRight < 10) {
      left = Math.max(10, window.innerWidth - menuWidth - 10)
    }
    
    const estimatedHeight = menuHeight > 0 ? menuHeight : 300
    const spaceBottom = window.innerHeight - rect.bottom - 6
    
    let top
    if (spaceBottom >= estimatedHeight) {
      top = rect.bottom + 6
    } else {
      const spaceTop = rect.top - 6
      if (spaceTop >= estimatedHeight) {
        top = rect.top - estimatedHeight - 6
      } else {
        top = Math.max(10, (window.innerHeight - estimatedHeight) / 2)
      }
    }
    
    top = Math.max(10, Math.min(top, window.innerHeight - estimatedHeight - 10))
    left = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10))
    
    setMenuPosition({ top, left })
  }, [menuHeight])

  const handleMenuToggle = (e) => {
    e.stopPropagation()
    if (showMenu) {
      setShowMenu(false)
      return
    }
    
    calculateMenuPosition()
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

  const handleChangeImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath && onChangeImage) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) {
        onChangeImage(sound.id, result.path)
      }
    }
  }

  const handleChangeEmoji = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setEmojiPickerPosition({
        top: rect.bottom + 4,
        left: rect.left - 100
      })
    }
    setShowEmojiPicker(true)
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

  useEffect(() => {
    if (showMenu && menuHeight > 0) {
      calculateMenuPosition()
    }
  }, [showMenu, menuHeight, calculateMenuPosition])

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

  const isFavorite = sound.favorites?.includes(currentProfileId) || false;

  // ✅ Fonction de suppression avec confirmation - Délègue à onDelete
  const handleDeleteWithConfirm = async () => {
    setShowMenu(false)
    
    if (onDelete) {
      onDelete(sound.id)
    } else {
      console.warn('⚠️ onDelete non fourni, suppression impossible')
    }
  }

  // ✅ Fonction de retrait du profil avec confirmation
  const handleRemoveFromProfileWithConfirm = async () => {
    setShowMenu(false)
    
    if (onRemoveFromProfile && currentProfileId !== 'all') {
      const soundName = sound.name || 'ce son'
      
      const confirmed = await confirm({
        title: t('confirmAction') || 'Confirmer le retrait',
        message: `${t('menuRemoveFromProfile')} "${soundName}" ?`,
        type: 'warning',
        confirmText: t('remove') || 'Retirer',
        cancelText: t('cancel') || 'Annuler'
      })
      
      if (confirmed) {
        onRemoveFromProfile(sound.id)
      }
    }
  }

  return (
    <>
      <div 
        ref={cardRef} 
        draggable={draggable && !isDraggingVolume && !showVolume}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        data-sound-id={sound.id}
        data-testid={`sound-card-${sound.id}`}
        className={`sound-card sound-card-${size} ${playing ? 'playing-pulse' : ''}`}
        style={{
          background: 'var(--bg-secondary)',
          border: `1px solid ${fileError ? 'var(--danger)' : playing ? (loopEnabled ? 'var(--success)' : 'var(--accent)') : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: sizeConfig.padding,
          position: 'relative',
          transition: 'border-color 0.15s, transform 0.15s ease, box-shadow 0.15s ease',
          cursor: draggable && !isDraggingVolume && !showVolume ? 'grab' : 'default',
          userSelect: isDraggingVolume || showVolume ? 'none' : 'auto',
          boxShadow: playing ? '0 0 20px rgba(124,111,247,0.15)' : 'none'
        }}
      >

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <button 
            onClick={e => { e.stopPropagation(); onToggleFavorite(sound.id) }}
            data-testid="favorite-button"
            style={{
              background: isFavorite ? 'rgba(239,159,39,0.15)' : 'var(--bg-tertiary)',
              border: `1px solid ${isFavorite ? 'var(--warning)' : 'var(--border)'}`,
              borderRadius: 6, fontSize: 12, color: isFavorite ? 'var(--warning)' : 'var(--text-tertiary)',
              padding: '3px 7px', cursor: 'pointer', lineHeight: 1
            }}>
            <i className={`ti ${isFavorite ? 'ti-star-filled' : 'ti-star'}`} />
          </button>

          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {loopEnabled && (
              <span title="Loop activé" style={{ fontSize: 11, color: 'var(--success)' }}>
                <i className="ti ti-repeat" />
              </span>
            )}
            <button 
              ref={buttonRef} 
              onClick={handleMenuToggle}
              data-testid="dots-button"
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
            fontSize: sizeConfig.emojiSize, marginBottom: 4, position: 'relative', overflow: 'hidden', cursor: 'pointer'
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
            <span style={{ fontSize: sizeConfig.emojiSize }}>{sound.emoji || '🔊'}</span>
          )}
          <div className="play-overlay" style={{
            position: 'absolute', inset: 0,
            background: playing
              ? (loopEnabled ? 'rgba(29,158,117,0.85)' : 'rgba(224,82,82,0.85)')
              : 'rgba(124,111,247,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: playing ? 1 : 0, transition: 'opacity 0.15s, background 0.15s', borderRadius: 8
          }}>
            <i className={`ti ${playing ? 'ti-player-stop-filled' : 'ti-player-play-filled'}`} style={{ fontSize: sizeConfig.emojiSize, color: 'white' }} />
            {playing && loopEnabled && (
              <i className="ti ti-repeat" style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 12, color: 'white', opacity: 0.8 }} />
            )}
          </div>
        </div>

        {editingName ? (
          <input autoFocus value={nameValue} onChange={e => setNameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
            style={{ fontSize: sizeConfig.nameSize, padding: '3px 6px', marginBottom: 2 }}
            onClick={e => e.stopPropagation()} />
        ) : (
          <div style={{ 
            fontSize: sizeConfig.nameSize, 
            fontWeight: 500, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap', 
            marginBottom: 2,
            textAlign: 'center'
          }}>
            {sound.name}
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 3, 
            marginTop: 2,
            justifyContent: 'center'
          }}>
            {tags.map(tag => (
              <span
                key={tag}
                style={{
                  fontSize: 8,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveTag?.(sound.id, tag)
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(224,82,82,0.15)'
                  e.currentTarget.style.color = 'var(--danger)'
                  e.currentTarget.style.borderColor = 'var(--danger)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--accent-light)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.borderColor = 'var(--accent)'
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {onAddTag && (
          <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', marginTop: 2 }}>
            {showTagInput ? (
              <div style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 4px',
                width: '100%'
              }} onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={newTagValue}
                  onChange={e => setNewTagValue(e.target.value)}
                  placeholder="Tag..."
                  style={{
                    flex: 1,
                    fontSize: 9,
                    padding: '2px 6px',
                    minHeight: 20,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    width: '100%'
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTagValue.trim()) {
                      onAddTag(sound.id, newTagValue.trim().toLowerCase())
                      setNewTagValue('')
                      setShowTagInput(false)
                    }
                    if (e.key === 'Escape') {
                      setShowTagInput(false)
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newTagValue.trim()) {
                      onAddTag(sound.id, newTagValue.trim().toLowerCase())
                      setNewTagValue('')
                      setShowTagInput(false)
                    }
                  }}
                  className="btn-primary btn-sm"
                  style={{
                    padding: '1px 6px',
                    fontSize: 9,
                    borderRadius: 'var(--radius-sm)',
                    minHeight: 20,
                    minWidth: 20
                  }}
                >
                  <i className="ti ti-check" style={{ fontSize: 10 }} />
                </button>
                <button
                  onClick={() => setShowTagInput(false)}
                  className="btn-secondary btn-sm"
                  style={{
                    padding: '1px 6px',
                    fontSize: 9,
                    borderRadius: 'var(--radius-sm)',
                    minHeight: 20,
                    minWidth: 20
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: 10 }} />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTagInput(true)
                  setTimeout(() => {
                    const input = document.querySelector('.tag-input-inline')
                    if (input) input.focus()
                  }, 10)
                }}
                style={{
                  fontSize: 8,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                  border: '1px dashed var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (e.currentTarget) {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.color = 'var(--accent)'
                  }
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                  }
                }}
              >
                + Tag
              </button>
            )}
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
          <div style={{ fontSize: 8, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <i className="ti ti-player-play" style={{ fontSize: 8 }} />
            {sound.playCount} {t('playCount')}
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
            onDelete={onDelete}
            onChangeImage={handleChangeImage}
            onChangeEmoji={handleChangeEmoji}
            position={menuPosition}
            lang={lang}
            onHeightMeasured={setMenuHeight}
            onDeleteWithConfirm={handleDeleteWithConfirm}
            onRemoveFromProfileWithConfirm={handleRemoveFromProfileWithConfirm}
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

      {showEmojiPicker && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: emojiPickerPosition.top,
            left: emojiPickerPosition.left,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            zIndex: 99999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxWidth: 320,
            maxHeight: 300,
            overflowY: 'auto'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 8
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Choisir un emoji
            </span>
            <button 
              onClick={() => setShowEmojiPicker(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              <i className="ti ti-x" />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {EMOJI_LIST.map(e => (
              <button
                key={e}
                onClick={() => {
                  if (onChangeEmoji) {
                    onChangeEmoji(sound.id, e)
                  }
                  setShowEmojiPicker(false)
                }}
                style={{
                  width: 36,
                  height: 36,
                  fontSize: 18,
                  borderRadius: 6,
                  border: `1px solid ${sound.emoji === e ? 'var(--accent)' : 'var(--border)'}`,
                  background: sound.emoji === e ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.transform = 'scale(1.1)'
                }}
                onMouseLeave={e => {
                  if (sound.emoji !== e) {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
      
      <ConfirmWrapper />
    </>
  )
}

// VolumePanel (inchangé)
function VolumePanel({ volume, onChange, onCommit, onClose, lang = 'fr', onDragStart, onDragEnd, soundName, position }) {
  const { t, currentLang } = useLanguage()
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
              {t('menuVolume')}
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
          ▸ 0 dB {t('volumeDefault')}
        </span>
        <span>+24 dB</span>
      </div>

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
          title={t('volumeReset')}
        >
          <i className="ti ti-refresh" style={{ fontSize: 14 }} />
          <span>{t('reset')}</span>
        </button>

        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="btn-primary"
          style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
        >
          <i className="ti ti-check" /> {t('volumePanelClose')}
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

// ContextMenuPortal
function ContextMenuPortal({ 
  sound, 
  currentProfileId, 
  onClose, 
  onToggleFavorite, 
  onRename, 
  onVolumeOpen, 
  onRemoveFromProfile, 
  onDelete,
  onChangeImage,
  onChangeEmoji,
  position, 
  lang = 'fr',
  onHeightMeasured,
  onDeleteWithConfirm,
  onRemoveFromProfileWithConfirm
}) {
  const { t, currentLang } = useLanguage()
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuRef.current) return
    
    requestAnimationFrame(() => {
      if (!menuRef.current) return
      const height = menuRef.current.getBoundingClientRect().height
      if (onHeightMeasured && height > 0) {
        onHeightMeasured(height)
      }
    })
  }, [onHeightMeasured])

  useEffect(() => {
    if (!menuRef.current) return
    
    requestAnimationFrame(() => {
      if (!menuRef.current) return
      
      const rect = menuRef.current.getBoundingClientRect()
      let { top, left } = position
      
      if (rect.right > window.innerWidth) {
        left = Math.max(10, window.innerWidth - rect.width - 10)
      }
      
      if (rect.bottom > window.innerHeight) {
        top = Math.max(10, window.innerHeight - rect.height - 10)
      }
      
      if (left < 10) {
        left = 10
      }
      
      if (top < 10) {
        top = 10
      }
      
      if (top !== position.top || left !== position.left) {
        menuRef.current.style.top = top + 'px'
        menuRef.current.style.left = left + 'px'
      }
    })
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
      data-testid="context-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 4,
        zIndex: 999,
        minWidth: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <MenuItem 
        icon={sound.favorite ? 'ti-star' : 'ti-star-filled'} 
        label={sound.favorite ? t('menuFavoriteRemove') : t('menuFavoriteAdd')} 
        onClick={() => handleAction(onToggleFavorite)}
        lang={lang}
      />
      <MenuItem 
        icon="ti-pencil" 
        label={t('menuRename')} 
        onClick={() => handleAction(onRename)}
        lang={lang}
      />
      <MenuItem 
        icon="ti-volume" 
        label={t('menuVolume')} 
        onClick={() => handleAction(onVolumeOpen)}
        lang={lang}
      />
      
      <MenuItem 
        icon="ti-photo" 
        label={t('menuChangeImage')} 
        onClick={() => handleAction(onChangeImage)}
        lang={lang}
      />
      
      <MenuItem 
        icon="ti-mood-smile" 
        label={t('menuChangeEmoji')} 
        onClick={() => handleAction(onChangeEmoji)}
        lang={lang}
      />
      
      {onRemoveFromProfile && currentProfileId !== 'all' && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <MenuItem 
            icon="ti-folder-minus" 
            label={t('menuRemoveFromProfile')} 
            onClick={() => handleAction(onRemoveFromProfileWithConfirm)}
            warning 
            lang={lang}
          />
        </>
      )}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      
      <div style={{ padding: '2px 4px' }}>
        <button
          onClick={() => {
            onClose()
            onDeleteWithConfirm?.()
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.1s',
            color: 'var(--danger)',
            fontSize: 13,
            fontFamily: 'inherit'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(224, 82, 82, 0.1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <i className="ti ti-trash" style={{ fontSize: 16, minWidth: 20 }} />
          {t('menuDelete') || 'Supprimer définitivement'}
        </button>
      </div>
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