// src/features/home/ImportModal/CompressionOptions.jsx
import { useLanguage } from '@core/i18n/LanguageContext'

export default function CompressionOptions({
  compressOnImport,
  setCompressOnImport,
  compressionBitrate,
  setCompressionBitrate,
}) {
  const { t } = useLanguage()

  return (
    <div style={{
      padding: '8px 12px',
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      marginTop: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={compressOnImport}
          onChange={e => setCompressOnImport(e.target.checked)}
          style={{ width: 'auto', accentColor: 'var(--accent)' }}
        />
        <label style={{ fontSize: 12, cursor: 'pointer' }}>
          <i className="ti ti-file-zip" style={{ marginRight: 4 }} />
          {t('compressOnImport')}
        </label>
      </div>

      {compressOnImport && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {t('compressionBitrate')}:
          </span>
          <select
            value={compressionBitrate}
            onChange={e => setCompressionBitrate(Number(e.target.value))}
            style={{ width: 120, fontSize: 12 }}
          >
            <option value="64">64 kbps</option>
            <option value="96">96 kbps</option>
            <option value="128">128 kbps</option>
            <option value="192">192 kbps</option>
            <option value="256">256 kbps</option>
          </select>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
            ({t('compressOnImportDesc')})
          </span>
        </div>
      )}
    </div>
  )
}