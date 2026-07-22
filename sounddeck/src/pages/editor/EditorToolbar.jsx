import { useState, useRef, useEffect } from 'react'
import EditorMetronome from './EditorMetronome'
import { useLanguage } from '../../context/LanguageContext'

export default function EditorToolbar({
  isPlaying,
  isPaused,
  currentTime,
  totalDuration,
  onPlay,
  onStop,
  onExport,
  onAddTrack,
  onAddClip,
  onAddClipFromFile,
  tracks,
  sounds,
  isLoading,
  isExporting,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  snapEnabled,
  onToggleSnap,
  onSplit,
  canSplit,
  loopEnabled,
  onToggleLoop,
  projectName,
  onRenameProject,
  isPreviewingEffect,
  autoCrossfade,
  onToggleCrossfade,
  isDirty,
  isAutoSaving,
  metronomeEnabled,
  metronomeBpm,
  onMetronomeToggle,
  onMetronomeBpmChange
}) {
  const { t, currentLang } = useLanguage()
  const [showAddClip, setShowAddClip] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [selectedSoundId, setSelectedSoundId] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [newProjectName, setNewProjectName] = useState(projectName || 'Nouveau projet')
  const [importTrackId, setImportTrackId] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const dropdownRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setNewProjectName(projectName || 'Nouveau projet')
  }, [projectName])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAddClip(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleAddClipAction = () => {
    let trackId = selectedTrackId
    if (!trackId && tracks.length > 0) {
      trackId = tracks[0].id
      setSelectedTrackId(trackId)
    }

    if (!trackId) {
      alert(t('editorNoTracks'))
      return
    }

    if (!selectedSoundId) {
      alert(t('editorSelectSound'))
      return
    }

    onAddClip(trackId, selectedSoundId)
    setShowAddClip(false)
    setSelectedSoundId('')
  }

  const handleSoundSelect = (e) => {
    const soundId = e.target.value
    setSelectedSoundId(soundId)
    if (soundId && selectedTrackId) {
      onAddClip(selectedTrackId, soundId)
      setShowAddClip(false)
      setSelectedSoundId('')
    }
  }

  const handleAddFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const files = e.target.files
    if (files.length === 0) return

    const file = files[0]
    let filePath = file.path || file.webkitRelativePath
    
    if (!filePath) {
      try {
        const result = await window.electronAPI.openFileDialog()
        if (result && result.length > 0) {
          filePath = result[0]
        } else {
          if (fileInputRef.current) fileInputRef.current.value = ''
          return
        }
      } catch (err) {
        console.error('Erreur import fichier:', err)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    }

    if (tracks.length === 0) {
      alert(t('editorNoTracks'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    let trackId = selectedTrackId
    if (trackId && tracks.some(t => t.id === trackId)) {
      try {
        await onAddClipFromFile(trackId, filePath)
      } catch (err) {
        console.error('Erreur import fichier:', err)
        alert(t('editorFileImportError'))
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      return
    }

    if (tracks.length === 1) {
      try {
        await onAddClipFromFile(tracks[0].id, filePath)
        setSelectedTrackId(tracks[0].id)
      } catch (err) {
        console.error('Erreur import fichier:', err)
        alert(t('editorFileImportError'))
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      return
    }

    setPendingFile(filePath)
    setImportTrackId(tracks[0].id)
    setShowImportModal(true)
    
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const confirmImportWithTrack = async () => {
    if (!importTrackId) {
      alert(t('editorSelectTrack'))
      return
    }
    
    try {
      await onAddClipFromFile(importTrackId, pendingFile)
      setSelectedTrackId(importTrackId)
    } catch (err) {
      console.error('Erreur import fichier:', err)
      alert(t('editorFileImportError'))
    } finally {
      setShowImportModal(false)
      setPendingFile(null)
      setImportTrackId('')
    }
  }

  const handleRenameProject = () => {
    if (isRenaming) {
      if (newProjectName.trim()) {
        onRenameProject?.(newProjectName.trim())
      }
      setIsRenaming(false)
    } else {
      setIsRenaming(true)
    }
  }

  const getButtonState = () => {
    if (isPlaying) return { icon: 'ti-player-pause', label: t('editorPause'), color: 'var(--warning)' }
    if (isPaused) return { icon: 'ti-player-play', label: t('editorResume'), color: 'var(--accent)' }
    if (currentTime > 0) return { icon: 'ti-player-play', label: t('editorPlayFromStart'), color: 'var(--accent)' }
    return { icon: 'ti-player-play', label: t('editorPlay'), color: 'var(--accent)' }
  }

  const buttonState = getButtonState()

  return (
    <div style={{
      padding: '8px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      flexShrink: 0,
      position: 'relative'
    }}>
      {/* Nom du projet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}>
        {isRenaming ? (
          <input
            type="text"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameProject()
              if (e.key === 'Escape') {
                setIsRenaming(false)
                setNewProjectName(projectName || 'Nouveau projet')
              }
            }}
            onBlur={() => {
              if (newProjectName.trim()) {
                onRenameProject?.(newProjectName.trim())
              }
              setIsRenaming(false)
            }}
            autoFocus
            style={{
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              width: 150,
              color: 'var(--text-primary)'
            }}
          />
        ) : (
          <>
            <span
              onClick={handleRenameProject}
              style={{
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title={t('editorClickToRename')}
            >
              <i className="ti ti-pencil" style={{ fontSize: 12, color: 'var(--text-tertiary)', opacity: 0.6 }} />
              {projectName || 'Nouveau projet'}
            </span>
            {isAutoSaving ? (
              <span style={{
                fontSize: 9,
                color: 'var(--text-tertiary)',
                animation: 'pulse 1s ease-in-out infinite'
              }}>
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('editorSaving') || 'Sauvegarde...'}
              </span>
            ) : isDirty ? (
              <span style={{
                fontSize: 9,
                color: 'var(--warning)'
              }}>
                ● {t('editorDirty') || 'Modifié'}
              </span>
            ) : (
              <span style={{
                fontSize: 9,
                color: 'var(--success)'
              }}>
                ✓ {t('editorSaved') || 'Sauvegardé'}
              </span>
            )}
          </>
        )}
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Contrôles de lecture */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn-primary btn-sm"
          onClick={onPlay}
          disabled={isLoading}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: buttonState.color,
            borderColor: buttonState.color
          }}
          title={buttonState.label}
        >
          <i className={`ti ${buttonState.icon}`} />
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={onStop}
          disabled={isLoading || (!isPlaying && !isPaused && currentTime === 0)}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={t('editorStop')}
        >
          <i className="ti ti-player-stop-filled" />
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canUndo ? 1 : 0.4
          }}
          title={t('editorUndo')}
        >
          <i className="ti ti-arrow-back-up" />
        </button>
        <button
          className="btn-secondary btn-sm"
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: canRedo ? 1 : 0.4
          }}
          title={t('editorRedo')}
        >
          <i className="ti ti-arrow-forward-up" />
        </button>

        <button
          className={snapEnabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleSnap}
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={t('editorSnap')}
        >
          <i className="ti ti-magnet" />
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={onSplit}
          disabled={!canSplit}
          style={{ fontSize: 12, opacity: canSplit ? 1 : 0.4 }}
          title={t('editorSplit')}
        >
          <i className="ti ti-cut" /> {t('editorSplit')}
        </button>

        <button
          className={loopEnabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleLoop}
          style={{ fontSize: 12 }}
          title={t('editorLoop')}
        >
          <i className="ti ti-repeat" /> {t('editorLoop')}
        </button>

        <button
          className={autoCrossfade ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleCrossfade}
          style={{ fontSize: 10, padding: '2px 8px', minHeight: 24 }}
          title={t('editorAutoCrossfade') || 'Crossfade automatique'}
        >
          <i className="ti ti-transition-right" />
          {autoCrossfade ? 'Crossfade ON' : 'Crossfade OFF'}
        </button>

        <span style={{ 
          fontSize: 12, 
          fontFamily: 'monospace', 
          color: 'var(--text-secondary)',
          minWidth: 100,
          textAlign: 'center'
        }}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>

        {isPlaying && (
          <span style={{
            fontSize: 10,
            color: 'var(--success)',
            background: 'rgba(29,158,117,0.15)',
            padding: '2px 8px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              background: 'var(--success)',
              animation: 'pulse 1s ease-in-out infinite'
            }} />
            {t('editorPlaying')}
          </span>
        )}
        {isPaused && (
          <span style={{
            fontSize: 10,
            color: 'var(--warning)',
            background: 'rgba(239,159,39,0.15)',
            padding: '2px 8px',
            borderRadius: 10
          }}>
            {t('editorPaused')}
          </span>
        )}
        {isPreviewingEffect && (
          <span style={{
            fontSize: 10,
            color: 'var(--accent)',
            background: 'rgba(124,111,247,0.15)',
            padding: '2px 8px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              background: 'var(--accent)',
              animation: 'pulse 0.5s ease-in-out infinite'
            }} />
            {t('editorPreviewEffects') || 'Prévisualisation des effets'}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Métronome */}
      <EditorMetronome
        bpm={metronomeBpm}
        onBpmChange={onMetronomeBpmChange}
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        enabled={metronomeEnabled}
        onToggle={onMetronomeToggle}
        tr={t}
      />

      {/* Boutons d'action */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          className="btn-secondary btn-sm"
          onClick={onAddTrack}
          style={{ fontSize: 12 }}
          disabled={isLoading}
        >
          <i className="ti ti-plus" /> {t('editorAddTrack')}
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowAddClip(!showAddClip)}
          style={{ fontSize: 12 }}
          disabled={isLoading}
        >
          <i className="ti ti-music-plus" /> {t('editorAddClip')}
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={handleAddFileClick}
          style={{ fontSize: 12 }}
          disabled={isLoading}
        >
          <i className="ti ti-file-import" /> {t('editorAddFile') || 'Importer un fichier'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          multiple={false}
        />

        <button
          className="btn-primary btn-sm"
          onClick={onExport}
          style={{ fontSize: 12 }}
          disabled={isExporting || isLoading}
        >
          {isExporting ? (
            <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('editorExporting')}</>
          ) : (
            <><i className="ti ti-package-export" /> {t('editorExport')}</>
          )}
        </button>
      </div>

      {/* Dropdown pour ajouter un clip depuis SoundDeck */}
      {showAddClip && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 16,
            marginTop: 4,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
            zIndex: 20,
            minWidth: 260,
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {t('editorAddClip')}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 4
            }}>
              {t('editorSelectTrack')}
            </label>
            <select
              value={selectedTrackId}
              onChange={e => setSelectedTrackId(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
              key={`track-select-${currentLang}`}
            >
              <option value="">{t('editorSelectTrack')}</option>
              {tracks.map((track, index) => {
                // Détecter si le nom est un nom par défaut (automatique)
                const isDefaultName = track.name?.startsWith('__track_') || /^(Piste|Track|Pista)\s+\d+$/.test(track.name)
                const displayName = isDefaultName 
                  ? t('editorTrackDefault').replace('{index}', index + 1)
                  : track.name
                
                return (
                  <option key={track.id} value={track.id}>
                    {displayName} ({track.clips.length} clips)
                  </option>
                )
              })}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 4
            }}>
              {t('editorSelectSound')}
            </label>
            <select
              value={selectedSoundId}
              onChange={handleSoundSelect}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">{t('editorSelectSound')}</option>
              {sounds.map(sound => (
                <option key={sound.id} value={sound.id}>
                  {sound.emoji || '🔊'} {sound.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowAddClip(false)}
              style={{ fontSize: 12 }}
            >
              {t('cancel')}
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={handleAddClipAction}
              disabled={!selectedTrackId || !selectedSoundId}
              style={{ fontSize: 12, opacity: !selectedTrackId || !selectedSoundId ? 0.5 : 1 }}
            >
              <i className="ti ti-plus" /> {t('add')}
            </button>
          </div>

          {tracks.length === 0 && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginTop: 8,
              textAlign: 'center',
              padding: 8,
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)'
            }}>
              {t('editorAddTrackHint')}
            </div>
          )}
        </div>
      )}

      {/* Modal d'importation de fichier avec sélection de piste */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => {
          setShowImportModal(false)
          setPendingFile(null)
        }}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <i className="ti ti-file-import" style={{ color: 'var(--accent)' }} />
              {t('editorImportToTrack') || 'Importer dans la piste...'}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                display: 'block',
                marginBottom: 4
              }}>
                {t('editorSelectTrack')}
              </label>
              <select
                value={importTrackId}
                onChange={e => setImportTrackId(e.target.value)}
                style={{ width: '100%', fontSize: 12 }}
                key={`import-track-select-${currentLang}`}
              >
                {tracks.map((track, index) => {
                  const isDefaultName = track.name?.startsWith('__track_') || /^(Piste|Track|Pista)\s+\d+$/.test(track.name)
                  const displayName = isDefaultName 
                    ? t('editorTrackDefault').replace('{index}', index + 1)
                    : track.name
                  
                  return (
                    <option key={track.id} value={track.id}>
                      {displayName} ({track.clips.length} clips)
                    </option>
                  )
                })}
              </select>
            </div>

            <div style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              padding: '4px 8px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 12
            }}>
              <i className="ti ti-file" style={{ marginRight: 4 }} />
              {pendingFile ? pendingFile.split('/').pop() : 'Fichier sélectionné'}
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  setShowImportModal(false)
                  setPendingFile(null)
                }}
              >
                {t('cancel')}
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={confirmImportWithTrack}
              >
                <i className="ti ti-plus" /> {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}