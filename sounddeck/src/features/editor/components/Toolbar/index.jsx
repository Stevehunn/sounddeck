// src/features/editor/components/Toolbar/index.jsx
import React, { useState, useEffect, useRef } from 'react'
import EditorMetronome from './EditorMetronome'
import ImportFileModal from '../Modals/ImportFileModal'
import ProjectControls from './ProjectControls'

export default function EditorToolbar({
  tracks,
  sounds,
  isPlaying,
  isPaused,
  currentTime,
  totalDuration,
  onAddTrack,
  onAddClip,
  onAddFile,
  onPlay,
  onStop,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  snapEnabled,
  onToggleSnap,
  autoCrossfade,
  onToggleCrossfade,
  projectName,
  onRenameProject,
  onRefreshDurations,
  tr,
  addToast,
  loopState,
  onToggleTimelineLoop,
  onOpenLoopPanel,
  // ✅ NOUVEAUX PROPS POUR LE MÉTRONOME
  metronomeEnabled,
  onToggleMetronome,
  bpm,
  onBpmChange,
  // ✅ PROPS PROJETS
  project,
  projectList,
  recentProjects,
  isSaving,
  isLoading,
  onSaveProject,
  onLoadProject,
  onCreateProject,
  onDeleteProject,
  onDuplicateProject,
  onProjectRename,  // ← Pour le modal
  onLoadProjectList,
  onExportProject,
  onImportProject,
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

  const timelineLoop = loopState?.timeline || { enabled: false }

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
    console.log('🎵 [Toolbar] Ajout clip:', { trackId, soundId: selectedSoundId, startPosition })
    
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
        setPendingFile(filePath)
        setPendingFileName(fileName)
        setShowImportModal(true)
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
              if (e.key === 'Enter') {
                setIsRenaming(false)
                onRenameProject?.(newProjectName.trim())
              }
              if (e.key === 'Escape') {
                setIsRenaming(false)
                setNewProjectName(projectName || 'Nouveau projet')
              }
            }}
            onBlur={() => {
              setIsRenaming(false)
              onRenameProject?.(newProjectName.trim())
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
          <span
            onClick={() => setIsRenaming(true)}
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
        )}
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* Contrôles de lecture */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn-primary btn-sm"
          onClick={onPlay}
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
          style={{
            minHeight: 32,
            minWidth: 32,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (!isPlaying && !isPaused && currentTime === 0) ? 0.4 : 1
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
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* ✅ MÉTRONOME */}
      <EditorMetronome
        bpm={bpm || 120}
        onBpmChange={onBpmChange}
        isPlaying={isPlaying || isPaused}
        currentTime={currentTime}
        totalDuration={totalDuration}
        enabled={metronomeEnabled || false}
        onToggle={onToggleMetronome}
        tr={tr}
      />

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* ✅ PROJETS */}
      <ProjectControls
        project={project}
        projectList={projectList}
        recentProjects={recentProjects}
        isSaving={isSaving}
        isLoading={isLoading}
        onSaveProject={onSaveProject}
        onLoadProject={onLoadProject}
        onCreateProject={onCreateProject}
        onDeleteProject={onDeleteProject}
        onDuplicateProject={onDuplicateProject}
        onRenameProject={onProjectRename}  // ← Utilise onProjectRename
        onLoadProjectList={onLoadProjectList}
        onExportProject={onExportProject}
        onImportProject={onImportProject}
        tr={tr}
      />

      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

      {/* ✅ BOUTONS BOUCLE GÉNÉRALE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className={timelineLoop.enabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          onClick={onToggleTimelineLoop}
          style={{
            minHeight: 28,
            padding: '2px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11
          }}
          title={tr('toggleTimelineLoop') || 'Activer/désactiver la boucle générale'}
        >
          <i className="ti ti-repeat" />
          <span>{tr('loop') || 'Boucle'}</span>
          <span style={{
            fontSize: 8,
            padding: '1px 6px',
            borderRadius: 10,
            background: timelineLoop.enabled ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)',
            color: timelineLoop.enabled ? 'white' : 'var(--text-tertiary)'
          }}>
            {timelineLoop.enabled ? 'ON' : 'OFF'}
          </span>
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={onOpenLoopPanel}
          style={{
            minHeight: 28,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12
          }}
          title={tr('loopSettings') || 'Paramètres de la boucle'}
        >
          <i className="ti ti-settings" />
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Boutons d'action */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          className="btn-secondary btn-sm"
          onClick={onAddTrack}
          style={{ fontSize: 12 }}
        >
          <i className="ti ti-plus" /> {tr('editorAddTrack')}
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowAddClip(!showAddClip)}
          style={{ fontSize: 12 }}
        >
          <i className="ti ti-music-plus" /> {tr('editorAddClip')}
        </button>

        <button
          className="btn-secondary btn-sm"
          onClick={onAddFile}
          style={{ fontSize: 12 }}
        >
          <i className="ti ti-file-import" /> {tr('editorAddFile') || 'Importer un fichier'}
        </button>

        <button
          className="btn-primary btn-sm"
          onClick={onExport}
          style={{ fontSize: 12 }}
        >
          <i className="ti ti-package-export" /> {tr('editorExport')}
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
              {tracks.map((track, index) => (
                <option key={track.id} value={track.id}>
                  {track.name || `Piste ${index + 1}`} ({track.clips.length} clips)
                </option>
              ))}
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
              style={{ fontSize: 12, opacity: (!selectedTrackId || !selectedSoundId) ? 0.5 : 1 }}
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
            console.log('📁 [Toolbar] Import fichier:', { trackId, file: pendingFile })
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
    </div>
  )
}