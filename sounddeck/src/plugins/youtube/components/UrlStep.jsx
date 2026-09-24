// src/plugins/youtube/components/UrlStep.jsx
import React from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import PageHeader from './PageHeader'

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
              value={isTutorialMode ? 'https://www.youtube.com/watch?v=a5uQMwRMHcs' : url}
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