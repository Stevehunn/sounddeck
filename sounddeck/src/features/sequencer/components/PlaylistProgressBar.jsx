// src/features/sequencer/components/PlaylistProgressBar.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import { formatTime } from '@shared/utils/format'

export default function PlaylistProgressBar({
  playing,
  currentProgress,
  currentIdx,
  items,
  sounds,
}) {
  const { t } = useLanguage()

  if (!playing || !currentProgress) return null

  const currentItem = items[currentIdx]
  const currentSound = currentItem
    ? sounds.find((s) => s.id === currentItem.soundId)
    : null

  return (
    <div className="sequencer-progress">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: 'var(--text-secondary)',
          marginBottom: 4,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="ti ti-music" style={{ color: 'var(--accent)' }} />
          {currentSound?.name || t('unknownSound')}
        </span>
        <span style={{ fontFamily: 'monospace' }}>
          {formatTime(currentProgress.current)} /{' '}
          {formatTime(currentProgress.duration)}
        </span>
      </div>
      <div className="progress-bar">
        <div className="track">
          <div
            className="fill accent"
            style={{ width: `${currentProgress.ratio * 100}%` }}
          />
        </div>
      </div>
      {items.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginTop: 3,
          }}
        >
          <span>
            {t('playing')} {currentIdx + 1} / {items.length}
          </span>
          <span>
            {items.filter((_, i) => i > currentIdx).length} {t('remaining')}
          </span>
        </div>
      )}
    </div>
  )
}