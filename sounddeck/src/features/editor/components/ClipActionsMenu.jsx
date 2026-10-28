/**
 * @file Right-click context menu for a clip — three tabs (Edit / Audio /
 * Effects), plus an inline loop sub-menu (color + end mode + cycle count
 * + manual duration).
 *
 * **Edit tab** — move up/down, copy, cut, duplicate, delete.
 * **Audio tab** — trim, split at middle, split with click, normalize,
 * and the loop sub-menu.
 * **Effects tab** — open effects panel, preview effects, list active ones.
 *
 * The menu auto-repositions itself so it stays inside the viewport
 * (`MARGIN` = 10 px), both on mount and on window resize.
 *
 * `Delete` is deferred by `DELETE_DELAY_MS` so the menu can close before
 * the confirm dialog opens (avoids focus fights).
 *
 * @see ../Clip/index.jsx — the parent that opens it
 * @see ../EffectsPanel/index.jsx
 * @see @shared/utils/appStorage (not used here — the loop persistence is
 *   handled by the parent Editor)
 */

import { useState, useRef, useEffect } from 'react'

/** Minimum distance from the viewport edges (px). */
const VIEWPORT_MARGIN = 10

/** Delay between closing the menu and dispatching `onDelete` (ms). */
const DELETE_DELAY_MS = 50

/** Default cycle count for `cycles` loop mode. */
const DEFAULT_CYCLE_COUNT = 3

/** Default manual duration (seconds). */
const DEFAULT_MANUAL_DURATION = 10

/** Default clip duration (seconds). */
const DEFAULT_CLIP_DURATION = 3

/** Loop color palette. */
const ARROW_COLORS = [
  { id: 'green', color: '#22c55e', labelKey: 'markerColorGreen' },
  { id: 'blue', color: '#3b82f6', labelKey: 'markerColorBlue' },
  { id: 'purple', color: '#8b5cf6', labelKey: 'markerColorPurple' },
  { id: 'pink', color: '#ec4899', labelKey: 'markerColorPink' },
  { id: 'red', color: '#ef4444', labelKey: 'markerColorRed' },
  { id: 'orange', color: '#f97316', labelKey: 'markerColorOrange' },
  { id: 'yellow', color: '#eab308', labelKey: 'markerColorYellow' },
  { id: 'cyan', color: '#06b6d4', labelKey: 'markerColorCyan' },
]

/** Loop end-mode options. */
const LOOP_END_OPTIONS = [
  { id: 'endOfTrack', labelKey: 'editorLoopEndOfTrack', icon: 'ti-flag' },
  { id: 'cycles', labelKey: 'editorLoopCycles', icon: 'ti-repeat' },
  { id: 'manualDuration', labelKey: 'editorLoopManualDuration', icon: 'ti-clock' },
  { id: 'manualClick', labelKey: 'editorLoopManualClick', icon: 'ti-mouse' },
]

/** Effect type → Tabler icon. */
const EFFECT_ICON_MAP = {
  volume: 'ti-volume',
  fadeIn: 'ti-sunrise',
  fadeOut: 'ti-sunset',
  speed: 'ti-gauge',
  echo: 'ti-repeat',
  reverb: 'ti-wave-sine',
}

/**
 * A single menu row (button + icon + label + shortcut + optional state).
 * Hoisted to module scope so React Compiler can memoize it.
 *
 * @param {Object} props
 * @param {string} props.icon
 * @param {string} [props.labelKey]
 * @param {string} [props.label]
 * @param {Function} [props.onClick]
 * @param {string} [props.shortcut]
 * @param {boolean} [props.danger]
 * @param {boolean} [props.accent]
 * @param {boolean} [props.active]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.hasSubmenu]
 * @param {boolean} [props.small]
 * @param {boolean} [props.muted]
 * @param {Object} [props.style]
 * @param {(key: string) => string} props.tr
 * @returns {JSX.Element}
 */
