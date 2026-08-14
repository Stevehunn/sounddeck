// src/features/editor/components/ClipActionsMenu.jsx
import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

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
  onFadeIn,
  onFadeOut,
  onPreviewEffects,
  isPlaying,
  isLoopEnabled,
  clipDurations = {},
  tr
}) {
  const { t } = useLanguage()
  const menuRef = useRef(null)
  const [showFadeSubmenu, setShowFadeSubmenu] = useState(false)
  const [fadeDurations, setFadeDurations] = useState({ in: 0.5, out: 0.5 })
  const [activeTab, setActiveTab] = useState('edit')

  console.log('📋 [ClipActionsMenu] Rendu du menu pour clip:', clip?.id, 'nom:', clip?.name)

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

  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    let { top, left } = position

    if (rect.bottom > window.innerHeight) {
      top = position.top - rect.height
    }
    if (rect.right > window.innerWidth) {
      left = position.left - rect.width
    }
    if (top < 10) top = 10
    if (left < 10) left = 10

    if (top !== position.top || left !== position.left) {
      menuRef.current.style.top = top + 'px'
      menuRef.current.style.left = left + 'px'
    }
  }, [position])

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

  // ✅ HANDLER SUPPRESSION - Ferme le menu et appelle le handler parent (Editor)
  const handleDeleteClick = () => {
    console.log('🗑️ [ClipActionsMenu] Clic sur Supprimer pour:', clip.id)
    // Fermer le menu immédiatement
    onClose()
    // Le parent (Editor) gère la confirmation via useConfirm
    onDelete?.(trackId, clip.id)
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
        animation: 'fadeIn 0.15s ease'
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
            
            {/* ✅ BOUTON SUPPRIMER PERSONNALISÉ - SANS DeleteButton */}
            <div style={{ padding: '2px 4px' }}>
              <button
                onClick={handleDeleteClick}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(224,82,82,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 14, minWidth: 18 }} />
                <span style={{ flex: 1, textAlign: 'left' }}>{t('editorDelete') || 'Supprimer'}</span>
                <span style={{
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  fontFamily: 'monospace',
                  opacity: 0.6
                }}>
                  Delete
                </span>
              </button>
            </div>
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
            <MenuItem 
              icon="ti-wave" 
              label={t('editorNormalize') || 'Normaliser'} 
              onClick={() => { onNormalize?.(clip.id); onClose() }} 
            />
            <MenuItem 
              icon="ti-repeat" 
              label={t('editorLoop') || 'Boucle'} 
              onClick={() => { onLoop?.(clip.id); onClose() }} 
              active={isLoopEnabled}
            />
            
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
            
            <MenuItem 
              icon="ti-sun" 
              label={t('editorFades') || 'Fades'} 
              onClick={() => setShowFadeSubmenu(!showFadeSubmenu)}
              hasSubmenu={showFadeSubmenu}
            />
            {showFadeSubmenu && (
              <div style={{ padding: '4px 8px 4px 32px' }}>
                <FadeControl 
                  label={t('editorFadeIn') || 'Fade In'} 
                  value={fadeDurations.in} 
                  onChange={(val) => {
                    setFadeDurations(prev => ({ ...prev, in: val }))
                    onFadeIn?.(trackId, clip.id, val)
                  }}
                />
                <FadeControl 
                  label={t('editorFadeOut') || 'Fade Out'} 
                  value={fadeDurations.out} 
                  onChange={(val) => {
                    setFadeDurations(prev => ({ ...prev, out: val }))
                    onFadeOut?.(trackId, clip.id, val)
                  }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="menu-group">
            <MenuItem 
              icon="ti-plus" 
              label={t('editorAddEffect') || '+ Ajouter un effet'} 
              onClick={() => { onAddEffect?.(trackId, clip.id); onClose() }}
              accent
            />
            <MenuItem 
              icon="ti-wave" 
              label={t('editorEffectPreview') || 'Aperçu des effets'} 
              onClick={() => { onPreviewEffects?.(clip); onClose() }}
              disabled={!hasActiveEffects}
            />
            {clip.effects?.filter(e => e.enabled).map(effect => (
              <MenuItem 
                key={effect.id}
                icon="ti-circle-filled"
                label={`${effect.type} (${Object.values(effect.params).join(', ')})`}
                onClick={() => {}}
                small
                muted
              />
            ))}
            {!hasActiveEffects && (
              <div style={{
                padding: '6px 12px',
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

function MenuItem({ icon, label, onClick, shortcut, danger, accent, active, disabled, hasSubmenu, small, muted }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      className={`menu-item ${danger ? 'danger' : ''} ${accent ? 'accent' : ''} ${active ? 'active' : ''}`}
      onClick={onClick}
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
        color: danger ? 'var(--danger)' : accent ? 'var(--accent)' : muted ? 'var(--text-tertiary)' : 'var(--text-primary)',
        fontSize: small ? 11 : 12,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.15s',
        fontFamily: 'inherit'
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

function FadeControl({ label, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '2px 0',
      fontSize: 11
    }}>
      <span style={{ color: 'var(--text-secondary)', minWidth: 55 }}>{label}</span>
      <input
        type="range"
        min={0.1}
        max={5}
        step={0.05}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)', height: 3 }}
      />
      <span style={{
        color: 'var(--text-tertiary)',
        fontFamily: 'monospace',
        minWidth: 30,
        fontSize: 10
      }}>
        {value.toFixed(1)}s
      </span>
    </div>
  )
}