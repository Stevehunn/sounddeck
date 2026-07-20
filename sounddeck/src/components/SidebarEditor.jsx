import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useLanguage } from '../context/LanguageContext'
import useConfirm from '../hooks/useConfirm.jsx'

// Configuration par défaut - sections ordonnées (Profils en premier)
const DEFAULT_SECTION_ORDER = ['pinned', 'profiles', 'navigation', 'actions', 'footer']

// Map des icônes par défaut pour les éléments
const DEFAULT_ICONS = {
  home: 'ti-home',
  discover: 'ti-compass',
  editor: 'ti-cut',
  sequencer: 'ti-playlist',
  youtube: 'ti-brand-youtube',
  loop: 'ti-repeat',
  shortcuts: 'ti-keyboard',
  presentation: 'ti-layout-grid',
  guide: 'ti-book',
  options: 'ti-settings',
}

// Map des groupes par défaut pour les éléments
const DEFAULT_GROUPS = {
  home: 'navigation',
  discover: 'navigation',
  editor: 'navigation',
  sequencer: 'navigation',
  youtube: 'navigation',
  loop: 'actions',
  shortcuts: 'actions',
  presentation: 'actions',
  guide: 'footer',
  options: 'footer',
}

// Map des labels par défaut pour les éléments
const DEFAULT_LABELS = {
  home: 'Mes sons',
  discover: 'Découverte',
  editor: 'Éditeur',
  sequencer: 'Séquenceur',
  youtube: 'YouTube',
  loop: 'Répétition',
  shortcuts: 'Raccourcis',
  presentation: 'Présentation',
  guide: 'Guide Discord',
  options: 'Options',
}

// IDs des éléments qui sont toujours des actions (peu importe leur groupe)
const ACTION_IDS = ['loop', 'shortcuts', 'presentation']

// ✅ Sections disponibles pour le mode fixe
const FIXABLE_SECTIONS = ['pinned', 'profiles', 'navigation', 'actions']

