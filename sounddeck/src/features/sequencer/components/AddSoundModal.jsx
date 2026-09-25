// src/features/sequencer/components/AddSoundModal.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { buildFileUrl } from '@shared/utils/fileUrl'

export default function AddSoundModal({
  sounds,
  existingIds,
  onAdd,
  onClose,
}) {
  const { t } = useLanguage()
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')

  const filtered = sounds.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{
          width: 480,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i className="ti ti-music-plus" style={{ color: 'var(--accent)' }} />
          {t('addSounds')}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className="input-lg"
          style={{ marginBottom: 10, borderRadius: 'var(--radius-md)' }}
          autoFocus
          data-testid="add-sounds-search"
        />

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 12,
          }}
        >
          {filtered.map((sound) => {
            const isSelected = selected.includes(sound.id)
            const imageUrl = buildFileUrl(sound.image)

            return (
              <label
                key={sound.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: `1px solid ${
                    isSelected ? 'var(--accent)' : 'var(--border)'
                  }`,
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(sound.id)}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    sound.emoji
                  )}
                </div>
                <span style={{ fontSize: 13, flex: 1 }}>{sound.name}</span>
                {existingIds.includes(sound.id) && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      background: 'var(--bg-tertiary)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {t('alreadyAdded')}
                  </span>
                )}
              </label>
            )
          })}
        </div>

        <div className="modal-actions">
          <button
            className="btn-secondary btn-lg"
            onClick={onClose}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            {t('cancel')}
          </button>
          <button
            className="btn-primary btn-lg"
            onClick={() => onAdd(selected)}
            disabled={selected.length === 0}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <i className="ti ti-plus" /> {t('add')}{' '}
            {selected.length > 0 ? `(${selected.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}