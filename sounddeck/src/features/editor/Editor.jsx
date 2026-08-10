// src/features/editor/Editor.jsx
import React, { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@core/i18n/LanguageContext'
import { EditorProvider, useEditor } from './contexts/EditorContext'
import EditorTimeline from './components/Timeline'
import EditorToolbar from './components/Toolbar'
import EditorEffectsPanel from './components/EffectsPanel'
import EditorMasterVolume from './components/MasterVolume'
import ClipActionsMenu from './components/ClipActionsMenu'
import MarkersPanel from './components/Markers/MarkersPanel'
import AddTrackModal from './components/Modals/AddTrackModal'
import TrimModal from './components/Modals/TrimModal'
import ExportModal from './components/Modals/ExportModal'
import ImportFileModal from './components/Modals/ImportFileModal'
import { getClipById } from './utils'
import { mixdownProject, exportMixdown } from '@shared/utils/mixdown'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts' // ✅ AJOUTÉ

console.log('📝 [Editor] Chargement du module Editor')

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────

export default function Editor({ store, addToast }) {
  console.log('📝 [Editor] Rendu du composant principal')
  return (
    <EditorProvider store={store} addToast={addToast}>
      <EditorContent />
    </EditorProvider>
  )
}

// ─── COMPOSANT CONTENU ──────────────────────────────────────────────────────

function EditorContent() {
  console.log('📝 [Editor] Rendu de EditorContent')
  const { t } = useLanguage()
  const context = useEditor()
  
  if (!context || !context.isInitialized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-tertiary)',
        gap: 12
      }}>
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        <span>{t('editorLoading')}</span>
      </div>
    )
  }
  
  if (!context.project || !context.project.id) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-tertiary)',
        gap: 12,
        padding: 20
      }}>
        <i className="ti ti-folder-plus" style={{ fontSize: 32, color: 'var(--accent)' }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>{t('editorNoProject')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('editorNoProjectDesc')}</div>
        <button 
          className="btn-primary btn-sm"
          onClick={() => context.store?.createEditorProject?.('Nouveau projet')}
          style={{ marginTop: 8 }}
        >
          <i className="ti ti-plus" /> {t('editorCreateProject')}
        </button>
      </div>
    )
  }

  return <EditorTimelineContent />
}

// ─── COMPOSANT AVEC TOUTE LA LOGIQUE ──────────────────────────────────────