export default function SidebarEditor({
  config,
  onSave,
  onCancel,
  onReset,
  profiles = [],
  lang = 'fr'
}) {
  const { t, currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang })
  const [items, setItems] = useState([])
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER)
  const [fixedSections, setFixedSections] = useState([])
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [draggedGroup, setDraggedGroup] = useState(null)
  const [dragOverGroup, setDragOverGroup] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const initializingRef = useRef(false)

  const log = useCallback((...args) => {
    console.log('[SidebarEditor]', ...args)
  }, [])

  // ─── INITIALISATION ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (initializingRef.current || !config || isInitialized) {
      return
    }
    
    log('🚀 Début initialisation...')
    initializingRef.current = true

    let newSectionOrder = config.sectionOrder || DEFAULT_SECTION_ORDER
    
    const allGroups = new Set(['pinned', 'profiles', 'navigation', 'actions', 'footer'])
    const existingGroups = new Set(newSectionOrder)
    allGroups.forEach(g => {
      if (!existingGroups.has(g)) {
        newSectionOrder.push(g)
      }
    })
    
    const pinnedIndex = newSectionOrder.indexOf('pinned')
    if (pinnedIndex > 0) {
      const [pinned] = newSectionOrder.splice(pinnedIndex, 1)
      newSectionOrder.unshift(pinned)
    }
    const footerIndex = newSectionOrder.indexOf('footer')
    if (footerIndex !== -1 && footerIndex < newSectionOrder.length - 1) {
      const [footer] = newSectionOrder.splice(footerIndex, 1)
      newSectionOrder.push(footer)
    }

    setSectionOrder(newSectionOrder)
    
    const fixed = config.fixedSections || []
    setFixedSections(fixed)
    log('📋 Sections fixes:', fixed)

    const existingItems = config.items || []
    log('📦 Éléments existants:', existingItems.length)
    
    const userProfiles = profiles || []
    const allProfile = { id: 'all', name: t('allSounds'), isDefault: true }
    const allProfiles = [allProfile, ...userProfiles]
    log('👤 Profils reçus:', allProfiles.map(p => p.id))

    const newItems = []
    const processedIds = new Set()

    existingItems.forEach(item => {
      if (item.id) {
        const isProfile = item.id.startsWith('profile-')
        const profileId = isProfile ? item.id.replace('profile-', '') : null
        
        if (isProfile && !allProfiles.some(p => p.id === profileId)) {
          return
        }
        
        processedIds.add(item.id)
        
        if (isProfile) {
          const profile = allProfiles.find(p => p.id === profileId)
          if (profile) {
            item.label = profile.name
            item.icon = profile.id === 'all' ? 'ti-stack' : 'ti-user'
            item.isDefaultProfile = profile.id === 'all'
          }
        }
        
        if (!item.group) {
          item.group = DEFAULT_GROUPS[item.id] || 'other'
        }
        
        if (!item.icon) {
          item.icon = DEFAULT_ICONS[item.id] || 'ti-circle'
        }
        
        if (!item.label) {
          item.label = DEFAULT_LABELS[item.id] || item.id
        }
        
        item.pinned = !!item.pinned
        item.visible = item.visible !== false
        
        if (item.canHide === undefined) {
          if (isProfile) {
            item.canHide = false
          } else {
            item.canHide = !['loop', 'shortcuts', 'presentation'].includes(item.id)
          }
        }
        
        if (item.order === undefined) {
          item.order = newItems.length
        }
        
        newItems.push(item)
      }
    })

    allProfiles.forEach(profile => {
      const profileId = `profile-${profile.id}`
      if (processedIds.has(profileId)) return
      
      const newItem = {
        id: profileId,
        group: 'profiles',
        label: profile.name,
        icon: profile.id === 'all' ? 'ti-stack' : 'ti-user',
        visible: true,
        pinned: false,
        order: newItems.length,
        canHide: false,
        isProfile: true,
        isDefaultProfile: profile.id === 'all'
      }
      newItems.push(newItem)
    })

    const defaultItemIds = ['home', 'discover', 'editor', 'sequencer', 'youtube', 'loop', 'shortcuts', 'presentation', 'guide', 'options']
    defaultItemIds.forEach(id => {
      if (processedIds.has(id)) return
      
      const newItem = {
        id,
        group: DEFAULT_GROUPS[id] || 'navigation',
        label: DEFAULT_LABELS[id] || id,
        icon: DEFAULT_ICONS[id] || 'ti-circle',
        visible: true,
        pinned: false,
        order: newItems.length,
        canHide: !ACTION_IDS.includes(id),
        isProfile: false,
        isDefaultProfile: false,
        isAction: ACTION_IDS.includes(id)
      }
      newItems.push(newItem)
    })

    newItems.sort((a, b) => (a.order || 0) - (b.order || 0))
    
    log(`📊 Total items: ${newItems.length}`)

    setItems(newItems)
    setIsInitialized(true)
    initializingRef.current = false
    log('✅ Initialisation terminée')
  }, [config, profiles, tr, isInitialized])

  // ─── RÉORGANISATION DES SECTIONS ───────────────────────────────────────────

  const moveSectionUp = useCallback((section) => {
    if (section === 'footer' || section === 'pinned') return
    
    const reorderable = sectionOrder.filter(s => s !== 'footer' && s !== 'pinned')
    const currentIndex = reorderable.indexOf(section)
    if (currentIndex <= 0) return
    
    const newOrder = [...sectionOrder]
    const sectionIndex = newOrder.indexOf(section)
    const [removed] = newOrder.splice(sectionIndex, 1)
    const insertIndex = sectionIndex - 1
    newOrder.splice(insertIndex, 0, removed)
    
    setSectionOrder(newOrder)
  }, [sectionOrder])

  const moveSectionDown = useCallback((section) => {
    if (section === 'footer' || section === 'pinned') return
    
    const reorderable = sectionOrder.filter(s => s !== 'footer' && s !== 'pinned')
    const currentIndex = reorderable.indexOf(section)
    if (currentIndex >= reorderable.length - 1) return
    
    const newOrder = [...sectionOrder]
    const sectionIndex = newOrder.indexOf(section)
    const [removed] = newOrder.splice(sectionIndex, 1)
    const insertIndex = Math.min(sectionIndex + 1, newOrder.length)
    newOrder.splice(insertIndex, 0, removed)
    
    setSectionOrder(newOrder)
  }, [sectionOrder])

  // ─── GESTION DES SECTIONS FIXES ──────────────────────────────────────────

  const toggleFixedSection = useCallback((sectionKey) => {
    log(`🔒 Toggle section fixe: ${sectionKey}`)
    
    setFixedSections(prev => {
      if (prev.includes(sectionKey)) {
        return prev.filter(s => s !== sectionKey)
      } else {
        if (prev.length >= 2) {
          return prev
        }
        return [...prev, sectionKey]
      }
    })
  }, [])

  const isSectionFixed = useCallback((sectionKey) => {
    return fixedSections.includes(sectionKey)
  }, [fixedSections])

  // ─── GESTION DES ÉLÉMENTS ──────────────────────────────────────────────────

  const toggleVisibility = useCallback((id) => {
    log(`👁️ Toggle visibilité: ${id}`)
    setItems(prev => prev.map(item =>
      item.id === id && item.canHide
        ? { ...item, visible: !item.visible }
        : item
    ))
  }, [])

  const togglePinned = useCallback((id) => {
    log(`📌 Toggle épinglé: ${id}`)
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newPinned = !item.pinned
        
        const newGroup = newPinned 
          ? 'pinned' 
          : (item.originalGroup && item.originalGroup !== 'pinned' 
              ? item.originalGroup 
              : item.group)
        
        log(`📌 ${id}: pinned ${item.pinned} -> ${newPinned}, groupe ${item.group} -> ${newGroup}`)
        return { 
          ...item, 
          pinned: newPinned,
          group: newGroup,
          originalGroup: item.originalGroup || item.group
        }
      }
      return item
    }))
  }, [])

  // ─── DRAG & DROP ──────────────────────────────────────────────────────────

  const canDropToGroup = useCallback((sourceItem, targetGroup) => {
    if (targetGroup === 'actions' && !sourceItem.isAction) {
      return false
    }

    if (sourceItem.isAction && targetGroup !== 'actions' && targetGroup !== 'pinned') {
      return false
    }

    if (sourceItem.isProfile && targetGroup !== 'profiles' && targetGroup !== 'pinned') {
      return false
    }

    return true
  }, [])

  const handleDragStart = useCallback((e, index, group) => {
    log(`🖱️ Drag start: index=${index}, group=${group}`)
    setDraggedIndex(index)
    setDraggedGroup(group)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ index, group }))
    setTimeout(() => {
      if (e.target) e.target.style.opacity = '0.4'
    }, 0)
  }, [])

  const handleDragEnd = useCallback((e) => {
    if (e.target) e.target.style.opacity = '1'
    setDraggedIndex(null)
    setDragOverIndex(null)
    setDraggedGroup(null)
    setDragOverGroup(null)
  }, [])

  const handleDragOver = useCallback((e, index, group) => {
    e.preventDefault()
    if (group === 'actions') {
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'))
        const sourceItem = items.find((_, i) => i === data.index)
        if (sourceItem && !sourceItem.isAction) {
          e.dataTransfer.dropEffect = 'none'
          return
        }
      } catch {
        e.dataTransfer.dropEffect = 'none'
        return
      }
    }
    setDragOverIndex(index)
    setDragOverGroup(group)
  }, [items])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
    setDragOverGroup(null)
  }, [])

  const handleDrop = useCallback((e, targetIndex, targetGroup) => {
    e.preventDefault()
    
    let sourceData
    try {
      sourceData = JSON.parse(e.dataTransfer.getData('text/plain'))
    } catch {
      resetDragState()
      return
    }
    
    if (!sourceData) {
      resetDragState()
      return
    }

    const { index: sourceIndex, group: sourceGroup } = sourceData
    log(`🖱️ Drop: source=${sourceIndex}(${sourceGroup}) -> target=${targetIndex}(${targetGroup})`)

    if (sourceGroup === targetGroup && sourceIndex === targetIndex) {
      resetDragState()
      return
    }

    const sourceItems = items.filter(item => item.group === sourceGroup)
    if (sourceIndex >= sourceItems.length) {
      resetDragState()
      return
    }

    const sourceItem = sourceItems[sourceIndex]
    
    if (targetGroup === 'actions' && !sourceItem.isAction) {
      log(`❌ Drop vers "actions" interdit pour ${sourceItem.id}`)
      resetDragState()
      return
    }

    if (sourceItem.isAction && targetGroup !== 'actions' && targetGroup !== 'pinned') {
      log(`❌ Une action ne peut pas quitter "actions"`)
      resetDragState()
      return
    }

    if (sourceItem.isProfile && targetGroup !== 'profiles' && targetGroup !== 'pinned') {
      log(`❌ Un profil ne peut pas aller dans ${targetGroup}`)
      resetDragState()
      return
    }

    if (sourceGroup === targetGroup) {
      const groupItems = items.filter(item => item.group === sourceGroup)
      const start = sourceIndex
      const end = targetIndex
      
      const reordered = [...groupItems]
      const [removed] = reordered.splice(start, 1)
      reordered.splice(end, 0, removed)
      
      const groupIds = new Set(groupItems.map(item => item.id))
      const newItems = items.filter(item => !groupIds.has(item.id))
      
      const insertIndex = items.findIndex(item => item.id === groupItems[0]?.id)
      if (insertIndex === -1) {
        resetDragState()
        return
      }
      
      const beforeItems = newItems.slice(0, insertIndex)
      const afterItems = newItems.slice(insertIndex)
      
      setItems([...beforeItems, ...reordered, ...afterItems])
      log(`🔄 Réorganisé dans ${sourceGroup}: ${start} -> ${end}`)
      resetDragState()
      return
    }

    const movedItem = { ...sourceItems[sourceIndex] }
    log(`📦 Déplacement de l'élément: ${movedItem.id} (${sourceGroup} -> ${targetGroup})`)

    const sourceId = movedItem.id
    let newItems = items.filter(item => item.id !== sourceId)

    movedItem.group = targetGroup
    if (targetGroup === 'pinned') {
      movedItem.pinned = true
    } else {
      movedItem.pinned = false
    }
    movedItem.originalGroup = movedItem.originalGroup || sourceGroup

    const targetGroupItems = newItems.filter(item => item.group === targetGroup)
    const targetInsertIndex = Math.min(targetIndex, targetGroupItems.length)
    
    let insertPos = newItems.length
    if (targetGroupItems.length > 0) {
      const firstTargetId = targetGroupItems[0]?.id
      const lastTargetId = targetGroupItems[targetGroupItems.length - 1]?.id
      
      if (targetInsertIndex === 0) {
        insertPos = newItems.findIndex(item => item.id === firstTargetId)
      } else if (targetInsertIndex >= targetGroupItems.length) {
        insertPos = newItems.findIndex(item => item.id === lastTargetId) + 1
      } else {
        const beforeId = targetGroupItems[targetInsertIndex - 1]?.id
        const afterId = targetGroupItems[targetInsertIndex]?.id
        const beforeIndex = newItems.findIndex(item => item.id === beforeId)
        const afterIndex = newItems.findIndex(item => item.id === afterId)
        insertPos = afterIndex !== -1 ? afterIndex : beforeIndex + 1
      }
    }

    if (insertPos < 0) insertPos = 0

    newItems.splice(insertPos, 0, movedItem)
    setItems(newItems)
    log(`✅ Élément déplacé avec succès: ${movedItem.id} -> ${targetGroup}`)
    resetDragState()
  }, [items])

  const resetDragState = useCallback(() => {
    setDraggedIndex(null)
    setDragOverIndex(null)
    setDraggedGroup(null)
    setDragOverGroup(null)
  }, [])

  // ─── SAUVEGARDE ────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    log('💾 Sauvegarde de la configuration')
    
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index,
      originalGroup: undefined
    }))
    
    const allGroups = new Set(items.map(item => item.pinned ? 'pinned' : item.group))
    const finalSectionOrder = sectionOrder.filter(s => allGroups.has(s))
    
    allGroups.forEach(group => {
      if (!finalSectionOrder.includes(group)) {
        finalSectionOrder.push(group)
      }
    })

    const pinnedIdx = finalSectionOrder.indexOf('pinned')
    if (pinnedIdx > 0) {
      const [pinned] = finalSectionOrder.splice(pinnedIdx, 1)
      finalSectionOrder.unshift(pinned)
    }
    
    const footerIdx = finalSectionOrder.indexOf('footer')
    if (footerIdx !== -1 && footerIdx < finalSectionOrder.length - 1) {
      const [footer] = finalSectionOrder.splice(footerIdx, 1)
      finalSectionOrder.push(footer)
    }

    const validFixedSections = fixedSections.filter(s => finalSectionOrder.includes(s))

    log('📋 Ordre final des sections:', finalSectionOrder)
    log('📋 Sections fixes:', validFixedSections)

    onSave({ 
      ...config, 
      items: updatedItems, 
      sectionOrder: finalSectionOrder,
      fixedSections: validFixedSections,
      mode: 'custom' 
    })
  }, [items, sectionOrder, fixedSections, config, onSave])

  // ─── GROUPEMENT DES ITEMS ────────────────────────────────────────────────

  const groupedItems = useMemo(() => {
    const groups = {}
    const allItems = [...items]
    
    let orderedSections = [...sectionOrder]
    
    const footerIndex = orderedSections.indexOf('footer')
    if (footerIndex !== -1 && footerIndex < orderedSections.length - 1) {
      const footer = orderedSections.splice(footerIndex, 1)[0]
      orderedSections.push(footer)
    }
    
    const pinnedIndex = orderedSections.indexOf('pinned')
    if (pinnedIndex > 0) {
      const pinned = orderedSections.splice(pinnedIndex, 1)[0]
      orderedSections.unshift(pinned)
    }
    
    orderedSections = orderedSections.filter(s => {
      return allItems.some(item => 
        (item.pinned && s === 'pinned') || 
        (!item.pinned && item.group === s)
      )
    })
    
    const pinnedItems = allItems.filter(item => item.pinned)
    if (pinnedItems.length > 0 && !orderedSections.includes('pinned')) {
      orderedSections.unshift('pinned')
    }
    
    orderedSections.forEach(section => {
      if (section === 'pinned') {
        groups[section] = pinnedItems
      } else {
        groups[section] = allItems.filter(item => !item.pinned && item.group === section)
      }
    })
    
    const remainingSections = new Set(allItems.map(item => 
      item.pinned ? 'pinned' : item.group
    ))
    remainingSections.forEach(section => {
      if (!groups[section]) {
        if (section === 'pinned') {
          groups[section] = pinnedItems
        } else {
          groups[section] = allItems.filter(item => !item.pinned && item.group === section)
        }
      }
    })
    
    return groups
  }, [items, sectionOrder])

  const groupLabels = {
    pinned: '📌 Épinglés',
    navigation: '🧭 Navigation',
    profiles: '👤 Profils',
    actions: '⚡ Actions',
    footer: '📌 Footer',
  }

  const groupIcons = {
    pinned: 'ti-pinned',
    navigation: 'ti-compass',
    profiles: 'ti-users',
    actions: 'ti-bolt',
    footer: 'ti-arrow-bar-to-down',
  }

  // ─── RENDU ──────────────────────────────────────────────────────────────────

  if (!isInitialized && config) {
    return (
      <div style={{
        marginTop: 12,
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
        padding: '20px',
        textAlign: 'center'
      }}>
        <span style={{ color: 'var(--text-tertiary)' }}>Chargement...</span>
      </div>
    )
  }

  const renderFixedToggle = (sectionKey) => {
    if (sectionKey === 'footer') return null
    
    const isFixed = isSectionFixed(sectionKey)
    const canLock = !isFixed && fixedSections.length < 2
    const canUnlock = isFixed
    
    if (!canLock && !canUnlock) return null
    
    return (
      <button
        onClick={() => toggleFixedSection(sectionKey)}
        style={{
          padding: '2px 6px',
          borderRadius: 4,
          border: '1px solid',
          borderColor: isFixed ? 'var(--accent)' : 'var(--border)',
          background: isFixed ? 'var(--accent-light)' : 'transparent',
          color: isFixed ? 'var(--accent)' : 'var(--text-tertiary)',
          cursor: canLock || canUnlock ? 'pointer' : 'not-allowed',
          fontSize: 12,
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          opacity: canLock || canUnlock ? 1 : 0.3
        }}
        title={isFixed ? t('unlockSection') : t('lockSection')}
      >
        <i className={`ti ${isFixed ? 'ti-lock' : 'ti-lock-open'}`} />
        <span style={{ fontSize: 8 }}>
          {isFixed ? t('fixed') : t('unfixed')}
        </span>
      </button>
    )
  }

  const renderItem = (item, groupKey, index) => {
    const globalIndex = items.indexOf(item)
    const isDragOver = dragOverIndex === globalIndex && dragOverGroup === groupKey
    const isDragging = draggedIndex === globalIndex
    const isDefaultProfile = item.isDefaultProfile
    const isAction = item.group === 'actions' || ACTION_IDS.includes(item.id)
    const isActionGroup = groupKey === 'actions'
    const isDraggable = !isDefaultProfile && !isActionGroup

    let borderStyle = '1px solid var(--border)'
    if (isDragOver) {
      borderStyle = '1px solid var(--accent)'
    } else if (item.pinned) {
      borderStyle = '1px solid var(--accent)'
    } else if (isActionGroup) {
      borderStyle = '1px solid rgba(124,111,247,0.3)'
    }

    const isVisible = item.visible !== false
    const canHide = item.canHide !== false && !item.isProfile

    return (
      <div
        key={item.id}
        draggable={isDraggable}
        onDragStart={(e) => {
          if (isDefaultProfile || !isDraggable) {
            e.preventDefault()
            return
          }
          handleDragStart(e, index, groupKey)
        }}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, index, groupKey)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index, groupKey)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          marginBottom: 4,
          borderRadius: 'var(--radius-sm)',
          backgroundColor: isDragOver
            ? 'var(--accent-light)'
            : isDragging
              ? 'var(--bg-tertiary)'
              : item.pinned
                ? 'var(--accent-light)'
                : isAction
                  ? 'rgba(124,111,247,0.08)'
                  : isActionGroup
                    ? 'rgba(124,111,247,0.06)'
                    : 'var(--bg-secondary)',
          border: borderStyle,
          opacity: isDragging ? 0.4 : (isVisible ? 1 : 0.4),
          transition: 'all 0.15s',
          cursor: isDraggable ? 'grab' : 'default',
          position: 'relative'
        }}
      >
        {!isDefaultProfile ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              {isDraggable ? (
                <i className="ti ti-grip-vertical" style={{ color: 'var(--text-tertiary)', opacity: 0.3, fontSize: 14 }} />
              ) : (
                <i className="ti ti-lock" style={{ color: 'var(--text-tertiary)', opacity: 0.3, fontSize: 12 }} />
              )}
              <i className={`ti ${item.icon}`} style={{
                color: item.pinned ? 'var(--accent)' : isAction ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 15
              }} />
              <span style={{
                fontSize: 13,
                color: item.pinned ? 'var(--accent)' : isAction ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: item.pinned ? 600 : isAction ? 500 : 400
              }}>
                {item.label}
              </span>
              {item.pinned && (
                <span style={{
                  fontSize: 9,
                  color: 'var(--accent)',
                  backgroundColor: 'var(--accent-light)',
                  padding: '0 6px',
                  borderRadius: 10
                }}>
                  📌
                </span>
              )}
              {item.isProfile && (
                <span style={{
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '0 6px',
                  borderRadius: 10
                }}>
                  👤
                </span>
              )}
              {isAction && (
                <span style={{
                  fontSize: 9,
                  color: 'var(--accent)',
                  backgroundColor: 'rgba(124,111,247,0.15)',
                  padding: '0 6px',
                  borderRadius: 10
                }}>
                  ⚡
                </span>
              )}
              {isActionGroup && !item.pinned && (
                <span style={{
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  backgroundColor: 'rgba(124,111,247,0.1)',
                  padding: '0 6px',
                  borderRadius: 10
                }}>
                  🔒 Fixe
                </span>
              )}
              {isActionGroup && item.pinned && (
                <span style={{
                  fontSize: 9,
                  color: 'var(--accent)',
                  backgroundColor: 'rgba(124,111,247,0.15)',
                  padding: '0 6px',
                  borderRadius: 10
                }}>
                  📌 Épinglé
                </span>
              )}
              <span style={{
                fontSize: 9,
                color: 'var(--text-tertiary)',
                marginLeft: 'auto',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '0 6px',
                borderRadius: 10
              }}>
                {groupKey}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => togglePinned(item.id)}
                style={{
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: item.pinned ? 'var(--accent-light)' : 'transparent',
                  color: item.pinned ? 'var(--accent)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  transition: 'all 0.15s'
                }}
                title={item.pinned ? t('sidebarEditorUnpin') : t('sidebarEditorPin')}
              >
                <i className={`ti ${item.pinned ? 'ti-pinned' : 'ti-pin'}`} />
              </button>

              {canHide && (
                <button
                  onClick={() => toggleVisibility(item.id)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isVisible ? 'transparent' : 'rgba(224,82,82,0.15)',
                    color: isVisible ? 'var(--text-tertiary)' : 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.15s'
                  }}
                  title={isVisible ? t('sidebarEditorHide') : t('sidebarEditorShow')}
                >
                  <i className={`ti ${isVisible ? 'ti-eye' : 'ti-eye-off'}`} />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <i className={`ti ${item.icon}`} style={{
                color: item.pinned ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 15
              }} />
              <span style={{
                fontSize: 13,
                color: item.pinned ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: item.pinned ? 600 : 400
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: 9,
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '0 6px',
                borderRadius: 10
              }}>
                ⭐ Défaut
              </span>
              <span style={{
                fontSize: 9,
                color: 'var(--text-tertiary)',
                marginLeft: 'auto',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '0 6px',
                borderRadius: 10
              }}>
                {groupKey}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => togglePinned(item.id)}
                style={{
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: item.pinned ? 'var(--accent-light)' : 'transparent',
                  color: item.pinned ? 'var(--accent)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  transition: 'all 0.15s'
                }}
                title={item.pinned ? t('sidebarEditorUnpin') : t('sidebarEditorPin')}
              >
                <i className={`ti ${item.pinned ? 'ti-pinned' : 'ti-pin'}`} />
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <div style={{
        marginTop: 12,
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--accent-light)',
          borderBottom: '1px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-layout-sidebar" style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent)' }}>
              {t('sidebarEditorTitle')}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {t('sidebarEditorSub')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-ghost btn-sm"
              onClick={onReset}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
            >
              <i className="ti ti-refresh" /> {t('sidebarEditorReset')}
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={onCancel}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
            >
              <i className="ti ti-x" /> {t('cancel')}
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={handleSave}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}
            >
              <i className="ti ti-check" /> {t('sidebarEditorSave')}
            </button>
          </div>
        </div>

        <div style={{
          padding: '8px 16px',
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          fontSize: 11,
          color: 'var(--text-tertiary)'
        }}>
          <span><span style={{ opacity: 0.4 }}>☰</span> {t('sidebarEditorDragHint')}</span>
          <span><i className="ti ti-eye" /> {t('sidebarEditorShowHide')}</span>
          <span><i className="ti ti-pinned" /> {t('sidebarEditorPin')}</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>
            💡 {t('sidebarEditorPinnedNote')}
          </span>
          <span style={{ color: 'var(--accent)', fontSize: 10 }}>
            <i className="ti ti-arrows-sort" /> {t('sidebarEditorDragGroupHint')}
          </span>
          <span style={{ color: 'var(--warning)', fontSize: 10 }}>
            📌 Le footer reste toujours en bas
          </span>
          <span style={{ color: 'var(--accent)', fontSize: 10 }}>
            🔒 {t('sidebarEditorFixedHint')} ({fixedSections.length}/2)
          </span>
        </div>

        <div style={{ padding: '12px 16px', maxHeight: 400, overflowY: 'auto' }}>
          {Object.keys(groupedItems).map(groupKey => {
            const itemsInGroup = groupedItems[groupKey]
            if (itemsInGroup.length === 0) return null

            const isDraggingOverGroup = dragOverGroup === groupKey && draggedGroup !== groupKey
            const isFooter = groupKey === 'footer'
            const isPinned = groupKey === 'pinned'
            const isActionGroup = groupKey === 'actions'
            const isFixed = isSectionFixed(groupKey)

            const containerStyles = {
              marginBottom: 12,
              padding: isPinned ? '4px 6px' : '4px 6px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isDraggingOverGroup ? 'rgba(124,111,247,0.1)' : 'transparent',
              border: isDraggingOverGroup ? '2px dashed var(--accent)' : '2px solid transparent',
              transition: 'all 0.15s',
              opacity: isFooter ? 0.8 : 1
            }

            if (isFooter) {
              containerStyles.borderTop = '2px solid var(--border)'
              containerStyles.paddingTop = 12
              containerStyles.marginTop = 8
            }

            if (isActionGroup) {
              containerStyles.backgroundColor = 'rgba(124,111,247,0.04)'
              containerStyles.borderRadius = 'var(--radius-md)'
              containerStyles.border = '1px solid rgba(124,111,247,0.15)'
            }

            if (isFixed) {
              containerStyles.backgroundColor = 'rgba(124,111,247,0.06)'
              containerStyles.border = '1px solid var(--accent)'
              containerStyles.borderRadius = 'var(--radius-md)'
            }

            return (
              <div 
                key={groupKey} 
                style={containerStyles}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (groupKey === 'actions') {
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                      const sourceItem = items.find((_, i) => i === data.index)
                      if (sourceItem && !sourceItem.isAction) {
                        e.dataTransfer.dropEffect = 'none'
                        return
                      }
                    } catch {
                      e.dataTransfer.dropEffect = 'none'
                      return
                    }
                  }
                  setDragOverGroup(groupKey)
                }}
                onDragLeave={() => {
                  setDragOverGroup(null)
                }}
                onDrop={(e) => {
                  if (groupKey === 'actions') {
                    try {
                      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
                      const sourceItem = items.find((_, i) => i === data.index)
                      if (sourceItem && !sourceItem.isAction) {
                        return
                      }
                    } catch {
                      return
                    }
                  }

                  let sourceData
                  try {
                    sourceData = JSON.parse(e.dataTransfer.getData('text/plain'))
                  } catch {
                    return
                  }
                  if (sourceData) {
                    const sourceItem = items.find((_, i) => i === sourceData.index)
                    if (sourceItem && sourceItem.group !== groupKey) {
                      handleDrop(e, itemsInGroup.length, groupKey)
                    }
                  }
                }}
              >
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isPinned ? 'var(--accent)' : isFooter ? 'var(--text-tertiary)' : isActionGroup ? 'var(--accent)' : isFixed ? 'var(--accent)' : 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className={`ti ${groupIcons[groupKey] || 'ti-circle'}`} style={{ fontSize: 12 }} />
                    {groupLabels[groupKey] || groupKey}
                    {isPinned && (
                      <span style={{
                        fontSize: 9,
                        color: 'var(--accent)',
                        marginLeft: 4,
                        fontWeight: 400,
                        textTransform: 'none'
                      }}>
                        {t('sidebarEditorPinnedItems')}
                      </span>
                    )}
                    {isFooter && (
                      <span style={{
                        fontSize: 9,
                        color: 'var(--text-tertiary)',
                        marginLeft: 4,
                        fontWeight: 400,
                        textTransform: 'none'
                      }}>
                        (toujours en bas)
                      </span>
                    )}
                    {isActionGroup && (
                      <span style={{
                        fontSize: 9,
                        color: 'var(--accent)',
                        marginLeft: 4,
                        fontWeight: 400,
                        textTransform: 'none'
                      }}>
                        (⚡ épinglables mais non déplaçables)
                      </span>
                    )}
                    {isFixed && (
                      <span style={{
                        fontSize: 9,
                        color: 'var(--accent)',
                        marginLeft: 4,
                        fontWeight: 400,
                        textTransform: 'none'
                      }}>
                        🔒 {t('fixed')}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9,
                      color: 'var(--text-tertiary)',
                      fontWeight: 400,
                      textTransform: 'none'
                    }}>
                      ({itemsInGroup.length})
                    </span>
                    {isDraggingOverGroup && draggedGroup !== groupKey && !isActionGroup && (
                      <span style={{
                        fontSize: 9,
                        color: 'var(--accent)',
                        fontWeight: 400,
                        marginLeft: 4,
                        textTransform: 'none'
                      }}>
                        <i className="ti ti-arrow-up" /> Déposer ici
                      </span>
                    )}
                    {isActionGroup && isDraggingOverGroup && (
                      <span style={{
                        fontSize: 9,
                        color: 'var(--warning)',
                        fontWeight: 400,
                        marginLeft: 4,
                        textTransform: 'none'
                      }}>
                        ⚡ Actions uniquement
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {renderFixedToggle(groupKey)}
                    
                    {!isPinned && !isFooter && !isActionGroup && (
                      <>
                        <button
                          onClick={() => moveSectionUp(groupKey)}
                          disabled={sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').indexOf(groupKey) === 0}
                          style={{
                            padding: '2px 4px',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').indexOf(groupKey) === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                            cursor: sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').indexOf(groupKey) === 0 ? 'default' : 'pointer',
                            fontSize: 12,
                            opacity: sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').indexOf(groupKey) === 0 ? 0.3 : 1
                          }}
                          title="Déplacer vers le haut"
                        >
                          <i className="ti ti-arrow-up" />
                        </button>
                        <button
                          onClick={() => moveSectionDown(groupKey)}
                          disabled={sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').indexOf(groupKey) === sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').length - 1}
                          style={{
                            padding: '2px 4px',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').indexOf(groupKey) === sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                            cursor: sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').indexOf(groupKey) === sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').length - 1 ? 'default' : 'pointer',
                            fontSize: 12,
                            opacity: sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').indexOf(groupKey) === sectionOrder.filter(s => s !== 'footer' && s !== 'pinned').length - 1 ? 0.3 : 1
                          }}
                          title="Déplacer vers le bas"
                        >
                          <i className="ti ti-arrow-down" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {itemsInGroup.map((item, index) => renderItem(item, groupKey, index))}
              </div>
            )
          })}
        </div>

        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-tertiary)',
          fontSize: 10,
          color: 'var(--text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap'
        }}>
          <span style={{ color: 'var(--accent)' }}>🔍 Debug:</span>
          <span>Ordre des sections: </span>
          {sectionOrder.map((s, i) => (
            <span key={s} style={{
              padding: '1px 6px',
              borderRadius: 3,
              backgroundColor: s === 'footer' ? 'rgba(224,82,82,0.2)' : s === 'pinned' ? 'var(--accent-light)' : s === 'actions' ? 'rgba(124,111,247,0.15)' : fixedSections.includes(s) ? 'rgba(124,111,247,0.2)' : 'var(--bg-secondary)',
              border: `1px solid ${s === 'footer' ? 'var(--danger)' : s === 'pinned' ? 'var(--accent)' : s === 'actions' ? 'var(--accent)' : fixedSections.includes(s) ? 'var(--accent)' : 'var(--border)'}`,
              fontSize: 9
            }}>
              {s} {s === 'footer' && '🔒'} {s === 'actions' && '⚡'} {fixedSections.includes(s) && '🔒'}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-tertiary)' }}>
            Groupes: {Object.keys(groupedItems).join(', ')}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
            Items: {items.length}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
            Profils: {profiles.length}
          </span>
          <span style={{ fontSize: 9, color: 'var(--accent)' }}>
            Fixes: {fixedSections.length}/2
          </span>
        </div>
      </div>
      <ConfirmWrapper />
    </>
  )
}