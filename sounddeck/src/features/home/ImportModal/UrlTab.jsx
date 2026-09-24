// src/features/home/ImportModal/UrlTab.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import CompressionOptions from './CompressionOptions'

export default function UrlTab({
  onClose,
  onUrlImport,
  compressOnImport,
  setCompressOnImport,
  compressionBitrate,
  setCompressionBitrate,
}) {
  const { t } = useLanguage()
  const [url, setUrl] = useState('')
  const [urlName, setUrlName] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
          {t('soundName')}
        </label>
        <input
          value={urlName}
          onChange={e => setUrlName(e.target.value)}
          placeholder="Ex: Airhorn"
        />
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
          {t('urlLabel')}
        </label>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={t('urlPlaceholder')}
        />
      </div>

      <CompressionOptions
        compressOnImport={compressOnImport}
        setCompressOnImport={setCompressOnImport}
        compressionBitrate={compressionBitrate}
        setCompressionBitrate={setCompressionBitrate}
      />

      <div style={{
        fontSize: 11,
        color: 'var(--text-tertiary)',
        background: 'var(--bg-tertiary)',
        borderRadius: 6,
        padding: '8px 10px',
        lineHeight: 1.6,
      }}>
        <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
        <strong>{t('supportedLinks')} :</strong> {t('urlInfo')}<br />
        <strong>⚠️ Google Drive :</strong> {t('urlWarning')}
      </div>

      <div className="modal-actions">
        <button className="btn-secondary btn-lg" onClick={onClose}>
          {t('cancel')}
        </button>
        <button
          className="btn-primary btn-lg"
          onClick={() => url && urlName && onUrlImport(url, urlName)}
          disabled={!url || !urlName}
        >
          <i className="ti ti-download" /> {t('download')}
        </button>
      </div>
    </div>
  )
}