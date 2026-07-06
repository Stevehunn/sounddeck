import { useTranslation } from '../i18n'

export default function CardSizeSelector({ value, onChange, lang = 'fr' }) {
  const tr = useTranslation(lang)
  
  const sizes = [
    { val: 'small', label: tr('cardSizeSmall'), icon: 'ti-layout-grid' },
    { val: 'medium', label: tr('cardSizeMedium'), icon: 'ti-layout-grid' },
    { val: 'large', label: tr('cardSizeLarge'), icon: 'ti-layout-grid' },
  ]
  
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {sizes.map(({ val, label, icon }) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            border: `2px solid ${value === val ? 'var(--accent)' : 'var(--border)'}`,
            background: value === val ? 'var(--accent-light)' : 'var(--bg-tertiary)',
            color: value === val ? 'var(--accent)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: value === val ? 600 : 400,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            if (value !== val) {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={e => {
            if (value !== val) {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
        >
          <i className={icon} style={{ fontSize: 14 }} />
          {label}
          {value === val && <i className="ti ti-check" style={{ fontSize: 11 }} />}
        </button>
      ))}
    </div>
  )
}