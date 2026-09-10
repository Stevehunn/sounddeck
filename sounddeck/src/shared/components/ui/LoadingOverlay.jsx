// src/shared/components/ui/LoadingOverlay.jsx
import { createPortal } from 'react-dom'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function LoadingOverlay({ message, visible }) {
  const { t } = useLanguage()

  if (!visible) return null

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '2px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px 40px',
        maxWidth: 400,
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <i className="ti ti-loader" style={{
          fontSize: 48,
          color: 'var(--accent)',
          animation: 'spin 1.5s linear infinite',
          display: 'block',
          marginBottom: 16
        }} />
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 8
        }}>
          {message || t('loading')}
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--text-secondary)'
        }}>
          {t('loadingSubtitle')}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}