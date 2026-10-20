/**
 * @file Step 1 of the YouTube import flow — URL input.
 *
 * Renders a URL input + a "Load" button. On click, calls `onFetchInfo`
 * (defined in the parent), which detects the platform (YouTube / Spotify
 * / SoundCloud), fetches the video metadata, and advances to `TrimStep`.
 *
 * Tutorial mode: the URL is replaced by a hardcoded demo URL, the input
 * is disabled, and the Load button is always enabled (so the tutorial
 * can simulate the full flow).
 *
 * The `resetKey` prop is used as a React `key` to remount the component
 * when a "reset" is triggered externally (`youtube-force-reset` event) —
 * this clears the input's internal focus/selection state.
 *
 * @see ../YouTube.jsx — parent (defines `onFetchInfo`)
 * @see ./TrimStep.jsx — next step
 */

import { useLanguage } from '@core/i18n/LanguageContext'
import PageHeader from './PageHeader'

/** Demo URL used when the tutorial is active. */
const TUTORIAL_URL = 'https://www.youtube.com/watch?v=a5uQMwRMHcs'

/**
 * URL input step.
 *
 * @param {Object} props
 * @param {number} props.resetKey - Remount key (bumped by parent on reset).
 * @param {boolean} props.isTutorialMode - Whether the tutorial is active.
 * @param {string} props.url - Controlled URL value.
 * @param {(url: string) => void} props.setUrl - URL setter.
 * @param {boolean} props.loadingInfo - Whether a fetch is in progress.
 * @param {() => void} props.onFetchInfo - Called on Load click / Enter.
 * @returns {JSX.Element}
 */
export default function UrlStep({
  resetKey,
  isTutorialMode,
  url,
  setUrl,
  loadingInfo,
  onFetchInfo,
}) {
  const { t } = useLanguage()

  return (
    <div
      key={resetKey}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      <PageHeader
        title={t('youtubeTitle')}
        sub={
          isTutorialMode
            ? '🎬 ' + t('tutorialMode') + ' - ' + t('pasteUrl')
            : t('pasteUrl')
        }
      />
      <div className="flex-center" style={{ flex: 1, padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <div style={{ fontSize: 56, textAlign: 'center', marginBottom: 20 }}>▶️</div>
          <div style={{
            fontWeight: 600,
            fontSize: 16,
            marginBottom: 16,
            textAlign: 'center',
          }}>
            {isTutorialMode ? '🔗 ' + t('ytUrlPlaceholder') : t('pasteUrl')}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              data-testid="youtube-url-input"
              className="youtube-url-input"
              value={isTutorialMode ? TUTORIAL_URL : url}
              onChange={(e) => !isTutorialMode && setUrl(e.target.value)}
              placeholder={t('ytUrlPlaceholder')}
              style={{ flex: 1, fontSize: 13, borderRadius: 'var(--radius-md)' }}
              autoFocus
              disabled={isTutorialMode}
            />
            <button
              data-testid="youtube-load-button"
              className="youtube-load-button btn-primary btn-lg"
              onClick={onFetchInfo}
              disabled={isTutorialMode ? false : (!url.trim() || loadingInfo)}
              style={{ flexShrink: 0, borderRadius: 'var(--radius-md)', minWidth: 120 }}
            >
              {loadingInfo ? (
                <>
                  <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />{' '}
                  {t('loading2')}
                </>
              ) : (
                <>
                  <i className="ti ti-search" /> {t('load')}
                </>
              )}
            </button>
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            lineHeight: 1.6,
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
          }}>
            <i className="ti ti-shield-check" style={{ marginRight: 4, color: 'var(--success)' }} />
            {isTutorialMode
              ? '🎬 ' + t('tutorialMode') + ' - ' + t('ytUrlNote')
              : t('ytUrlNote')}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}