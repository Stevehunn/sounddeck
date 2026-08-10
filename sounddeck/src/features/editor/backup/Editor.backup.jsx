// src/features/editor/Editor.jsx
import { useCallback } from 'react'
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

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────

export default function Editor({ store, addToast }) {
  return (
    <EditorProvider store={store} addToast={addToast}>
      <EditorContent />
    </EditorProvider>
  )
}

// ─── COMPOSANT CONTENU ──────────────────────────────────────────────────────

function EditorContent() {
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

  const handleAddTrack = useCallback(async () => {
    console.log('➕ [Editor] handleAddTrack appelé')
    const trackIndex = tracks.length + 1
    setPendingTrackName(t('editorTrackDefault').replace('{index}', trackIndex))
    setShowAddTrackModal(true)
  }, [tracks.length, t])

  const handleAddTrackConfirm = useCallback(async (name, color) => {
    await addTrack(name, color)
    setShowAddTrackModal(false)
  }, [addTrack])

  const handleRemoveTrack = useCallback(async (trackId) => {
    const track = tracks.find(t => t.id === trackId)
    if (track && track.clips.length > 0) {
      const confirmed = window.confirm(
        t('editorRemoveTrackConfirm').replace('{count}', track.clips.length)
      )
      if (!confirmed) return
    }
    await removeTrack(trackId)
    if (selectedTrackId === trackId) {
      deselectClip()
    }
  }, [tracks, selectedTrackId, removeTrack, deselectClip, t])

  const handleAddClip = useCallback(async (trackId, soundId, startPosition) => {
    await addClip(trackId, soundId, startPosition)
  }, [addClip])

  const handleRemoveClip = useCallback((trackId, clipId) => {
    removeClip(trackId, clipId)
  }, [removeClip])

  const handleClipSelect = useCallback((clipId, trackId) => {
    selectClip(clipId, trackId)
  }, [selectClip])

  const handleExportClick = useCallback(() => {
    if (!project || project.tracks.length === 0 || 
        project.tracks.every(t => t.clips.length === 0)) {
      addToast?.(t('editorNothingToExport'), 'info')
      return
    }
    setExportName(project.name || 'Mon mix')
    setShowExportModal(true)
  }, [project, addToast, t])

  const handleRefreshDurations = useCallback(async () => {
    if (!store) return 0
    const fixedCount = await store.fixAllClipDurations?.()
    await context.loadClipDurations?.()
    return fixedCount
  }, [store, context])

  // ─── RENDU ──────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--bg-primary)'
    }}>
      {/* Barre d'outils */}
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

      {/* Timeline */}
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
          onClipContextMenu={(e, clipId, trackId) => {
            setSelectedClipForMenu(clipId)
            setSelectedTrackForMenu(trackId)
            setClipMenu({ top: e.clientY, left: e.clientX })
          }}
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
          onUpdateClipDuration={(clipId, duration) => {
            setClipDurations(prev => ({ ...prev, [clipId]: duration }))
            updateClip(selectedTrackId, clipId, { duration })
          }}
          tr={t}
          addToast={addToast}
        />
      </div>

      {/* Panneau d'effets */}
      {showEffectsPanel && (() => {
        const selectedClip = selectedClipId ? getClipById(tracks, selectedClipId) : null
        if (!selectedClip) return null
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

      {/* Barre inférieure */}
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

      {/* Modals */}
      {showAddTrackModal && (
        <AddTrackModal
          onConfirm={handleAddTrackConfirm}
          onCancel={() => setShowAddTrackModal(false)}
          defaultName={pendingTrackName}
          tr={t}
        />
      )}

      {showExportModal && (
        <ExportModal
          defaultName={exportName}
          defaultFormat={exportFormat}
          store={store}
          onExport={async (options) => {
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
              console.error('Export error:', e)
              addToast?.(`${t('editorExportError')}: ${e.message}`, 'error')
              setIsExporting(false)
              return { success: false, error: e.message }
            }
          }}
          onCancel={() => setShowExportModal(false)}
          tr={t}
        />
      )}
    </div>
  )
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}