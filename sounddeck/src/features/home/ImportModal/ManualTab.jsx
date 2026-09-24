// src/features/home/ImportModal/ManualTab.jsx
import { useState } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'
import { buildFileUrl } from '@shared/utils/fileUrl'
import AudioTrimmer from '@shared/components/audio/AudioTrimmer'
import EmojiPicker from '@shared/components/ui/EmojiPicker'
import CompressionOptions from './CompressionOptions'

export default function ManualTab({
  onClose,
  onManualAdd,
  compressOnImport,
  setCompressOnImport,
  compressionBitrate,
  setCompressionBitrate,
}) {
  const { t } = useLanguage()
  const [manualName, setManualName] = useState('')
  const [manualFile, setManualFile] = useState(null)
  const [manualImage, setManualImage] = useState(null)
  const [manualEmoji, setManualEmoji] = useState('🔊')
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handlePickFile = async () => {
    const paths = await window.electronAPI.openFileDialog()
    if (paths[0]) {
      const result = await window.electronAPI.importSoundFile(paths[0])
      if (result.success) {
        setManualFile(result)
        if (!manualName) setManualName(result.name)
      }
    }
  }

  const handlePickImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) setManualImage(result.path)
    }
  }

  const handleManualAdd = async (finalPath) => {
    await onManualAdd(manualName, finalPath || manualFile.path, manualImage, manualEmoji)
  }

  if (showTrimmer && manualFile) {
    return (
      <AudioTrimmer
        filePath={manualFile.path}
        onConfirm={async (trimmedPath) => {
          setShowTrimmer(false)
          if (trimmedPath !== manualFile.path) {
            setManualFile({ ...manualFile, path: trimmedPath })
          }
        }}
        onCancel={() => setShowTrimmer(false)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
          {t('soundName')}
        </label>
        <input
          value={manualName}
          onChange={e => setManualName(e.target.value)}
          placeholder="Ex: Airhorn"
        />
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
          {t('audioFile')}
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            readOnly
            value={manualFile ? manualFile.name : ''}
            placeholder={t('noFile')}
            style={{ flex: 1 }}
          />
          <button className="btn-secondary btn-sm" onClick={handlePickFile}>
            <i className="ti ti-folder-open" /> {t('browse')}
          </button>
        </div>
      </div>

      {manualFile && (
        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowTrimmer(true)}
          style={{ justifyContent: 'center' }}
        >
          <i className="ti ti-cut" /> {t('trimAudio')}
        </button>
      )}

      <div>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
          {t('image')}
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {manualImage && (
            <img
              src={buildFileUrl(manualImage)}
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <input
            readOnly
            value={manualImage ? t('imageSelected') : ''}
            placeholder={t('noImage')}
            style={{ flex: 1 }}
          />
          <button className="btn-secondary btn-sm" onClick={handlePickImage}>
            <i className="ti ti-photo" /> {t('image')}
          </button>
          {manualImage && (
            <button className="btn-ghost btn-sm" onClick={() => setManualImage(null)}>
              <i className="ti ti-x" />
            </button>
          )}
        </div>
      </div>

      {!manualImage && (
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            {t('emojiLabel')}
          </label>
          <button
            data-testid="import-modal-emoji-picker-button"
            onClick={() => setShowEmojiPicker(true)}
            className="btn-secondary"
            style={{
              width: 60,
              height: 60,
              justifyContent: 'center',
              fontSize: 28,
              borderRadius: 'var(--radius-md)',
            }}
          >
            {manualEmoji || '🔊'}
          </button>
          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            currentEmoji={manualEmoji}
            onSelect={(e) => {
              setManualEmoji(e)
              setShowEmojiPicker(false)
            }}
            onManageClick={() => window.__navigateTo?.('emoji')}
          />
        </div>
      )}

      <CompressionOptions
        compressOnImport={compressOnImport}
        setCompressOnImport={setCompressOnImport}
        compressionBitrate={compressionBitrate}
        setCompressionBitrate={setCompressionBitrate}
      />

      <div className="modal-actions">
        <button className="btn-secondary btn-lg" onClick={onClose}>
          {t('cancel')}
        </button>
        <button
          className="btn-primary btn-lg"
          onClick={() => handleManualAdd(null)}
          disabled={!manualFile || !manualName}
        >
          <i className="ti ti-check" /> {t('add')}
        </button>
      </div>
    </div>
  )
}