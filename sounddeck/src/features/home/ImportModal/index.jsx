/**
 * @file Import modal shell (tab switcher).
 *
 * Owns the shared `compressOnImport` / `compressionBitrate` state so the
 * 3 tabs (file / manual / URL) stay in sync even when the user switches
 * tabs mid-flow.
 *
 * @see ./FileTab.jsx
 * @see ./ManualTab.jsx
 * @see ./UrlTab.jsx
 * @see ./CompressionOptions.jsx
 */

import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import FileTab from './FileTab'
import ManualTab from './ManualTab'
import UrlTab from './UrlTab'

/**
 * Import modal.
 *
 * @param {Object} props
 * @param {() => void} props.onClose
 * @param {() => void} props.onOpenDialog
 * @param {(e: DragEvent) => void} props.onDrop
 * @param {boolean} props.dragOver
 * @param {(b: boolean) => void} props.setDragOver
 * @param {(url: string, name: string) => void} props.onUrlImport
 * @param {(name: string, path: string, imagePath: string|null, emoji: string) => void} props.onManualAdd
 * @param {Object} [props.store]
 * @returns {JSX.Element}
 */
export default function ImportModal({
  onClose,
  onOpenDialog,
  onDrop,
  dragOver,
  setDragOver,
  onUrlImport,
  onManualAdd,
  store,
}) {
  const { t } = useLanguage()
  const [tab, setTab] = useState('file')

  // Compression state shared between the 3 tabs
  const [compressOnImport, setCompressOnImport] = useState(
    store?.compressOnImport || false
  )
  const [compressionBitrate, setCompressionBitrate] = useState(
    store?.compressionBitrate || 128
  )

  const tabs = [
    ['file', 'ti-upload', t('tabDrop')],
    ['manual', 'ti-settings', t('tabManual')],
    ['url', 'ti-link', t('tabUrl')],
  ]

  const sharedCompressionProps = {
    compressOnImport,
    setCompressOnImport,
    compressionBitrate,
    setCompressionBitrate,
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title">
          <i
            className="ti ti-music-plus"
            style={{ color: 'var(--accent)' }}
          />{' '}
          {t('addSoundTitle')}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 16,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
            padding: 4,
          }}
        >
          {tabs.map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                background: tab === id ? 'var(--bg-secondary)' : 'transparent',
                color:
                  tab === id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: tab === id ? 500 : 400,
                cursor: 'pointer',
              }}
            >
              <i className={`ti ${icon}`} style={{ marginRight: 4 }} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'file' && (
          <FileTab
            dragOver={dragOver}
            setDragOver={setDragOver}
            onDrop={onDrop}
            onOpenDialog={onOpenDialog}
            onClose={onClose}
            {...sharedCompressionProps}
          />
        )}

        {tab === 'manual' && (
          <ManualTab
            onClose={onClose}
            onManualAdd={onManualAdd}
            {...sharedCompressionProps}
          />
        )}

        {tab === 'url' && (
          <UrlTab
            onClose={onClose}
            onUrlImport={onUrlImport}
            {...sharedCompressionProps}
          />
        )}
      </div>
    </div>
  )
}