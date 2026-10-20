/**
 * @file Two placeholder views shown before the URL input becomes available:
 *
 * 1. **`CheckingView`** — a blank page with just the header. Shown while
 *    `yt-dlp` is being detected (the parent also renders a
 *    `<LoadingOverlay>` on top of it).
 * 2. **`MissingYtdlpView`** — a "yt-dlp required" screen with an
 *    "Install automatically" button. Shown when yt-dlp isn't found and
 *    the user hasn't installed it yet.
 *
 * Both views share the same header (`PageHeader`) as the rest of the
 * flow so the UI feels continuous.
 *
 * @see ../YouTube.jsx — parent (renders these based on `effectiveStatus`)
 * @see ./PageHeader.jsx — the shared header component
 */

import { useLanguage } from '@core/i18n/LanguageContext'
import PageHeader from './PageHeader'

/**
 * Placeholder view shown while the app checks whether yt-dlp is
 * installed. The parent overlays a `<LoadingOverlay>` on top of it.
 *
 * @returns {JSX.Element}
 */
export function CheckingView() {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader title={t('youtubeTitle')} sub={t('youtubeSub')} />
    </div>
  )
}

/**
 * View shown when yt-dlp isn't installed. Offers a one-click install
 * (the parent calls `electronAPI.downloadYtdlp()`) and a fallback hint
 * about manual install.
 *
 * @param {Object} props
 * @param {() => void} props.onInstall - Called when the user clicks "Install".
 * @param {boolean} props.downloading - Whether a download is in progress
 *   (disables the button and swaps its label to "Installing…").
 * @returns {JSX.Element}
 */
export function MissingYtdlpView({ onInstall, downloading }) {
  const { t } = useLanguage()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader title={t('youtubeTitle')} sub={t('youtubeSub')} />
      <div className="flex-center" style={{ flex: 1, padding: 40 }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {t('ytdlpRequired')}
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginBottom: 24,
            lineHeight: 1.7,
          }}>
            {t('ytdlpDesc')}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
            <button
              className="btn-primary btn-lg"
              onClick={onInstall}
              disabled={downloading}
              style={{ borderRadius: 'var(--radius-md)', padding: '10px 24px' }}
            >
              {downloading ? (
                <>
                  <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />{' '}
                  {t('installing')}
                </>
              ) : (
                <>
                  <i className="ti ti-download" /> {t('installYtdlp')}
                </>
              )}
            </button>
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            padding: '10px 14px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            lineHeight: 1.6,
            textAlign: 'left',
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6, color: 'var(--accent)' }} />
            {t('ytdlpManual')}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}