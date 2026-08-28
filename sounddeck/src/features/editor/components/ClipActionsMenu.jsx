// src/features/editor/components/ClipActionsMenu.jsx
import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

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

const LOOP_END_OPTIONS = [
  { id: 'endOfTrack', labelKey: 'editorLoopEndOfTrack', icon: 'ti-flag' },
  { id: 'cycles', labelKey: 'editorLoopCycles', icon: 'ti-repeat' },
  { id: 'manualDuration', labelKey: 'editorLoopManualDuration', icon: 'ti-clock' },
  { id: 'manualClick', labelKey: 'editorLoopManualClick', icon: 'ti-mouse' },
]

const EFFECT_ICON_MAP = {
  volume: 'ti-volume',
  fadeIn: 'ti-sunrise',
  fadeOut: 'ti-sunset',
  speed: 'ti-gauge',
  echo: 'ti-repeat',
  reverb: 'ti-wave-sine',
}

export default function ClipActionsMenu({
  clip,
  trackId,
  position,
  onClose,
  onSplit,
  onLoop,
  onTrim,
  onNormalize,
  onAddEffect,
  onDuplicate,
  onCopy,
  onCut,
  onDelete,
  onPreviewEffects,
  onToggleClipLoop,
  onActivateLoopManualClick,
  onActivateSplitManualClick,
  isPlaying,
  isLoopEnabled,
  clipDurations = {},
  loopState = {},
  tr,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}) {
  const { t } = useLanguage()
  const menuRef = useRef(null)
  const [showLoopSubmenu, setShowLoopSubmenu] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  const [loopColor, setLoopColor] = useState('#22c55e')
  const [loopEndMode, setLoopEndMode] = useState('endOfTrack')
  const [cycleCount, setCycleCount] = useState(3)
  const [manualDuration, setManualDuration] = useState(10)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const isClipLooping = clip?.id && loopState?.clips?.[clip.id]?.enabled || false
  const clipLoopData = clip?.id ? loopState?.clips?.[clip.id] : null

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    let { top, left } = position
    const MARGIN = 10
    if (rect.bottom > window.innerHeight - MARGIN) {
      top = position.top - rect.height - MARGIN
    }
    if (top < MARGIN) {
      top = MARGIN
    }
    if (rect.right > window.innerWidth - MARGIN) {
      left = position.left - rect.width - MARGIN
    }
    if (left < MARGIN) {
      left = MARGIN
    }
    if (top !== position.top || left !== position.left) {
      menuRef.current.style.top = top + 'px'
      menuRef.current.style.left = left + 'px'
    }
  }, [position, showLoopSubmenu, activeTab])

  useEffect(() => {
    const handleResize = () => {
      if (!menuRef.current) return
      const rect = menuRef.current.getBoundingClientRect()
      let { top, left } = position
      const MARGIN = 10
      if (rect.bottom > window.innerHeight - MARGIN) {
        top = position.top - rect.height - MARGIN
      }
      if (top < MARGIN) {
        top = MARGIN
      }
      if (rect.right > window.innerWidth - MARGIN) {
        left = position.left - rect.width - MARGIN
      }
      if (left < MARGIN) {
        left = MARGIN
      }
      if (top !== position.top || left !== position.left) {
        menuRef.current.style.top = top + 'px'
        menuRef.current.style.left = left + 'px'
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [position])

  useEffect(() => {
    if (clipLoopData) {
      setLoopColor(clipLoopData.arrowColor || '#22c55e')
      setLoopEndMode(clipLoopData.loopMode || 'endOfTrack')
      setCycleCount(clipLoopData.cycleCount || 3)
      setManualDuration(clipLoopData.manualDuration || 10)
    }
  }, [clipLoopData])

  if (!clip) return null

  const hasActiveEffects = clip.effects?.some(e => e.enabled) || false
  const duration = clipDurations?.[clip.id] || clip.duration || 3

  const handleSplitMid = () => {
    if (clip) {
      const start = clip.start || 0
      const midPoint = start + duration / 2
      onSplit?.(trackId, clip.id, midPoint)
      onClose()
    }
  }

  // ✅ handleDeleteClick - Ferme le menu et appelle onDelete après un délai
  const handleDeleteClick = () => {
    // ✅ Fermer le menu immédiatement
    onClose()
    
    // ✅ Appeler onDelete après un court délai pour que le menu ait le temps de se fermer
    setTimeout(() => {
      if (onDelete) {
        onDelete(trackId, clip.id, clip.name)
      }
    }, 50)
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
      manualDuration: loopEndMode === 'manualDuration' ? manualDuration : undefined,
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

  const handlePreviewEffectsClick = () => {
    onClose()
    if (onAddEffect) {
      onAddEffect(clip.id, trackId)
    }
  }

  const colorLabels = {}
  ARROW_COLORS.forEach(c => {
    colorLabels[c.id] = tr(c.labelKey) || c.id
  })

  const effectLabels = {
    volume: tr('editorEffectVolume') || 'Volume',
    fadeIn: tr('editorEffectFadeIn') || 'Fade In',
    fadeOut: tr('editorEffectFadeOut') || 'Fade Out',
    speed: tr('editorEffectSpeed') || 'Vitesse',
    echo: tr('editorEffectEcho') || 'Écho',
    reverb: tr('editorEffectReverb') || 'Réverbération',
  }

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
        overflowY: 'auto'
      }}
    >
      <div style={{
        padding: '6px 14px 10px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 160
        }}>
          {clip.name}
        </span>
        <span style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          fontFamily: 'monospace'
        }}>
          {duration.toFixed(1)}s
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: 2,
        padding: '4px 8px',
        marginBottom: 4
      }}>
        {[
          { id: 'edit', icon: 'ti-pencil', labelKey: 'editorClipEdit' },
          { id: 'audio', icon: 'ti-volume', labelKey: 'editorAudioEdit' },
          { id: 'effects', icon: 'ti-wand', labelKey: 'editorEffects' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === tab.id ? 'var(--accent-light)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-tertiary)',
              fontSize: 10,
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <i className={`ti ${tab.icon}`} style={{ marginRight: 4 }} />
            {tr(tab.labelKey) || tab.labelKey}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 4px' }}>
        {activeTab === 'edit' && (
          <div className="menu-group">
            <div style={{
              display: 'flex',
              gap: 4,
              padding: '2px 4px',
              marginBottom: 4
            }}>
              <MenuItem 
                icon="ti-arrow-up" 
                labelKey="editorMoveUp"
                onClick={() => { onMoveUp?.(trackId, clip.id); onClose() }}
                disabled={!canMoveUp}
                shortcut="↑"
                style={{ flex: 1 }}
                tr={tr}
              />
              <MenuItem 
                icon="ti-arrow-down" 
                labelKey="editorMoveDown"
                onClick={() => { onMoveDown?.(trackId, clip.id); onClose() }}
                disabled={!canMoveDown}
                shortcut="↓"
                style={{ flex: 1 }}
                tr={tr}
              />
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '2px 8px' }} />

            <MenuItem 
              icon="ti-copy" 
              labelKey="editorCopy"
              onClick={() => { onCopy?.(clip.id, trackId); onClose() }}
              shortcut="Ctrl+C"
              tr={tr}
            />
            <MenuItem 
              icon="ti-scissors" 
              labelKey="editorCut"
              onClick={() => { onCut?.(clip.id, trackId); onClose() }}
              shortcut="Ctrl+X"
              tr={tr}
            />
            <MenuItem 
              icon="ti-copy" 
              labelKey="editorDuplicate"
              onClick={() => { onDuplicate?.(trackId, clip.id); onClose() }}
              shortcut="Ctrl+D"
              tr={tr}
            />
            
            {/* ✅ MenuItem Delete - Utilise handleDeleteClick avec délai */}
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

        {activeTab === 'audio' && (
          <div className="menu-group">
            <MenuItem 
              icon="ti-cut" 
              labelKey="editorTrim"
              onClick={() => { onTrim?.(clip.id); onClose() }}
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
              onClick={() => { onNormalize?.(clip.id); onClose() }}
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
                  background: isClipLooping ? 'var(--accent-light)' : 'transparent',
                  border: `1px solid ${isClipLooping ? 'var(--success)' : 'transparent'}`,
                  borderRadius: 'var(--radius-sm)',
                  color: isClipLooping ? 'var(--success)' : 'var(--text-primary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit'
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
                <i className={`ti ${isClipLooping ? 'ti-repeat' : 'ti-repeat-off'}`} style={{ fontSize: 14, minWidth: 18 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {isClipLooping ? (tr('editorLoopActive') || 'Boucle active') : (tr('editorLoop') || 'Boucle')}
                </span>
                {isClipLooping && (
                  <span style={{
                    fontSize: 9,
                    color: 'var(--success)',
                    background: 'rgba(34,197,94,0.15)',
                    padding: '1px 8px',
                    borderRadius: 10
                  }}>
                    ON
                  </span>
                )}
                <i className={`ti ${showLoopSubmenu ? 'ti-chevron-up' : 'ti-chevron-right'}`} style={{ fontSize: 12, color: 'var(--text-tertiary)' }} />
              </button>
              
              {showLoopSubmenu && (
                <div style={{
                  marginTop: 4,
                  padding: '6px 8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                      {tr('editorLoopColor') || 'Couleur de la flèche'}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {ARROW_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setLoopColor(c.color)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: c.color,
                            border: loopColor === c.color ? '2px solid var(--accent)' : '2px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            outline: 'none',
                            flexShrink: 0
                          }}
                          title={colorLabels[c.id]}
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
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                        }}
                        title={tr('customColor') || 'Couleur personnalisée'}
                      >
                        +
                      </button>
                    </div>
                    {showColorPicker && (
                      <div style={{
                        marginTop: 4,
                        padding: 4,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
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
                            background: 'transparent'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                      {tr('editorLoopEnd') || 'Fin de la boucle'}
                    </div>
                    
                    {LOOP_END_OPTIONS.map(opt => (
                      <label
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '3px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: loopEndMode === opt.id ? 'var(--accent-light)' : 'transparent',
                          border: `1px solid ${loopEndMode === opt.id ? 'var(--accent)' : 'transparent'}`,
                          cursor: 'pointer',
                          fontSize: 10,
                          marginBottom: 2
                        }}
                      >
                        <input
                          type="radio"
                          name="loopEndMode"
                          checked={loopEndMode === opt.id}
                          onChange={() => setLoopEndMode(opt.id)}
                          style={{ width: 'auto', accentColor: 'var(--accent)', margin: 0 }}
                        />
                        <i className={`ti ${opt.icon}`} style={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                        <span style={{ flex: 1 }}>{tr(opt.labelKey) || opt.id}</span>
                        
                        {opt.id === 'cycles' && loopEndMode === 'cycles' && (
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={cycleCount}
                            onChange={(e) => setCycleCount(Math.max(1, parseInt(e.target.value) || 1))}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: 40,
                              padding: '1px 4px',
                              fontSize: 10,
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              textAlign: 'center'
                            }}
                          />
                        )}
                        
                        {opt.id === 'manualDuration' && loopEndMode === 'manualDuration' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <input
                              type="number"
                              min="0.1"
                              max="999"
                              step="0.1"
                              value={manualDuration}
                              onChange={(e) => setManualDuration(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: 50,
                                padding: '1px 4px',
                                fontSize: 10,
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                textAlign: 'center'
                              }}
                            />
                            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>s</span>
                          </div>
                        )}
                        
                        {opt.id === 'manualClick' && loopEndMode === 'manualClick' && (
                          <span style={{
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
                            gap: 4
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onActivateLoopManualClick) {
                              onActivateLoopManualClick(clip.id, trackId, { arrowColor: loopColor })
                            }
                            onClose()
                          }}
                          >
                            <i className="ti ti-click" style={{ fontSize: 10 }} />
                            {tr('editorLoopClickToDefine') || 'Cliquer pour définir'}
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
                      color: 'white'
                    }}
                  >
                    <i className="ti ti-check" /> 
                    {isClipLooping 
                      ? (tr('editorLoopUpdate') || 'Mettre à jour')
                      : (tr('editorLoopActivate') || 'Activer la boucle')
                    }
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

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
              onClick={handlePreviewEffectsClick}
              disabled={!hasActiveEffects}
              tr={tr}
            />
            
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
            
            {clip.effects?.filter(e => e.enabled).length > 0 && (
              <>
                <div style={{
                  padding: '4px 8px',
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {tr('editorActiveEffects') || 'Effets actifs'}
                </div>
                {clip.effects.filter(e => e.enabled).map(effect => {
                  const effectIcon = EFFECT_ICON_MAP[effect.type] || 'ti-wand'
                  const effectLabel = effectLabels[effect.type] || effect.type
                  return (
                    <MenuItem 
                      key={effect.id}
                      icon={effectIcon}
                      label={`${effectLabel} (${Object.values(effect.params).map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')})`}
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
              <div style={{
                padding: '8px 12px',
                fontSize: 11,
                color: 'var(--text-tertiary)',
                fontStyle: 'italic',
                textAlign: 'center'
              }}>
                {tr('editorNoEffects') || 'Aucun effet actif'}
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
  tr
}) {
  const [hovered, setHovered] = useState(false)
  const displayLabel = label || (labelKey ? tr(labelKey) : '')

  return (
    <button
      className={`menu-item ${danger ? 'danger' : ''} ${accent ? 'accent' : ''} ${active ? 'active' : ''}`}
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
        color: danger ? 'var(--danger)' : accent ? 'var(--accent)' : muted ? 'var(--text-tertiary)' : disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
        fontSize: small ? 11 : 12,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        ...style
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: small ? 12 : 14, minWidth: small ? 16 : 18 }} />
      <span style={{ flex: 1, textAlign: 'left' }}>{displayLabel}</span>
      {shortcut && (
        <span style={{
          fontSize: 9,
          color: 'var(--text-tertiary)',
          fontFamily: 'monospace',
          opacity: hovered ? 1 : 0.6
        }}>
          {shortcut}
        </span>
      )}
      {hasSubmenu && (
        <i className="ti ti-chevron-up" style={{ fontSize: 12, color: 'var(--text-tertiary)' }} />
      )}
      {active && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--success)',
          display: 'inline-block'
        }} />
      )}
    </button>
  )
}