/**
 * @file Sequencer sidebar — playlist list, create / delete, sound popup
 * toggle + config button.
 *
 * The "new playlist" flow is inline: clicking the button reveals an input
 * + confirm/cancel buttons. On Enter, the playlist is created and the
 * selection moves to it.
 *
 * @see ./PlaylistEditor.jsx (main panel)
 * @see src/features/sequencer/Sequencer.jsx (parent)
 */

import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'

/**
 * Sequencer sidebar.
 *
 * @param {Object} props
 * @param {Array<Object>} props.playlists
 * @param {string|null} props.activePlaylistId
 * @param {(name: string) => Promise<Object|null>} props.onCreatePlaylist
 * @param {(id: string) => void} props.onSelectPlaylist
 * @param {(id: string) => Promise<void>} props.onDeletePlaylist
 * @param {boolean} props.soundPopupEnabled
 * @param {() => void} props.onToggleSoundPopup
 * @param {() => void} props.onOpenSoundPopupConfig
 * @returns {JSX.Element}
 */
export default function SequencerSidebar({
  playlists,
  activePlaylistId,
  onCreatePlaylist,
  onSelectPlaylist,
  onDeletePlaylist,
  soundPopupEnabled,
  onToggleSoundPopup,
  onOpenSoundPopupConfig,
}) {
  const { t } = useLanguage()
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')

  /**
   * Creates the playlist from the input value.
   * @returns {Promise<void>}
   */
  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return
    await onCreatePlaylist(newPlaylistName)
    setNewPlaylistName('')
    setShowNewPlaylist(false)
  }

  /**
   * Cancels the creation flow.
   * @returns {void}
   */
  const handleCancel = () => {
    setNewPlaylistName('')
    setShowNewPlaylist(false)
  }

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 12px 8px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="ti ti-playlist" style={{ color: 'var(--accent)' }} />
          {t('sequencerTitle')}
        </div>

        {showNewPlaylist ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '6px 0',
            }}
          >
            <input
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') handleCancel()
              }}
              placeholder={t('playlistName')}
              className="input-sm"
              style={{
                flex: 1,
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                minHeight: 32,
              }}
            />
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <button
                className="btn-secondary btn-sm"
                onClick={handleCancel}
                style={{
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  padding: '4px 12px',
                  minHeight: 28,
                }}
              >
                <i className="ti ti-x" /> {t('cancel')}
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={handleCreate}
                disabled={!newPlaylistName.trim()}
                style={{
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11,
                  padding: '4px 12px',
                  minHeight: 28,
                  opacity: newPlaylistName.trim() ? 1 : 0.5,
                }}
                data-testid="new-playlist-confirm-button"
              >
                <i className="ti ti-check" /> {t('add')}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn-primary btn-sm"
            style={{
              width: '100%',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              padding: '6px 12px',
              minHeight: 34,
            }}
            onClick={() => setShowNewPlaylist(true)}
            data-testid="new-playlist-open-button"
          >
            <i className="ti ti-plus" /> {t('newPlaylist')}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {playlists.length === 0 && (
          <div
            style={{
              padding: '20px 12px',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 12,
            }}
          >
            {t('noPlaylist')}
          </div>
        )}
        {playlists.map((pl) => {
          const isActive = activePlaylistId === pl.id
          return (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              style={{
                borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                backgroundColor: isActive
                  ? 'var(--accent-light)'
                  : 'transparent',
                color: isActive ? 'var(--accent)' : undefined,
              }}
              data-testid={`playlist-item-${pl.id}`}
            >
              <i
                className="ti ti-playlist"
                style={{
                  color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
                  fontSize: 15,
                }}
              />
              <div className="label">
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isActive
                      ? 'var(--accent)'
                      : 'var(--text-primary)',
                  }}
                >
                  {pl.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  {pl.items.length} {t('sounds')}
                </div>
              </div>

              <DeleteButton
                onDelete={() => onDeletePlaylist(pl.id)}
                confirmTitle={t('deletePlaylist')}
                confirmMessage={t('deletePlaylistConfirm')}
                itemName={pl.name}
                size="sm"
                variant="ghost-danger"
                icon="ti-trash"
                showLabel={false}
              />
            </div>
          )
        })}
      </div>

      {/* Sound popup section */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '10px 12px',
          flexShrink: 0,
          background: 'var(--bg-secondary)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <i className="ti ti-bell" style={{ fontSize: 12 }} />
          {t('soundPopupEnabled')}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onToggleSoundPopup}
            data-testid="sound-popup-toggle-button"
            aria-pressed={soundPopupEnabled}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${soundPopupEnabled ? 'var(--accent)' : 'var(--border)'}`,
              background: soundPopupEnabled
                ? 'var(--accent-light)'
                : 'var(--bg-tertiary)',
              color: soundPopupEnabled
                ? 'var(--accent)'
                : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
              transition: 'all 0.15s ease',
              minHeight: 30,
            }}
            title={soundPopupEnabled ? t('disable') : t('enable')}
          >
            <span>{soundPopupEnabled ? t('on') : t('off')}</span>
            <div
              className={`toggle ${soundPopupEnabled ? 'active' : ''}`}
              style={{ width: 28, height: 16, borderRadius: 8, flexShrink: 0 }}
            >
              <div
                className="knob"
                style={{
                  width: 12,
                  height: 12,
                  top: 1,
                  left: soundPopupEnabled ? 13 : 2,
                }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSoundPopupConfig}
            data-testid="sound-popup-config-button"
            title={t('soundPopupConfigure')}
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              transition: 'all 0.15s ease',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <i className="ti ti-settings" />
          </button>
        </div>
      </div>
    </div>
  )
}