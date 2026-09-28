// src/features/sequencer/components/SequencerSidebar.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { DeleteButton } from '@shared/components/ui'

export default function SequencerSidebar({
  playlists,
  activePlaylistId,
  onCreatePlaylist,
  onSelectPlaylist,
  onDeletePlaylist,
}) {
  const { t } = useLanguage()
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return
    await onCreatePlaylist(newPlaylistName)
    setNewPlaylistName('')
    setShowNewPlaylist(false)
  }

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
                borderLeft: `2px solid ${
                  isActive ? 'var(--accent)' : 'transparent'
                }`,
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
                    color: isActive ? 'var(--accent)' : 'var(--text-primary)',
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
    </div>
  )
}