function EditorTimelineContent() {
  console.log('📝 [Editor] Rendu de EditorTimelineContent')
  const { t } = useLanguage()
  const context = useEditor()
  
  const {
    project,
    tracks,
    selectedClipId,
    selectedTrackId,
    currentTime,
    isPlaying,
    isPaused,
    totalDuration,
    clipDurations,
    setClipDurations,
    waveformData,
    store,
    addToast,
    addTrack,
    removeTrack,
    renameTrack,
    muteTrack,
    soloTrack,
    setTrackVolume,
    addClip,
    addClipFromFile,
    removeClip,
    updateClip,
    duplicateClip,
    play,
    pause,
    stop,
    seek,
    togglePlay,
    selectClip,
    deselectClip,
    loopRegion,
    setLoopRegion,
    toggleLoop,
    clearLoop,
    handleZoomChange,
    zoomLevel,
    snapEnabled,
    setSnapEnabled,
    autoCrossfade,
    setAutoCrossfade,
  } = context

  // ─── ÉTATS LOCAUX ──────────────────────────────────────────────────────
  const [clipMenu, setClipMenu] = useState(null)
  const [selectedClipForMenu, setSelectedClipForMenu] = useState(null)
  const [selectedTrackForMenu, setSelectedTrackForMenu] = useState(null)
  const [showAddTrackModal, setShowAddTrackModal] = useState(false)
  const [pendingTrackName, setPendingTrackName] = useState('')
  const [showTrimModal, setShowTrimModal] = useState(false)
  const [trimClipId, setTrimClipId] = useState(null)
  const [masterVolume, setMasterVolume] = useState(100)
  const [isMasterMuted, setIsMasterMuted] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportName, setExportName] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('mp3')
  const [exportBitrate, setExportBitrate] = useState(192)
  const [showEffectsPanel, setShowEffectsPanel] = useState(true)

  // ✅ ÉTATS POUR L'IMPORT
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedImportTrackId, setSelectedImportTrackId] = useState('')
  const [pendingImportFile, setPendingImportFile] = useState(null)
  const [pendingImportFileName, setPendingImportFileName] = useState('')

  // ─── HANDLERS ──────────────────────────────────────────────────────────

  const handleAddTrack = useCallback(() => {
    console.log('➕ [Editor] handleAddTrack appelé')
    try {
      const trackIndex = tracks.length + 1
      const defaultName = t('editorTrackDefault').replace('{index}', trackIndex)
      setPendingTrackName(defaultName)
      setShowAddTrackModal(true)
    } catch (e) {
      console.error('❌ [Editor] Erreur handleAddTrack:', e)
      addToast?.('Erreur lors de l\'ouverture du modal', 'error')
    }
  }, [tracks.length, t, addToast])

  const handleAddTrackConfirm = useCallback(async (name, color) => {
    console.log('✅ [Editor] handleAddTrackConfirm:', name, color)
    
    if (typeof addTrack !== 'function') {
      addToast?.('Erreur: addTrack non disponible', 'error')
      setShowAddTrackModal(false)
      return null
    }
    
    try {
      const result = await addTrack(name, color)
      if (result) {
        addToast?.(`Piste "${result.name}" ajoutée`, 'success')
      } else {
        addToast?.('Erreur lors de l\'ajout de la piste', 'error')
      }
      setShowAddTrackModal(false)
      return result
    } catch (e) {
      console.error('❌ [Editor] Erreur handleAddTrackConfirm:', e)
      addToast?.('Erreur lors de l\'ajout de la piste: ' + e.message, 'error')
      setShowAddTrackModal(false)
      return null
    }
  }, [addTrack, addToast])

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else if (isPaused) {
      play()
    } else {
      play()
    }
  }, [isPlaying, isPaused, play, pause])

  const handleRemoveTrack = useCallback(async (trackId) => {
    try {
      const track = tracks.find(t => t.id === trackId)
      if (!track) return
      
      if (tracks.length <= 1) {
        addToast?.('Impossible de supprimer la dernière piste', 'warning')
        return
      }
      
      if (track.clips.length > 0) {
        const confirmed = window.confirm(
          `La piste "${track.name}" contient ${track.clips.length} clip(s). Voulez-vous vraiment la supprimer ?`
        )
        if (!confirmed) return
      }
      
      await removeTrack(trackId)
      addToast?.(`Piste "${track.name}" supprimée`, 'info')
    } catch (e) {
      console.error('❌ [Editor] Erreur handleRemoveTrack:', e)
      addToast?.('Erreur lors de la suppression', 'error')
    }
  }, [tracks, removeTrack, addToast])

  const handleAddClip = useCallback(async (trackId, soundId, startPosition) => {
    console.log('🎵 [Editor] handleAddClip:', { trackId, soundId, startPosition })
    await addClip(trackId, soundId, startPosition)
  }, [addClip])

  const handleAddFileClick = useCallback(() => {
    console.log('📁 [Editor] handleAddFileClick - Ouverture du modal d\'import')
    
    if (tracks.length === 0) {
      addToast?.(t('editorNoTracks'), 'error')
      return
    }
    
    setPendingImportFile(null)
    setPendingImportFileName('')
    setSelectedImportTrackId(tracks[0].id)
    setShowImportModal(true)
  }, [tracks, addToast, t])

  const handleImportConfirm = useCallback(async ({ file, fileName, trackId, startTime }) => {
    console.log('📁 [Editor] handleImportConfirm:', { fileName, trackId, startTime })
    
    if (!file) {
      console.error('❌ [Editor] Aucun fichier sélectionné')
      addToast?.('Aucun fichier sélectionné', 'error')
      return
    }

    try {
      const soundsDir = await window.electronAPI.getSoundsDir?.()
      const safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '_') + '_' + Date.now() + '.wav'
      const tempPath = soundsDir + '/' + safeName
      
      const writeResult = await window.electronAPI.writeSoundFile?.(tempPath, Array.from(new Uint8Array(file)))
      
      if (!writeResult?.success) {
        addToast?.('Erreur lors de la sauvegarde du fichier', 'error')
        return
      }
      
      const result = await addClipFromFile(trackId, tempPath, startTime)
      
      if (result) {
        addToast?.(`"${fileName}" ${t('editorFileImported')}`, 'success')
      } else {
        addToast?.(t('editorFileImportError'), 'error')
      }
      
    } catch (e) {
      console.error('❌ [Editor] Erreur import:', e)
      addToast?.(t('editorFileImportError') + ': ' + e.message, 'error')
    }
    
    setShowImportModal(false)
    setPendingImportFile(null)
    setPendingImportFileName('')
  }, [addClipFromFile, addToast, t])

  const handleRemoveClip = useCallback((trackId, clipId) => {
    removeClip(trackId, clipId)
  }, [removeClip])

  const handleClipSelect = useCallback((clipId, trackId) => {
    selectClip(clipId, trackId)
  }, [selectClip])

  const handleClipContextMenu = useCallback((e, clipId, trackId) => {
    e.preventDefault()
    setSelectedClipForMenu(clipId)
    setSelectedTrackForMenu(trackId)
    setClipMenu({ top: e.clientY, left: e.clientX })
  }, [])

  const handleUpdateClipDuration = useCallback((clipId, newDuration) => {
    if (selectedTrackId) {
      updateClip(selectedTrackId, clipId, { duration: newDuration })
      setClipDurations(prev => ({ ...prev, [clipId]: newDuration }))
    }
  }, [selectedTrackId, updateClip, setClipDurations])

  const handleRefreshDurations = useCallback(async () => {
    if (!store) return 0
    const fixedCount = await store.fixAllClipDurations?.()
    if (project?.tracks) {
      const durations = {}
      for (const track of project.tracks) {
        for (const clip of track.clips) {
          if (clip.id) {
            durations[clip.id] = clip.duration || 3
          }
        }
      }
      setClipDurations(durations)
    }
    return fixedCount
  }, [store, project, setClipDurations])

  const handleExportClick = useCallback(() => {
    if (!project || project.tracks.length === 0 || 
        project.tracks.every(t => t.clips.length === 0)) {
      addToast?.(t('editorNothingToExport'), 'info')
      return
    }
    setExportName(project.name || 'Mon mix')
    setShowExportModal(true)
  }, [project, addToast, t])

  const handlePreviewEffects = useCallback(async (clip) => {
    if (!clip || !clip.path) {
      console.warn('⚠️ [Editor] Aucun clip à prévisualiser')
      return
    }
    
    console.log(`🎛️ [Editor] Prévisualisation des effets pour ${clip.name}`)
    
    try {
      const { applyEffectsToBuffer } = await import('@shared/utils/realTimeEffects')
      
      const fileUrl = clip.path.startsWith('file://') 
        ? clip.path 
        : 'file:///' + clip.path.replace(/\\/g, '/')
      
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const hasActiveEffects = clip.effects?.some(e => e.enabled) || false
      let processedBuffer = audioBuffer
      
      if (hasActiveEffects) {
        processedBuffer = applyEffectsToBuffer(audioBuffer, clip.effects, audioContext.sampleRate, true)
        console.log('✅ [Editor] Effets appliqués pour la prévisualisation')
      }
      
      const source = audioContext.createBufferSource()
      source.buffer = processedBuffer
      
      const gainNode = audioContext.createGain()
      gainNode.gain.value = 0.5
      
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      source.start(0)
      
      source.onended = () => {
        audioContext.close().catch(() => {})
      }
      
      setTimeout(() => {
        try {
          source.stop()
          audioContext.close().catch(() => {})
        } catch (e) {}
      }, Math.min(processedBuffer.duration * 1000, 5000))
      
    } catch (e) {
      console.error('❌ [Editor] Erreur prévisualisation effets:', e)
      addToast?.(t('editorEffectPreviewError') || 'Erreur lors de la prévisualisation', 'error')
    }
  }, [addToast, t])

  // ─── RACCOURCIS CLAVIER ──────────────────────────────────────────────

  // ✅ Récupérer les fonctions undo/redo depuis le store
  const undoEditor = store?.undoEditor || (() => {
    console.log('ℹ️ Undo non disponible')
    addToast?.('Undo non disponible', 'info')
  })
  
  const redoEditor = store?.redoEditor || (() => {
    console.log('ℹ️ Redo non disponible')
    addToast?.('Redo non disponible', 'info')
  })
  
  const canUndo = store?.canUndoEditor || false
  const canRedo = store?.canRedoEditor || false

  // ✅ Utiliser le hook de raccourcis clavier
  const { shortcuts } = useKeyboardShortcuts({
    onPlay: () => {
      console.log('⌨️ Play')
      if (isPlaying) {
        pause()
      } else if (isPaused) {
        play()
      } else {
        play()
      }
    },
    onPause: pause,
    onStop: stop,
    onUndo: undoEditor,
    onRedo: redoEditor,
    onAddTrack: handleAddTrack,
    onAddMarker: () => {
      console.log('⌨️ Add Marker à', currentTime)
      // Ajouter un marqueur à la position actuelle
      const markers = project?.markers || []
      const newMarker = {
        id: `marker-${Date.now()}`,
        name: `Marqueur ${markers.length + 1}`,
        time: currentTime,
        color: '#3b82f6'
      }
      const updatedProject = {
        ...project,
        markers: [...markers, newMarker],
        updatedAt: Date.now()
      }
      store?.updateEditorProject?.(updatedProject)
      addToast?.('Marqueur ajouté', 'success')
    },
    onDelete: () => {
      console.log('⌨️ Delete')
      if (selectedClipId && selectedTrackId) {
        removeClip(selectedTrackId, selectedClipId)
        addToast?.('Clip supprimé', 'info')
      } else {
        addToast?.('Aucun clip sélectionné', 'info')
      }
    },
    onSplit: () => {
      console.log('⌨️ Split')
      if (selectedClipId && selectedTrackId) {
        // TODO: Implémenter le split
        addToast?.('Split pas encore implémenté', 'info')
      } else {
        addToast?.('Aucun clip sélectionné', 'info')
      }
    },
    onToggleSnap: () => setSnapEnabled(!snapEnabled),
    onZoomIn: () => handleZoomChange(zoomLevel + 0.1),
    onZoomOut: () => handleZoomChange(zoomLevel - 0.1),
    onZoomReset: () => handleZoomChange(1),
    isPlaying: isPlaying || isPaused,
    canUndo: canUndo,
    canRedo: canRedo,
    isEnabled: true
  })

  // ─── RENDU ──────────────────────────────────────────────────────────────

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ✅ Afficher les raccourcis dans la console pour débogage
  console.log('⌨️ Raccourcis clavier actifs:', shortcuts)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)'
    }}>
      <EditorToolbar
        tracks={tracks}
        sounds={store?.sounds || []}
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onAddTrack={handleAddTrack}
        onAddClip={handleAddClip}
        onAddFile={handleAddFileClick}
        onPlay={togglePlay}
        onStop={stop}
        onExport={handleExportClick}
        onUndo={undoEditor}
        onRedo={redoEditor}
        canUndo={canUndo}
        canRedo={canRedo}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        autoCrossfade={autoCrossfade}
        onToggleCrossfade={() => setAutoCrossfade(!autoCrossfade)}
        projectName={project?.name || 'Nouveau projet'}
        onRenameProject={store?.updateEditorProjectName || (() => {})}
        onRefreshDurations={handleRefreshDurations}
        tr={t}
        addToast={addToast}
      />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <EditorTimeline
          tracks={tracks}
          selectedClipId={selectedClipId}
          selectedTrackId={selectedTrackId}
          totalDuration={totalDuration}
          currentTime={currentTime}
          isPlaying={isPlaying || isPaused}
          clipDurations={clipDurations}
          waveformData={waveformData}
          snapEnabled={snapEnabled}
          loopRegion={loopRegion}
          autoCrossfade={autoCrossfade}
          zoomLevel={zoomLevel}
          onZoomChange={handleZoomChange}
          onClipSelect={handleClipSelect}
          onClipMove={store?.moveClip || (() => {})}
          onClipUpdate={updateClip}
          onClipRemove={handleRemoveClip}
          onClipDuplicate={duplicateClip}
          onClipFade={store?.setClipFade || (() => {})}
          onClipContextMenu={handleClipContextMenu}
          onDragCheckpoint={store?.pushEditorHistoryCheckpoint || (() => {})}
          onTrackRemove={handleRemoveTrack}
          onSeek={seek}
          onTrackMute={muteTrack}
          onTrackSolo={soloTrack}
          onTrackVolume={setTrackVolume}
          onTrackReorder={store?.reorderTracks || (() => {})}
          onRenameTrack={renameTrack}
          onSetLoopRegion={setLoopRegion}
          onClearLoop={clearLoop}
          onToggleLoop={toggleLoop}
          onUpdateClipDuration={handleUpdateClipDuration}
          tr={t}
          addToast={addToast}
        />
      </div>

      {showEffectsPanel && (() => {
        const selectedClip = selectedClipId ? getClipById(tracks, selectedClipId) : null
        if (!selectedClip) return null
        
        const {
          addEffectToClip,
          removeEffectFromClip,
          updateEffectParam,
          toggleEffect,
          setClipFade
        } = context
        
        console.log('🎛️ [Editor] setClipFade est une fonction?', typeof setClipFade)
        
        return (
          <EditorEffectsPanel
            clip={selectedClip}
            trackId={selectedTrackId}
            onEffectAdd={addEffectToClip}
            onEffectRemove={removeEffectFromClip}
            onEffectUpdate={updateEffectParam}
            onEffectToggle={toggleEffect}
            onClipUpdate={updateClip}
            onFadeUpdate={setClipFade}
            tr={t}
          />
        )
      })()}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <EditorMasterVolume
          volume={isMasterMuted ? 0 : masterVolume}
          onVolumeChange={setMasterVolume}
          isMuted={isMasterMuted}
          onMuteToggle={() => setIsMasterMuted(!isMasterMuted)}
          tr={t}
        />
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', gap: 12 }}>
          <span>{t('editorClips')}: {tracks.flatMap(t => t.clips).length}</span>
          <span>{t('editorTracks')}: {tracks.length}</span>
          <span>{t('editorDuration')}: {formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* MODAL ADD TRACK */}
      {showAddTrackModal && createPortal(
        <AddTrackModal
          isOpen={showAddTrackModal}
          onConfirm={handleAddTrackConfirm}
          onCancel={() => setShowAddTrackModal(false)}
          defaultName={pendingTrackName}
          tr={t}
        />,
        document.body
      )}

      {/* MODAL IMPORT FILE */}
      {showImportModal && createPortal(
        <ImportFileModal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false)
            setPendingImportFile(null)
            setPendingImportFileName('')
          }}
          onConfirm={handleImportConfirm}
          tracks={tracks}
          defaultTrackId={selectedImportTrackId}
          fileName={pendingImportFileName}
          tr={t}
        />,
        document.body
      )}

      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={async (options) => {
            console.log('📤 [Editor] Export démarré avec options:', options)
            setIsExporting(true)
            
            try {
              console.log('🎵 [Editor] Mixdown du projet...')
              const buffer = await mixdownProject(project, clipDurations, 44100)
              
              if (!buffer) {
                throw new Error('Erreur lors du mixage')
              }
              
              console.log('✅ [Editor] Mixdown terminé, durée:', buffer.duration)
              
              const exportResults = []
              
              if (options.exportLocation === 'file' || options.exportLocation === 'both') {
                console.log('📁 [Editor] Export en fichier...')
                
                const saveResult = await window.electronAPI.saveFileDialog?.(
                  options.outputPath || `${options.name}.${options.format === 'wav' ? 'wav' : options.format}`,
                  null
                )
                
                if (saveResult?.success && saveResult?.path) {
                  const result = await exportMixdown(
                    buffer, 
                    options.format, 
                    options.bitrate, 
                    saveResult.path
                  )
                  if (result.success) {
                    exportResults.push({ type: 'file', path: saveResult.path })
                    addToast?.(`${t('editorExportSuccess')}: ${saveResult.path}`, 'success')
                  } else {
                    throw new Error(result.error || 'Erreur export fichier')
                  }
                } else if (saveResult?.canceled) {
                  setIsExporting(false)
                  setShowExportModal(false)
                  return
                } else {
                  const fallbackPath = options.outputPath || `${options.name}.${options.format === 'wav' ? 'wav' : options.format}`
                  const result = await exportMixdown(buffer, options.format, options.bitrate, fallbackPath)
                  if (result.success) {
                    exportResults.push({ type: 'file', path: fallbackPath })
                    addToast?.(`${t('editorExportSuccess')}: ${fallbackPath}`, 'success')
                  } else {
                    throw new Error(result.error || 'Erreur export fichier')
                  }
                }
              }
              
              if (options.exportLocation === 'library' || options.exportLocation === 'both') {
                console.log('📚 [Editor] Ajout à la bibliothèque...')
                
                const tempPath = `temp_${Date.now()}.wav`
                const tempResult = await exportMixdown(buffer, 'wav', 44100, tempPath)
                
                if (tempResult.success) {
                  const profiles = options.profiles || ['all']
                  await store.addSound({
                    name: options.name || 'Export',
                    path: tempResult.path,
                    emoji: '🎵',
                    profiles: profiles
                  })
                  exportResults.push({ type: 'library', name: options.name })
                  addToast?.(`"${options.name}" ${t('editorCreated')}`, 'success')
                } else {
                  throw new Error('Erreur ajout à la bibliothèque')
                }
              }
              
              setIsExporting(false)
              setShowExportModal(false)
              return { success: true, results: exportResults }
              
            } catch (e) {
              console.error('❌ [Editor] Erreur export:', e)
              addToast?.(`${t('editorExportError')}: ${e.message}`, 'error')
              setIsExporting(false)
              return { success: false, error: e.message }
            }
          }}
          store={store}
          totalDuration={totalDuration}
          defaultName={exportName}
          tr={t}
        />
      )}

      {clipMenu && (
        <ClipActionsMenu
          clip={selectedClipForMenu ? getClipById(tracks, selectedClipForMenu) : null}
          trackId={selectedTrackForMenu}
          position={clipMenu}
          onClose={() => {
            setClipMenu(null)
            setSelectedClipForMenu(null)
            setSelectedTrackForMenu(null)
          }}
          onSplit={store?.splitClip || (() => {})}
          onLoop={() => {
            const clip = getClipById(tracks, selectedClipForMenu)
            if (clip) {
              const duration = clipDurations[clip.id] || clip.duration || 3
              setLoopRegion(clip.start, clip.start + duration)
              toggleLoop()
              addToast?.(t('editorLoopSet'), 'success')
            }
            setClipMenu(null)
          }}
          onTrim={(clipId) => {
            setTrimClipId(clipId)
            setShowTrimModal(true)
            setClipMenu(null)
          }}
          onNormalize={() => {}}
          onAddEffect={() => {
            setShowEffectsPanel(true)
            setClipMenu(null)
          }}
          onDuplicate={(trackId, clipId) => {
            duplicateClip(trackId, clipId)
            setClipMenu(null)
          }}
          onCopy={() => {}}
          onCut={() => {}}
          onDelete={(trackId, clipId) => {
            removeClip(trackId, clipId)
            setClipMenu(null)
          }}
          onFadeIn={store?.setClipFade || (() => {})}
          onFadeOut={store?.setClipFade || (() => {})}
          onPreviewEffects={() => {}}
          isPlaying={isPlaying}
          isLoopEnabled={loopRegion.enabled}
          tr={t}
        />
      )}
    </div>
  )
}