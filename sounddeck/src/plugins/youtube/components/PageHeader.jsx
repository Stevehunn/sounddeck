// src/plugins/youtube/components/PageHeader.jsx
import React from 'react'

export default function PageHeader({ title, sub, onBack }) {
  return (
    <div style={{
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0,
    }}>
      {onBack && (
        <button
          className="btn-ghost"
          onClick={onBack}
          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
        >
          <i className="ti ti-arrow-left" />
        </button>
      )}
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
      </div>
    </div>
  )
}