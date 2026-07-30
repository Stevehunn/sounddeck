// src/pages/editor/Editor.jsx
import { useState, useCallback, useMemo } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { EditorProvider, useEditor } from './contexts/EditorContext'
import { usePlayback } from './hooks/usePlayback'
import EditorTimeline from './components/EditorTimeline'
import EditorToolbar from './components/EditorToolbar'
import EditorEffectsPanel from './components/EditorEffectsPanel'
import EditorMasterVolume from './components/EditorMasterVolume'
import ClipActionsMenu from './components/ClipActionsMenu'
import EditorMarkersPanel from './components/EditorMarkersPanel'
import AddTrackModal from './components/AddTrackModal'
import TrimModal from './components/TrimModal'
import ExportModal from './components/ExportModal'
import { getClipById } from './utils'
import { mixdownProject, exportMixdown } from '../../utils/mixdown'

// ─── COMPOSANT QUI CONTIENT TOUTE LA LOGIQUE ──────────────────────────────

function EditorTimelineContent() {
  const { t } = useLanguage()
  const context = useEditor()
  
  // ✅ TOUS LES HOOKS ICI - TOUJOURS APPELÉS
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
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [autoCrossfade, setAutoCrossfade] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Récupérer les données du contexte
  const project = context?.project || { tracks: [] }
  const selectedClipId = context?.selectedClipId || null
  const selectedTrackId = context?.selectedTrackId || null
  const clipDurations = context?.clipDurations || {}
  const waveformData = context?.waveformData || {}
  const isLoading = context?.isLoading || false
  const isDirty = context?.isDirty || false
  const isAutoSaving = context?.isAutoSaving || false
  const totalDuration = context?.totalDuration || 10
  const store = context?.store
  const addToast = context?.addToast
  const selectClip = context?.selectClip || (() => {})
  const deselectClip = context?.deselectClip || (() => {})
  const updateWaveform = context?.updateWaveform || (() => {})
  const editorLoopRegion = context?.editorLoopRegion || { enabled: false, start: 0, end: 10 }
  const setEditorLoopRegion = context?.setEditorLoopRegion || (() => {})
  const toggleEditorLoop = context?.toggleEditorLoop || (() => {})
  const clearEditorLoopRegion = context?.clearEditorLoopRegion || (() => {})

  // ✅ usePlayback TOUJOURS appelé
  const {
    isPlaying,
    isPaused,
    currentTime,
    play,
    pause,
    resume,
    stop,
    seek,
    togglePlay,
    updateClipEffects,
  } = usePlayback({
    project: project || { tracks: [] },
    clipDurations,
    store: store || { sounds: [] },
    masterVolume: 100,
    isMasterMuted: false,
    loopRegion: editorLoopRegion,
    onError: (error) => addToast?.(error, 'error')
  })

  // ✅ TOUS LES HANDLERS ICI - TOUJOURS APPELÉS
  const handlePlay = useCallback(() => togglePlay(), [togglePlay])
  const handleStop = useCallback(() => stop(), [stop])
  const handleSeek = useCallback((time) => seek(time), [seek])

  const handleAddTrack = useCallback(async () => {
    if (!store) return
    const trackIndex = project.tracks.length + 1
    setPendingTrackName(t('editorTrackDefault').replace('{index}', trackIndex))
    setShowAddTrackModal(true)
  }, [store, project.tracks.length, t])

  const handleAddTrackConfirm = useCallback(async (name, color) => {
    if (!store) return
    await store.addTrack(name, color)
    addToast?.(t('editorTrackAdded'), 'success')
    setShowAddTrackModal(false)
  }, [store, addToast, t])

  const handleRenameTrack = useCallback(async (trackId, newName) => {
    if (!store) return
    await store.renameTrack(trackId, newName)
    addToast?.(t('editorTrackRenamed'), 'success')
  }, [store, addToast, t])

  const handleRemoveTrack = useCallback(async (trackId) => {
    if (!store) return
    const track = project.tracks.find(t => t.id === trackId)
    if (track && track.clips.length > 0) {
      const confirmed = window.confirm(
        t('editorRemoveTrackConfirm').replace('{count}', track.clips.length)
      )
      if (!confirmed) return
    }
    await store.removeTrack(trackId)
    if (selectedTrackId === trackId) {
      deselectClip()
    }
    addToast?.(t('editorTrackRemoved'), 'info')
  }, [store, project.tracks, selectedTrackId, deselectClip, addToast, t])

  const handleAddClip = useCallback(async (trackId, soundId, startPosition = null) => {
    if (!store) return
    const sound = store.sounds.find(s => s.id === soundId)
    if (!sound) {
      addToast?.(t('editorSoundNotFound'), 'error')
      return
    }

    const clip = await store.addClipToTrack(trackId, soundId, startPosition)
    if (clip) {
      addToast?.(`"${sound.name}" ${t('editorClipAdded')}`, 'success')
      selectClip(clip.id, trackId)
      // ✅ La durée est maintenant mise à jour automatiquement via l'événement dans EditorContext
    }
  }, [store, addToast, t, selectClip])

  const handleAddClipFromFile = useCallback(async (trackId, filePath) => {
    if (!store) return
    try {
      const exists = await window.electronAPI.fileExists?.(filePath)
      if (!exists) {
        addToast?.(t('editorFileNotFound'), 'error')
        return
      }

      const clip = await store.addClipFromFile(trackId, filePath)
      if (clip) {
        addToast?.(`"${clip.name}" ${t('editorClipAdded')}`, 'success')
        selectClip(clip.id, trackId)
        // ✅ La durée est maintenant mise à jour automatiquement via l'événement dans EditorContext
      }
    } catch (e) {
      console.error('Erreur ajout fichier:', e)
      addToast?.(t('editorFileImportError'), 'error')
    }
  }, [store, addToast, t, selectClip])

  const handleRemoveClip = useCallback(async (trackId, clipId) => {
    if (!store) return
    await store.removeClip(trackId, clipId)
    if (selectedClipId === clipId) deselectClip()
    addToast?.(t('editorClipRemoved'), 'info')
  }, [store, selectedClipId, deselectClip, addToast, t])

  const handleClipSelect = useCallback((clipId, trackId) => {
    selectClip(clipId, trackId)
  }, [selectClip])

  const handleUpdateClipDuration = useCallback((clipId, newDuration) => {
    if (store && selectedTrackId) {
      store.updateClip(selectedTrackId, clipId, { duration: newDuration })
      console.log(`📏 Mise à jour durée clip ${clipId}: ${newDuration.toFixed(2)}s`)
    }
  }, [store, selectedTrackId])

  const handleEffectAdd = useCallback(async (trackId, clipId, effectType, params) => {
    if (!store) return null
    const effect = await store.addEffectToClip(trackId, clipId, effectType, params)
    if (effect) {
      updateClipEffects(clipId)
    }
    return effect
  }, [store, updateClipEffects])

  const handleEffectRemove = useCallback(async (trackId, clipId, effectId) => {
    if (!store) return
    await store.removeEffectFromClip(trackId, clipId, effectId)
    updateClipEffects(clipId)
  }, [store, updateClipEffects])

  const handleEffectUpdate = useCallback(async (trackId, clipId, effectId, param, value) => {
    if (!store) return
    await store.updateEffectParam(trackId, clipId, effectId, param, value)
    updateClipEffects(clipId)
  }, [store, updateClipEffects])

  const handleEffectToggle = useCallback(async (trackId, clipId, effectId, enabled) => {
    if (!store) return
    await store.toggleEffect(trackId, clipId, effectId, enabled)
    updateClipEffects(clipId)
  }, [store, updateClipEffects])

  const handleFadeUpdate = useCallback((trackId, clipId, edge, duration) => {
    if (!store) return
    store.setClipFade(trackId, clipId, edge, duration)
    updateClipEffects(clipId)
  }, [store, updateClipEffects])

  const handleClipContextMenu = useCallback((clipId, trackId, e) => {
    e.preventDefault()
    e.stopPropagation()

    const clip = getClipById(project.tracks, clipId)
    if (!clip) return

    setSelectedClipForMenu(clipId)
    setSelectedTrackForMenu(trackId)

    const rect = e.currentTarget?.getBoundingClientRect() || e.target?.getBoundingClientRect()
    const top = Math.min(e.clientY || rect?.bottom || 0, window.innerHeight - 40)
    const left = Math.min(e.clientX || rect?.left || 0, window.innerWidth - 40)

    setClipMenu({ top, left })
  }, [project.tracks])

  const handleLoopFromMenu = useCallback((clipId) => {
    const clip = getClipById(project.tracks, clipId)
    if (clip) {
      const clipDuration = clipDurations[clipId] || clip.duration || 3
      setEditorLoopRegion(clip.start, clip.start + clipDuration)
      toggleEditorLoop()
      addToast?.(t('editorLoopSet'), 'success')
    }
    setClipMenu(null)
  }, [project.tracks, clipDurations, setEditorLoopRegion, toggleEditorLoop, t, addToast])

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
    console.log('🔄 [Editor] Rafraîchissement des durées...')
    const fixedCount = await store.fixAllClipDurations()
    await context?.loadClipDurations?.()
    console.log(`✅ [Editor] ${fixedCount} clip(s) corrigé(s)`)
    return fixedCount
  }, [store, context])

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Rendu
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
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        totalDuration={totalDuration || 10}
        onPlay={handlePlay}
        onStop={handleStop}
        onExport={handleExportClick}
        onAddTrack={handleAddTrack}
        onAddClip={handleAddClip}
        onAddClipFromFile={handleAddClipFromFile}
        tracks={project.tracks || []}
        sounds={store?.sounds || []}
        isLoading={isLoading}
        isExporting={isExporting}
        onUndo={store?.undoEditor || (() => {})}
        onRedo={store?.redoEditor || (() => {})}
        canUndo={store?.canUndoEditor || false}
        canRedo={store?.canRedoEditor || false}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        projectName={project?.name || 'Nouveau projet'}
        onRenameProject={store?.updateEditorProjectName || (() => {})}
        isPreviewingEffect={false}
        autoCrossfade={autoCrossfade}
        onToggleCrossfade={() => setAutoCrossfade(!autoCrossfade)}
        isDirty={isDirty}
        isAutoSaving={isAutoSaving}
        tr={t}
        addToast={addToast || (() => {})}
        onRefreshDurations={handleRefreshDurations}
      />

      {/* Timeline ou écran vide */}
      {project.tracks.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          color: 'var(--text-tertiary)',
          gap: 16,
          padding: 20
        }}>
          <i className="ti ti-playlist" style={{ fontSize: 48, color: 'var(--border)' }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>{t('editorNoTracks')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
            {t('editorNoTracksDesc') || 'Ajoutez une piste pour commencer à éditer vos sons.'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn-primary btn-lg"
              onClick={handleAddTrack}
              style={{ minWidth: 140 }}
            >
              <i className="ti ti-plus" /> {t('editorAddTrack')}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <EditorTimeline
            tracks={project.tracks}
            selectedClipId={selectedClipId}
            selectedTrackId={selectedTrackId}
            totalDuration={totalDuration || 10}
            onClipSelect={handleClipSelect}
            onClipMove={store?.moveClip || (() => {})}
            onClipUpdate={store?.updateClip || (() => {})}
            onClipRemove={handleRemoveClip}
            onClipDuplicate={store?.duplicateClip || (() => {})}
            onClipFade={store?.setClipFade || (() => {})}
            onClipCopy={() => {}}
            onClipCut={() => {}}
            onClipContextMenu={handleClipContextMenu}
            onDragCheckpoint={store?.pushEditorHistoryCheckpoint || (() => {})}
            onTrackRemove={handleRemoveTrack}
            onSeek={handleSeek}
            onTrackMute={(trackId, muted) => store?.updateTrack(trackId, { muted })}
            onTrackSolo={(trackId, solo) => store?.updateTrack(trackId, { solo })}
            onTrackVolume={(trackId, volume) => store?.updateTrack(trackId, { volume })}
            onTrackReorder={store?.reorderTracks || (() => {})}
            waveformData={waveformData}
            onWaveformUpdate={updateWaveform}
            currentTime={currentTime}
            isPlaying={isPlaying || isPaused}
            clipDurations={clipDurations}
            snapEnabled={snapEnabled}
            loopRegion={editorLoopRegion}
            onSetLoopRegion={setEditorLoopRegion}
            autoCrossfade={autoCrossfade}
            addToast={addToast || (() => {})}
            tr={t}
            onRenameTrack={handleRenameTrack}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
            onSetLoopStart={(time) => setEditorLoopRegion(time, editorLoopRegion.end)}
            onSetLoopEnd={(time) => setEditorLoopRegion(editorLoopRegion.start, time)}
            onClearLoop={clearEditorLoopRegion}
            onToggleLoop={toggleEditorLoop}
            onSplitClip={store?.splitClip || (() => {})}
            onTrimClip={() => {}}
            onSetFade={store?.setClipFade || (() => {})}
            onUpdateClipDuration={handleUpdateClipDuration}
          />
        </div>
      )}

      {/* Panneau d'effets */}
      {showEffectsPanel && (() => {
        const selectedClip = selectedClipId ? getClipById(project.tracks, selectedClipId) : null
        if (!selectedClip) return null
        return (
          <EditorEffectsPanel
            clip={selectedClip}
            trackId={selectedTrackId}
            onEffectAdd={handleEffectAdd}
            onEffectRemove={handleEffectRemove}
            onEffectUpdate={handleEffectUpdate}
            onEffectToggle={handleEffectToggle}
            onClipUpdate={store?.updateClip || (() => {})}
            onFadeUpdate={handleFadeUpdate}
            onPreview={() => {}}
            isPreviewing={false}
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
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: 8
      }}>
        <EditorMasterVolume
          volume={isMasterMuted ? 0 : masterVolume}
          onVolumeChange={setMasterVolume}
          isMuted={isMasterMuted}
          onMuteToggle={() => setIsMasterMuted(!isMasterMuted)}
          peakMeter={0}
          tr={t}
        />

        <div style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          display: 'flex',
          gap: 12,
          alignItems: 'center'
        }}>
          <span>{t('editorClips')}: {project.tracks?.flatMap(t => t.clips).length || 0}</span>
          <span>{t('editorTracks')}: {project.tracks?.length || 0}</span>
          <span>{t('editorDuration')}: {formatTime(totalDuration || 10)}</span>
        </div>
      </div>

      {/* Menu contextuel */}
      {clipMenu && selectedClipForMenu && (
        <ClipActionsMenu
          clip={getClipById(project.tracks, selectedClipForMenu)}
          trackId={selectedTrackForMenu}
          position={clipMenu}
          onClose={() => setClipMenu(null)}
          onSplit={(trackId, clipId) => {
            store?.splitClip(trackId, clipId, currentTime)
            setClipMenu(null)
          }}
          onLoop={handleLoopFromMenu}
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
          onDuplicate={store?.duplicateClip || (() => {})}
          onCopy={() => {}}
          onCut={() => {}}
          onDelete={handleRemoveClip}
          onFadeIn={store?.setClipFade || (() => {})}
          onFadeOut={store?.setClipFade || (() => {})}
          onPreviewEffects={() => {}}
          isPlaying={isPlaying}
          isLoopEnabled={editorLoopRegion.enabled}
          tr={t}
        />
      )}

      {/* Marqueurs */}
      <EditorMarkersPanel
        markers={project.markers || []}
        currentTime={currentTime}
        onAddMarker={store?.saveEditorMarkers || (() => {})}
        onRemoveMarker={store?.saveEditorMarkers || (() => {})}
        onSeek={handleSeek}
        tr={t}
      />

      {/* Modals */}
      {showAddTrackModal && (
        <AddTrackModal
          onConfirm={handleAddTrackConfirm}
          onCancel={() => setShowAddTrackModal(false)}
          defaultName={pendingTrackName}
          tr={t}
        />
      )}

      {showTrimModal && trimClipId && (
        <TrimModal
          clip={getClipById(project.tracks, trimClipId)}
          onConfirm={(clipId, start, end) => {
            setShowTrimModal(false)
            setTrimClipId(null)
          }}
          onCancel={() => {
            setShowTrimModal(false)
            setTrimClipId(null)
          }}
          tr={t}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          defaultName={exportName || project.name || 'Mon mix'}
          defaultFormat={exportFormat}
          store={store}
          onExport={async (options) => {
            setIsExporting(true)
            try {
              if (!options.outputPath) {
                console.error('❌ [Editor] Pas de chemin de sortie !')
                addToast?.('Erreur: chemin de sortie manquant', 'error')
                setIsExporting(false)
                return { success: false, error: 'Chemin de sortie manquant' }
              }
              
              console.log('📤 [Editor] Export démarré avec options:', options)
              
              const buffer = await mixdownProject(project, clipDurations, 44100, null, 0, null)
              console.log('✅ [Editor] Mixdown terminé, durée:', buffer.duration, 's')
              
              const result = await exportMixdown(
                buffer,
                options.format,
                options.bitrate,
                options.outputPath
              )
              console.log('📄 [Editor] Résultat export:', result)
              
              if (!result.success) {
                console.error('❌ [Editor] Erreur export:', result.error)
                addToast?.(`${t('editorExportError')}: ${result.error}`, 'error')
                setIsExporting(false)
                return { success: false, error: result.error }
              }
              
              if (options.addToLibrary && options.profiles && options.profiles.length > 0) {
                const soundName = options.name || project.name || 'Mix exporté'
                console.log('📚 [Editor] Ajout à la bibliothèque:', soundName, 'profils:', options.profiles)
                
                const fileExists = await window.electronAPI.fileExists(result.path)
                console.log(`📁 [Editor] Le fichier ${result.path} existe: ${fileExists}`)
                
                if (!fileExists) {
                  console.warn('⚠️ [Editor] Le fichier n\'existe pas:', result.path)
                  addToast?.('⚠️ Le fichier exporté n\'a pas été trouvé', 'warning')
                }
                
                await store?.addSound({
                  name: soundName,
                  path: result.path,
                  emoji: '🎵',
                  profiles: options.profiles
                })
                console.log('✅ [Editor] Son ajouté à la bibliothèque')
                
                addToast?.(`"${soundName}" ${t('editorExportFile')} ${t('ytSoundAdded')}`, 'success')
              }
              
              if (options.deleteAfterAdd) {
                try {
                  await window.electronAPI.deleteSoundFile(result.path)
                  console.log('🗑️ [Editor] Fichier temporaire supprimé:', result.path)
                } catch (e) {
                  console.warn('⚠️ [Editor] Impossible de supprimer le fichier temporaire:', e)
                }
              }
              
              console.log('✅ [Editor] Export terminé avec succès')
              addToast?.(`${t('editorExportSuccess')} (${options.format})`, 'success')
              setIsExporting(false)
              return { success: true, path: result.path }
              
            } catch (e) {
              console.error('❌ [Editor] Exception export:', e)
              addToast?.(`${t('editorExportError')}: ${e.message}`, 'error')
              setIsExporting(false)
              return { success: false, error: e.message }
            }
          }}
          onCancel={(success) => {
            setShowExportModal(false)
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

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
  
  // Vérifications initiales
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
          onClick={() => context.store?.createEditorProject('Nouveau projet')}
          style={{ marginTop: 8 }}
        >
          <i className="ti ti-plus" /> {t('editorCreateProject')}
        </button>
      </div>
    )
  }

  // ✅ TOUT EST PRÊT - Rendre le composant avec toute la logique
  return <EditorTimelineContent />
}