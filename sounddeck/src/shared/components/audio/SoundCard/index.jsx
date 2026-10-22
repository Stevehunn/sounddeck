/**
 * @file Sound card — play, rename, tag, volume, image/emoji, context menu.
 *
 * A card represents one sound in the library. It supports:
 * - **Play / stop** with visual feedback (pulse, border color, progress bar)
 * - **Favorite** toggle (star icon)
 * - **Rename** (inline editing on double-click of the name)
 * - **Tags** (add inline, remove on click)
 * - **Volume** (via `VolumePanel`, per-sound dB adjustment)
 * - **Image / emoji** (change via context menu or `EmojiPicker`)
 * - **Context menu** (`ContextMenuPortal`) with all the above + delete
 * - **Keyboard shortcut** (via `ShortcutRecorder`, compact mode)
 *
 * Drag & drop:
 * - The card itself is `draggable` when `draggable === true` and the user
 *   isn't interacting with the volume panel.
 * - Dragging calls `onDragStart` / `onDragEnd` (managed by the parent grid).
 *
 * Note on state derivation:
 * - `imgError` is tracked as `{url, hasError}` so an error on one image is
 *   automatically "cleared" when the image URL changes — no need for a
 *   `set-state-in-effect`.
 * - `progress` is only meaningful when `playing === true`; the derived
 *   `displayProgress` handles the "not playing" case without state.
 *
 * @see ./VolumePanel.jsx
 * @see ./ContextMenuPortal.jsx
 * @see ../Waveform.jsx (unused here, used by AudioTrimmer)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  playSound,
  stopSound,
  isPlaying,
  getSoundProgress,
} from '@core/services/AudioService'
import ShortcutRecorder from '@shared/components/settings/ShortcutRecorder'
import { useLanguage } from '@core/i18n/LanguageContext'
import useConfirm from '@shared/hooks/useConfirm'
import { formatTime } from '@shared/utils/format'
import { buildFileUrl } from '@shared/utils/fileUrl'
import EmojiPicker from '@shared/components/ui/EmojiPicker'
import { convertOldVolumeToDb } from '@core/store/utils/volumeUtils'

import VolumePanel from './VolumePanel'
import ContextMenuPortal from './ContextMenuPortal'

/**
 * Compute the canonical volume in dB from a sound.
 *
 * Prefers `sound.volumeDb` (new schema) and falls back to the legacy linear
 * `sound.volume` (0-100 → dB).
 *
 * @param {Object} sound
 * @returns {number} Volume in dB.
 */
function getSoundVolumeDb(sound) {
  return sound.volumeDb !== undefined
    ? sound.volumeDb
    : convertOldVolumeToDb(sound.volume)
}

