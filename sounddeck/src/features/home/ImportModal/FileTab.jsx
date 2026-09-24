// src/features/home/ImportModal/FileTab.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import CompressionOptions from './CompressionOptions'

export default function FileTab({
  dragOver,
  setDragOver,
  onDrop,
  onOpenDialog,
  onClose,
  compressOnImport,
  setCompressOnImport,
  compressionBitrate,
  setCompressionBitrate,
}) {
  const { t } = useLanguage()

  return (
    <>
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }}
        onDrop={onDrop}
        onClick={onOpenDialog}
        style={{ cursor: 'pointer', padding: '32px' }}
      >
        <i className="ti ti-upload" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
        <div style={{
          fontWeight: 600,
          marginBottom: 6,
          fontSize: 14,
          color: dragOver ? 'var(--accent)' : 'var(--text-primary)',
        }}>
          {dragOver ? t('releaseToImport') : t('dropFiles')}
        </div>
        <div style={{ fontSize: 12, marginBottom: 12 }}>
          MP3, WAV, OGG, FLAC, M4A
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 8,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}>
          <i className="ti ti-folder-open" /> {t('orBrowse')}
        </div>
      </div>

      <CompressionOptions
        compressOnImport={compressOnImport}
        setCompressOnImport={setCompressOnImport}
        compressionBitrate={compressionBitrate}
        setCompressionBitrate={setCompressionBitrate}
      />

      <div className="modal-actions">
        <button className="btn-secondary btn-lg" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </>
  )
}