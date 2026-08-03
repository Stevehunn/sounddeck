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
  
  const colors = {
    danger: {
      border: 'var(--danger)',
      bg: 'rgba(224,82,82,0.1)',
      icon: 'var(--danger)',
      button: 'var(--danger)'
    },
    warning: {
      border: 'var(--warning)',
      bg: 'rgba(239,159,39,0.1)',
      icon: 'var(--warning)',
      button: 'var(--warning)'
    },
    info: {
      border: 'var(--accent)',
      bg: 'var(--accent-light)',
      icon: 'var(--accent)',
      button: 'var(--accent)'
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
          <button 
            className="btn-danger btn-lg" 
            onClick={onConfirm}
            style={{ 
              borderRadius: 'var(--radius-md)', 
              minHeight: 40, 
              padding: '8px 20px',
              background: style.button,
              borderColor: style.button,
              color: 'white',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '0.8'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <i className="ti ti-check" /> {confirmText || t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}