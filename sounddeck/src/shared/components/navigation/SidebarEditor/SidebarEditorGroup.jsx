// src/shared/components/navigation/SidebarEditor/SidebarEditorGroup.jsx
import SidebarEditorItem from './SidebarEditorItem'
import { GROUP_ICONS, getGroupLabels } from './constants'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function SidebarEditorGroup({ groupKey, items, editor }) {
  const { t } = useLanguage()
  const groupLabels = getGroupLabels(t)

  const isDraggingOverGroup =
    editor.dragOverGroup === groupKey && editor.draggedGroup !== groupKey
  const isFooter = groupKey === 'footer'
  const isPinned = groupKey === 'pinned'
  const isActionGroup = groupKey === 'actions'
  const isFixed = editor.isSectionFixed(groupKey)

  const containerStyles = {
    marginBottom: 12,
    padding: '4px 6px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: isDraggingOverGroup
      ? 'rgba(124,111,247,0.1)'
      : 'transparent',
    border: isDraggingOverGroup
      ? '2px dashed var(--accent)'
      : '2px solid transparent',
    transition: 'all 0.15s',
    opacity: isFooter ? 0.8 : 1,
  }

  if (isFooter) {
    containerStyles.borderTop = '2px solid var(--border)'
    containerStyles.paddingTop = 12
    containerStyles.marginTop = 8
  }
  if (isActionGroup) {
    containerStyles.backgroundColor = 'rgba(124,111,247,0.04)'
    containerStyles.border = '1px solid rgba(124,111,247,0.15)'
  }
  if (isFixed) {
    containerStyles.backgroundColor = 'rgba(124,111,247,0.06)'
    containerStyles.border = '1px solid var(--accent)'
  }

  const handleGroupDragOver = (e) => {
    e.preventDefault()
    if (groupKey === 'actions') {
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'))
        const sourceItem = editor.items[data.index]
        if (sourceItem && !sourceItem.isAction) {
          e.dataTransfer.dropEffect = 'none'
          return
        }
      } catch {
        e.dataTransfer.dropEffect = 'none'
        return
      }
    }
    editor.setDragOverGroup?.(groupKey) // pas exposé, on laisse l'over sur items
  }

  const handleGroupDrop = (e) => {
    if (groupKey === 'actions') {
      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'))
        const sourceItem = editor.items[data.index]
        if (sourceItem && !sourceItem.isAction) return
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
    if (!sourceData) return

    const sourceItem = editor.items[sourceData.index]
    if (sourceItem && sourceItem.group !== groupKey) {
      editor.handleDrop(e, items.length, groupKey)
    }
  }

  return (
    <div
      style={containerStyles}
      onDragOver={handleGroupDragOver}
      onDragLeave={() => editor.setDragOverGroup?.(null)}
      onDrop={handleGroupDrop}
    >
      <GroupHeader
        groupKey={groupKey}
        label={groupLabels[groupKey] || groupKey}
        icon={GROUP_ICONS[groupKey] || 'ti-circle'}
        count={items.length}
        isPinned={isPinned}
        isFooter={isFooter}
        isActionGroup={isActionGroup}
        isFixed={isFixed}
        fixedSectionsCount={editor.fixedSections.length}
        onMoveUp={() => editor.moveSectionUp(groupKey)}
        onMoveDown={() => editor.moveSectionDown(groupKey)}
        onToggleFixed={() => editor.toggleFixedSection(groupKey)}
        canMoveUp={
          editor.sectionOrder
            .filter((s) => s !== 'footer' && s !== 'pinned')
            .indexOf(groupKey) > 0
        }
        canMoveDown={
          editor.sectionOrder
            .filter((s) => s !== 'footer' && s !== 'pinned')
            .indexOf(groupKey) <
          editor.sectionOrder.filter(
            (s) => s !== 'footer' && s !== 'pinned'
          ).length -
            1
        }
      />

      {items.map((item, index) => (
        <SidebarEditorItem
          key={item.id}
          item={item}
          groupKey={groupKey}
          index={index}
          editor={editor}
        />
      ))}
    </div>
  )
}

// ─── Header du groupe ──────────────────────────────────────────────────

function GroupHeader({
  groupKey,
  label,
  icon,
  count,
  isPinned,
  isFooter,
  isActionGroup,
  isFixed,
  fixedSectionsCount,
  onMoveUp,
  onMoveDown,
  onToggleFixed,
  canMoveUp,
  canMoveDown,
}) {
  const { t } = useLanguage()

  const color = isPinned
    ? 'var(--accent)'
    : isFooter
      ? 'var(--text-tertiary)'
      : isActionGroup
        ? 'var(--accent)'
        : isFixed
          ? 'var(--accent)'
          : 'var(--text-tertiary)'

  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12 }} />
        {label}
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontWeight: 400,
            textTransform: 'none',
          }}
        >
          ({count})
        </span>
      </div>

      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {groupKey !== 'footer' && (
          <FixedToggle
            isFixed={isFixed}
            canLock={!isFixed && fixedSectionsCount < 2}
            canUnlock={isFixed}
            onClick={onToggleFixed}
          />
        )}

        {!isPinned && !isFooter && !isActionGroup && (
          <>
            <SmallBtn icon="ti-arrow-up" onClick={onMoveUp} disabled={!canMoveUp} />
            <SmallBtn
              icon="ti-arrow-down"
              onClick={onMoveDown}
              disabled={!canMoveDown}
            />
          </>
        )}
      </div>
    </div>
  )
}

function FixedToggle({ isFixed, canLock, canUnlock, onClick }) {
  const { t } = useLanguage()
  const enabled = canLock || canUnlock
  if (!enabled && !isFixed) return null

  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      style={{
        padding: '2px 6px',
        borderRadius: 4,
        border: '1px solid',
        borderColor: isFixed ? 'var(--accent)' : 'var(--border)',
        background: isFixed ? 'var(--accent-light)' : 'transparent',
        color: isFixed ? 'var(--accent)' : 'var(--text-tertiary)',
        cursor: enabled ? 'pointer' : 'not-allowed',
        fontSize: 12,
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: enabled ? 1 : 0.3,
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

function SmallBtn({ icon, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '2px 4px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        backgroundColor: 'transparent',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 12,
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <i className={`ti ${icon}`} />
    </button>
  )
}