// src/shared/components/navigation/SidebarEditor/SidebarEditorItem.jsx
import { ACTION_IDS } from '@shared/constants/navigation'

export default function SidebarEditorItem({
  item,
  groupKey,
  index,
  editor,
}) {
  const isDragOver =
    editor.dragOverIndex === index && editor.dragOverGroup === groupKey
  const isDragging =
    editor.draggedIndex === index && editor.draggedGroup === groupKey

  const isDefaultProfile = item.isDefaultProfile
  const isAction = item.group === 'actions' || ACTION_IDS.includes(item.id)
  const isActionGroup = groupKey === 'actions'
  const isDraggable = !isDefaultProfile && !isActionGroup

  const isVisible = item.visible !== false
  const canHide = item.canHide !== false && !item.isProfile

  let borderStyle = '1px solid var(--border)'
  if (isDragOver) borderStyle = '1px solid var(--accent)'
  else if (item.pinned) borderStyle = '1px solid var(--accent)'
  else if (isActionGroup) borderStyle = '1px solid rgba(124,111,247,0.3)'

  const handleDragStart = (e) => {
    if (isDefaultProfile || !isDraggable) {
      e.preventDefault()
      return
    }
    editor.handleDragStart(e, index, groupKey)
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={editor.handleDragEnd}
      onDragOver={(e) => editor.handleDragOver(e, index, groupKey)}
      onDragLeave={editor.handleDragLeave}
      onDrop={(e) => editor.handleDrop(e, index, groupKey)}
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
        opacity: isDragging ? 0.4 : isVisible ? 1 : 0.4,
        transition: 'all 0.15s',
        cursor: isDraggable ? 'grab' : 'default',
        position: 'relative',
      }}
    >
      {!isDefaultProfile ? (
        <EditableItem
          item={item}
          isDraggable={isDraggable}
          isAction={isAction}
          isVisible={isVisible}
          canHide={canHide}
          onTogglePinned={() => editor.togglePinned(item.id)}
          onToggleVisibility={() => editor.toggleVisibility(item.id)}
        />
      ) : (
        <DefaultProfileItem
          item={item}
          onTogglePinned={() => editor.togglePinned(item.id)}
        />
      )}
    </div>
  )
}

// ─── Sous-rendus ────────────────────────────────────────────────────────

function EditableItem({
  item,
  isDraggable,
  isAction,
  isVisible,
  canHide,
  onTogglePinned,
  onToggleVisibility,
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        {isDraggable ? (
          <i
            className="ti ti-grip-vertical"
            style={{
              color: 'var(--text-tertiary)',
              opacity: 0.3,
              fontSize: 14,
            }}
          />
        ) : (
          <i
            className="ti ti-lock"
            style={{
              color: 'var(--text-tertiary)',
              opacity: 0.3,
              fontSize: 12,
            }}
          />
        )}
        <i
          className={`ti ${item.icon}`}
          style={{
            color: item.pinned
              ? 'var(--accent)'
              : isAction
                ? 'var(--accent)'
                : 'var(--text-secondary)',
            fontSize: 15,
          }}
        />
        <span
          style={{
            fontSize: 13,
            color: item.pinned
              ? 'var(--accent)'
              : isAction
                ? 'var(--accent)'
                : 'var(--text-primary)',
            fontWeight: item.pinned ? 600 : isAction ? 500 : 400,
          }}
        >
          {item.label}
        </span>
        {item.pinned && <Badge color="accent">📌</Badge>}
        {item.isProfile && <Badge>👤</Badge>}
        {isAction && <Badge color="accent">⚡</Badge>}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <IconBtn
          active={item.pinned}
          title={item.pinned ? 'Désépingler' : 'Épingler'}
          icon={item.pinned ? 'ti-pinned' : 'ti-pin'}
          onClick={onTogglePinned}
        />
        {canHide && (
          <IconBtn
            danger={!isVisible}
            title={isVisible ? 'Masquer' : 'Afficher'}
            icon={isVisible ? 'ti-eye' : 'ti-eye-off'}
            onClick={onToggleVisibility}
          />
        )}
      </div>
    </>
  )
}

function DefaultProfileItem({ item, onTogglePinned }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <i
          className={`ti ${item.icon}`}
          style={{
            color: item.pinned ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 15,
          }}
        />
        <span
          style={{
            fontSize: 13,
            color: item.pinned ? 'var(--accent)' : 'var(--text-primary)',
            fontWeight: item.pinned ? 600 : 400,
          }}
        >
          {item.label}
        </span>
        <Badge>⭐</Badge>
      </div>

      <IconBtn
        active={item.pinned}
        title={item.pinned ? 'Désépingler' : 'Épingler'}
        icon={item.pinned ? 'ti-pinned' : 'ti-pin'}
        onClick={onTogglePinned}
      />
    </>
  )
}

function Badge({ children, color }) {
  return (
    <span
      style={{
        fontSize: 9,
        color: color === 'accent' ? 'var(--accent)' : 'var(--text-tertiary)',
        backgroundColor:
          color === 'accent' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
        padding: '0 6px',
        borderRadius: 10,
      }}
    >
      {children}
    </span>
  )
}

function IconBtn({ icon, onClick, active, danger, title }) {
  const color = active
    ? 'var(--accent)'
    : danger
      ? 'var(--danger)'
      : 'var(--text-tertiary)'
  const bg = active
    ? 'var(--accent-light)'
    : danger
      ? 'rgba(224,82,82,0.15)'
      : 'transparent'

  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        backgroundColor: bg,
        color,
        cursor: 'pointer',
        fontSize: 13,
        transition: 'all 0.15s',
      }}
    >
      <i className={`ti ${icon}`} />
    </button>
  )
}