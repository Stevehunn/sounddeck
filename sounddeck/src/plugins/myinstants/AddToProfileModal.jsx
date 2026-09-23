// src/plugins/myinstants/AddToProfileModal.jsx
import React from 'react'

export default function AddToProfileModal({
  sound,
  profiles,
  selectedProfile,
  onSelectProfile,
  onClose,
  onConfirm,
  t,
}) {
  if (!sound) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <span style={{ fontSize: 22 }}>{sound.emoji || '🔊'}</span>
          {t('myinstantsAddToLibrary')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {profiles.map(p => {
            const isSelected = selectedProfile === p.id
            return (
              <label
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <input
                  type="radio"
                  name="profile"
                  value={p.id}
                  checked={isSelected}
                  onChange={() => onSelectProfile(p.id)}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: 13 }}>{p.id === 'all' ? t('allSounds') : p.name}</span>
              </label>
            )
          })}
        </div>
        <div className="modal-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary btn-lg" onClick={onClose} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
            <i className="ti ti-x" /> {t('myinstantsCancel')}
          </button>
          <button className="btn-primary btn-lg" onClick={onConfirm} style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}>
            <i className="ti ti-download" /> {t('myinstantsAdd')}
          </button>
        </div>
      </div>
    </div>
  )
}