// src/features/home/Section.jsx
export default function Section({ title, icon, iconColor, count, muted, children, testId }) {
  return (
    <section
      data-testid={testId || 'section'}
      style={{ marginBottom: 24 }}
    >
      <div style={{
        fontSize: 12,
        fontWeight: 500,
        color: muted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <i className={`ti ${icon}`} style={{ color: iconColor || 'inherit' }} />
        {title}
        {count != null && (
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
            ({count})
          </span>
        )}
      </div>
      {children}
    </section>
  )
}