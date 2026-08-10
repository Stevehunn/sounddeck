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
import { getClipById } from './utils'
import { mixdownProject, exportMixdown } from '@shared/utils/mixdown'

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
  
  console.log('📝 [Editor] Context:', { 
    isInitialized: context?.isInitialized, 
    projectId: context?.project?.id,
    hasSetClipDurations: !!context?.setClipDurations,
    tracksLength: context?.tracks?.length || 0
  })
  
  if (!context || !context.isInitialized) {
    console.log('⏳ [Editor] En attente de l\'initialisation...')
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
    console.log('📂 [Editor] Aucun projet, affichage de la vue de création')
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

  console.log('✅ [Editor] Projet chargé, rendu de EditorTimelineContent')
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

  console.log('📊 [Editor] Contexte:', {
    tracks: tracks?.length || 0,
    selectedClipId,
    selectedTrackId,
    isPlaying,
    currentTime,
    hasSetClipDurations: !!setClipDurations,
    hasAddTrack: !!addTrack,
    hasRemoveTrack: !!removeTrack,
    typeofAddTrack: typeof addTrack
  })

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

  // ─── HANDLERS ──────────────────────────────────────────────────────────

  const handleAddTrack = useCallback(() => {
    console.log('➕ [Editor] handleAddTrack appelé')
    try {
      const trackIndex = tracks.length + 1
      const defaultName = t('editorTrackDefault').replace('{index}', trackIndex)
      setPendingTrackName(defaultName)
      console.log('✅ [Editor] Ouverture du modal avec nom par défaut:', defaultName)
      setShowAddTrackModal(true)
    } catch (e) {
      console.error('❌ [Editor] Erreur handleAddTrack:', e)
      addToast?.('Erreur lors de l\'ouverture du modal', 'error')
    }
  }, [tracks.length, t, addToast])

  // ✅ CORRECTION - handleAddTrackConfirm avec vérification
  const handleAddTrackConfirm = useCallback(async (name, color) => {
    console.log('✅ [Editor] handleAddTrackConfirm:', name, color)
    console.log('📊 [Editor] addTrack est une fonction?', typeof addTrack)
    
    if (typeof addTrack !== 'function') {
      console.error('❌ [Editor] addTrack n\'est pas une fonction!')
      addToast?.('Erreur: addTrack non disponible', 'error')
      setShowAddTrackModal(false)
      return null
    }
    
    try {
      console.log('📊 [Editor] Appel de addTrack avec:', name, color)
      const result = await addTrack(name, color)
      console.log('📊 [Editor] Résultat addTrack:', result)
      
      if (result) {
        console.log('✅ [Editor] Piste ajoutée avec succès:', result)
        console.log('📊 [Editor] Nombre de pistes actuel:', tracks.length)
        addToast?.(`Piste "${result.name}" ajoutée`, 'success')
      } else {
        console.error('❌ [Editor] Échec ajout piste - result est null')
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
  }, [addTrack, addToast, tracks.length])

  const handlePlayToggle = useCallback(() => {
    console.log('▶️ [Editor] handlePlayToggle - isPlaying:', isPlaying, 'isPaused:', isPaused)
    
    if (isPlaying) {
      pause()
    } else if (isPaused) {
      play()
    } else {
      console.log('▶️ [Editor] Démarrage de la lecture depuis', currentTime)
      play()
    }
  }, [isPlaying, isPaused, currentTime, play, pause])

  const handleRemoveTrack = useCallback(async (trackId) => {
    console.log('🗑️ [Editor] handleRemoveTrack:', trackId)
    try {
      const track = tracks.find(t => t.id === trackId)
      if (!track) {
        console.error('❌ [Editor] Piste non trouvée:', trackId)
        return
      }
      
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

  const handleRemoveClip = useCallback((trackId, clipId) => {
    console.log('🗑️ [Editor] handleRemoveClip:', trackId, clipId)
    removeClip(trackId, clipId)
  }, [removeClip])

  const handleClipSelect = useCallback((clipId, trackId) => {
    console.log('🎯 [Editor] handleClipSelect:', clipId, trackId)
    selectClip(clipId, trackId)
  }, [selectClip])

  const handleClipContextMenu = useCallback((e, clipId, trackId) => {
    console.log('📋 [Editor] handleClipContextMenu:', clipId, trackId)
    e.preventDefault()
    setSelectedClipForMenu(clipId)
    setSelectedTrackForMenu(trackId)
    setClipMenu({ top: e.clientY, left: e.clientX })
  }, [])

  const handleUpdateClipDuration = useCallback((clipId, newDuration) => {
    console.log('📏 [Editor] handleUpdateClipDuration:', clipId, newDuration)
    if (selectedTrackId) {
      updateClip(selectedTrackId, clipId, { duration: newDuration })
      setClipDurations(prev => ({ ...prev, [clipId]: newDuration }))
    }
  }, [selectedTrackId, updateClip, setClipDurations])

  const handleRefreshDurations = useCallback(async () => {
    console.log('🔄 [Editor] handleRefreshDurations')
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
    console.log(`✅ [Editor] ${fixedCount || 0} durées corrigées`)
    return fixedCount
  }, [store, project, setClipDurations])

  const handleExportClick = useCallback(() => {
    console.log('📤 [Editor] handleExportClick')
    if (!project || project.tracks.length === 0 || 
        project.tracks.every(t => t.clips.length === 0)) {
      addToast?.(t('editorNothingToExport'), 'info')
      return
    }
    setExportName(project.name || 'Mon mix')
    setShowExportModal(true)
  }, [project, addToast, t])

  // ─── RENDU ──────────────────────────────────────────────────────────────

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  console.log('🔍 [Editor] DEBUG - Vérification des fonctions:')
  console.log('  - addTrack:', typeof addTrack)
  console.log('  - removeTrack:', typeof removeTrack)
  console.log('  - addClip:', typeof addClip)
  console.log('  - removeClip:', typeof removeClip)
  console.log('  - updateClip:', typeof updateClip)
  console.log('  - duplicateClip:', typeof duplicateClip)
  console.log('  - onPlay:', typeof play)
  console.log('  - onStop:', typeof stop)
  console.log('  - setClipDurations:', typeof setClipDurations)
  console.log('  - store.addClipToTrack:', typeof store?.addClipToTrack)

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
        onPlay={togglePlay}
        onStop={stop}
        onExport={handleExportClick}
        onUndo={store?.undoEditor || (() => {})}
        onRedo={store?.redoEditor || (() => {})}
        canUndo={store?.canUndoEditor || false}
        canRedo={store?.canRedoEditor || false}
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
        console.log('🎛️ [Editor] Affichage du panneau d\'effets pour:', selectedClip.name)
        return (
          <EditorEffectsPanel
            clip={selectedClip}
            trackId={selectedTrackId}
            onEffectAdd={store?.addEffectToClip || (() => {})}
            onEffectRemove={store?.removeEffectFromClip || (() => {})}
            onEffectUpdate={store?.updateEffectParam || (() => {})}
            onEffectToggle={store?.toggleEffect || (() => {})}
            onClipUpdate={updateClip}
            onFadeUpdate={store?.setClipFade || (() => {})}
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

      {/* ✅ MODAL ADD TRACK EN PORTAL */}
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

      {showExportModal && (
        <ExportModal
          defaultName={exportName}
          defaultFormat={exportFormat}
          store={store}
          onExport={async (options) => {
            console.log('📤 [Editor] Export démarré')
            setIsExporting(true)
            try {
              const buffer = await mixdownProject(project, clipDurations, 44100)
              const result = await exportMixdown(buffer, options.format, options.bitrate, options.outputPath)
              if (result.success) {
                addToast?.(`${t('editorExportSuccess')}`, 'success')
              }
              setIsExporting(false)
              return result
            } catch (e) {
              console.error('❌ [Editor] Export error:', e)
              addToast?.(`${t('editorExportError')}: ${e.message}`, 'error')
              setIsExporting(false)
              return { success: false, error: e.message }
            }
          }}
          onCancel={() => setShowExportModal(false)}
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
            console.log('📋 [Editor] Dupliquer depuis le menu:', trackId, clipId)
            duplicateClip(trackId, clipId)
            setClipMenu(null)
          }}
          onCopy={() => {}}
          onCut={() => {}}
          onDelete={(trackId, clipId) => {
            console.log('🗑️ [Editor] Supprimer depuis le menu:', trackId, clipId)
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