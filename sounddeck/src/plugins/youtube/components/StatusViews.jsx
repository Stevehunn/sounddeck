// src/plugins/youtube/components/StatusViews.jsx
import React from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import PageHeader from './PageHeader'

/**
 * Vue "Vérification de yt-dlp en cours"
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
 * Vue "yt-dlp manquant → installer"
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