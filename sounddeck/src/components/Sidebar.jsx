import { useState, useEffect, useMemo, useRef, memo } from 'react'
import { useLanguage } from '../context/LanguageContext'

// IDs des éléments qui sont toujours des actions
const ACTION_IDS = ['loop', 'shortcuts', 'presentation']

// Map des labels par défaut pour les éléments (traductions)
const getDefaultLabels = (t) => ({
  home: t('mySounds'),
  discover: t('discover'),
  trimmer: t('trimmer'),
  editor: t('editor'),
  sequencer: t('sequencer'),
  youtube: t('youtube'),
  loop: t('loop'),
  shortcuts: t('shortcuts'),
  presentation: t('presentation'),
  guide: t('guide'),
  options: t('options'),
  stats: t('stats'),
})

// Map des groupes par défaut pour les éléments
const DEFAULT_GROUPS = {
  home: 'navigation',
  discover: 'navigation',
  trimmer: 'navigation',
  editor: 'navigation',
  sequencer: 'navigation',
  youtube: 'navigation',
  loop: 'actions',
  shortcuts: 'actions',
  presentation: 'actions',
  guide: 'footer',
  options: 'footer',
  stats: 'navigation',
}

// Map des icônes par défaut pour les éléments
const DEFAULT_ICONS = {
  home: 'ti-home',
  discover: 'ti-compass',
  trimmer: 'ti-cut',
  editor: 'ti-wand',
  sequencer: 'ti-playlist',
  youtube: 'ti-brand-youtube',
  loop: 'ti-repeat',
  shortcuts: 'ti-keyboard',
  presentation: 'ti-layout-grid',
  guide: 'ti-book',
  options: 'ti-settings',
  stats: 'ti-chart-bar',
}

// ─── COMPOSANT PRINCIPAL AVEC MEMO ──────────────────────────────────────────

