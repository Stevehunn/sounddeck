import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n'

export default function Sidebar({ 
  profiles, 
  currentProfileId, 
  currentPage, 
  onSwitchProfile,
  onChangePage, 
  onCreateProfile, 
  onToggleLoop, 
  loopEnabled, 
  addToast,
  volume, 
  onVolumeChange, 
  onStopAll, 
  onPresentation, 
  lang,
  onReorderProfiles
}) {

  const [newProfileName, setNewProfileName] = useState('')
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const tr = useTranslation(lang)
  
  const [draggedProfileId, setDraggedProfileId] = useState(null)
  const [dragOverProfileId, setDragOverProfileId] = useState(null)

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

  const handleProfileDragStart = (e, profileId) => {
    if (profileId === 'all') {
      e.preventDefault()
      return
    }
    setDraggedProfileId(profileId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', profileId)
    setTimeout(() => {
      if (e.target) {
        e.target.style.opacity = '0.4'
      }
    }, 0)
  }

  const handleProfileDragEnd = (e) => {
    if (e.target) {
      e.target.style.opacity = '1'
    }
    setDraggedProfileId(null)
    setDragOverProfileId(null)
  }

  const handleProfileDragOver = (e, profileId) => {
    e.preventDefault()
    if (profileId === 'all') return
    setDragOverProfileId(profileId)
  }

  const handleProfileDragLeave = () => {
    setDragOverProfileId(null)
  }

  const handleProfileDrop = async (e, targetProfileId) => {
    e.preventDefault()
    if (targetProfileId === 'all') return
    
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetProfileId) {
      setDraggedProfileId(null)
      setDragOverProfileId(null)
      return
    }

    const userProfiles = profiles.filter(p => p.id !== 'all')
    const startIndex = userProfiles.findIndex(p => p.id === sourceId)
    const endIndex = userProfiles.findIndex(p => p.id === targetProfileId)
    
    if (startIndex === -1 || endIndex === -1) {
      setDraggedProfileId(null)
      setDragOverProfileId(null)
      return
    }

    const success = await onReorderProfiles(startIndex, endIndex)
    if (success) {
      addToast('Profil déplacé', 'success')
    }
    
    setDraggedProfileId(null)
    setDragOverProfileId(null)
  }

  const userProfiles = profiles.filter(p => p.id !== 'all')

  return (
    <aside style={{
      width: 200,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh'
    }}>
      {/* Logo */}
      <div style={{
        padding: '16px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid var(--border)'
      }}>
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
          width: '100%',
          marginTop: 8,
          padding: '5px 0',
          background: 'rgba(224,82,82,0.1)',
          border: '1px solid rgba(224,82,82,0.3)',
          borderRadius: 6,
          color: 'var(--danger)',
          fontSize: 11,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          fontWeight: 500,
          transition: 'all 0.15s'
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(224,82,82,0.1)'}>
          <i className="ti ti-player-stop-filled" /> {tr('stopAll')}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* Profils */}
        <div style={{ padding: '8px 12px 4px' }}>
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 500
          }}>
            {tr('profiles')}
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            marginTop: 2,
            opacity: 0.6
          }}>
            <i className="ti ti-grip-vertical" style={{ fontSize: 10 }} /> {tr('dragToReorder')}
          </div>
        </div>

        {/* Profil "Tous les sons" */}
        {profiles.filter(p => p.id === 'all').map(profile => (
          <SidebarItem
            key={profile.id}
            icon="ti-stack"
            label={tr('allSounds')}
            active={currentProfileId === profile.id && currentPage === 'home'}
            dot={currentProfileId === profile.id}
            onClick={() => { onSwitchProfile(profile.id); onChangePage('home') }}
          />
        ))}

        {/* Profils utilisateur */}
        {userProfiles.map((profile) => {
          const isDragging = draggedProfileId === profile.id
          const isDragOver = dragOverProfileId === profile.id && !isDragging
          
          return (
            <div
              key={profile.id}
              draggable={true}
              onDragStart={(e) => handleProfileDragStart(e, profile.id)}
              onDragEnd={handleProfileDragEnd}
              onDragOver={(e) => handleProfileDragOver(e, profile.id)}
              onDragLeave={handleProfileDragLeave}
              onDrop={(e) => handleProfileDrop(e, profile.id)}
              style={{
                opacity: isDragging ? 0.3 : 1,
                transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.15s, opacity 0.15s',
                position: 'relative',
                zIndex: isDragging ? 10 : 1,
                cursor: 'grab'
              }}
            >
              {isDragOver && (
                <div style={{
                  position: 'absolute',
                  top: -2,
                  left: 4,
                  right: 4,
                  height: 2,
                  background: 'var(--accent)',
                  borderRadius: 1,
                  pointerEvents: 'none',
                  zIndex: 5,
                  animation: 'fadeIn 0.15s ease'
                }} />
              )}
              <SidebarItem
                icon="ti-user"
                label={profile.name}
                active={currentProfileId === profile.id && currentPage === 'home'}
                dot={currentProfileId === profile.id}
                onClick={() => { onSwitchProfile(profile.id); onChangePage('home') }}
                showDragHandle={true}
              />
            </div>
          )
        })}

        {showNewProfile ? (
          <div style={{ padding: '4px 12px', display: 'flex', gap: 4 }}>
            <input
              autoFocus
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateProfile()
                if (e.key === 'Escape') setShowNewProfile(false)
              }}
              placeholder={tr('newProfile')}
              style={{ fontSize: 12, padding: '5px 8px' }}
            />
            <button className="btn-primary btn-sm" onClick={handleCreateProfile}>
              <i className="ti ti-check" />
            </button>
          </div>
        ) : (
          <SidebarItem
            icon="ti-plus"
            label={tr('newProfile')}
            muted
            onClick={() => setShowNewProfile(true)}
          />
        )}

        {/* Navigation */}
        <div style={{
          padding: '12px 12px 4px',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 500,
          marginTop: 4
        }}>
          {tr('navigation')}
        </div>

        <SidebarItem icon="ti-home" label={tr('mySounds')} active={currentPage === 'home'} onClick={() => onChangePage('home')} />
        <SidebarItem icon="ti-compass" label={tr('discover')} active={currentPage === 'discover'} onClick={() => onChangePage('discover')} />
        <SidebarItem icon="ti-cut" label={tr('editor')} active={currentPage === 'editor'} onClick={() => onChangePage('editor')} />
        <SidebarItem icon="ti-playlist" label={tr('sequencer')} active={currentPage === 'sequencer'} onClick={() => onChangePage('sequencer')} />
        <SidebarItem icon="ti-brand-youtube" label={tr('youtube')} active={currentPage === 'youtube'} onClick={() => onChangePage('youtube')} />

        {/* Loop */}
        <div style={{ margin: '6px 8px 0' }}>
          <button onClick={onToggleLoop} style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 8px',
            borderRadius: 8,
            background: loopEnabled ? 'rgba(29,158,117,0.15)' : 'var(--bg-tertiary)',
            border: `1px solid ${loopEnabled ? 'var(--success)' : 'var(--border)'}`,
            color: loopEnabled ? 'var(--success)' : 'var(--text-tertiary)',
            fontSize: 12,
            fontWeight: loopEnabled ? 600 : 400,
            cursor: 'pointer'
          }}>
            <i className="ti ti-repeat" style={{ fontSize: 15 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{tr('loop')}</span>
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              background: loopEnabled ? 'var(--success)' : 'var(--border)',
              color: loopEnabled ? 'white' : 'var(--text-tertiary)'
            }}>
              {loopEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Toggle Raccourcis */}
        <div style={{ margin: '6px 8px 0' }}>
          <button onClick={handleToggleShortcuts} style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 8px',
            borderRadius: 8,
            background: shortcutsEnabled ? 'rgba(124,111,247,0.15)' : 'rgba(224,82,82,0.15)',
            border: `1px solid ${shortcutsEnabled ? 'var(--accent)' : 'var(--danger)'}`,
            color: shortcutsEnabled ? 'var(--accent)' : 'var(--danger)',
            fontSize: 12,
            fontWeight: shortcutsEnabled ? 600 : 400,
            cursor: 'pointer',
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
            <span style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              background: shortcutsEnabled ? 'var(--accent)' : 'var(--danger)',
              color: 'white'
            }}>
              {shortcutsEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* Présentation */}
        <div style={{ margin: '6px 8px 0' }}>
          <button onClick={onPresentation} style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 8px',
            borderRadius: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}>
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

function SidebarItem({ icon, label, active, dot, muted, onClick, showDragHandle = false }) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-item ${active ? 'active' : ''} ${muted ? 'muted' : ''}`}
      style={{
        cursor: showDragHandle ? 'grab' : 'pointer'
      }}
      onMouseEnter={e => {
        if (!active && !muted) {
          e.currentTarget.style.background = 'var(--bg-hover)'
        }
      }}
      onMouseLeave={e => {
        if (!active && !muted) {
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {showDragHandle && (
        <i className="ti ti-grip-vertical" style={{ fontSize: 12, color: 'var(--text-tertiary)', opacity: 0.4 }} />
      )}
      {!showDragHandle && <i className={`ti ${icon}`} style={{ fontSize: 16 }} />}
      <span className="label">{label}</span>
      {dot && <span className="dot" />}
    </button>
  )
}