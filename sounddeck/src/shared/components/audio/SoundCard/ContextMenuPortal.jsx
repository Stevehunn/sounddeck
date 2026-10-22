/**
 * @file Right-click / dots-button context menu for a SoundCard.
 *
 * Renders a floating menu anchored at `position` with the following actions:
 * - Toggle favorite
 * - Rename
 * - Adjust volume (opens `VolumePanel` via `onVolumeOpen`)
 * - Change image
 * - Change emoji
 * - Remove from profile (only if `currentProfileId !== 'all'`)
 * - Delete (with confirmation)
 *
 * The menu measures its own height on mount (`onHeightMeasured`) so the
 * parent can reposition it (avoid overflowing the viewport) before the next
 * render. The menu also re-clamps its position when the viewport resizes.
 *
 * `sound` and `onDelete` are kept in the signature for API compatibility
 * with the parent (`SoundCard/index.jsx`), but are not read here — the
 * delete flow is delegated via `onDeleteWithConfirm`.
 *
 * @see ./index.jsx — parent (positioning logic + confirm wrapper)
 * @see ./VolumePanel.jsx — sibling panel
 */

import { useEffect, useRef } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

/**
 * Context menu popup for a SoundCard.
 *
 * @param {Object} props
 * @param {Object} _sound - Sound object (unused here, kept for API compatibility).
 * @param {boolean} props.isFavorite - Whether the sound is favorited.
 * @param {string} props.currentProfileId - Current profile ID (for the "remove from profile" item).
 * @param {() => void} props.onClose - Called after any action (closes the menu).
 * @param {() => void} props.onToggleFavorite
 * @param {() => void} props.onRename
 * @param {() => void} props.onVolumeOpen
 * @param {(() => void)|null} props.onRemoveFromProfile
 * @param {() => void} _onDelete - Unused here (deletion goes through `onDeleteWithConfirm`).
 * @param {() => void} props.onChangeImage
 * @param {() => void} props.onChangeEmoji
 * @param {{top: number, left: number}} props.position - Initial position.
 * @param {(height: number) => void} props.onHeightMeasured - Called once with the rendered height.
 * @param {() => void} props.onDeleteWithConfirm - Opens the delete confirmation.
 * @param {() => void} props.onRemoveFromProfileWithConfirm - Opens the remove confirmation.
 * @returns {JSX.Element}
 */
export default function ContextMenuPortal({
  sound: _sound,
  isFavorite,
  currentProfileId,
  onClose,
  onToggleFavorite,
  onRename,
  onVolumeOpen,
  onRemoveFromProfile,
  onDelete: _onDelete,
  onChangeImage,
  onChangeEmoji,
  position,
  onHeightMeasured,
  onDeleteWithConfirm,
  onRemoveFromProfileWithConfirm,
}) {
  const { t } = useLanguage()
  const menuRef = useRef(null)

  // Measure the rendered height and report it to the parent (which uses it
  // to re-clamp the position before the menu appears fully on screen).
  useEffect(() => {
    if (!menuRef.current) return

    requestAnimationFrame(() => {
      if (!menuRef.current) return
      const height = menuRef.current.getBoundingClientRect().height
      if (onHeightMeasured && height > 0) onHeightMeasured(height)
    })
  }, [onHeightMeasured])

  // Re-position if the menu overflows the viewport (e.g. after a resize).
  useEffect(() => {
    if (!menuRef.current) return

    requestAnimationFrame(() => {
      if (!menuRef.current) return

      const rect = menuRef.current.getBoundingClientRect()
      let { top, left } = position

      if (rect.right > window.innerWidth) {
        left = Math.max(10, window.innerWidth - rect.width - 10)
      }
      if (rect.bottom > window.innerHeight) {
        top = Math.max(10, window.innerHeight - rect.height - 10)
      }
      if (left < 10) left = 10
      if (top < 10) top = 10

      if (top !== position.top || left !== position.left) {
        menuRef.current.style.top = top + 'px'
        menuRef.current.style.left = left + 'px'
      }
    })
  }, [position])

  const handleMenuClick = (e) => e.stopPropagation()

  const handleAction = (action) => {
    action()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      onClick={handleMenuClick}
      data-testid="context-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 4,
        zIndex: 999,
        minWidth: 200,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <MenuItem
        icon={isFavorite ? 'ti-star-filled' : 'ti-star'}
        label={isFavorite ? t('menuFavoriteRemove') : t('menuFavoriteAdd')}
        onClick={() => handleAction(onToggleFavorite)}
      />
      <MenuItem
        icon="ti-pencil"
        label={t('menuRename')}
        onClick={() => handleAction(onRename)}
      />
      <MenuItem
        icon="ti-volume"
        label={t('menuVolume')}
        onClick={() => handleAction(onVolumeOpen)}
      />
      <MenuItem
        icon="ti-photo"
        label={t('menuChangeImage')}
        onClick={() => handleAction(onChangeImage)}
      />
      <MenuItem
        icon="ti-mood-smile"
        label={t('menuChangeEmoji')}
        onClick={() => handleAction(onChangeEmoji)}
      />

      {onRemoveFromProfile && currentProfileId !== 'all' && (
        <>
          <div
            style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}
          />
          <MenuItem
            icon="ti-folder-minus"
            label={t('menuRemoveFromProfile')}
            onClick={() => handleAction(onRemoveFromProfileWithConfirm)}
            warning
          />
        </>
      )}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

      <div style={{ padding: '2px 4px' }}>
        <button
          onClick={() => {
            onClose()
            onDeleteWithConfirm?.()
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.1s',
            color: 'var(--danger)',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(224, 82, 82, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <i className="ti ti-trash" style={{ fontSize: 16, minWidth: 20 }} />
          {t('menuDelete') || 'Supprimer définitivement'}
        </button>
      </div>
    </div>
  )
}

// ─── MenuItem ──────────────────────────────────────────────────────────────

/**
 * Single row in the context menu.
 *
 * @param {Object} props
 * @param {string} props.icon - Tabler icon class (e.g. `ti-star`).
 * @param {string} props.label - Display label.
 * @param {() => void} props.onClick
 * @param {boolean} [props.danger] - Render in danger color.
 * @param {boolean} [props.warning] - Render in warning color.
 * @returns {JSX.Element}
 */
function MenuItem({ icon, label, onClick, danger, warning }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'transparent',
        border: 'none',
        color: danger
          ? 'var(--danger)'
          : warning
            ? 'var(--warning)'
            : 'var(--text-primary)',
        fontSize: 13,
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--bg-hover)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 16, minWidth: 20 }} />
      {label}
    </button>
  )
}