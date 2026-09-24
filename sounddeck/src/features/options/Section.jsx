// src/features/options/Section.jsx
import { forwardRef } from 'react'

const Section = forwardRef(({ title, icon, children, id }, ref) => {
  return (
    <div
      ref={ref}
      data-section={id}
      style={{ marginBottom: 32, scrollMarginTop: 80 }}
    >
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--accent)',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}>
        <i className={`ti ${icon}`} />
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
})

Section.displayName = 'Section'

export default Section