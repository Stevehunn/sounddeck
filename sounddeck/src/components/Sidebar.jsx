import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n'

export default function Sidebar({ profiles, currentProfileId, currentPage, onSwitchProfile,
  onChangePage, onCreateProfile, onToggleLoop, loopEnabled, addToast,
  volume, onVolumeChange, onStopAll, onPresentation, lang }) {

  const [newProfileName, setNewProfileName] = useState('')
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const tr = useTranslation(lang)

  useEffect(() => {
    window.electronAPI.getGlobalShortcutsState().then(enabled => {
      setShortcutsEnabled(enabled)
    }).catch(() => {})
    
    window.electronAPI.onShortcutsToggle((enabled) => {
      setShortcutsEnabled(enabled)
    })
    
    return () => {
      window.electronAPI.removeAllListeners('shortcuts-toggle')
    }
  }, [])

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return
    await onCreateProfile(newProfileName.trim())
    setNewProfileName('')
    setShowNewProfile(false)
    addToast(`Profil "${newProfileName.trim()}" créé`, 'success')
  }

  const handleToggleShortcuts = async () => {
    try {
      const newState = await window.electronAPI.toggleGlobalShortcuts()
      setShortcutsEnabled(newState)
      addToast(newState ? 'Raccourcis activés' : 'Raccourcis désactivés', 'info')
    } catch (e) {
      console.error('Erreur toggle shortcuts:', e)
    }
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

      {/* Volume maître */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className={`ti ${volume === 0 ? 'ti-volume-off' : volume < 50 ? 'ti-volume-2' : 'ti-volume'}`}
              style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{tr('volume')}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{volume}%</span>
        </div>
        <input type="range" min="0" max="100" value={volume}
          onChange={e => onVolumeChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
        <button onClick={onStopAll} style={{
          width: '100%', marginTop: 8, padding: '5px 0',
          background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)',
          borderRadius: 6, color: 'var(--danger)', fontSize: 11,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 5, fontWeight: 500, transition: 'all 0.15s'
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,82,82,0.1)'}>
          <i className="ti ti-player-stop-filled" /> {tr('stopAll')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* Profils */}
        <div style={{ padding: '8px 12px 4px', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
          {tr('profiles')}
        </div>

        {profiles.map(profile => (
          <SidebarItem key={profile.id}
            icon={profile.isDefault ? 'ti-stack' : 'ti-user'}
            label={profile.id === 'all' ? tr('allSounds') : profile.name}
            active={currentProfileId === profile.id && currentPage === 'home'}
            dot={currentProfileId === profile.id}
            onClick={() => { onSwitchProfile(profile.id); onChangePage('home') }}
          />
        ))}

        {showNewProfile ? (
          <div style={{ padding: '4px 12px', display: 'flex', gap: 4 }}>
            <input autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateProfile(); if (e.key === 'Escape') setShowNewProfile(false) }}
              placeholder={tr('newProfile')} style={{ fontSize: 12, padding: '5px 8px' }} />
            <button className="btn-primary" style={{ padding: '5px 8px' }} onClick={handleCreateProfile}>
              <i className="ti ti-check" />
            </button>
          </div>
        ) : (
          <SidebarItem icon="ti-plus" label={tr('newProfile')} muted onClick={() => setShowNewProfile(true)} />
        )}

        {/* Navigation */}
        <div style={{ padding: '12px 12px 4px', fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginTop: 4 }}>
          {tr('navigation')}
        </div>

        <SidebarItem icon="ti-home" label={tr('mySounds')} active={currentPage === 'home'} onClick={() => onChangePage('home')} />
        <SidebarItem icon="ti-compass" label={tr('discover')} active={currentPage === 'discover'} onClick={() => onChangePage('discover')} />
        <SidebarItem icon="ti-cut" label={tr('editor')} active={currentPage === 'editor'} onClick={() => onChangePage('editor')} />
        <SidebarItem icon="ti-playlist" label={tr('sequencer')} active={currentPage === 'sequencer'} onClick={() => onChangePage('sequencer')} />
        <SidebarItem icon="ti-brand-youtube" label={tr('youtube')} active={currentPage === 'youtube'} onClick={() => onChangePage('youtube')} />

        {/* Loop - TRADUIT */}
        <div style={{ margin: '6px 8px 0' }}>
          <button onClick={onToggleLoop} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 8px', borderRadius: 8,
            background: loopEnabled ? 'rgba(29,158,117,0.15)' : 'var(--bg-tertiary)',
            border: `1px solid ${loopEnabled ? 'var(--success)' : 'var(--border)'}`,
            color: loopEnabled ? 'var(--success)' : 'var(--text-tertiary)',
            fontSize: 12, fontWeight: loopEnabled ? 600 : 400, cursor: 'pointer'
          }}>
            <i className="ti ti-repeat" style={{ fontSize: 15 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{tr('loop')}</span>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: loopEnabled ? 'var(--success)' : 'var(--border)', color: loopEnabled ? 'white' : 'var(--text-tertiary)' }}>
              {loopEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Toggle Raccourcis - TRADUIT */}
        <div style={{ margin: '6px 8px 0' }}>
          <button onClick={handleToggleShortcuts} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 8px', borderRadius: 8,
            background: shortcutsEnabled ? 'rgba(124,111,247,0.15)' : 'rgba(224,82,82,0.15)',
            border: `1px solid ${shortcutsEnabled ? 'var(--accent)' : 'var(--danger)'}`,
            color: shortcutsEnabled ? 'var(--accent)' : 'var(--danger)',
            fontSize: 12, fontWeight: shortcutsEnabled ? 600 : 400, cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.02)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
          }}>
            <i className={`ti ${shortcutsEnabled ? 'ti-keyboard' : 'ti-keyboard-off'}`} style={{ fontSize: 15 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{tr('shortcuts')}</span>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: shortcutsEnabled ? 'var(--accent)' : 'var(--danger)', color: 'white' }}>
              {shortcutsEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Présentation */}
        <div style={{ margin: '6px 8px 0' }}>
          <button onClick={onPresentation} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 8px', borderRadius: 8, background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)', color: 'var(--text-secondary)',
            fontSize: 12, cursor: 'pointer', transition: 'all 0.15s'
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
            <i className="ti ti-layout-grid" style={{ fontSize: 15 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{tr('presentation')}</span>
            <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>

      {/* Options en bas */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '4px 0' }}>
        <SidebarItem icon="ti-book" label={tr('guide')} active={currentPage === 'guide'} onClick={() => onChangePage('guide')} />
        <SidebarItem icon="ti-settings" label={tr('options')} active={currentPage === 'options'} onClick={() => onChangePage('options')} />
      </div>
    </aside>
  )
}

function SidebarItem({ icon, label, active, dot, muted, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 12px', background: active ? 'var(--accent-light)' : 'transparent',
      color: active ? 'var(--accent)' : muted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
      borderTop: 'none', borderRight: 'none', borderBottom: 'none',
      borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
      fontSize: 13, fontWeight: active ? 500 : 400, textAlign: 'left',
      cursor: 'pointer',
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {dot && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />}
    </button>
  )
}