function MenuItem({
  icon,
  labelKey,
  label,
  onClick,
  shortcut,
  danger,
  accent,
  active,
  disabled,
  hasSubmenu,
  small,
  muted,
  style,
  tr,
}) {
  const [hovered, setHovered] = useState(false)
  const displayLabel = label || (labelKey ? tr(labelKey) : '')

  return (
    <button
      className={`menu-item ${danger ? 'danger' : ''} ${
        accent ? 'accent' : ''
      } ${active ? 'active' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: small ? '4px 10px' : '6px 12px',
        background: hovered && !disabled ? 'var(--bg-hover)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: danger
          ? 'var(--danger)'
          : accent
            ? 'var(--accent)'
            : muted
              ? 'var(--text-tertiary)'
              : disabled
                ? 'var(--text-tertiary)'
                : 'var(--text-primary)',
        fontSize: small ? 11 : 12,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      <i
        className={`ti ${icon}`}
        style={{ fontSize: small ? 12 : 14, minWidth: small ? 16 : 18 }}
      />
      <span style={{ flex: 1, textAlign: 'left' }}>{displayLabel}</span>
      {shortcut && (
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontFamily: 'monospace',
            opacity: hovered ? 1 : 0.6,
          }}
        >
          {shortcut}
        </span>
      )}
      {hasSubmenu && (
        <i
          className="ti ti-chevron-up"
          style={{ fontSize: 12, color: 'var(--text-tertiary)' }}
        />
      )}
      {active && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--success)',
            display: 'inline-block',
          }}
        />
      )}
    </button>
  )
}

/**
 * Clip actions menu (see file header).
 *
 * @param {Object} props
 * @param {Object|null} props.clip
 * @param {string} props.trackId
 * @param {{top: number, left: number}} props.position - Cursor position.
 * @param {() => void} props.onClose
 * @param {Function} [props.onSplit]
 * @param {Function} [props.onLoop] - Unused; kept for API compat.
 * @param {Function} [props.onTrim]
 * @param {Function} [props.onNormalize]
 * @param {Function} [props.onAddEffect]
 * @param {Function} [props.onDuplicate]
 * @param {Function} [props.onCopy]
 * @param {Function} [props.onCut]
 * @param {Function} [props.onDelete]
 * @param {Function} [props.onToggleClipLoop]
 * @param {Function} [props.onActivateLoopManualClick]
 * @param {Function} [props.onActivateSplitManualClick]
 * @param {boolean} [props.isPlaying] - Unused; kept for API compat.
 * @param {boolean} [props.isLoopEnabled] - Unused; kept for API compat.
 * @param {Object} [props.clipDurations]
 * @param {Object} [props.loopState]
 * @param {(key: string) => string} props.tr
 * @param {Function} [props.onMoveUp]
 * @param {Function} [props.onMoveDown]
 * @param {boolean} [props.canMoveUp]
 * @param {boolean} [props.canMoveDown]
 * @returns {JSX.Element|null}
 */
export default function ClipActionsMenu({
  clip,
  trackId,
  position,
  onClose,
  onSplit,
  onLoop: _onLoop,
  onTrim,
  onNormalize,
  onAddEffect,
  onDuplicate,
  onCopy,
  onCut,
  onDelete,
  onToggleClipLoop,
  onActivateLoopManualClick,
  onActivateSplitManualClick,
  isPlaying: _isPlaying,
  isLoopEnabled: _isLoopEnabled,
  clipDurations = {},
  loopState = {},
  tr,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) {
  const menuRef = useRef(null)
  const [showLoopSubmenu, setShowLoopSubmenu] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [loopColor, setLoopColor] = useState('#22c55e')
  const [loopEndMode, setLoopEndMode] = useState('endOfTrack')
  const [cycleCount, setCycleCount] = useState(DEFAULT_CYCLE_COUNT)
  const [manualDuration, setManualDuration] = useState(DEFAULT_MANUAL_DURATION)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const isClipLooping =
    (clip?.id && loopState?.clips?.[clip.id]?.enabled) || false
  const clipLoopData = clip?.id ? loopState?.clips?.[clip.id] : null

  // Close the menu on outside click.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Auto-reposition the menu when it would overflow the viewport.
  // Runs on mount, on `position` change, and on window resize.
  useEffect(() => {
    const reposition = () => {
      if (!menuRef.current) return
      const rect = menuRef.current.getBoundingClientRect()
      let { top, left } = position

      if (rect.bottom > window.innerHeight - VIEWPORT_MARGIN) {
        top = position.top - rect.height - VIEWPORT_MARGIN
      }
      if (top < VIEWPORT_MARGIN) {
        top = VIEWPORT_MARGIN
      }
      if (rect.right > window.innerWidth - VIEWPORT_MARGIN) {
        left = position.left - rect.width - VIEWPORT_MARGIN
      }
      if (left < VIEWPORT_MARGIN) {
        left = VIEWPORT_MARGIN
      }
      if (top !== position.top || left !== position.left) {
        menuRef.current.style.top = top + 'px'
        menuRef.current.style.left = left + 'px'
      }
    }

    reposition()
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [position, showLoopSubmenu, activeTab])

  // Sync the loop sub-menu with the clip's current loop data.
  useEffect(() => {
    if (clipLoopData) {
      setLoopColor(clipLoopData.arrowColor || '#22c55e')
      setLoopEndMode(clipLoopData.loopMode || 'endOfTrack')
      setCycleCount(clipLoopData.cycleCount || DEFAULT_CYCLE_COUNT)
      setManualDuration(clipLoopData.manualDuration || DEFAULT_MANUAL_DURATION)
    }
  }, [clipLoopData])

  if (!clip) return null

  const hasActiveEffects = clip.effects?.some((e) => e.enabled) || false
  const duration =
    clipDurations?.[clip.id] || clip.duration || DEFAULT_CLIP_DURATION

  /**
   * Splits the clip at its midpoint.
   * @returns {void}
   */
  const handleSplitMid = () => {
    if (clip) {
      const start = clip.start || 0
      const midPoint = start + duration / 2
      onSplit?.(trackId, clip.id, midPoint)
      onClose()
    }
  }

  /**
   * Closes the menu, then dispatches `onDelete` after a short delay so
   * the confirm dialog doesn't fight with the closing menu for focus.
   * @returns {void}
   */
  const handleDeleteClick = () => {
    onClose()
    setTimeout(() => {
      if (onDelete) {
        onDelete(trackId, clip.id, clip.name)
      }
    }, DELETE_DELAY_MS)
  }

  const handleToggleLoop = () => {
    if (isClipLooping) {
      onToggleClipLoop?.(clip.id, { enabled: false })
      onClose()
      return
    }

    if (loopEndMode === 'manualClick') {
      if (onActivateLoopManualClick) {
        onActivateLoopManualClick(clip.id, trackId, { arrowColor: loopColor })
      }
      onClose()
      return
    }

    const options = {
      arrowColor: loopColor,
      loopMode: loopEndMode,
      cycleCount: loopEndMode === 'cycles' ? cycleCount : undefined,
      manualDuration:
        loopEndMode === 'manualDuration' ? manualDuration : undefined,
    }

    onToggleClipLoop?.(clip.id, options)
    onClose()
  }

  const handleSplitWithClick = () => {
    if (onActivateSplitManualClick) {
      onActivateSplitManualClick(clip.id, trackId)
    }
    onClose()
  }

  const handleAddEffectClick = () => {
    onClose()
    if (onAddEffect) {
      onAddEffect(clip.id, trackId)
    }
  }

  /** Renders the 3 tabs (edit / audio / effects). */
  const tabs = [
    { id: 'edit', icon: 'ti-pencil', labelKey: 'editorClipEdit' },
    { id: 'audio', icon: 'ti-volume', labelKey: 'editorAudioEdit' },
    { id: 'effects', icon: 'ti-wand', labelKey: 'editorEffects' },
  ]

  return (
    <div
      ref={menuRef}
      className="clip-actions-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        minWidth: 260,
        maxWidth: 320,
        zIndex: 9999,
        padding: '8px 0',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.15s ease',
        maxHeight: 'calc(100vh - 20px)',
        overflowY: 'auto',
      }}
    >
      {/* Clip name + duration */}
      <div
        style={{
          padding: '6px 14px 10px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 160,
          }}
        >
          {clip.name}
        </span>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-tertiary)',
            fontFamily: 'monospace',
          }}
        >
          {duration.toFixed(1)}s
        </span>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: '4px 8px',
          marginBottom: 4,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background:
                activeTab === tab.id ? 'var(--accent-light)' : 'transparent',
              color:
                activeTab === tab.id
                  ? 'var(--accent)'
                  : 'var(--text-tertiary)',
              fontSize: 10,
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <i className={`ti ${tab.icon}`} style={{ marginRight: 4 }} />
            {tr(tab.labelKey) || tab.labelKey}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 4px' }}>
        {/* ─── EDIT TAB ───────────────────────────────────────────── */}
        {activeTab === 'edit' && (
          <div className="menu-group">
            <div
              style={{
                display: 'flex',
                gap: 4,
                padding: '2px 4px',
                marginBottom: 4,
              }}
            >
              <MenuItem
                icon="ti-arrow-up"
                labelKey="editorMoveUp"
                onClick={() => {
                  onMoveUp?.(trackId, clip.id)
                  onClose()
                }}
                disabled={!canMoveUp}
                shortcut="↑"
                style={{ flex: 1 }}
                tr={tr}
              />
              <MenuItem
                icon="ti-arrow-down"
                labelKey="editorMoveDown"
                onClick={() => {
                  onMoveDown?.(trackId, clip.id)
                  onClose()
                }}
                disabled={!canMoveDown}
                shortcut="↓"
                style={{ flex: 1 }}
                tr={tr}
              />
            </div>

            <div
              style={{ height: 1, background: 'var(--border)', margin: '2px 8px' }}
            />

            <MenuItem
              icon="ti-copy"
              labelKey="editorCopy"
              onClick={() => {
                onCopy?.(clip.id, trackId)
                onClose()
              }}
              shortcut="Ctrl+C"
              tr={tr}
            />
            <MenuItem
              icon="ti-scissors"
              labelKey="editorCut"
              onClick={() => {
                onCut?.(clip.id, trackId)
                onClose()
              }}
              shortcut="Ctrl+X"
              tr={tr}
            />
            <MenuItem
              icon="ti-copy"
              labelKey="editorDuplicate"
              onClick={() => {
                onDuplicate?.(trackId, clip.id)
                onClose()
              }}
              shortcut="Ctrl+D"
              tr={tr}
            />

            <MenuItem
              icon="ti-trash"
              labelKey="editorDelete"
              onClick={handleDeleteClick}
              shortcut="Delete"
              danger
              tr={tr}
            />
          </div>
        )}

        {/* ─── AUDIO TAB ──────────────────────────────────────────── */}
        {activeTab === 'audio' && (
          <div className="menu-group">
            <MenuItem
              icon="ti-cut"
              labelKey="editorTrim"
              onClick={() => {
                onTrim?.(clip.id)
                onClose()
              }}
              shortcut="Ctrl+R"
              tr={tr}
            />
            <MenuItem
              icon="ti-scissors"
              labelKey="editorSplitAtMiddle"
              onClick={handleSplitMid}
              shortcut="S"
              tr={tr}
            />
            <MenuItem
              icon="ti-scissors"
              labelKey="editorSplitWithClick"
              onClick={handleSplitWithClick}
              shortcut="C"
              tr={tr}
            />
            <MenuItem
              icon="ti-adjustments-horizontal"
              labelKey="editorNormalize"
              onClick={() => {
                onNormalize?.(clip.id)
                onClose()
              }}
              tr={tr}
            />

            <div style={{ padding: '2px 4px' }}>
              <button
                onClick={() => {
                  if (isClipLooping) {
                    handleToggleLoop()
                  } else {
                    setShowLoopSubmenu(!showLoopSubmenu)
                  }
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: isClipLooping
                    ? 'var(--accent-light)'
                    : 'transparent',
                  border: `1px solid ${
                    isClipLooping ? 'var(--success)' : 'transparent'
                  }`,
                  borderRadius: 'var(--radius-sm)',
                  color: isClipLooping
                    ? 'var(--success)'
                    : 'var(--text-primary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isClipLooping) {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isClipLooping) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <i
                  className={`ti ${
                    isClipLooping ? 'ti-repeat' : 'ti-repeat-off'
                  }`}
                  style={{ fontSize: 14, minWidth: 18 }}
                />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {isClipLooping
                    ? tr('editorLoopActive') || 'Loop active'
                    : tr('editorLoop') || 'Loop'}
                </span>
                {isClipLooping && (
                  <span
                    style={{
                      fontSize: 9,
                      color: 'var(--success)',
                      background: 'rgba(34,197,94,0.15)',
                      padding: '1px 8px',
                      borderRadius: 10,
                    }}
                  >
                    ON
                  </span>
                )}
                <i
                  className={`ti ${
                    showLoopSubmenu ? 'ti-chevron-up' : 'ti-chevron-right'
                  }`}
                  style={{ fontSize: 12, color: 'var(--text-tertiary)' }}
                />
              </button>

              {showLoopSubmenu && (
                <div
                  style={{
                    marginTop: 4,
                    padding: '6px 8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        marginBottom: 4,
                      }}
                    >
                      {tr('editorLoopColor') || 'Arrow color'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      {ARROW_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setLoopColor(c.color)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: c.color,
                            border:
                              loopColor === c.color
                                ? '2px solid var(--accent)'
                                : '2px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            outline: 'none',
                            flexShrink: 0,
                          }}
                          title={tr(c.labelKey) || c.id}
                        />
                      ))}
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: loopColor,
                          border: '2px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: 'white',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}
                        title={tr('customColor') || 'Custom color'}
                      >
                        +
                      </button>
                    </div>
                    {showColorPicker && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: 4,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <input
                          type="color"
                          value={loopColor}
                          onChange={(e) => setLoopColor(e.target.value)}
                          style={{
                            width: '100%',
                            height: 32,
                            padding: 2,
                            cursor: 'pointer',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'transparent',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-tertiary)',
                        marginBottom: 4,
                      }}
                    >
                      {tr('editorLoopEnd') || 'Loop end'}
                    </div>

                    {LOOP_END_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background:
                            loopEndMode === opt.id
                              ? 'var(--accent-light)'
                              : 'transparent',
                          border: `1px solid ${
                            loopEndMode === opt.id
                              ? 'var(--accent)'
                              : 'transparent'
                          }`,
                          cursor: 'pointer',
                          fontSize: 10,
                          marginBottom: 2,
                        }}
                      >
                        <input
                          type="radio"
                          name="loopEndMode"
                          checked={loopEndMode === opt.id}
                          onChange={() => setLoopEndMode(opt.id)}
                          style={{
                            width: 'auto',
                            accentColor: 'var(--accent)',
                            margin: 0,
                          }}
                        />
                        <i
                          className={`ti ${opt.icon}`}
                          style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                        />
                        <span style={{ flex: 1 }}>
                          {tr(opt.labelKey) || opt.id}
                        </span>

                        {opt.id === 'cycles' && loopEndMode === 'cycles' && (
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={cycleCount}
                            onChange={(e) =>
                              setCycleCount(
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: 40,
                              padding: '1px 4px',
                              fontSize: 10,
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              textAlign: 'center',
                            }}
                          />
                        )}

                        {opt.id === 'manualDuration' &&
                          loopEndMode === 'manualDuration' && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                              }}
                            >
                              <input
                                type="number"
                                min="0.1"
                                max="999"
                                step="0.1"
                                value={manualDuration}
                                onChange={(e) =>
                                  setManualDuration(
                                    Math.max(0.1, parseFloat(e.target.value) || 0.1)
                                  )
                                }
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: 50,
                                  padding: '1px 4px',
                                  fontSize: 10,
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                  textAlign: 'center',
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 9,
                                  color: 'var(--text-tertiary)',
                                }}
                              >
                                s
                              </span>
                            </div>
                          )}

                        {opt.id === 'manualClick' &&
                          loopEndMode === 'manualClick' && (
                            <span
                              style={{
                                fontSize: 9,
                                color: 'var(--accent)',
                                fontStyle: 'italic',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--accent-light)',
                                border: '1px solid var(--accent)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onActivateLoopManualClick) {
                                  onActivateLoopManualClick(clip.id, trackId, {
                                    arrowColor: loopColor,
                                  })
                                }
                                onClose()
                              }}
                            >
                              <i
                                className="ti ti-click"
                                style={{ fontSize: 10 }}
                              />
                              {tr('editorLoopClickToDefine') ||
                                'Click to define'}
                            </span>
                          )}
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={handleToggleLoop}
                    className="btn-primary btn-sm"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      fontSize: 11,
                      padding: '4px 8px',
                      minHeight: 28,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent)',
                      color: 'white',
                    }}
                  >
                    <i className="ti ti-check" />
                    {isClipLooping
                      ? tr('editorLoopUpdate') || 'Update'
                      : tr('editorLoopActivate') || 'Activate loop'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── EFFECTS TAB ────────────────────────────────────────── */}
        {activeTab === 'effects' && (
          <div className="menu-group">
            <MenuItem
              icon="ti-plus"
              labelKey="editorOpenEffectsPanel"
              onClick={handleAddEffectClick}
              accent
              tr={tr}
            />

            <MenuItem
              icon="ti-wave"
              labelKey="editorEffectPreview"
              onClick={handleAddEffectClick}
              disabled={!hasActiveEffects}
              tr={tr}
            />

            <div
              style={{
                height: 1,
                background: 'var(--border)',
                margin: '4px 8px',
              }}
            />

            {clip.effects?.filter((e) => e.enabled).length > 0 && (
              <>
                <div
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {tr('editorActiveEffects') || 'Active effects'}
                </div>
                {clip.effects
                  .filter((e) => e.enabled)
                  .map((effect) => {
                    const effectIcon =
                      EFFECT_ICON_MAP[effect.type] || 'ti-wand'
                    const effectLabel =
                      tr(`editorEffect${effect.type.charAt(0).toUpperCase() + effect.type.slice(1)}`) ||
                      effect.type
                    return (
                      <MenuItem
                        key={effect.id}
                        icon={effectIcon}
                        label={`${effectLabel} (${Object.values(effect.params)
                          .map((v) =>
                            typeof v === 'number' ? v.toFixed(2) : v
                          )
                          .join(', ')})`}
                        onClick={() => {}}
                        small
                        muted
                        tr={tr}
                      />
                    )
                  })}
              </>
            )}

            {!hasActiveEffects && (
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}
              >
                {tr('editorNoEffects') || 'No active effects'}
              </div>
            )}
          </div>
        )}
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