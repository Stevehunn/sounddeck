// src/features/editor/components/ClipActionsMenu.jsx
import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

// ✅ Couleurs pour la flèche de boucle
const ARROW_COLORS = [
  { id: 'green', color: '#22c55e', label: 'Vert' },
  { id: 'blue', color: '#3b82f6', label: 'Bleu' },
  { id: 'purple', color: '#8b5cf6', label: 'Violet' },
  { id: 'pink', color: '#ec4899', label: 'Rose' },
  { id: 'red', color: '#ef4444', label: 'Rouge' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
  { id: 'yellow', color: '#eab308', label: 'Jaune' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
]

// ✅ Options de fin de boucle
const LOOP_END_OPTIONS = [
  { id: 'endOfTrack', label: 'Jusqu\'à la fin de la piste', icon: 'ti-flag' },
  { id: 'cycles', label: 'Nombre de cycles', icon: 'ti-repeat' },
  { id: 'manualDuration', label: 'Durée manuelle', icon: 'ti-clock' },
  { id: 'manualClick', label: 'Cliquer sur la timeline', icon: 'ti-mouse' },
]

// ✅ Map des icônes pour l'affichage dans le menu contextuel
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
  // ✅ NOUVEAUX PROPS POUR LE DÉPLACEMENT VERTICAL
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}) {
  const { t } = useLanguage()
  const menuRef = useRef(null)
  const [showLoopSubmenu, setShowLoopSubmenu] = useState(false)
  const [activeTab, setActiveTab] = useState('edit')
  
  // ✅ État pour la boucle
  const [loopColor, setLoopColor] = useState('#22c55e')
  const [loopEndMode, setLoopEndMode] = useState('endOfTrack')
  const [cycleCount, setCycleCount] = useState(3)
  const [manualDuration, setManualDuration] = useState(10)
  const [showColorPicker, setShowColorPicker] = useState(false)

  console.log('📋 [ClipActionsMenu] Rendu du menu pour clip:', clip?.id, 'nom:', clip?.name)

  // ✅ Vérifier si le clip est déjà en boucle
  const isClipLooping = clip?.id && loopState?.clips?.[clip.id]?.enabled || false
  const clipLoopData = clip?.id ? loopState?.clips?.[clip.id] : null

  // ✅ Fermer le menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        console.log('📋 [ClipActionsMenu] Clic extérieur, fermeture')
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // ✅ POSITIONNEMENT DYNAMIQUE - Se repositionne à chaque render
  useEffect(() => {
    if (!menuRef.current) return
    
    const rect = menuRef.current.getBoundingClientRect()
    let { top, left } = position
    
    // ✅ Marge de sécurité
    const MARGIN = 10
    
    // ✅ Vérifier si le menu dépasse en bas
    if (rect.bottom > window.innerHeight - MARGIN) {
      top = position.top - rect.height - MARGIN
    }
    
    // ✅ Vérifier si le menu dépasse en haut
    if (top < MARGIN) {
      top = MARGIN
    }
    
    // ✅ Vérifier si le menu dépasse à droite
    if (rect.right > window.innerWidth - MARGIN) {
      left = position.left - rect.width - MARGIN
    }
    
    // ✅ Vérifier si le menu dépasse à gauche
    if (left < MARGIN) {
      left = MARGIN
    }
    
    // ✅ Appliquer la position
    if (top !== position.top || left !== position.left) {
      menuRef.current.style.top = top + 'px'
      menuRef.current.style.left = left + 'px'
    }
  }, [position, showLoopSubmenu, activeTab]) // ✅ Se repositionne quand le sous-menu change

  // ✅ RECALCULER LA POSITION AU REDIMENSIONNEMENT DE LA FENÊTRE
  useEffect(() => {
    const handleResize = () => {
      if (!menuRef.current) return
      
      const rect = menuRef.current.getBoundingClientRect()
      let { top, left } = position
      const MARGIN = 10
      
      // ✅ Vérifier si le menu dépasse
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

  // ✅ Charger les données de boucle existantes
  useEffect(() => {
    if (clipLoopData) {
      setLoopColor(clipLoopData.arrowColor || '#22c55e')
      setLoopEndMode(clipLoopData.loopMode || 'endOfTrack')
      setCycleCount(clipLoopData.cycleCount || 3)
      setManualDuration(clipLoopData.manualDuration || 10)
    }
  }, [clipLoopData])

  if (!clip) {
    console.warn('📋 [ClipActionsMenu] clip est null/undefined, pas de rendu')
    return null
  }

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

  const handleDeleteClick = () => {
    console.log('🗑️ [ClipActionsMenu] Clic sur Supprimer pour:', clip.id)
    onClose()
    onDelete?.(trackId, clip.id)
  }

  // ✅ Handler pour activer/désactiver la boucle
  const handleToggleLoop = () => {
    console.log('🔄 [ClipActionsMenu] Toggle boucle pour:', clip.id)
    
    if (isClipLooping) {
      console.log('🔄 [ClipActionsMenu] Désactivation de la boucle')
      onToggleClipLoop?.(clip.id, {
        enabled: false
      })
      onClose()
      return
    }
    
    // ✅ Si le mode est "Cliquer sur la timeline", on active le mode d'attente
    if (loopEndMode === 'manualClick') {
      console.log('🖱️ [ClipActionsMenu] Activation du mode clic pour la boucle')
      if (onActivateLoopManualClick) {
        onActivateLoopManualClick(clip.id, trackId, {
          arrowColor: loopColor,
        })
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
    
    console.log('🔄 [ClipActionsMenu] Activation de la boucle avec options:', options)
    
    onToggleClipLoop?.(clip.id, options)
    onClose()
  }

  // ✅ Handler pour l'option "Split avec clic"
  const handleSplitWithClick = () => {
    console.log('✂️ [ClipActionsMenu] Split avec clic sur la timeline')
    if (onActivateSplitManualClick) {
      onActivateSplitManualClick(clip.id, trackId)
    }
    onClose()
  }

  // ✅ Handler pour ajouter un effet
  const handleAddEffectClick = () => {
    console.log('✨ [ClipActionsMenu] Ouvrir le panneau des effets pour:', clip.id, clip.name)
    onClose()
    if (onAddEffect) {
      onAddEffect(clip.id, trackId)
    }
  }

  // ✅ Handler pour l'aperçu des effets
  const handlePreviewEffectsClick = () => {
    console.log('👂 [ClipActionsMenu] Ouvrir le panneau des effets pour aperçu:', clip.id, clip.name)
    onClose()
    if (onAddEffect) {
      onAddEffect(clip.id, trackId)
    }
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
        // ✅ Limiter la hauteur max pour éviter de sortir de l'écran
        maxHeight: `calc(100vh - 20px)`,
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
          { id: 'edit', icon: 'ti-pencil', label: t('editorClipEdit') || 'Édition' },
          { id: 'audio', icon: 'ti-volume', label: t('editorAudioEdit') || 'Audio' },
          { id: 'effects', icon: 'ti-wand', label: t('editorEffects') || 'Effets' }
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
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 4px' }}>
        {activeTab === 'edit' && (
          <div className="menu-group">
            {/* ✅ BOUTONS DE DÉPLACEMENT VERTICAL */}
            <div style={{
              display: 'flex',
              gap: 4,
              padding: '2px 4px',
              marginBottom: 4
            }}>
              <MenuItem 
                icon="ti-arrow-up" 
                label={t('editorMoveUp') || 'Monter'} 
                onClick={() => { 
                  console.log('⬆️ [ClipActionsMenu] Monter le clip:', clip.id)
                  onMoveUp?.(trackId, clip.id)
                  onClose() 
                }}
                disabled={!canMoveUp}
                shortcut="↑"
                style={{ flex: 1 }}
              />
              <MenuItem 
                icon="ti-arrow-down" 
                label={t('editorMoveDown') || 'Descendre'} 
                onClick={() => { 
                  console.log('⬇️ [ClipActionsMenu] Descendre le clip:', clip.id)
                  onMoveDown?.(trackId, clip.id)
                  onClose() 
                }}
                disabled={!canMoveDown}
                shortcut="↓"
                style={{ flex: 1 }}
              />
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '2px 8px' }} />

            <MenuItem 
              icon="ti-copy" 
              label={t('editorCopy') || 'Copier'} 
              onClick={() => { 
                console.log('📋 [ClipActionsMenu] Copier:', clip.id)
                onCopy?.(clip.id, trackId)
                onClose() 
              }} 
              shortcut="Ctrl+C"
            />
            <MenuItem 
              icon="ti-scissors" 
              label={t('editorCut') || 'Couper'} 
              onClick={() => { 
                console.log('✂️ [ClipActionsMenu] Couper:', clip.id)
                onCut?.(clip.id, trackId)
                onClose() 
              }} 
              shortcut="Ctrl+X"
            />
            <MenuItem 
              icon="ti-copy" 
              label={t('editorDuplicate') || 'Dupliquer'} 
              onClick={() => { 
                console.log('📋 [ClipActionsMenu] Dupliquer:', clip.id)
                onDuplicate?.(trackId, clip.id)
                onClose() 
              }} 
              shortcut="Ctrl+D"
            />
            
            <MenuItem 
              icon="ti-trash" 
              label={t('editorDelete') || 'Supprimer'} 
              onClick={handleDeleteClick}
              shortcut="Delete"
              danger
            />
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="menu-group">
            <MenuItem 
              icon="ti-cut" 
              label={t('editorTrim') || 'Rogner'} 
              onClick={() => { 
                console.log('✂️ [ClipActionsMenu] Rogner:', clip.id)
                onTrim?.(clip.id)
                onClose() 
              }} 
              shortcut="Ctrl+R"
            />
            
            <MenuItem 
              icon="ti-scissors" 
              label={t('editorSplitAtMiddle') || 'Split au milieu'} 
              onClick={handleSplitMid}
              shortcut="S"
            />
            
            {/* ✅ Split avec clic sur la timeline */}
            <MenuItem 
              icon="ti-scissors" 
              label={t('editorSplitWithClick') || '✂️ Split avec clic'} 
              onClick={handleSplitWithClick}
              shortcut="C"
            />
            
            <MenuItem 
              icon="ti-adjustments-horizontal" 
              label={t('editorNormalize') || 'Normaliser'} 
              onClick={() => { 
                console.log('📊 [ClipActionsMenu] Normaliser:', clip.id)
                onNormalize?.(clip.id)
                onClose() 
              }} 
            />
            
            {/* ✅ BOUCLE - Sous-menu simplifié */}
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
                  {isClipLooping ? t('editorLoopActive') || 'Boucle active' : t('editorLoop') || 'Boucle'}
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
              
              {/* ✅ Sous-menu de la boucle simplifié */}
              {showLoopSubmenu && (
                <div style={{
                  marginTop: 4,
                  padding: '6px 8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}>
                  {/* ✅ Sélecteur de couleur */}
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                      {t('editorLoopColor') || 'Couleur de la flèche'}
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
                          title={c.label}
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
                        title="Couleur personnalisée"
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

                  {/* ✅ Options de fin de boucle */}
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                      {t('editorLoopEnd') || 'Fin de la boucle'}
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
                        <span style={{ flex: 1 }}>{opt.label}</span>
                        
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
                            console.log('🖱️ [ClipActionsMenu] Clic sur "Cliquer pour définir"')
                            if (onActivateLoopManualClick) {
                              onActivateLoopManualClick(clip.id, trackId, {
                                arrowColor: loopColor,
                              })
                            }
                            onClose()
                          }}
                          >
                            <i className="ti ti-click" style={{ fontSize: 10 }} />
                            Cliquer pour définir
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
                      ? (t('editorLoopUpdate') || 'Mettre à jour')
                      : (t('editorLoopActivate') || 'Activer la boucle')
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
              label={t('editorAddEffect') || 'Ouvrir le panneau des effets'} 
              onClick={handleAddEffectClick}
              accent
            />
            
            <MenuItem 
              icon="ti-wave" 
              label={t('editorEffectPreview') || 'Ouvrir le panneau des effets (aperçu)'} 
              onClick={handlePreviewEffectsClick}
              disabled={!hasActiveEffects}
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
                  {t('editorActiveEffects') || 'Effets actifs'}
                </div>
                {clip.effects.filter(e => e.enabled).map(effect => {
                  const effectIcon = EFFECT_ICON_MAP[effect.type] || 'ti-wand'
                  return (
                    <MenuItem 
                      key={effect.id}
                      icon={effectIcon}
                      label={`${effect.type} (${Object.values(effect.params).map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')})`}
                      onClick={() => {}}
                      small
                      muted
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
                {t('editorNoEffects') || 'Aucun effet actif'}
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
  style
}) {
  const [hovered, setHovered] = useState(false)

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
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
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