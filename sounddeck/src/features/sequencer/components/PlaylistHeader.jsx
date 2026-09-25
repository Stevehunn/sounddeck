// src/features/sequencer/components/PlaylistHeader.jsx
import { useLanguage } from '@core/i18n/LanguageContext'

export default function PlaylistHeader({
  playlist,
  itemsCount,
  totalDelay,
  playing,
  loopPlaylist,
  onToggleLoop,
  onAddSounds,
  onStart,
  onStop,
  onPrev,
  onNext,
}) {
  const { t } = useLanguage()

  return (
    <div
      style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 150 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{playlist.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {itemsCount} {t('sounds')} · {totalDelay.toFixed(1)}s{' '}
          {t('delayAfter').toLowerCase()}
        </div>
      </div>

      <button
        onClick={onToggleLoop}
        className={`btn-sm ${loopPlaylist ? 'btn-success' : 'btn-secondary'}`}
        style={{
          border: `1px solid ${
            loopPlaylist ? 'var(--success)' : 'var(--border)'
          }`,
          minHeight: 28,
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          padding: '4px 10px',
        }}
        data-testid="loop-sequence-button"
      >
        <i className="ti ti-repeat" style={{ fontSize: 14 }} /> {t('loop')}
      </button>

      <button
        className="btn-secondary btn-sm"
        style={{
          minHeight: 28,
          padding: '4px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
        }}
        onClick={onAddSounds}
        data-testid="add-sounds-button"
      >
        <i className="ti ti-plus" style={{ fontSize: 14 }} /> {t('addSounds')}
      </button>

      {playing ? (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
        >
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={onPrev}
              className="btn-secondary btn-sm"
              title={t('previous')}
              style={{
                borderRadius: 'var(--radius-sm)',
                minHeight: 28,
                padding: '4px 8px',
              }}
            >
              <i className="ti ti-player-skip-back" style={{ fontSize: 14 }} />
            </button>
            <button
              onClick={onNext}
              className="btn-secondary btn-sm"
              title={t('next')}
              style={{
                borderRadius: 'var(--radius-sm)',
                minHeight: 28,
                padding: '4px 8px',
              }}
            >
              <i className="ti ti-player-skip-forward" style={{ fontSize: 14 }} />
            </button>
          </div>
          <button
            onClick={onStop}
            className="btn-danger btn-sm"
            style={{
              borderRadius: 'var(--radius-sm)',
              minHeight: 28,
              padding: '4px 10px',
              fontSize: 12,
            }}
          >
            <i className="ti ti-player-stop-filled" style={{ fontSize: 14 }} />{' '}
            {t('stop_seq')}
          </button>
        </div>
      ) : (
        <button
          className="btn-primary btn-sm"
          onClick={onStart}
          style={{
            borderRadius: 'var(--radius-sm)',
            minHeight: 28,
            padding: '4px 12px',
            fontSize: 12,
          }}
          data-testid="play-sequence-button"
        >
          <i className="ti ti-player-play-filled" style={{ fontSize: 14 }} />{' '}
          {t('start_seq')}
        </button>
      )}
    </div>
  )
}