import { useState } from 'react'

export default function Sidebar({ profiles, currentProfileId, currentPage, onSwitchProfile, onChangePage, onCreateProfile, addToast }) {
  const [newProfileName, setNewProfileName] = useState('')
  const [showNewProfile, setShowNewProfile] = useState(false)

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return
    await onCreateProfile(newProfileName.trim())
    setNewProfileName('')
    setShowNewProfile(false)
    addToast(`Profil "${newProfileName.trim()}" créé`, 'success')
  }

  return (
    <aside style={{
      width: 200, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh'
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
        <i className="ti ti-speakerphone" style={{ fontSize: 22, color: 'var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>SoundDeck</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* Profils */}
        <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
          Profils
        </div>

        {profiles.map(profile => (
          <SidebarItem
            key={profile.id}
            icon={profile.isDefault ? 'ti-stack' : 'ti-user'}
            label={profile.name}
            active={currentProfileId === profile.id && currentPage === 'home'}
            dot={currentProfileId === profile.id}
            onClick={() => { onSwitchProfile(profile.id); onChangePage('home') }}
          />
        ))}

        {/* Nouveau profil */}
        {showNewProfile ? (
          <div style={{ padding: '4px 12px', display: 'flex', gap: 4 }}>
            <input
              autoFocus
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateProfile(); if (e.key === 'Escape') setShowNewProfile(false) }}
              placeholder="Nom du profil"
              style={{ fontSize: 12, padding: '5px 8px' }}
            />
            <button className="btn-primary" style={{ padding: '5px 8px' }} onClick={handleCreateProfile}>
              <i className="ti ti-check" />
            </button>
          </div>
        ) : (
          <SidebarItem
            icon="ti-plus"
            label="Nouveau profil"
            muted
            onClick={() => setShowNewProfile(true)}
          />
        )}

        {/* Navigation */}
        <div style={{ padding: '12px 12px 4px', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginTop: 4 }}>
          Navigation
        </div>

        <SidebarItem
          icon="ti-home"
          label="Mes sons"
          active={currentPage === 'home'}
          onClick={() => onChangePage('home')}
        />
        <SidebarItem
          icon="ti-compass"
          label="Découverte"
          active={currentPage === 'discover'}
          onClick={() => onChangePage('discover')}
        />
      </div>

      {/* Options en bas */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0' }}>
        <SidebarItem
          icon="ti-settings"
          label="Options"
          active={currentPage === 'options'}
          onClick={() => onChangePage('options')}
        />
      </div>
    </aside>
  )
}

function SidebarItem({ icon, label, active, dot, muted, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 12px', background: active ? 'var(--accent-light)' : 'transparent',
        color: active ? 'var(--accent)' : muted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        fontSize: 13, fontWeight: active ? 500 : 400, textAlign: 'left',
        cursor: 'pointer', border: 'none', borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {dot && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />}
    </button>
  )
}