/**
 * SoundCard component.
 *
 * @param {Object} props
 * @param {Object} props.sound - Sound data (`id`, `name`, `path`, `image`, `emoji`, `volumeDb`, `favorites`, `playCount`).
 * @param {string} [props.shortcut] - Keyboard accelerator bound to this sound.
 * @param {string} props.audioDevice - Output device ID (for `playSound`).
 * @param {number} props.volume - Master volume (0-100).
 * @param {boolean} props.loopEnabled - Whether loop is currently ON.
 * @param {boolean} props.playLocally - Whether to play on the local output too.
 * @param {(id: string) => void} props.onToggleFavorite
 * @param {(id: string, acc: string) => void} props.onSetShortcut
 * @param {((id: string) => void)|null} props.onDelete
 * @param {((id: string) => void)|null} props.onRemoveFromProfile
 * @param {(id: string, name: string) => void} props.onRename
 * @param {(id: string, volumeDb: number) => void} props.onVolumeChange
 * @param {((id: string) => void)|null} [props.onPlay]
 * @param {string} props.currentProfileId
 * @param {((e: React.DragEvent) => void)|null} [props.onDragStart]
 * @param {((e: React.DragEvent) => void)|null} [props.onDragEnd]
 * @param {boolean} [props.draggable=true]
 * @param {'qwerty'|'azerty'} [props.layout='qwerty']
 * @param {((id: string, path: string) => void)|null} [props.onChangeImage]
 * @param {((id: string, emoji: string) => void)|null} [props.onChangeEmoji]
 * @param {string[]} [props.tags=[]]
 * @param {((id: string, tag: string) => void)|null} [props.onAddTag]
 * @param {((id: string, tag: string) => void)|null} [props.onRemoveTag]
 * @param {'small'|'medium'|'large'} [props.size='medium']
 * @returns {JSX.Element}
 */
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
  onDragStart,
  onDragEnd,
  draggable = true,
  layout = 'qwerty',
  onChangeImage,
  onChangeEmoji,
  tags = [],
  onAddTag,
  onRemoveTag,
  size = 'medium',
}) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })

  // ─── STATE ─────────────────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(sound.name)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')

  // Volume state (controlled, synced from sound.volumeDb via effect below)
  const [localVolume, setLocalVolume] = useState(() =>
    getSoundVolumeDb(sound)
  )

  // Image error: track which URL failed, so an error on one URL doesn't
  // leak to the next one (derived state, no set-state-in-effect).
  const [imgErrorUrl, setImgErrorUrl] = useState(null)

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
    large: { padding: 10, fontSize: 13, emojiSize: 32, nameSize: 13 },
  }
  const sizeConfig = cardSizes[size] || cardSizes.medium

  const isFavorite = sound.favorites?.includes(currentProfileId) || false

  // Derived: a progress bar is only meaningful while playing.
  const displayProgress = playing ? progress : null

  // Derived: an image is shown unless the current `sound.image` URL errored.
  const showImage = !!sound.image && imgErrorUrl !== sound.image

  // ─── MENU POSITIONING ──────────────────────────────────────────────────
  // Declared BEFORE the effect that uses it (avoids "accessed before declared").
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

  // ─── EFFECTS ───────────────────────────────────────────────────────────

  // Sync localVolume when the store updates `sound.volumeDb` externally
  // (e.g. reset from context menu, profile switch). Deferred via
  // `setTimeout(0)` to satisfy React 19's set-state-in-effect rule.
  //
  // Inline the volume computation (instead of `getSoundVolumeDb(sound)`)
  // so ESLint sees only `sound.volume` / `sound.volumeDb` accesses in the
  // closure — no missing `sound` dependency.
  useEffect(() => {
    const newVolume =
      sound.volumeDb !== undefined
        ? sound.volumeDb
        : convertOldVolumeToDb(sound.volume)
    const timer = setTimeout(() => setLocalVolume(newVolume), 0)
    return () => clearTimeout(timer)
  }, [sound.volume, sound.volumeDb])

  // Poll progress while playing
  useEffect(() => {
    if (!playing) return

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

  // Stop playback if loop is disabled while a sound is playing
  const prevLoopEnabledRef = useRef(loopEnabled)
  useEffect(() => {
    const loopJustDisabled =
      prevLoopEnabledRef.current === true && loopEnabled === false
    prevLoopEnabledRef.current = loopEnabled

    if (loopJustDisabled && playing) {
      stopSound(sound.id)
      setPlaying(false)
    }
  }, [loopEnabled, playing, sound.id])

  // Close menu on click outside
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

  // Re-clamp menu position once its real height is known
  useEffect(() => {
    if (showMenu && menuHeight > 0) {
      calculateMenuPosition()
    }
  }, [showMenu, menuHeight, calculateMenuPosition])

  // ─── HANDLERS ──────────────────────────────────────────────────────────

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
    if (nameValue.trim() && nameValue !== sound.name)
      onRename(sound.id, nameValue.trim())
    setEditingName(false)
  }

  const handleVolumeCommit = useCallback(
    (val) => {
      const clampedVal = Math.max(-24, Math.min(24, val))
      onVolumeChange(sound.id, clampedVal)
    },
    [sound.id, onVolumeChange]
  )

  const handleVolumeDragStart = useCallback(() => {
    setIsDraggingVolume(true)
    if (cardRef.current) cardRef.current.style.cursor = 'default'
  }, [])

  const handleVolumeDragEnd = useCallback(() => {
    setIsDraggingVolume(false)
    if (cardRef.current)
      cardRef.current.style.cursor = draggable ? 'grab' : 'default'
  }, [draggable])

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
      const top = Math.max(
        10,
        Math.min(rect.top + rect.height / 2 - 150, window.innerHeight - 320)
      )
      const left = Math.max(
        10,
        Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 320)
      )
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
    setShowEmojiPicker(true)
    setShowMenu(false)
  }

  const handleManageEmojis = () => {
    if (window.__navigateTo) {
      window.__navigateTo('emoji')
    }
  }

  const handleDragStart = (e) => {
    if (isDraggingVolume || showVolume) {
      e.preventDefault()
      return false
    }
    if (onDragStart) onDragStart(e)
  }

  const handleDragEnd = (e) => {
    if (isDraggingVolume || showVolume) return
    if (onDragEnd) onDragEnd(e)
  }

  const handleDeleteWithConfirm = async () => {
    setShowMenu(false)
    if (onDelete) onDelete(sound.id)
  }

  const handleRemoveFromProfileWithConfirm = async () => {
    setShowMenu(false)

    if (onRemoveFromProfile && currentProfileId !== 'all') {
      const soundName = sound.name || 'ce son'

      const confirmed = await confirm({
        title: t('confirmAction'),
        message: t('menuRemoveFromProfileConfirm', { name: soundName }),
        type: 'warning',
        confirmText: t('remove'),
        cancelText: t('cancel'),
      })

      if (confirmed) onRemoveFromProfile(sound.id)
    }
  }

  // Change emoji (also clears the image so the emoji is visible)
  const handleEmojiSelect = (emoji) => {
    if (onChangeEmoji) onChangeEmoji(sound.id, emoji)

    if (sound.image && onChangeImage) {
      onChangeImage(sound.id, null)
    }

    setShowEmojiPicker(false)
  }

  // ─── RENDER ────────────────────────────────────────────────────────────

  const imageUrl = buildFileUrl(sound.image)

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
          border: `1px solid ${
            fileError
              ? 'var(--danger)'
              : playing
                ? loopEnabled
                  ? 'var(--success)'
                  : 'var(--accent)'
                : 'var(--border)'
          }`,
          borderRadius: 'var(--radius-md)',
          padding: sizeConfig.padding,
          position: 'relative',
          transition:
            'border-color 0.15s, transform 0.15s ease, box-shadow 0.15s ease',
          cursor:
            draggable && !isDraggingVolume && !showVolume ? 'grab' : 'default',
          userSelect: isDraggingVolume || showVolume ? 'none' : 'auto',
          boxShadow: playing ? '0 0 20px rgba(124,111,247,0.15)' : 'none',
        }}
      >
        {/* Header : favorite + loop + menu */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(sound.id)
            }}
            data-testid="favorite-button"
            style={{
              background: isFavorite
                ? 'rgba(239,159,39,0.15)'
                : 'var(--bg-tertiary)',
              border: `1px solid ${
                isFavorite ? 'var(--warning)' : 'var(--border)'
              }`,
              borderRadius: 6,
              fontSize: 12,
              color: isFavorite ? 'var(--warning)' : 'var(--text-tertiary)',
              padding: '3px 7px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            <i className={`ti ${isFavorite ? 'ti-star-filled' : 'ti-star'}`} />
          </button>

          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {loopEnabled && (
              <span
                title={t('loopActive')}
                style={{ fontSize: 11, color: 'var(--success)' }}
              >
                <i className="ti ti-repeat" />
              </span>
            )}
            <button
              ref={buttonRef}
              onClick={handleMenuToggle}
              data-testid="dots-button"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-secondary)',
                padding: '3px 7px',
                fontSize: 12,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              <i className="ti ti-dots-vertical" />
            </button>
          </div>
        </div>

        {/* Preview / Play */}
        <div
          onClick={handlePlay}
          style={{
            width: '100%',
            aspectRatio: '1',
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: sizeConfig.emojiSize,
            marginBottom: 4,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            const o = e.currentTarget.querySelector('.play-overlay')
            if (o) o.style.opacity = 1
          }}
          onMouseLeave={(e) => {
            const o = e.currentTarget.querySelector('.play-overlay')
            if (o && !playing) o.style.opacity = 0
          }}
        >
          {showImage && (
            <img
              src={imageUrl}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={() => setImgErrorUrl(sound.image)}
            />
          )}
          {!showImage && (
            <span style={{ fontSize: sizeConfig.emojiSize }}>
              {sound.emoji || '🔊'}
            </span>
          )}
          <div
            className="play-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: playing
                ? loopEnabled
                  ? 'rgba(29,158,117,0.85)'
                  : 'rgba(224,82,82,0.85)'
                : 'rgba(124,111,247,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: playing ? 1 : 0,
              transition: 'opacity 0.15s, background 0.15s',
              borderRadius: 8,
            }}
          >
            <i
              className={`ti ${
                playing ? 'ti-player-stop-filled' : 'ti-player-play-filled'
              }`}
              style={{ fontSize: sizeConfig.emojiSize, color: 'white' }}
            />
            {playing && loopEnabled && (
              <i
                className="ti ti-repeat"
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  fontSize: 12,
                  color: 'white',
                  opacity: 0.8,
                }}
              />
            )}
          </div>
        </div>

        {/* Name (editable) */}
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') setEditingName(false)
            }}
            style={{
              fontSize: sizeConfig.nameSize,
              padding: '3px 6px',
              marginBottom: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            style={{
              fontSize: sizeConfig.nameSize,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 2,
              textAlign: 'center',
            }}
          >
            {sound.name}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              marginTop: 2,
              justifyContent: 'center',
            }}
          >
            {tags.map((tag) => (
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
                  transition: 'all 0.15s ease',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveTag?.(sound.id, tag)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(224,82,82,0.15)'
                  e.currentTarget.style.color = 'var(--danger)'
                  e.currentTarget.style.borderColor = 'var(--danger)'
                }}
                onMouseLeave={(e) => {
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

        {/* Add tag */}
        {onAddTag && (
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            {showTagInput ? (
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 4px',
                  width: '100%',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  autoFocus
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
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
                    width: '100%',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTagValue.trim()) {
                      onAddTag(sound.id, newTagValue.trim().toLowerCase())
                      setNewTagValue('')
                      setShowTagInput(false)
                    }
                    if (e.key === 'Escape') setShowTagInput(false)
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
                    minWidth: 20,
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
                    minWidth: 20,
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
                }}
                style={{
                  fontSize: 8,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-tertiary)',
                  border: '1px dashed var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (e.currentTarget) {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.color = 'var(--accent)'
                  }
                }}
                onMouseLeave={(e) => {
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

        {/* Shortcut recorder */}
        <ShortcutRecorder
          value={shortcut || ''}
          onSave={(acc) => onSetShortcut(sound.id, acc)}
          onClear={() => onSetShortcut(sound.id, '')}
          compact
          lang={currentLang}
          layout={layout}
        />

        {/* Progress bar (only while playing) */}
        {displayProgress && (
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                height: 4,
                background: 'var(--bg-tertiary)',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: loopEnabled ? 'var(--success)' : 'var(--accent)',
                  width: `${displayProgress.ratio * 100}%`,
                  transition: 'width 0.1s linear',
                  boxShadow: `0 0 4px ${
                    loopEnabled ? 'var(--success)' : 'var(--accent)'
                  }`,
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 8,
                color: 'var(--text-tertiary)',
                marginTop: 1,
              }}
            >
              <span>{formatTime(displayProgress.current)}</span>
              <span>{formatTime(displayProgress.duration)}</span>
            </div>
          </div>
        )}

        {/* Play count */}
        {sound.playCount > 0 && (
          <div
            style={{
              fontSize: 8,
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <i className="ti ti-player-play" style={{ fontSize: 8 }} />
            {sound.playCount} {t('playCount')}
          </div>
        )}
      </div>

      {/* Context menu (portal) */}
      {showMenu &&
        createPortal(
          <div ref={menuRef}>
            <ContextMenuPortal
              sound={sound}
              isFavorite={isFavorite}
              currentProfileId={currentProfileId}
              onClose={() => setShowMenu(false)}
              onToggleFavorite={() => {
                onToggleFavorite(sound.id)
                setShowMenu(false)
              }}
              onRename={() => {
                setEditingName(true)
                setShowMenu(false)
              }}
              onVolumeOpen={handleVolumeOpen}
              onRemoveFromProfile={
                onRemoveFromProfile
                  ? () => {
                      onRemoveFromProfile(sound.id)
                      setShowMenu(false)
                    }
                  : null
              }
              onDelete={onDelete}
              onChangeImage={handleChangeImage}
              onChangeEmoji={handleChangeEmoji}
              position={menuPosition}
              onHeightMeasured={setMenuHeight}
              onDeleteWithConfirm={handleDeleteWithConfirm}
              onRemoveFromProfileWithConfirm={handleRemoveFromProfileWithConfirm}
            />
          </div>,
          document.body
        )}

      {/* Volume panel (portal) */}
      {showVolume &&
        createPortal(
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
            position={volumePosition}
          />,
          document.body
        )}

      {/* Global EmojiPicker */}
      <EmojiPicker
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        currentEmoji={sound.emoji}
        onSelect={handleEmojiSelect}
        onManageClick={handleManageEmojis}
      />

      <ConfirmWrapper />
    </>
  )
}