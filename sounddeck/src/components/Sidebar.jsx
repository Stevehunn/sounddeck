import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../i18n'

// IDs des éléments qui sont toujours des actions
const ACTION_IDS = ['loop', 'shortcuts', 'presentation']

export default function Sidebar({
  profiles,
  currentProfileId,
  currentPage,
  onSwitchProfile,
  onChangePage,
  onCreateProfile,
  onToggleLoop,
  loopEnabled,
  volume,
  onVolumeChange,
  onStopAll,
  onPresentation,
  lang,
  addToast,
  onReorderProfiles,
  sidebarConfig,
  sidebarEditMode,
  sidebarVersion = 0,
}) {

  const [newProfileName, setNewProfileName] = useState('')
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)
  const tr = useTranslation(lang)

  const [draggedProfileId, setDraggedProfileId] = useState(null)
  const [dragOverProfileId, setDragOverProfileId] = useState(null)

  // ─── Raccourcis ──────────────────────────────────────────────────────────────
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

  // ─── Debug ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('🔄 Sidebar re-rendue avec version:', sidebarVersion)
    console.log('📋 Sidebar config:', sidebarConfig)
    console.log('📋 Profils disponibles:', profiles.map(p => p.id))
    
    if (sidebarConfig?.items) {
      const groups = {}
      sidebarConfig.items.forEach(item => {
        const key = item.pinned ? 'pinned' : item.group
        if (!groups[key]) groups[key] = []
        groups[key].push(item.id)
      })
      console.log('📊 Groupes dans la config:', groups)
    }
  }, [sidebarVersion, sidebarConfig, profiles])

  // ─── Profils ──────────────────────────────────────────────────────────────────
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

  // ─── Drag & Drop des profils ──────────────────────────────────────────────
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

  // ─── CONFIGURATION DE LA SIDEBAR ────────────────────────────────────────────

  const visibleItems = useMemo(() => {
    console.log('🔄 Recalcul de visibleItems avec config:', sidebarConfig?.mode)
    
    if (!sidebarConfig || !sidebarConfig.items) {
      return { pinned: [], groups: {} }
    }

    const visible = sidebarConfig.items.filter(item => item.visible !== false)

    const pinned = visible.filter(item => item.pinned === true)
    const others = visible.filter(item => item.pinned !== true)

    const groups = {}
    others.forEach(item => {
      const groupKey = item.group || 'other'
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(item)
    })

    console.log('📊 visibleItems calculé:', { 
      pinned: pinned.length, 
      groups: Object.keys(groups),
      actions: groups.actions?.length || 0
    })

    return { pinned, groups }
  }, [sidebarConfig])

  const isItemActive = (itemId) => {
    if (itemId === 'home') return currentPage === 'home'
    if (itemId === 'discover') return currentPage === 'discover'
    if (itemId === 'editor') return currentPage === 'editor'
    if (itemId === 'sequencer') return currentPage === 'sequencer'
    if (itemId === 'youtube') return currentPage === 'youtube'
    if (itemId === 'guide') return currentPage === 'guide'
    if (itemId === 'options') return currentPage === 'options'
    if (itemId === 'library') return currentPage === 'library'
    if (itemId === 'mixer') return currentPage === 'mixer'
    if (itemId === 'stats') return currentPage === 'stats'
    return false
  }

  const handleNavClick = (itemId) => {
    if (itemId === 'home') onChangePage('home')
    else if (itemId === 'discover') onChangePage('discover')
    else if (itemId === 'editor') onChangePage('editor')
    else if (itemId === 'sequencer') onChangePage('sequencer')
    else if (itemId === 'youtube') onChangePage('youtube')
    else if (itemId === 'guide') onChangePage('guide')
    else if (itemId === 'options') onChangePage('options')
    else if (itemId === 'library') onChangePage('library')
    else if (itemId === 'mixer') onChangePage('mixer')
    else if (itemId === 'stats') onChangePage('stats')
  }

  // ✅ Rendre un élément de navigation standard
  const renderNavItem = (item) => {
    const isAction = ACTION_IDS.includes(item.id)
    return (
      <SidebarItem
        key={item.id}
        icon={item.icon}
        label={item.label}
        active={isItemActive(item.id)}
        onClick={() => handleNavClick(item.id)}
        isAction={isAction}
      />
    )
  }

  // ✅ Rendre un profil individuel
  const renderProfileItem = (profile, showDragHandle = false) => {
    const isDragging = draggedProfileId === profile.id
    const isDragOver = dragOverProfileId === profile.id && !isDragging

    if (profile.id === 'all') {
      return (
        <SidebarItem
          key={profile.id}
          icon="ti-stack"
          label={tr('allSounds')}
          active={currentProfileId === profile.id && currentPage === 'home'}
          dot={currentProfileId === profile.id}
          onClick={() => { onSwitchProfile(profile.id); onChangePage('home') }}
        />
      )
    }

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
          showDragHandle={showDragHandle}
          isProfile={true}
        />
      </div>
    )
  }

  // ✅ Rendre un élément d'action
  const renderActionItem = (item) => {
    console.log('🎯 renderActionItem appelé pour:', item.id, 'groupe:', item.group)
    
    if (item.id === 'loop') {
      return (
        <button key={item.id} onClick={onToggleLoop} style={{
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
          cursor: 'pointer',
          transition: 'all 0.15s'
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
      )
    }
    if (item.id === 'shortcuts') {
      return (
        <button key={item.id} onClick={handleToggleShortcuts} style={{
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
      )
    }
    if (item.id === 'presentation') {
      return (
        <button key={item.id} onClick={onPresentation} style={{
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
        }}>
          <i className="ti ti-layout-grid" style={{ fontSize: 15 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>{tr('presentation')}</span>
          <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
        </button>
      )
    }
    return null
  }

  // ─── RENDU ──────────────────────────────────────────────────────────────────

  const sectionOrder = sidebarConfig?.sectionOrder || ['pinned', 'profiles', 'navigation', 'actions', 'footer']
  
  // S'assurer que 'footer' est toujours en dernier
  let orderedSections = [...sectionOrder]
  const footerIdx = orderedSections.indexOf('footer')
  if (footerIdx !== -1 && footerIdx < orderedSections.length - 1) {
    const [footer] = orderedSections.splice(footerIdx, 1)
    orderedSections.push(footer)
  }
  // S'assurer que 'pinned' est toujours en premier
  const pinnedIdx = orderedSections.indexOf('pinned')
  if (pinnedIdx > 0) {
    const [pinned] = orderedSections.splice(pinnedIdx, 1)
    orderedSections.unshift(pinned)
  }

  // ✅ Récupérer les sections fixes (celles que l'utilisateur a choisies)
  const userFixedSections = sidebarConfig?.fixedSections || []

  // Filtrer les sections qui ont du contenu
  const sectionsWithContent = orderedSections.filter(section => {
    if (section === 'pinned') {
      return visibleItems.pinned.length > 0
    }
    return visibleItems.groups?.[section]?.length > 0
  })

  // Séparer les sections avec contenu
  const footerSection = 'footer'

  // ✅ Garder l'ordre original des sections fixes (selon sectionOrder)
  const fixedSectionsList = userFixedSections.filter(s => 
    s !== 'footer' && sectionsWithContent.includes(s)
  )

  // ✅ Limiter à 2 sections fixes maximum et conserver l'ordre
  const maxFixedSections = 2
  const limitedFixedSections = fixedSectionsList.slice(0, maxFixedSections)

  // ✅ Les sections scrollables = toutes les sections avec contenu SAUF footer ET SAUF les sections fixes
  const scrollableSections = sectionsWithContent.filter(s => 
    s !== footerSection && !limitedFixedSections.includes(s)
  )

  console.log('📋 Sections scrollables:', scrollableSections)
  console.log('📋 Sections fixes:', limitedFixedSections)
  console.log('📋 Footer:', footerSection)

  // ✅ Fonction pour rendre une section générique (navigation, footer, etc.)
  const renderGenericSection = (sectionKey, title) => {
    const items = visibleItems.groups[sectionKey] || []
    if (items.length === 0) return null

    const nonActionItems = items.filter(item => !ACTION_IDS.includes(item.id))
    if (nonActionItems.length === 0) return null

    return (
      <div key={sectionKey}>
        <div style={{ padding: '8px 12px 4px', marginTop: 4 }}>
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 500
          }}>
            {title}
          </div>
        </div>
        {nonActionItems.map(item => renderNavItem(item))}
      </div>
    )
  }

  // ✅ Fonction pour vérifier si un profil est épinglé
  const isProfilePinned = (profileId) => {
    return sidebarConfig?.items?.some(i => 
      i.id === `profile-${profileId}` && i.pinned === true
    ) || false
  }

  // ✅ Rendu d'une section
  const renderSection = (sectionKey) => {
    if (sectionKey === 'pinned') {
      return (
        <div key="pinned">
          <div style={{ padding: '8px 12px 4px' }}>
            <div style={{
              fontSize: 11,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <i className="ti ti-pinned" style={{ fontSize: 12 }} /> {tr('pinned')}
            </div>
          </div>
          {visibleItems.pinned.map(item => {
            if (item.id.startsWith('profile-')) {
              const profileId = item.id.replace('profile-', '')
              const profile = profiles.find(p => p.id === profileId)
              if (profile) return renderProfileItem(profile, true)
              return null
            }
            if (ACTION_IDS.includes(item.id)) {
              return renderActionItem(item)
            }
            return renderNavItem(item)
          })}
        </div>
      )
    }

    if (sectionKey === 'profiles') {
      const nonPinnedProfiles = profiles.filter(p => 
        p.id !== 'all' && !isProfilePinned(p.id)
      )
      const allPinned = isProfilePinned('all')

      return (
        <div key="profiles">
          <div style={{ padding: '8px 12px 4px', marginTop: 4 }}>
            <div style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 500
            }}>
              {tr('profiles')}
            </div>
          </div>
          {!allPinned && renderProfileItem(profiles.find(p => p.id === 'all'))}
          {nonPinnedProfiles.map(profile => renderProfileItem(profile, true))}
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
                style={{ fontSize: 12, padding: '5px 8px', flex: 1 }}
              />
              <button className="btn-primary btn-sm" onClick={handleCreateProfile}>
                <i className="ti ti-check" />
              </button>
              <button className="btn-secondary btn-sm" onClick={() => setShowNewProfile(false)}>
                <i className="ti ti-x" />
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
        </div>
      )
    }

    if (sectionKey === 'navigation') {
      return renderGenericSection('navigation', tr('navigation'))
    }

    if (sectionKey === 'actions') {
      const items = visibleItems.groups.actions || []
      const nonPinnedActions = items.filter(item => {
        const isPinned = sidebarConfig?.items?.find(i => i.id === item.id && i.pinned)
        return !isPinned
      })
      const allActionItems = nonPinnedActions.filter(item => ACTION_IDS.includes(item.id))
      
      if (allActionItems.length === 0) return null
      
      return (
        <div key="actions">
          <div style={{ padding: '8px 12px 4px', marginTop: 4 }}>
            <div style={{
              fontSize: 11,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 500
            }}>
              ⚡ Actions
            </div>
          </div>
          <div style={{ margin: '0 8px' }}>
            {allActionItems.map(item => renderActionItem(item))}
          </div>
        </div>
      )
    }

    return null
  }

  // ✅ Rendu du footer (toujours en bas)
  const renderFooter = () => {
    const footerItems = visibleItems.groups.footer || []
    if (footerItems.length === 0) return null
    
    return (
      <div style={{ 
        flexShrink: 0,
        borderTop: '1px solid var(--border)',
        padding: '4px 0 8px',
        background: 'var(--bg-secondary)'
      }}>
        {footerItems.map(item => renderNavItem(item))}
      </div>
    )
  }

  // ✅ Rendu des sections fixes (au-dessus du footer) - DANS L'ORDRE ORIGINAL
  const renderFixedSections = () => {
    if (limitedFixedSections.length === 0) return null
    
    // ✅ Trier les sections fixes selon l'ordre original
    const sortedFixedSections = [...limitedFixedSections].sort((a, b) => {
      return sectionsWithContent.indexOf(a) - sectionsWithContent.indexOf(b)
    })
    
    return (
      <div style={{ flexShrink: 0 }}>
        {sortedFixedSections.map((sectionKey, index) => {
          const isLast = index === sortedFixedSections.length - 1
          return (
            <div key={`fixed-${sectionKey}`} style={{
              borderBottom: isLast ? '1px solid var(--border)' : 'none',
              paddingBottom: isLast ? 4 : 0
            }}>
              {renderSection(sectionKey)}
            </div>
          )
        })}
      </div>
    )
  }

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
      {/* Logo - toujours en haut */}
      <div style={{
        padding: '16px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <i className="ti ti-speakerphone" style={{ fontSize: 22, color: 'var(--accent)' }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>SoundDeck</span>
      </div>

      {/* Volume maître - toujours visible */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
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
        }}>
          <i className="ti ti-player-stop-filled" /> {tr('stopAll')}
        </button>
      </div>

      {/* ✅ Contenu scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {scrollableSections.map(sectionKey => renderSection(sectionKey))}
      </div>

      {/* ✅ Sections fixes (au-dessus du footer) - DANS L'ORDRE ORIGINAL */}
      {renderFixedSections()}

      {/* ✅ Footer - toujours en bas */}
      {renderFooter()}
    </aside>
  )
}

// ─── COMPOSANT SidebarItem ──────────────────────────────────────────────────

function SidebarItem({ icon, label, active, dot, muted, onClick, showDragHandle = false, isAction = false, isProfile = false }) {
  const isActive = active || false
  
  return (
    <button
      onClick={onClick}
      className={`sidebar-item ${isActive ? 'active' : ''} ${muted ? 'muted' : ''}`}
      style={{
        cursor: showDragHandle ? 'grab' : 'pointer',
        color: isAction && !isActive ? 'var(--accent)' : undefined,
        fontWeight: isAction && !isActive ? 500 : undefined,
      }}
      onMouseEnter={e => {
        if (!isActive && !muted) {
          e.currentTarget.style.background = 'var(--bg-hover)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive && !muted) {
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
      {isAction && !isActive && !isProfile && (
        <span style={{ fontSize: 9, color: 'var(--accent)', opacity: 0.6 }}>⚡</span>
      )}
    </button>
  )
}