const Sidebar = memo(function Sidebar({
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
  addToast,
  onReorderProfiles,
  sidebarConfig,
  sidebarEditMode,
  sidebarVersion = 0,
  pluginPages = [],
  isPluginPage = () => false,
}) {
  const { t } = useLanguage()
  const [newProfileName, setNewProfileName] = useState('')
  const [showNewProfile, setShowNewProfile] = useState(false)
  const [shortcutsEnabled, setShortcutsEnabled] = useState(true)

  const [draggedProfileId, setDraggedProfileId] = useState(null)
  const [dragOverProfileId, setDragOverProfileId] = useState(null)

  // ─── REFS POUR STOCKER LES VALEURS STABLES ──────────────────────────────
  const stableVisibleItemsRef = useRef({ pinned: [], groups: {} })
  const [visibleItems, setVisibleItems] = useState({ pinned: [], groups: {} })

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

  // ─── CALCUL DES visibleItems UNIQUEMENT QUAND LES DONNÉES CHANGENT VRAIMENT ─
  useEffect(() => {
    if (!sidebarConfig || !sidebarConfig.items) {
      const empty = { pinned: [], groups: {} }
      if (JSON.stringify(stableVisibleItemsRef.current) !== JSON.stringify(empty)) {
        stableVisibleItemsRef.current = empty
        setVisibleItems(empty)
      }
      return
    }

    const defaultLabels = getDefaultLabels(t)

    const updatedItems = sidebarConfig.items.map(item => ({
      ...item,
      label: getItemLabel(item, defaultLabels),
      icon: getItemIcon(item),
      group: getItemGroup(item),
    }))

    const visible = updatedItems.filter(item => item.visible !== false)
    const pinned = visible.filter(item => item.pinned === true)
    const others = visible.filter(item => item.pinned !== true)

    const groups = {}
    others.forEach(item => {
      const groupKey = item.group || 'other'
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(item)
    })

    const newVisibleItems = { pinned, groups }
    const currentJson = JSON.stringify(stableVisibleItemsRef.current)
    const newJson = JSON.stringify(newVisibleItems)

    if (currentJson !== newJson) {
      stableVisibleItemsRef.current = newVisibleItems
      setVisibleItems(newVisibleItems)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarConfig, t, profiles, pluginPages])

  // ─── Fonctions utilitaires ──────────────────────────────────────────────────
  const getItemLabel = (item, defaultLabels) => {
    if (item.id && item.id.startsWith('profile-')) {
      const profileId = item.id.replace('profile-', '')
      const profile = profiles.find(p => p.id === profileId)
      return profile?.name || item.label || profileId
    }
    
    if (item.id && defaultLabels[item.id]) {
      return defaultLabels[item.id]
    }
    
    return item.label || item.id
  }

  const getItemIcon = (item) => {
    if (item.id && DEFAULT_ICONS[item.id]) {
      return DEFAULT_ICONS[item.id]
    }
    return item.icon || 'ti-circle'
  }

  const getItemGroup = (item) => {
    if (item.id && DEFAULT_GROUPS[item.id]) {
      return DEFAULT_GROUPS[item.id]
    }
    return item.group || 'other'
  }

  // ─── Profils ──────────────────────────────────────────────────────────────────
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return
    await onCreateProfile(newProfileName.trim())
    setNewProfileName('')
    setShowNewProfile(false)
    addToast(`${t('newProfile')} "${newProfileName.trim()}" ${t('created')}`, 'success')
  }

  const handleToggleShortcuts = async () => {
    try {
      const newState = await window.electronAPI.toggleGlobalShortcuts()
      setShortcutsEnabled(newState)
      addToast(newState ? t('shortcutsActivated') : t('shortcutsDeactivated'), 'info')
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
      addToast(t('profileMoved'), 'success')
    }

    setDraggedProfileId(null)
    setDragOverProfileId(null)
  }

  // ─── Pages ──────────────────────────────────────────────────────────────────
  const allPages = useMemo(() => {
    const corePages = [
      { id: 'home', label: t('mySounds'), icon: 'ti-home', group: 'navigation', isCore: true },
      { id: 'library', label: t('library'), icon: 'ti-library', isCore: true, group: 'navigation' },
      { id: 'discover', label: t('discover'), icon: 'ti-compass', group: 'navigation', isCore: true },
      { id: 'trimmer', label: t('trimmer'), icon: 'ti-cut', group: 'navigation', isCore: true },
      { id: 'editor', label: t('editor'), icon: 'ti-wand', group: 'navigation', isCore: true },
      { id: 'sequencer', label: t('sequencer'), icon: 'ti-playlist', group: 'navigation', isCore: true },
      { id: 'youtube', label: t('youtube'), icon: 'ti-brand-youtube', group: 'navigation', isCore: true },
      { id: 'stats', label: t('stats'), icon: 'ti-chart-bar', group: 'navigation', isCore: true },
      { id: 'guide', label: t('guide'), icon: 'ti-book', group: 'footer', isCore: true },
      { id: 'options', label: t('options'), icon: 'ti-settings', group: 'footer', isCore: true }
    ]

    const pluginPagesFormatted = (pluginPages || [])
      .filter(p => p.visible !== false)
      .map(p => ({
        ...p,
        isCore: false,
        isPlugin: true
      }))

    return [...corePages, ...pluginPagesFormatted]
  }, [t, pluginPages])

  const isItemActive = (itemId) => {
    if (itemId === 'home') return currentPage === 'home'
    if (itemId === 'discover') return currentPage === 'discover'
    if (itemId === 'trimmer') return currentPage === 'trimmer'
    if (itemId === 'editor') return currentPage === 'editor'
    if (itemId === 'sequencer') return currentPage === 'sequencer'
    if (itemId === 'youtube') return currentPage === 'youtube'
    if (itemId === 'guide') return currentPage === 'guide'
    if (itemId === 'options') return currentPage === 'options'
    if (itemId === 'library') return currentPage === 'library'
    if (itemId === 'mixer') return currentPage === 'mixer'
    if (itemId === 'stats') return currentPage === 'stats'
    
    if (itemId && isPluginPage(itemId)) {
      return currentPage === itemId
    }
    
    return false
  }

  const handleNavClick = (itemId) => {
    if (itemId === 'home') onChangePage('home')
    else if (itemId === 'discover') onChangePage('discover')
    else if (itemId === 'trimmer') onChangePage('trimmer')
    else if (itemId === 'editor') onChangePage('editor')
    else if (itemId === 'sequencer') onChangePage('sequencer')
    else if (itemId === 'youtube') onChangePage('youtube')
    else if (itemId === 'guide') onChangePage('guide')
    else if (itemId === 'options') onChangePage('options')
    else if (itemId === 'library') onChangePage('library')
    else if (itemId === 'mixer') onChangePage('mixer')
    else if (itemId === 'stats') onChangePage('stats')
    else {
      onChangePage(itemId)
    }
  }

  // ✅ Rendre un élément de navigation standard
  const renderNavItem = (item) => {
    const isAction = ACTION_IDS.includes(item.id)
    const isPlugin = item.isPlugin || false
    
    return (
      <SidebarItem
        key={item.id}
        icon={item.icon}
        label={item.label}
        active={isItemActive(item.id)}
        onClick={() => handleNavClick(item.id)}
        isAction={isAction}
        isPlugin={isPlugin}
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
          label={t('allSounds')}
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
          <span style={{ flex: 1, textAlign: 'left' }}>{t('loop')}</span>
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
          <span style={{ flex: 1, textAlign: 'left' }}>{t('shortcuts')}</span>
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
          <span style={{ flex: 1, textAlign: 'left' }}>{t('presentation')}</span>
          <i className="ti ti-arrow-right" style={{ fontSize: 12 }} />
        </button>
      )
    }
    return null
  }

  // ─── RENDU ──────────────────────────────────────────────────────────────────

  const sectionOrder = sidebarConfig?.sectionOrder || ['pinned', 'profiles', 'navigation', 'actions', 'footer']
  
  let orderedSections = [...sectionOrder]
  const footerIdx = orderedSections.indexOf('footer')
  if (footerIdx !== -1 && footerIdx < orderedSections.length - 1) {
    const [footer] = orderedSections.splice(footerIdx, 1)
    orderedSections.push(footer)
  }
  const pinnedIdx = orderedSections.indexOf('pinned')
  if (pinnedIdx > 0) {
    const [pinned] = orderedSections.splice(pinnedIdx, 1)
    orderedSections.unshift(pinned)
  }

  const userFixedSections = sidebarConfig?.fixedSections || []

  const sectionsWithContent = orderedSections.filter(section => {
    if (section === 'pinned') {
      return visibleItems.pinned.length > 0
    }
    return visibleItems.groups?.[section]?.length > 0
  })

  const footerSection = 'footer'

  const fixedSectionsList = userFixedSections.filter(s => 
    s !== 'footer' && sectionsWithContent.includes(s)
  )

  const maxFixedSections = 2
  const limitedFixedSections = fixedSectionsList.slice(0, maxFixedSections)

  const scrollableSections = sectionsWithContent.filter(s => 
    s !== footerSection && !limitedFixedSections.includes(s)
  )

  // ✅ Fonction pour rendre une section générique
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
              <i className="ti ti-pinned" style={{ fontSize: 12 }} /> {t('pinned')}
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
              {t('profiles')}
            </div>
          </div>
          {!allPinned && renderProfileItem(profiles.find(p => p.id === 'all'))}
          {nonPinnedProfiles.map(profile => renderProfileItem(profile, true))}
          {showNewProfile ? (
            <div style={{ 
              padding: '4px 8px', 
              display: 'flex', 
              gap: 4,
              alignItems: 'center'
            }}> 
              <input
                autoFocus
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateProfile()
                  if (e.key === 'Escape') setShowNewProfile(false)
                }}
                placeholder={t('newProfile')}
                className="input-sm"
                style={{ 
                  flex: 1,
                  minHeight: 28,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12
                }}
              />
              <button 
                className="btn-primary btn-sm"
                onClick={handleCreateProfile}
                style={{ 
                  minHeight: 28,
                  minWidth: 28,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="ti ti-check" style={{ fontSize: 14 }} />
              </button>
              <button 
                className="btn-secondary btn-sm"
                onClick={() => setShowNewProfile(false)}
                style={{ 
                  minHeight: 28,
                  minWidth: 28,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="ti ti-x" style={{ fontSize: 14 }} />
              </button>
            </div>
          ) : (
            <SidebarItem
              icon="ti-plus"
              label={t('newProfile')}
              muted
              onClick={() => setShowNewProfile(true)}
            />
          )}
        </div>
      )
    }

    if (sectionKey === 'navigation') {
      return renderGenericSection('navigation', t('navigation'))
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
              ⚡ {t('actions')}
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

  // ✅ Rendu du footer
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

  // ✅ Rendu des sections fixes
  const renderFixedSections = () => {
    if (limitedFixedSections.length === 0) return null
    
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
      {/* Logo */}
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

      {/* Volume maître */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className={`ti ${volume === 0 ? 'ti-volume-off' : volume < 50 ? 'ti-volume-2' : 'ti-volume'}`}
              style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{t('volume')}</span>
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
          <i className="ti ti-player-stop-filled" /> {t('stopAll')}
        </button>
      </div>

      {/* Contenu scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {scrollableSections.map(sectionKey => renderSection(sectionKey))}
      </div>

      {/* Sections fixes */}
      {renderFixedSections()}

      {/* Footer */}
      {renderFooter()}
    </aside>
  )
}, (prevProps, nextProps) => {
  // ✅ Comparaison personnalisée pour éviter les re-rendus inutiles
  return (
    prevProps.sidebarVersion === nextProps.sidebarVersion &&
    prevProps.currentPage === nextProps.currentPage &&
    prevProps.currentProfileId === nextProps.currentProfileId &&
    prevProps.loopEnabled === nextProps.loopEnabled &&
    prevProps.volume === nextProps.volume &&
    JSON.stringify(prevProps.profiles) === JSON.stringify(nextProps.profiles) &&
    JSON.stringify(prevProps.sidebarConfig) === JSON.stringify(nextProps.sidebarConfig) &&
    JSON.stringify(prevProps.pluginPages) === JSON.stringify(nextProps.pluginPages)
  )
})

export default Sidebar

// ─── COMPOSANT SidebarItem ──────────────────────────────────────────────────

function SidebarItem({ 
  icon, 
  label, 
  active, 
  dot, 
  muted, 
  onClick, 
  showDragHandle = false, 
  isAction = false, 
  isProfile = false,
  isPlugin = false 
}) {
  // ✅ Utiliser useLanguage pour les traductions si nécessaire
  const { t } = useLanguage()
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
      {isPlugin && !isActive && (
        <span style={{ 
          fontSize: 8, 
          color: 'var(--accent)',
          background: 'var(--accent-light)',
          padding: '1px 6px',
          borderRadius: 10,
          marginLeft: 'auto',
          opacity: 0.7
        }}>
          🔌
        </span>
      )}
      {isPlugin && isActive && (
        <span style={{ 
          fontSize: 8, 
          color: 'white',
          background: 'var(--accent)',
          padding: '1px 6px',
          borderRadius: 10,
          marginLeft: 'auto'
        }}>
          Plugin
        </span>
      )}
    </button>
  )
}