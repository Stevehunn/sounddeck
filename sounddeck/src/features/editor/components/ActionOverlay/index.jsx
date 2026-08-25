// src/features/editor/components/ActionOverlay/index.jsx
import React, { useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function ActionOverlay({
  isOpen,
  actionType,
  clipName,
  step = 0,
  totalSteps = 3,
  onCancel,
  tr
}) {
  const { t } = useLanguage()
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isOpen && overlayRef.current) {
      overlayRef.current.style.animation = 'none'
      void overlayRef.current.offsetHeight
      overlayRef.current.style.animation = 'actionOverlaySlideUp 0.25s ease forwards'
    }
  }, [isOpen])

  if (!isOpen) return null

  // ✅ Configuration selon le type d'action
  const getConfig = () => {
    switch (actionType) {
      case 'loop-clip':
        return {
          icon: 'ti-repeat',
          title: t('editorLoopClipAction') || 'Boucle du clip',
          color: 'var(--success)',
          bgColor: 'rgba(34, 197, 94, 0.12)',
          // ✅ Texte fixe - NE BOUGE PAS
          instructions: clipName 
            ? 'Cliquer sur la ligne de temps après le clip sélectionné pour définir la durée de la boucle.'
            : 'Cliquer sur la ligne de temps pour définir la durée de la boucle.',
          // ✅ Pas d'effet de pulsation
          hasPulse: false
        }
      case 'loop-timeline':
        // ✅ Texte fixe qui ne change pas - affiche toujours le même message
        return {
          icon: 'ti-repeat',
          title: t('editorLoopTimelineAction') || 'Mode clic - Boucle générale',
          color: 'var(--accent)',
          bgColor: 'rgba(124, 111, 247, 0.12)',
          // ✅ Texte FIXE - ne change jamais
          instructions: 'Cliquez sur la ligne de temps pour définir la zone de boucle.',
          // ✅ PAS d'effet de pulsation (statique)
          hasPulse: false
        }
      case 'split':
        return {
          icon: 'ti-scissors',
          title: t('editorSplitAction') || 'Couper le clip',
          color: 'var(--warning)',
          bgColor: 'rgba(239, 159, 39, 0.12)',
          instructions: clipName 
            ? `Cliquez sur la ligne de temps pour couper "${clipName}"`
            : 'Cliquez sur la ligne de temps pour couper le clip',
          hasPulse: false
        }
      default:
        return {
          icon: 'ti-click',
          title: t('editorAction') || 'Action',
          color: 'var(--text-secondary)',
          bgColor: 'rgba(255, 255, 255, 0.05)',
          instructions: t('editorClickTimeline') || 'Cliquez sur la ligne de temps',
          hasPulse: false
        }
    }
  }

  const config = getConfig()
  const showProgress = totalSteps > 1 && step >= 0 && step < totalSteps

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        bottom: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        maxWidth: 580,
        width: 'auto',
        minWidth: 320,
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${config.color}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 30px ${config.color}20`,
        padding: '10px 16px',
        backdropFilter: 'blur(8px)',
        animation: 'actionOverlaySlideUp 0.25s ease forwards',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}
    >
      {/* Icône */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: config.bgColor,
        border: `2px solid ${config.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <i className={`ti ${config.icon}`} style={{ 
          fontSize: 16, 
          color: config.color 
        }} />
      </div>

      {/* Texte - STATIQUE (pas de pulsation) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: 13, 
          fontWeight: 600, 
          color: config.color,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 2
        }}>
          <span>{config.title}</span>
          {showProgress && (
            <span style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              fontFamily: 'monospace',
              background: 'var(--bg-tertiary)',
              padding: '1px 8px',
              borderRadius: 10
            }}>
              {step + 1}/{totalSteps}
            </span>
          )}
        </div>
        {/* ✅ Texte d'instruction - TOUJOURS STATIQUE */}
        <div style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5
        }}>
          {config.instructions}
        </div>
      </div>

      {/* Barre de progression */}
      {showProgress && (
        <div style={{
          display: 'flex',
          gap: 4,
          flexShrink: 0,
          alignItems: 'center',
          alignSelf: 'stretch',
          padding: '0 4px'
        }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 24,
                height: 4,
                borderRadius: 2,
                background: i < step + 1 ? config.color : 'var(--bg-tertiary)',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>
      )}

      {/* Bouton Fermer (X) */}
      <button
        onClick={onCancel}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(224, 82, 82, 0.15)'
          e.currentTarget.style.color = 'var(--danger)'
          e.currentTarget.style.borderColor = 'var(--danger)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-tertiary)'
          e.currentTarget.style.color = 'var(--text-tertiary)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
        title={t('cancel') || 'Annuler (Escape)'}
      >
        <i className="ti ti-x" />
      </button>

      <style>{`
        @keyframes actionOverlaySlideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}