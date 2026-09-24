// src/features/options/CollapsibleSection.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { t } = useLanguage()

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      marginTop: 6,
      background: 'var(--bg-secondary)',
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '10px 14px',
          background: 'var(--bg-tertiary)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          gap: 8,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`ti ${icon}`} style={{ color: 'var(--accent)' }} />
          {title}
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>
            {isOpen ? '▼' : '▶'}
          </span>
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 400 }}>
          {isOpen ? t('collapseHide') : t('collapseShow')}
        </span>
      </button>
      {isOpen && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {children}
        </div>
      )}
    </div>
  )
}