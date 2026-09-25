// src/features/sequencer/components/EmptyState.jsx
import { useLanguage } from '@core/i18n/LanguageContext'

export default function EmptyState() {
  const { t } = useLanguage()

  return (
    <div
      className="flex-center"
      style={{
        flexDirection: 'column',
        height: '100%',
        gap: 12,
        color: 'var(--text-tertiary)',
      }}
    >
      <i
        className="ti ti-playlist"
        style={{ fontSize: 48, color: 'var(--border)' }}
      />
      <div style={{ fontWeight: 500, fontSize: 14 }}>
        {t('selectPlaylist')}
      </div>
      <div
        style={{
          fontSize: 12,
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.6,
        }}
      >
        {t('selectPlaylistDesc')}
      </div>
    </div>
  )
}