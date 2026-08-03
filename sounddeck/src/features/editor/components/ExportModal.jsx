// src/pages/editor/components/ExportModal.jsx
import { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

export default function ExportModal({ 
  onExport, 
  onCancel, 
  store, 
  defaultName = 'Mon mix',
  defaultFormat = 'mp3'
}) {
  const { t } = useLanguage()
  
  const [exportName, setExportName] = useState(defaultName)
  const [exportFormat, setExportFormat] = useState(defaultFormat)
  const [exportBitrate, setExportBitrate] = useState(192)
  const [selectedProfiles, setSelectedProfiles] = useState(['all'])
  const [isExporting, setIsExporting] = useState(false)
  
  const [actionMode, setActionMode] = useState('both')

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedFormat = await window.electronAPI.storeGet('exportFormat')
        if (savedFormat) setExportFormat(savedFormat)
        
        const savedBitrate = await window.electronAPI.storeGet('exportBitrate')
        if (savedBitrate) setExportBitrate(savedBitrate)
        
        const savedProfiles = await window.electronAPI.storeGet('exportProfiles')
        if (savedProfiles && savedProfiles.length > 0) {
          setSelectedProfiles(savedProfiles)
        }
        
        const savedActionMode = await window.electronAPI.storeGet('exportActionMode')
        if (savedActionMode) setActionMode(savedActionMode)
      } catch (e) {
        console.warn('Erreur chargement préférences export:', e)
      }
    }
    loadPreferences()
  }, [])

  const handleExport = async () => {
    console.log('🚀 [ExportModal] handleExport début')
    setIsExporting(true)
    
    try {
        const shouldExport = actionMode === 'export_only' || actionMode === 'both'
        const shouldAddToLibrary = actionMode === 'add_to_library' || actionMode === 'both'
        
        console.log(`📋 [ExportModal] actionMode: ${actionMode}, shouldExport: ${shouldExport}, shouldAddToLibrary: ${shouldAddToLibrary}`)
        
        let exportResult = null
        let outputPath = null
        
        if (shouldExport) {
        const fileName = `${exportName}.${exportFormat}`
        console.log(`📁 [ExportModal] Demande de sauvegarde: ${fileName}`)
        
        const result = await window.electronAPI.saveFileDialog(fileName, null)
        console.log(`📁 [ExportModal] saveFileDialog résultat:`, result)
        
        // ✅ CORRECTION : Vérifier canceled (pas success)
        if (!result.success || !result.path) {
            console.log('❌ [ExportModal] Annulé par l\'utilisateur')
            setIsExporting(false)
            return
        }
        outputPath = result.path || result.filePath
        console.log(`✅ [ExportModal] Chemin sélectionné: ${outputPath}`)
        
        await window.electronAPI.storeSet('exportFormat', exportFormat)
        await window.electronAPI.storeSet('exportBitrate', exportBitrate)
        await window.electronAPI.storeSet('exportActionMode', actionMode)
        
        console.log('📤 [ExportModal] Appel de onExport...')
        exportResult = await onExport({
            outputPath,
            format: exportFormat,
            bitrate: exportBitrate,
            name: exportName,
            addToLibrary: shouldAddToLibrary,
            profiles: shouldAddToLibrary ? selectedProfiles : []
        })
        console.log(`📤 [ExportModal] onExport terminé, résultat:`, exportResult)
        
        } else if (shouldAddToLibrary) {
        const soundsDir = await window.electronAPI.getSoundsDir()
        const fileName = `${exportName}_${Date.now()}.${exportFormat}`
        const tempPath = `${soundsDir}/${fileName}`
        console.log(`📁 [ExportModal] Export temporaire: ${tempPath}`)
        
        await window.electronAPI.storeSet('exportActionMode', actionMode)
        
        exportResult = await onExport({
            outputPath: tempPath,
            format: exportFormat,
            bitrate: exportBitrate,
            name: exportName,
            addToLibrary: true,
            profiles: selectedProfiles,
            deleteAfterAdd: true
        })
        console.log(`📤 [ExportModal] onExport (temp) terminé, résultat:`, exportResult)
        }
        
        if (exportResult?.success) {
        console.log('✅ [ExportModal] Export réussi, fermeture de la popup')
        setIsExporting(false)
        onCancel(true)
        return
        } else {
        console.error('❌ [ExportModal] Export échoué:', exportResult?.error)
        setIsExporting(false)
        return
        }
        
    } catch (e) {
        console.error('❌ [ExportModal] Erreur:', e)
        setIsExporting(false)
    }
    }

  const profiles = store.profiles || []
  
  const isProfileSelected = (profileId) => {
    if (profileId === 'all') {
      return selectedProfiles.includes('all') || selectedProfiles.length === 0
    }
    return selectedProfiles.includes(profileId) || selectedProfiles.includes('all')
  }

  const toggleProfile = (profileId) => {
    if (profileId === 'all') {
      if (selectedProfiles.includes('all')) {
        setSelectedProfiles([])
      } else {
        setSelectedProfiles(['all'])
      }
      return
    }
    
    setSelectedProfiles(prev => {
      const newSelection = prev.filter(id => id !== 'all')
      if (newSelection.includes(profileId)) {
        return newSelection.filter(id => id !== profileId)
      } else {
        return [...newSelection, profileId]
      }
    })
  }

  return (
    <div className="modal-overlay" onClick={() => onCancel(false)}>
      <div className="modal" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-package-export" style={{ color: 'var(--accent)' }} />
          {t('editorExportTitle')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              {t('soundName')} *
            </label>
            <input
              value={exportName}
              onChange={e => setExportName(e.target.value)}
              placeholder={t('editorExportNamePlaceholder')}
              className="input-lg"
              style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {t('editorExportFormat')}
              </label>
              <select
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value)}
                style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
                <option value="ogg">OGG</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {t('editorExportQuality')}
              </label>
              <select
                value={exportBitrate}
                onChange={e => setExportBitrate(Number(e.target.value))}
                style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="128">128 kbps</option>
                <option value="192">192 kbps</option>
                <option value="256">256 kbps</option>
                <option value="320">320 kbps</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              {t('exportActionLabel') || 'Que voulez-vous faire ?'}
            </label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: `2px solid ${actionMode === 'export_only' ? 'var(--accent)' : 'var(--border)'}`,
                  background: actionMode === 'export_only' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  transition: 'all 0.15s'
                }}
                onClick={() => setActionMode('export_only')}
              >
                <input
                  type="radio"
                  name="action-mode"
                  checked={actionMode === 'export_only'}
                  onChange={() => setActionMode('export_only')}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    📁 {t('exportActionExportOnly') || 'Exporter le fichier uniquement'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {t('exportActionExportOnlyDesc') || 'Sauvegarder le fichier audio dans un dossier de votre choix'}
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: `2px solid ${actionMode === 'add_to_library' ? 'var(--accent)' : 'var(--border)'}`,
                  background: actionMode === 'add_to_library' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  transition: 'all 0.15s'
                }}
                onClick={() => setActionMode('add_to_library')}
              >
                <input
                  type="radio"
                  name="action-mode"
                  checked={actionMode === 'add_to_library'}
                  onChange={() => setActionMode('add_to_library')}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    📚 {t('exportActionAddOnly') || 'Ajouter à la bibliothèque uniquement'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {t('exportActionAddOnlyDesc') || 'Ajouter le son directement dans SoundDeck, sans exporter de fichier'}
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  border: `2px solid ${actionMode === 'both' ? 'var(--accent)' : 'var(--border)'}`,
                  background: actionMode === 'both' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  transition: 'all 0.15s'
                }}
                onClick={() => setActionMode('both')}
              >
                <input
                  type="radio"
                  name="action-mode"
                  checked={actionMode === 'both'}
                  onChange={() => setActionMode('both')}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    📁📚 {t('exportActionBoth') || 'Exporter ET ajouter à la bibliothèque'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {t('exportActionBothDesc') || 'Sauvegarder le fichier ET l\'ajouter à SoundDeck'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {(actionMode === 'add_to_library' || actionMode === 'both') && (
            <div style={{ 
              padding: '10px 12px', 
              background: 'var(--bg-tertiary)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                <i className="ti ti-users" style={{ marginRight: 4 }} />
                {t('exportProfiles')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {profiles.map(p => {
                  const isSelected = isProfileSelected(p.id)
                  return (
                    <label
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                        background: isSelected ? 'var(--accent-light)' : 'transparent',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'transparent'
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProfile(p.id)}
                        style={{ accentColor: 'var(--accent)', width: 'auto' }}
                      />
                      <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ fontSize: 12 }}>{p.id === 'all' ? t('allSounds') : p.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button
            className="btn-secondary btn-lg"
            onClick={() => {
              console.log('❌ [ExportModal] Annulation par l\'utilisateur')
              onCancel(false)
            }}
            disabled={isExporting}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <i className="ti ti-x" /> {t('cancel')}
          </button>
          <button
            className="btn-primary btn-lg"
            onClick={handleExport}
            disabled={isExporting || !exportName.trim()}
            style={{ 
              borderRadius: 'var(--radius-md)',
              opacity: isExporting || !exportName.trim() ? 0.5 : 1
            }}
          >
            {isExporting ? (
              <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('editorExporting')}</>
            ) : (
              <><i className="ti ti-check" /> {t('editorExport')}</>
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}