// src/features/editor/components/Modals/ExportModal.jsx
import React, { useState } from 'react'

export default function ExportModal({ isOpen, onClose, onExport, totalDuration, tr }) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState('wav')
  const [bitrate, setBitrate] = useState(320)
  const [profiles, setProfiles] = useState([])
  const [selectedProfiles, setSelectedProfiles] = useState(['all'])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onExport?.({
      name: name || 'export',
      format,
      bitrate,
      profiles: selectedProfiles
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 450, maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-file-export" style={{ color: 'var(--accent)' }} />
          {tr('editorExportTitle') || 'Exporter le mix'}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('editorExportNamePlaceholder') || 'Nom du son'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr('editorExportNamePlaceholder') || 'Nom du son'}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {tr('compressionFormat') || 'Format'}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="wav">WAV (sans perte)</option>
                <option value="mp3">MP3</option>
                <option value="aac">AAC</option>
                <option value="flac">FLAC (sans perte)</option>
                <option value="ogg">OGG</option>
              </select>
            </div>

            {format !== 'wav' && format !== 'flac' && (
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {tr('compressionBitrate') || 'Bitrate'}
                </label>
                <select
                  value={bitrate}
                  onChange={(e) => setBitrate(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                >
                  <option value="96">96 kbps</option>
                  <option value="128">128 kbps</option>
                  <option value="192">192 kbps</option>
                  <option value="256">256 kbps</option>
                  <option value="320">320 kbps {tr('compressionBitrateRecommended') || '(recommandé)'}</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('editorProfilesLabel') || 'Ajouter au(x) profil(s)'}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profiles.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={selectedProfiles.includes(p.id)}
                    onChange={() => {
                      if (selectedProfiles.includes(p.id)) {
                        setSelectedProfiles(selectedProfiles.filter(id => id !== p.id))
                      } else {
                        setSelectedProfiles([...selectedProfiles, p.id])
                      }
                    }}
                    style={{ accentColor: 'var(--accent)', width: 'auto' }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            padding: 8,
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 12
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
            {tr('editorExportNote') || 'Le mix sera exporté en un seul fichier audio et ajouté à votre bibliothèque SoundDeck.'}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {tr('cancel') || 'Annuler'}
            </button>
            <button type="submit" className="btn-primary">
              <i className="ti ti-download" /> {tr('editorExport') || 'Exporter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}