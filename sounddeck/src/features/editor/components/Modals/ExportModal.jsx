// src/features/editor/components/Modals/ExportModal.jsx
import React, { useState, useEffect } from 'react'

export default function ExportModal({ 
  isOpen, 
  onClose, 
  onExport, 
  totalDuration, 
  tr,
  store,
  defaultName = '',
  defaultFormat = 'mp3',
  defaultBitrate = 192
}) {
  const [name, setName] = useState(defaultName)
  const [format, setFormat] = useState(defaultFormat)
  const [bitrate, setBitrate] = useState(defaultBitrate)
  const [profiles, setProfiles] = useState([])
  const [selectedProfiles, setSelectedProfiles] = useState(['all'])
  const [isExporting, setIsExporting] = useState(false)
  const [exportLocation, setExportLocation] = useState('library') // 'library' | 'file' | 'both'

  // ✅ Charger les profils depuis le store
  useEffect(() => {
    if (store?.profiles) {
      const allProfiles = store.profiles.filter(p => p.id !== 'all')
      setProfiles(allProfiles)
      setSelectedProfiles(['all', ...allProfiles.map(p => p.id)])
    }
  }, [store])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      alert(tr('editorNameRequired') || 'Veuillez entrer un nom')
      return
    }

    setIsExporting(true)
    try {
      // ✅ Générer un nom de fichier sécurisé
      const safeName = name.trim().replace(/[^a-zA-Z0-9]/g, '_')
      const outputPath = `${safeName}_${Date.now()}.${format === 'wav' ? 'wav' : format}`
      
      // ✅ Passer les informations correctement
      const result = await onExport({
        name: name.trim(),
        format,
        bitrate,
        profiles: selectedProfiles,
        outputPath: outputPath,
        exportLocation
      })
      
      if (result?.success) {
        // Le toast est géré dans Editor.jsx
      }
    } catch (err) {
      console.error('❌ Erreur export:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const toggleProfile = (profileId) => {
    setSelectedProfiles(prev => {
      if (prev.includes(profileId)) {
        return prev.filter(id => id !== profileId)
      } else {
        return [...prev, profileId]
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 450, maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-file-export" style={{ color: 'var(--accent)' }} />
          {tr('editorExportTitle') || 'Exporter le mix'}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nom */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('editorExportNamePlaceholder') || 'Nom du son'} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr('editorExportNamePlaceholder') || 'Nom du son'}
              autoFocus
              required
              className="input-lg"
              style={{ borderRadius: 'var(--radius-md)' }}
            />
          </div>

          {/* Format et Bitrate */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {tr('compressionFormat') || 'Format'}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{ width: '100%' }}
                className="input-lg"
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
                  className="input-lg"
                >
                  <option value="96">96 kbps</option>
                  <option value="128">128 kbps</option>
                  <option value="192">192 kbps {tr('compressionBitrateRecommended') || '(recommandé)'}</option>
                  <option value="256">256 kbps</option>
                  <option value="320">320 kbps</option>
                </select>
              </div>
            )}
          </div>

          {/* Emplacement d'export */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {tr('exportLocation') || 'Emplacement d\'export'}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${exportLocation === 'library' ? 'var(--accent)' : 'var(--border)'}`,
                background: exportLocation === 'library' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                cursor: 'pointer',
                fontSize: 12
              }}>
                <input
                  type="radio"
                  name="exportLocation"
                  value="library"
                  checked={exportLocation === 'library'}
                  onChange={() => setExportLocation('library')}
                  style={{ width: 'auto', accentColor: 'var(--accent)' }}
                />
                {tr('exportAddOnly') || '📚 Ajouter à la bibliothèque'}
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${exportLocation === 'file' ? 'var(--accent)' : 'var(--border)'}`,
                background: exportLocation === 'file' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                cursor: 'pointer',
                fontSize: 12
              }}>
                <input
                  type="radio"
                  name="exportLocation"
                  value="file"
                  checked={exportLocation === 'file'}
                  onChange={() => setExportLocation('file')}
                  style={{ width: 'auto', accentColor: 'var(--accent)' }}
                />
                {tr('exportActionExportOnly') || '📁 Exporter le fichier'}
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${exportLocation === 'both' ? 'var(--accent)' : 'var(--border)'}`,
                background: exportLocation === 'both' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                cursor: 'pointer',
                fontSize: 12
              }}>
                <input
                  type="radio"
                  name="exportLocation"
                  value="both"
                  checked={exportLocation === 'both'}
                  onChange={() => setExportLocation('both')}
                  style={{ width: 'auto', accentColor: 'var(--accent)' }}
                />
                {tr('exportActionBoth') || '📁📚 Exporter ET ajouter'}
              </label>
            </div>
          </div>

          {/* Profils */}
          {profiles.length > 0 && exportLocation !== 'file' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {tr('editorProfilesLabel') || 'Ajouter au(x) profil(s)'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profiles.map(p => (
                  <label key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${selectedProfiles.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                    background: selectedProfiles.includes(p.id) ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    fontSize: 12
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedProfiles.includes(p.id)}
                      onChange={() => toggleProfile(p.id)}
                      style={{ width: 'auto', accentColor: 'var(--accent)' }}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            padding: '8px 12px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 12,
            border: '1px solid var(--border)'
          }}>
            <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
            {exportLocation === 'file' && '📁 Le fichier sera sauvegardé dans votre dossier de téléchargements.'}
            {exportLocation === 'library' && '📚 Le son sera ajouté à votre bibliothèque SoundDeck.'}
            {exportLocation === 'both' && '📁📚 Le fichier sera sauvegardé ET ajouté à SoundDeck.'}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isExporting}>
              {tr('cancel') || 'Annuler'}
            </button>
            <button type="submit" className="btn-primary" disabled={isExporting || !name.trim()}>
              {isExporting ? (
                <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('editorExporting') || 'Export...'}</>
              ) : (
                <><i className="ti ti-download" /> {tr('editorExport') || 'Exporter'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}