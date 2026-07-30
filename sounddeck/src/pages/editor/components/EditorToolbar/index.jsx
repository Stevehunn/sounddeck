// src/pages/editor/components/EditorToolbar/index.jsx
import { useState, useEffect, useRef } from 'react'
import EditorMetronome from './EditorMetronome'
import ImportFileModal from '../ImportFileModal'

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
  projectName,
  onRenameProject,
  isPreviewingEffect,
  autoCrossfade,
  onToggleCrossfade,
  isDirty,
  isAutoSaving,
  tr,
  addToast,
  onRefreshDurations // ✅ NOUVEAU PROP
}) {
  const [showAddClip, setShowAddClip] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState('')
  const [selectedSoundId, setSelectedSoundId] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [newProjectName, setNewProjectName] = useState(projectName || 'Nouveau projet')
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingFileName, setPendingFileName] = useState('')
  const [isRefreshingDurations, setIsRefreshingDurations] = useState(false)
  const dropdownRef = useRef(null)

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

  const getNextStartPosition = (trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return 0
    if (track.clips.length === 0) return 0
    
    const lastClip = track.clips.reduce((max, clip) => {
      const clipEnd = clip.start + (clip.duration || 3)
      return clipEnd > max.end ? { start: clip.start, end: clipEnd } : max
    }, { start: 0, end: 0 })
    return lastClip.end + 0.5
  }

  const handleAddClipAction = () => {
    let trackId = selectedTrackId
    if (!trackId && tracks.length > 0) {
      trackId = tracks[0].id
      setSelectedTrackId(trackId)
    }

    if (!trackId) {
      addToast?.(tr('editorNoTracks'), 'error')
      return
    }

    if (!selectedSoundId) {
      addToast?.(tr('editorSelectSound'), 'error')
      return
    }

    const startPosition = getNextStartPosition(trackId)
    
    onAddClip(trackId, selectedSoundId, startPosition)
    setShowAddClip(false)
    setSelectedSoundId('')
  }

  const handleAddFileClick = async () => {
    try {
      const result = await window.electronAPI.openFileDialog()
      
      if (!result || result.length === 0) return
      
      const filePath = result[0]
      const fileName = filePath.split(/[\\/]/).pop() || 'Fichier audio'
      
      if (tracks.length === 0) {
        addToast?.(tr('editorNoTracks'), 'error')
        return
      }
      
      if (tracks.length === 1) {
        await onAddClipFromFile(tracks[0].id, filePath)
        setSelectedTrackId(tracks[0].id)
        addToast?.(`${tr('editorFileImported')} ${fileName}`, 'success')
        return
      }
      
      setPendingFile(filePath)
      setPendingFileName(fileName)
      setShowImportModal(true)
      
    } catch (err) {
      console.error('Erreur import fichier:', err)
      addToast?.(tr('editorFileImportError'), 'error')
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

  // ✅ Gestion du rafraîchissement des durées
  const handleRefreshDurations = async () => {
    if (isRefreshingDurations || !onRefreshDurations) return
    
    setIsRefreshingDurations(true)
    addToast?.('🔄 Recalcul des durées en cours...', 'info')
    
    try {
      const fixedCount = await onRefreshDurations()
      if (fixedCount > 0) {
        addToast?.(`✅ ${fixedCount} clip(s) corrigé(s)`, 'success')
      } else {
        addToast?.('✅ Toutes les durées sont déjà correctes', 'success')
      }
    } catch (e) {
      console.error('Erreur rafraîchissement durées:', e)
      addToast?.('❌ Erreur lors du rafraîchissement', 'error')
    } finally {
      setIsRefreshingDurations(false)
    }
  }

  const getButtonState = () => {
    if (isPlaying) return { icon: 'ti-player-pause', label: tr('editorPause'), color: 'var(--warning)' }
    if (isPaused) return { icon: 'ti-player-play', label: tr('editorResume'), color: 'var(--accent)' }
    if (currentTime > 0) return { icon: 'ti-player-play', label: tr('editorPlayFromStart'), color: 'var(--accent)' }
    return { icon: 'ti-player-play', label: tr('editorPlay'), color: 'var(--accent)' }
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
            onBlur={handleRenameProject}
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
              title={tr('editorClickToRename')}
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
                <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('editorSaving') || 'Sauvegarde...'}
              </span>
            ) : isDirty ? (
              <span style={{ fontSize: 9, color: 'var(--warning)' }}>● {tr('editorDirty') || 'Modifié'}</span>
            ) : (
              <span style={{ fontSize: 9, color: 'var(--success)' }}>✓ {tr('editorSaved') || 'Sauvegardé'}</span>
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
          title={tr('editorStop')}
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
          title={tr('editorUndo')}
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
          title={tr('editorRedo')}
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
          title={tr('editorSnap')}
        >
          <i className="ti ti-magnet" />
        </button>

        <button
          className={autoCrossfade ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleCrossfade}
          style={{ fontSize: 10, padding: '2px 8px', minHeight: 24 }}
          title={tr('editorAutoCrossfade') || 'Crossfade automatique'}
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
            {tr('editorPlaying')}
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
            {tr('editorPaused')}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* ✅ NOUVEAU BOUTON : Rafraîchir les durées */}
      <button
        className="btn-secondary btn-sm"
        onClick={handleRefreshDurations}
        disabled={isRefreshingDurations || isLoading}
        style={{
          fontSize: 11,
          padding: '4px 10px',
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
        title={tr('editorRefreshDurations') || 'Recalculer les durées des clips'}
      >
        <i className={`ti ${isRefreshingDurations ? 'ti-loader' : 'ti-refresh'}`} 
           style={isRefreshingDurations ? { animation: 'spin 1s linear infinite' } : {}} />
        {isRefreshingDurations ? '...' : tr('editorRefreshDurations') || 'Durées'}
      </button>

      {/* Métronome */}
      <EditorMetronome
        bpm={120}
        onBpmChange={() => {}}
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        enabled={false}
        onToggle={() => {}}
        tr={tr}
      />

      {/* Boutons d'action */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          className="btn-secondary btn-sm"
          onClick={onAddTrack}
          style={{ fontSize: 12 }}
          disabled={isLoading}
        >
          <i className="ti ti-plus" /> {tr('editorAddTrack')}
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowAddClip(!showAddClip)}
          style={{ fontSize: 12 }}
          disabled={isLoading}
        >
          <i className="ti ti-music-plus" /> {tr('editorAddClip')}
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={handleAddFileClick}
          style={{ fontSize: 12 }}
          disabled={isLoading}
        >
          <i className="ti ti-file-import" /> {tr('editorAddFile') || 'Importer un fichier'}
        </button>

        <button
          className="btn-primary btn-sm"
          onClick={onExport}
          style={{ fontSize: 12 }}
          disabled={isExporting || isLoading}
        >
          {isExporting ? (
            <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('editorExporting')}</>
          ) : (
            <><i className="ti ti-package-export" /> {tr('editorExport')}</>
          )}
        </button>
      </div>

      {/* Dropdown pour ajouter un clip */}
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
            {tr('editorAddClip')}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 4
            }}>
              {tr('editorSelectTrack')}
            </label>
            <select
              value={selectedTrackId}
              onChange={e => setSelectedTrackId(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">{tr('editorSelectTrack')}</option>
              {tracks.map((track, index) => {
                const isDefaultName = track.name?.startsWith('__track_') || /^(Piste|Track|Pista)\s+\d+$/.test(track.name)
                const displayName = isDefaultName 
                  ? tr('editorTrackDefault').replace('{index}', index + 1)
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
              {tr('editorSelectSound')}
            </label>
            <select
              value={selectedSoundId}
              onChange={(e) => {
                const soundId = e.target.value
                setSelectedSoundId(soundId)
                if (soundId && selectedTrackId) {
                  const startPosition = getNextStartPosition(selectedTrackId)
                  onAddClip(selectedTrackId, soundId, startPosition)
                  setShowAddClip(false)
                  setSelectedSoundId('')
                }
              }}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">{tr('editorSelectSound')}</option>
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
              {tr('cancel')}
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={handleAddClipAction}
              disabled={!selectedTrackId || !selectedSoundId}
              style={{ fontSize: 12, opacity: !selectedTrackId || !selectedSoundId ? 0.5 : 1 }}
            >
              <i className="ti ti-plus" /> {tr('add')}
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
              {tr('editorAddTrackHint')}
            </div>
          )}
        </div>
      )}

      {/* Modal d'importation */}
      {showImportModal && (
        <ImportFileModal
          tracks={tracks}
          fileName={pendingFileName}
          onConfirm={(trackId) => {
            onAddClipFromFile(trackId, pendingFile)
            setShowImportModal(false)
            setPendingFile(null)
            setPendingFileName('')
          }}
          onCancel={() => {
            setShowImportModal(false)
            setPendingFile(null)
            setPendingFileName('')
          }}
          tr={tr}
        />
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