/**
 * @file Step 2 of the YouTube import flow — portion selection.
 *
 * Shows the video's thumbnail, title, uploader and total duration, then
 * lets the user pick a portion via:
 * - **Two range sliders** (start / end), each clamped so `start < end`
 * - **Two number inputs** for precise values (also clamped)
 * - **A "Select all" button** to reset to `[0, duration]`
 *
 * The "Download audio" button triggers `onDownload` (parent), which calls
 * `electronAPI.youtubeDownload()`.
 *
 * @see ../YouTube.jsx — parent
 * @see ../utils.js — `formatDuration`
 * @see ./UrlStep.jsx — previous step
 * @see ./SaveStep.jsx — next step
 */

import { useLanguage } from '@core/i18n/LanguageContext'
import PageHeader from './PageHeader'
import { formatDuration } from '../utils'

/**
 * Trim / portion step.
 *
 * @param {Object} props
 * @param {{ title: string, duration: number, thumbnail?: string, uploader?: string }} props.info
 *   Video metadata.
 * @param {boolean} props.isTutorialMode - Whether the tutorial is active.
 * @param {number} props.start - Selection start (seconds).
 * @param {number} props.end - Selection end (seconds).
 * @param {(v: number) => void} props.setStart - Start setter.
 * @param {(v: number) => void} props.setEnd - End setter.
 * @param {boolean} props.importing - Whether a download is in progress
 *   (disables the download button and swaps its label).
 * @param {() => void} props.onBack - Back to URL step.
 * @param {() => void} props.onDownload - Triggers the audio download.
 * @returns {JSX.Element}
 */
export default function TrimStep({
  info,
  isTutorialMode,
  start,
  end,
  setStart,
  setEnd,
  importing,
  onBack,
  onDownload,
}) {
  const { t } = useLanguage()
  const fmt = formatDuration

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('selectPortion')}
        sub={`${isTutorialMode ? '🎬 ' + t('tutorialMode') + ' - ' : ''}${
          info?.title?.slice(0, 60) || '...'
        }`}
        onBack={onBack}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {info?.thumbnail && (
          <div
            className="option-row"
            style={{ marginBottom: 24, padding: 16, borderRadius: 'var(--radius-md)' }}
          >
            <img
              src={info.thumbnail}
              alt={t('videoThumbnail')}
              style={{
                width: 140,
                height: 80,
                objectFit: 'cover',
                borderRadius: 'var(--radius-sm)',
                flexShrink: 0,
              }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div style={{ flex: 1, padding: '0 12px' }}>
              <div style={{
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 4,
                color: 'var(--text-primary)',
              }}>
                {info.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                <i className="ti ti-user" style={{ marginRight: 4 }} />
                {info.uploader || t('unknownArtist')}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <i className="ti ti-clock" />
                {t('ytTrimTotalDuration')} {fmt(info.duration)}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {t('ytTrimTitle')}
          </div>
          <div
            data-testid="youtube-trim-controls"
            className="youtube-trim-controls"
            style={{
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('ytTrimDuration')}{' '}
                <strong style={{ color: 'var(--accent)' }}>{fmt(end - start)}</strong>
              </span>
              <button
                className="btn-ghost btn-sm"
                onClick={() => { setStart(0); setEnd(info?.duration || 0) }}
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <i className="ti ti-refresh" /> {t('ytTrimSelectAll')}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 4,
                }}>
                  {t('start')} : {fmt(start)}
                </label>
                <input
                  type="range"
                  min="0"
                  max={info?.duration || 0}
                  step="0.5"
                  value={start}
                  onChange={(e) => setStart(Math.min(Number(e.target.value), end - 1))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
              <div>
                <label style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  display: 'block',
                  marginBottom: 4,
                }}>
                  {t('end')} : {fmt(end)}
                </label>
                <input
                  type="range"
                  min="0"
                  max={info?.duration || 0}
                  step="0.5"
                  value={end}
                  onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 1))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}>
                {t('ytPreciseStart')}
              </label>
              <input
                type="number"
                min="0"
                max={info?.duration}
                step="0.5"
                value={start}
                onChange={(e) => setStart(Math.max(0, Math.min(Number(e.target.value), end - 1)))}
                className="input-sm"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            </div>
            <div>
              <label style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4,
              }}>
                {t('ytPreciseEnd')}
              </label>
              <input
                type="number"
                min="0"
                max={info?.duration}
                step="0.5"
                value={end}
                onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 1))}
                className="input-sm"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn-secondary btn-lg"
            onClick={onBack}
            style={{ borderRadius: 'var(--radius-md)', minWidth: 120 }}
          >
            <i className="ti ti-arrow-left" /> {t('ytBack')}
          </button>
          <button
            data-testid="youtube-download-button"
            className="youtube-download-button btn-primary btn-lg"
            onClick={onDownload}
            disabled={importing || !info}
            style={{ borderRadius: 'var(--radius-md)', minWidth: 180 }}
          >
            {importing ? (
              <>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />{' '}
                {t('ytDownloading')}
              </>
            ) : (
              <>
                <i className="ti ti-download" /> {t('downloadAudio')}
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}