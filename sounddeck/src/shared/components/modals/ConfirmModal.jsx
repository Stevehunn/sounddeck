// src/shared/components/modals/ConfirmModal.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function ConfirmModal({ 
  title, 
  message, 
  confirmText, 
  cancelText, 
  onConfirm, 
  onCancel,
  type = 'danger',
  lang = 'fr'
}) {
  const { t, currentLang } = useLanguage()
  const [isHoveringConfirm, setIsHoveringConfirm] = useState(false)
  
  const colors = {
    danger: {
      border: 'var(--danger)',
      bg: 'rgba(224,82,82,0.1)',
      icon: 'var(--danger)',
      button: 'var(--danger)',
      buttonHover: '#c0392b',
      shadow: 'rgba(224, 82, 82, 0.4)'
    },
    warning: {
      border: 'var(--warning)',
      bg: 'rgba(239,159,39,0.1)',
      icon: 'var(--warning)',
      button: 'var(--warning)',
      buttonHover: '#d4891a',
      shadow: 'rgba(239, 159, 39, 0.4)'
    },
    info: {
      border: 'var(--accent)',
      bg: 'var(--accent-light)',
      icon: 'var(--accent)',
      button: 'var(--accent)',
      buttonHover: '#6B62D4',
      shadow: 'rgba(124, 111, 247, 0.4)'
    }
  }
  
  const style = colors[type] || colors.info

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ color: style.icon }}>
          <i className={`ti ${type === 'danger' ? 'ti-alert-triangle' : type === 'warning' ? 'ti-alert-circle' : 'ti-info-circle'}`} 
             style={{ color: style.icon, marginRight: 8 }} />
          {title}
        </div>
        
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          {message}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button 
            className="btn-secondary btn-lg" 
            onClick={onCancel}
            style={{ 
              borderRadius: 'var(--radius-md)', 
              minHeight: 40, 
              padding: '8px 20px' 
            }}
          >
            <i className="ti ti-x" /> {cancelText || t('cancel')}
          </button>
          
          {/* ✅ Bouton Supprimer avec effet de survol amélioré */}
          <button 
            className="btn-danger btn-lg" 
            onClick={onConfirm}
            onMouseEnter={() => setIsHoveringConfirm(true)}
            onMouseLeave={() => setIsHoveringConfirm(false)}
            style={{ 
              borderRadius: 'var(--radius-md)', 
              minHeight: 40, 
              padding: '8px 20px',
              background: isHoveringConfirm ? style.buttonHover : style.button,
              borderColor: style.button,
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: isHoveringConfirm ? 'scale(1.05)' : 'scale(1)',
              boxShadow: isHoveringConfirm 
                ? `0 4px 20px ${style.shadow}` 
                : '0 2px 8px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {/* Effet de lumière au survol */}
            {isHoveringConfirm && (
              <span style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                animation: 'shine 0.6s ease-out forwards',
                pointerEvents: 'none'
              }} />
            )}
            <i className="ti ti-check" /> {confirmText || t('confirm')}
          </button>
        </div>

        {/* Animation shine pour le bouton */}
        <style>{`
          @keyframes shine {
            0% {
              transform: translate(-50%, -50%) scale(0);
              opacity: 1;
            }
            100% {
              transform: translate(50%, 50%) scale(1);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </div>
  )
}