// src/features/editor/Editor.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@core/i18n/LanguageContext'
import { EditorProvider, useEditor } from './contexts/EditorContext'
import EditorTimeline from './components/Timeline'
import EditorToolbar from './components/Toolbar'
import EditorEffectsPanel from './components/EffectsPanel'
import EditorMasterVolume from './components/MasterVolume'
import ClipActionsMenu from './components/ClipActionsMenu'
import ActionOverlay from './components/ActionOverlay'
import AddTrackModal from './components/Modals/AddTrackModal'
import TrimClipModal from './components/Modals/TrimClipModal'
import NormalizeModal from './components/Modals/NormalizeModal'
import ExportModal from './components/Modals/ExportModal'
import ImportFileModal from './components/Modals/ImportFileModal'
import TimelineLoopModal from './components/Modals/TimelineLoopModal'
import { getClipById } from './utils'
import { mixdownProject, exportMixdown } from '@shared/utils/mixdown'
import { normalizeClip } from '@shared/utils/normalizeUtils'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'
import useConfirm from '@shared/hooks/useConfirm'
import useProjectManager from './hooks/useProjectManager'

export default function Editor({ store, addToast }) {
  return (
    <EditorProvider store={store} addToast={addToast}>
      <EditorContent />
    </EditorProvider>
  )
}

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
          onClick={() => {
            const newProject = {
              id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: 'Nouveau projet',
              tracks: [],
              markers: [],
              loops: {
                clips: {},
                timeline: {
                  enabled: false,
                  start: 0,
                  end: 10,
                  color: '#7C6FF7',
                  durationMode: 'cycles',
                  cycleCount: 3,
                  manualDuration: 10
                }
              },
              duration: 60,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
            context.setProject(newProject)
            context.store?.updateEditorProject?.(newProject)
          }}
          style={{ marginTop: 8 }}
        >
          <i className="ti ti-plus" /> {t('editorCreateProject')}
        </button>
      </div>
    )
  }

  return <EditorTimelineContent />
}

function EditorTimelineContent() {
  const { t, currentLang } = useLanguage()
  const context = useEditor()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  
  const {
    project,
    setProject,
    tracks,
    selectedClipId,
    setSelectedClipId,
    selectedTrackId,
    setSelectedTrackId,
    currentTime,
    setCurrentTime,
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
    splitClip,
    play,
    pause,
    resume,
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
    playClipOnly,
    loopState,
    toggleClipLoop,
    actionOverlay,
    isActionOverlayActive,
    cancelActionOverlay,
    executeActionOverlay,
    activateLoopManualClick,
    activateSplitManualClick,
    activateTimelineLoopManualClick,
    moveClip,
    setTimelineLoop,
    toggleTimelineLoop,
    isPlayingRef,
    isPausedRef,
    currentTimeRef,
    setSoloPlayClipId,
    masterGain,
    setMasterGain,
  } = context

  // ─── ÉTATS LOCAUX ──────────────────────────────────────────────────────
  const [clipMenu, setClipMenu] = useState(null)
  const [selectedClipForMenu, setSelectedClipForMenu] = useState(null)
  const [selectedTrackForMenu, setSelectedTrackForMenu] = useState(null)
  const [showAddTrackModal, setShowAddTrackModal] = useState(false)
  const [pendingTrackName, setPendingTrackName] = useState('')
  const [showTrimModal, setShowTrimModal] = useState(false)
  const [trimClipId, setTrimClipId] = useState(null)
  const [showNormalizeModal, setShowNormalizeModal] = useState(false)
  const [normalizeClipId, setNormalizeClipId] = useState(null)
  const [masterVolume, setMasterVolume] = useState(100)
  const [isMasterMuted, setIsMasterMuted] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportName, setExportName] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [showEffectsPanel, setShowEffectsPanel] = useState(true)
  const [showEffectsAddMenu, setShowEffectsAddMenu] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedImportTrackId, setSelectedImportTrackId] = useState('')
  const [pendingImportFile, setPendingImportFile] = useState(null)
  const [pendingImportFileName, setPendingImportFileName] = useState('')
  const [showTimelineLoopModal, setShowTimelineLoopModal] = useState(false)

  const [isTimelineClickModeActive, setIsTimelineClickModeActive] = useState(false)
  const [timelineClickData, setTimelineClickData] = useState({ start: null, end: null, duration: null })
  const [timelineClickStep, setTimelineClickStep] = useState(0)

  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [bpm, setBpm] = useState(120)

  const [clipboard, setClipboard] = useState(null)

  // ✅ Flag pour empêcher les appels multiples de la confirmation de suppression
  const [isDeletingClip, setIsDeletingClip] = useState(false)

  const masterVolumeRef = useRef(100)

  const projectManager = useProjectManager(store, project, setProject, addToast)

  useEffect(() => {
    const savedEnabled = localStorage.getItem('sounddeck_metronome_enabled')
    const savedBpm = localStorage.getItem('sounddeck_metronome_bpm')
    
    if (savedEnabled !== null) {
      setMetronomeEnabled(savedEnabled === 'true')
    }
    if (savedBpm !== null) {
      setBpm(parseInt(savedBpm, 10))
    }
    
    const savedVolume = localStorage.getItem('sounddeck_master_volume')
    if (savedVolume !== null) {
      const vol = parseInt(savedVolume, 10)
      setMasterVolume(vol)
      masterVolumeRef.current = vol
      setMasterGain(vol / 100)
    }
  }, [setMasterGain])

  const [markersState, setMarkersState] = useState(() => {
    const markers = context.markers || []
    const savedAutoOpen = localStorage.getItem('sounddeck_markers_auto_open')
    const autoOpen = savedAutoOpen === null ? true : savedAutoOpen === 'true'
    
    return {
      markers,
      shouldAutoOpen: autoOpen,
      hasInitialized: false
    }
  })

  useEffect(() => {
    if (markersState.hasInitialized) return
    setMarkersState(prev => ({ ...prev, hasInitialized: true }))
  }, [markersState.hasInitialized])

  const handleAddTrack = useCallback(() => {
    try {
      const trackIndex = tracks.length + 1
      const defaultName = t('editorTrackDefault').replace('{index}', trackIndex)
      setPendingTrackName(defaultName)
      setShowAddTrackModal(true)
    } catch (e) {
      addToast?.('Erreur lors de l\'ouverture du modal', 'error')
    }
  }, [tracks.length, t, addToast])

  const handleAddTrackConfirm = useCallback(async (name, color) => {
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
      addToast?.('Erreur lors de l\'ajout de la piste: ' + e.message, 'error')
      setShowAddTrackModal(false)
      return null
    }
  }, [addTrack, addToast])

  const handlePlayToggle = useCallback(() => {
    const currentlyPlaying = isPlayingRef?.current ?? isPlaying
    const currentlyPaused = isPausedRef?.current ?? isPaused
    
    if (currentlyPlaying) {
      pause()
    } else if (currentlyPaused) {
      resume()
    } else {
      setCurrentTime(0)
      if (currentTimeRef) currentTimeRef.current = 0
      setSoloPlayClipId(null)
      play()
    }
  }, [isPlaying, isPaused, pause, resume, play, isPlayingRef, isPausedRef, currentTimeRef, setCurrentTime, setSoloPlayClipId])

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
      addToast?.('Erreur lors de la suppression', 'error')
    }
  }, [tracks, removeTrack, addToast])

  const handleAddClip = useCallback(async (trackId, soundId, startPosition) => {
    await addClip(trackId, soundId, startPosition)
  }, [addClip])

  const handleAddFileClick = useCallback(() => {
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
    if (!file) {
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
    e.stopPropagation()
    
    const clip = getClipById(tracks, clipId)
    if (!clip) return
    
    setSelectedClipForMenu(clip)
    setSelectedTrackForMenu(trackId)
    setClipMenu({ top: e.clientY, left: e.clientX })
  }, [tracks])

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

  const handleMasterVolumeChange = useCallback((value) => {
    const normalized = Math.max(0, Math.min(200, value))
    setMasterVolume(normalized)
    masterVolumeRef.current = normalized
    const gain = normalized / 100
    setMasterGain(gain)
    localStorage.setItem('sounddeck_master_volume', String(normalized))
  }, [setMasterGain])

  const handleMasterMuteToggle = useCallback(() => {
    const newMuted = !isMasterMuted
    setIsMasterMuted(newMuted)
    if (newMuted) {
      const currentValue = masterVolumeRef.current
      setMasterVolume(currentValue)
      setMasterGain(0)
    } else {
      const restoredValue = masterVolumeRef.current || 100
      setMasterVolume(restoredValue)
      setMasterGain(restoredValue / 100)
    }
  }, [isMasterMuted, setMasterGain])

  const handleResetVolumes = useCallback(() => {
    setMasterVolume(100)
    masterVolumeRef.current = 100
    setMasterGain(1)
    localStorage.setItem('sounddeck_master_volume', '100')
    
    if (project?.tracks) {
      const updatedTracks = project.tracks.map(track => ({
        ...track,
        volume: 1
      }))
      
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now()
      }
      
      setProject(updatedProject)
      
      if (store?.updateEditorProject) {
        store.updateEditorProject(updatedProject).catch(() => {})
      }
      
      if (context.setTrackVolume) {
        for (const track of updatedTracks) {
          context.setTrackVolume(track.id, 1)
        }
      }
      
      context.setMasterGain(1)
      addToast?.(t('editorResetVolumesSuccess') || '✅ Tous les volumes réinitialisés à 100%', 'success')
    }
  }, [project, setProject, store, addToast, context, masterVolumeRef, setMasterVolume, setMasterGain, t])

  const handleToggleMetronome = useCallback((enabled) => {
    setMetronomeEnabled(enabled)
    localStorage.setItem('sounddeck_metronome_enabled', String(enabled))
  }, [])

  const handleBpmChange = useCallback((newBpm) => {
    setBpm(newBpm)
    localStorage.setItem('sounddeck_metronome_bpm', String(newBpm))
  }, [])

  const handleAddEffectFromMenu = useCallback((clipId, trackId) => {
    selectClip(clipId, trackId)
    setShowEffectsPanel(true)
    setShowEffectsAddMenu(true)
    
    const clipName = getClipById(tracks, clipId)?.name || 'clip'
    addToast?.(`Panneau des effets ouvert pour "${clipName}"`, 'info')
  }, [selectClip, tracks, addToast])

  const handleNormalizeWithOptions = useCallback(async (clipId, options) => {
    const clip = getClipById(tracks, clipId)
    if (!clip) {
      addToast?.('Clip non trouvé', 'error')
      return
    }
    
    const { method, target, maxGain, outputFormat = 'wav' } = options
    
    addToast?.(`Normalisation de "${clip.name}" en cours...`, 'info')
    
    try {
      const result = await normalizeClip(
        clip,
        target,
        store,
        {
          outputFormat,
          preserveOriginal: false,
          maxGain: maxGain || 10,
          minGain: 0.1,
          useRMS: method === 'rms',
          targetRMS: target * 0.3
        }
      )
      
      if (result?.normalized) {
        if (result.newPath) {
          const track = tracks.find(t => t.id === selectedTrackId)
          if (track) {
            const updatedTracks = tracks.map(t => {
              if (t.id === selectedTrackId) {
                return {
                  ...t,
                  clips: t.clips.map(c => {
                    if (c.id === clipId) {
                      return {
                        ...c,
                        path: result.newPath,
                        duration: clip.duration
                      }
                    }
                    return c
                  })
                }
              }
              return t
            })
            
            const updatedProject = {
              ...project,
              tracks: updatedTracks,
              updatedAt: Date.now()
            }
            
            setProject(updatedProject)
            
            if (store?.updateEditorProject) {
              await store.updateEditorProject(updatedProject)
            }
          }
        }
        
        addToast?.(`"${clip.name}" normalisé avec succès (gain: ${result.gain.toFixed(2)}x)`, 'success')
      } else if (result === null) {
        addToast?.(`Erreur lors de la normalisation de "${clip.name}"`, 'error')
      } else {
        addToast?.(`"${clip.name}" est déjà à un niveau optimal`, 'info')
      }
    } catch (e) {
      addToast?.(`Erreur: ${e.message}`, 'error')
    }
  }, [tracks, selectedTrackId, project, store, setProject, addToast])

  const handleCopyClip = useCallback((clip) => {
    if (!clip) {
      addToast?.('Aucun clip à copier', 'warning')
      return
    }
    
    setClipboard({
      clip: {
        ...clip,
        _sourceId: clip.id,
        _copiedAt: Date.now()
      },
      trackId: selectedTrackId
    })
    
    addToast?.(`"${clip.name}" ${t('editorCopied')}`, 'success')
  }, [selectedTrackId, addToast, t])

  const handleCutClip = useCallback((clip) => {
    if (!clip) {
      addToast?.('Aucun clip à couper', 'warning')
      return
    }
    
    setClipboard({
      clip: {
        ...clip,
        _sourceId: clip.id,
        _copiedAt: Date.now()
      },
      trackId: selectedTrackId
    })
    
    if (selectedTrackId && clip.id) {
      removeClip(selectedTrackId, clip.id)
      addToast?.(`"${clip.name}" ${t('editorCutAction')}`, 'info')
    } else {
      addToast?.('Impossible de couper le clip', 'error')
    }
  }, [selectedTrackId, removeClip, addToast, t])

  const handlePasteClip = useCallback(async () => {
    if (!clipboard) {
      addToast?.(t('editorClipboardEmpty'), 'warning')
      return
    }
    
    if (Date.now() - clipboard._copiedAt > 300000) {
      setClipboard(null)
      addToast?.(t('editorClipboardExpired'), 'warning')
      return
    }
    
    const { clip, trackId: sourceTrackId } = clipboard
    if (!clip) {
      addToast?.(t('editorClipboardEmpty'), 'warning')
      return
    }
    
    const targetTrackId = selectedTrackId || sourceTrackId || tracks[0]?.id
    
    if (!targetTrackId) {
      addToast?.('Aucune piste disponible', 'error')
      return
    }
    
    if (!project || !store?.updateEditorProject) {
      addToast?.('Impossible de coller le clip', 'error')
      return
    }
    
    const newClip = {
      id: `clip-${Date.now()}`,
      name: clip.name || 'Clip collé',
      path: clip.path,
      start: (clip.start || 0) + 1,
      duration: clip.duration || 3,
      offset: clip.offset || 0,
      volume: clip.volume || 0,
      volumeDb: clip.volumeDb || 0,
      effects: (clip.effects || []).map(e => ({
        ...e,
        id: `effect-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      })),
      fadeIn: clip.fadeIn || 0,
      fadeOut: clip.fadeOut || 0,
      pitch: clip.pitch || 0,
      speed: clip.speed || 1,
      isExternal: clip.isExternal || false
    }
    
    const updatedTracks = project.tracks.map(t => {
      if (t.id === targetTrackId) {
        const clips = [...t.clips, newClip]
        clips.sort((a, b) => a.start - b.start)
        return { ...t, clips }
      }
      return t
    })
    
    const updatedProject = {
      ...project,
      tracks: updatedTracks,
      updatedAt: Date.now()
    }
    
    await store.updateEditorProject(updatedProject)
    setProject(updatedProject)
    
    setClipDurations(prev => ({
      ...prev,
      [newClip.id]: newClip.duration || 3
    }))
    
    addToast?.(`"${newClip.name}" ${t('editorPasted')}`, 'success')
    setSelectedClipId(newClip.id)
    setSelectedTrackId(targetTrackId)
  }, [clipboard, selectedTrackId, tracks, project, store, setProject, setClipDurations, setSelectedClipId, setSelectedTrackId, addToast, t])

  // ✅ handleDeleteWithConfirm - Version corrigée avec flag anti-double-appel
  const handleDeleteWithConfirm = useCallback(async (trackId, clipId, clipName) => {
    // ✅ Empêcher les appels multiples (popup qui se ferme et se rouvre)
    if (isDeletingClip) return
    setIsDeletingClip(true)
    
    try {
      let name = clipName
      if (!name) {
        const clip = getClipById(tracks, clipId)
        name = clip?.name || 'ce clip'
      }
      
      // ✅ Utiliser la traduction avec remplacement du placeholder
      const message = (t('confirmDeleteClipMessage') || `Voulez-vous vraiment supprimer le clip "{name}" ?`).replace('{name}', name)
      
      const confirmed = await confirm({
        title: t('confirmDeleteClip') || 'Confirmer la suppression du clip',
        message: message,
        type: 'danger',
        confirmText: t('editorDelete') || 'Supprimer',
        cancelText: t('cancel') || 'Annuler'
      })
      
      if (confirmed) {
        removeClip(trackId, clipId)
        addToast?.(`Clip "${name}" supprimé`, 'info')
      }
    } catch (e) {
      console.error('Erreur suppression clip:', e)
    } finally {
      // ✅ Réinitialiser le flag après un délai pour éviter les appels multiples
      setTimeout(() => {
        setIsDeletingClip(false)
      }, 400)
    }
  }, [tracks, removeClip, addToast, confirm, t, isDeletingClip])

  const handleTrimClip = useCallback(async (trackId, clipId, newPath, newDuration) => {
    if (!trackId || !clipId) return
    
    try {
      if (store?.updateClipWithPath) {
        await store.updateClipWithPath(clipId, newPath)
      }
      
      const track = project.tracks.find(t => t.id === trackId)
      const clip = track?.clips.find(c => c.id === clipId)
      
      if (!clip) {
        if (store?.editorProject) {
          setProject(store.editorProject)
        }
        return
      }
      
      const updatedTracks = project.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            clips: t.clips.map(c => {
              if (c.id === clipId) {
                return {
                  ...c,
                  path: newPath,
                  duration: newDuration || c.duration,
                  offset: c.offset || 0
                }
              }
              return c
            })
          }
        }
        return t
      })
      
      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now()
      }
      
      setProject(updatedProject)
      
      if (newDuration) {
        setClipDurations(prev => ({ 
          ...prev, 
          [clipId]: newDuration 
        }))
      }
      
      if (store?.updateEditorProject) {
        await store.updateEditorProject(updatedProject)
      }
      
      addToast?.(t('editorTrimSuccess') || 'Clip rogné avec succès', 'success')
      
    } catch (e) {
      addToast?.(t('editorTrimError') || 'Erreur lors du rognage', 'error')
    }
  }, [project, store, setProject, setClipDurations, addToast, t])

  const handlePreviewEffects = useCallback(async (clip) => {
    if (!clip || !clip.path) return
    
    try {
      const { applyEffectsToBuffer } = await import('@shared/utils/realTimeEffects')
      
      const fileUrl = clip.path.startsWith('file://') 
        ? clip.path 
        : 'file:///' + clip.path.replace(/\\/g, '/')
      
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const hasActiveEffects = clip.effects?.some(e => e.enabled) || false
      let processedBuffer = audioBuffer
      
      if (hasActiveEffects) {
        processedBuffer = applyEffectsToBuffer(audioBuffer, clip.effects, audioContext.sampleRate, true)
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
      addToast?.(t('editorEffectPreviewError') || 'Erreur lors de la prévisualisation', 'error')
    }
  }, [addToast, t])

  const handleAddMarker = useCallback((markerData) => {
    const { addMarker } = context
    if (addMarker) {
      addMarker(markerData)
    } else {
      addToast?.('Erreur: addMarker non disponible', 'error')
    }
  }, [context, addToast])

  const handleRemoveMarker = useCallback((markerId) => {
    const { removeMarker } = context
    if (removeMarker) {
      removeMarker(markerId)
    }
  }, [context])

  const handleUpdateMarker = useCallback((markerId, updates) => {
    const { updateMarker } = context
    if (updateMarker) {
      updateMarker(markerId, updates)
    }
  }, [context])

  const handleNavigateToMarker = useCallback((time) => {
    const { navigateToMarker } = context
    if (navigateToMarker) {
      navigateToMarker(time)
    } else {
      seek(time)
    }
  }, [context, seek])

  const moveClipUp = useCallback((trackId, clipId) => {
    const currentTrackIndex = tracks.findIndex(t => t.id === trackId)
    if (currentTrackIndex <= 0) {
      return
    }
    
    const clip = getClipById(tracks, clipId)
    if (!clip) return
    
    const currentStart = clip.start || 0
    
    const targetTrackIndex = currentTrackIndex - 1
    const targetTrack = tracks[targetTrackIndex]
    
    if (!targetTrack) return
    
    moveClip(trackId, clipId, currentStart, targetTrack.id)
    setSelectedTrackId(targetTrack.id)
    
    addToast?.(t('editorClipMovedUp') || 'Clip déplacé vers le haut', 'info')
  }, [tracks, moveClip, setSelectedTrackId, addToast, t])

  const moveClipDown = useCallback((trackId, clipId) => {
    const currentTrackIndex = tracks.findIndex(t => t.id === trackId)
    if (currentTrackIndex >= tracks.length - 1) {
      return
    }
    
    const clip = getClipById(tracks, clipId)
    if (!clip) return
    
    const currentStart = clip.start || 0
    
    const targetTrackIndex = currentTrackIndex + 1
    const targetTrack = tracks[targetTrackIndex]
    
    if (!targetTrack) return
    
    moveClip(trackId, clipId, currentStart, targetTrack.id)
    setSelectedTrackId(targetTrack.id)
    
    addToast?.(t('editorClipMovedDown') || 'Clip déplacé vers le bas', 'info')
  }, [tracks, moveClip, setSelectedTrackId, addToast, t])

  const getCanMoveUp = useCallback((trackId) => {
    const currentTrackIndex = tracks.findIndex(t => t.id === trackId)
    return currentTrackIndex > 0
  }, [tracks])

  const getCanMoveDown = useCallback((trackId) => {
    const currentTrackIndex = tracks.findIndex(t => t.id === trackId)
    return currentTrackIndex < tracks.length - 1
  }, [tracks])

  const handleSetTimelineLoop = useCallback((options) => {
    setTimelineLoop?.(options)
  }, [setTimelineLoop])

  const handleToggleTimelineLoop = useCallback(() => {
    toggleTimelineLoop?.()
  }, [toggleTimelineLoop])

  const handleOpenLoopPanel = useCallback(() => {
    setShowTimelineLoopModal(true)
  }, [])

  const handleActivateTimelineClickMode = useCallback((active = true) => {
    setIsTimelineClickModeActive(active)
    if (active) {
      setTimelineClickStep(0)
      setTimelineClickData({ start: null, end: null, duration: null })
      activateTimelineLoopManualClick()
    } else {
      setTimelineClickStep(0)
      setTimelineClickData({ start: null, end: null, duration: null })
      cancelActionOverlay()
    }
  }, [activateTimelineLoopManualClick, cancelActionOverlay])

  const handleTimelineClickForLoop = useCallback((time) => {
    if (!isTimelineClickModeActive) return
    
    if (executeActionOverlay) {
      executeActionOverlay(time)
    }
    
    const clampedTime = Math.max(0, Math.min(time, totalDuration))
    
    if (timelineClickStep === 0) {
      setTimelineClickData(prev => ({ ...prev, start: clampedTime }))
      setTimelineClickStep(1)
    } else if (timelineClickStep === 1) {
      if (clampedTime > timelineClickData.start) {
        setTimelineClickData(prev => ({ ...prev, end: clampedTime }))
        setTimelineClickStep(2)
      }
    } else if (timelineClickStep === 2) {
      const duration = clampedTime - timelineClickData.start
      if (duration > 0.1) {
        setTimelineClickData(prev => ({ ...prev, duration: duration }))
        setShowTimelineLoopModal(false)
      }
    }
  }, [isTimelineClickModeActive, executeActionOverlay, totalDuration, timelineClickStep, timelineClickData, setShowTimelineLoopModal])

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return `${s.toFixed(1)}s`
  }

  const undoEditor = store?.undoEditor || (() => addToast?.('Undo non disponible', 'info'))
  const redoEditor = store?.redoEditor || (() => addToast?.('Redo non disponible', 'info'))
  const canUndo = store?.canUndoEditor || false
  const canRedo = store?.canRedoEditor || false

  useKeyboardShortcuts({
    onPlay: handlePlayToggle,
    onPause: pause,
    onStop: stop,
    onUndo: undoEditor,
    onRedo: redoEditor,
    onAddTrack: handleAddTrack,
    onAddMarker: () => {
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
      if (selectedClipId && selectedTrackId) {
        const clip = getClipById(tracks, selectedClipId)
        // ✅ Passer le nom du clip
        handleDeleteWithConfirm(selectedTrackId, selectedClipId, clip?.name)
      } else {
        addToast?.('Aucun clip sélectionné', 'info')
      }
    },
    onCopy: () => {
      const clip = getClipById(tracks, selectedClipId)
      if (clip) {
        handleCopyClip(clip)
      } else {
        addToast?.('Aucun clip sélectionné', 'warning')
      }
    },
    onCut: () => {
      const clip = getClipById(tracks, selectedClipId)
      if (clip) {
        handleCutClip(clip)
      } else {
        addToast?.('Aucun clip sélectionné', 'warning')
      }
    },
    onPaste: handlePasteClip,
    onSplit: () => {
      if (selectedClipId && selectedTrackId) {
        const clip = getClipById(tracks, selectedClipId)
        if (clip) {
          const duration = clipDurations[clip.id] || clip.duration || 3
          const start = clip.start || 0
          if (currentTime > start && currentTime < start + duration) {
            splitClip(selectedTrackId, selectedClipId, currentTime)
          } else {
            addToast?.('Le playhead doit être à l\'intérieur du clip', 'warning')
          }
        }
      } else {
        addToast?.('Aucun clip sélectionné', 'info')
      }
    },
    onToggleSnap: () => setSnapEnabled(!snapEnabled),
    onZoomIn: () => handleZoomChange(zoomLevel + 0.1),
    onZoomOut: () => handleZoomChange(zoomLevel - 0.1),
    onZoomReset: () => handleZoomChange(1),
    onToggleMetronome: () => {
      handleToggleMetronome(!metronomeEnabled)
    },
    isPlaying: isPlaying || isPaused,
    canUndo: canUndo,
    canRedo: canRedo,
    isEnabled: true
  })

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
        onPlay={handlePlayToggle}
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
        onRenameProject={async (newName) => {
          if (!newName || !newName.trim()) {
            addToast?.('Nom invalide', 'warning')
            return
          }
          const result = await projectManager.renameProject(project.id, newName.trim())
          if (result) {
            setProject(result)
            addToast?.(`Projet renommé en "${newName}"`, 'success')
          }
        }}
        onRefreshDurations={handleRefreshDurations}
        tr={t}
        addToast={addToast}
        loopState={loopState}
        onToggleTimelineLoop={handleToggleTimelineLoop}
        onOpenLoopPanel={handleOpenLoopPanel}
        metronomeEnabled={metronomeEnabled}
        onToggleMetronome={handleToggleMetronome}
        bpm={bpm}
        onBpmChange={handleBpmChange}
        project={project}
        projectList={projectManager.projectList}
        recentProjects={projectManager.recentProjects}
        isSaving={projectManager.isSaving}
        isLoading={projectManager.isLoading}
        onSaveProject={projectManager.saveProject}
        onLoadProject={projectManager.loadProject}
        onCreateProject={projectManager.createProject}
        onDeleteProject={projectManager.deleteProject}
        onDuplicateProject={projectManager.duplicateProject}
        onProjectRename={projectManager.renameProject}
        onLoadProjectList={projectManager.loadProjectList}
        onExportProject={projectManager.exportProject}
        onImportProject={projectManager.importProject}
      />

      <div style={{ 
        flex: 1, 
        overflow: 'hidden', 
        position: 'relative',
        minHeight: '320px'
      }}>
        {isActionOverlayActive && (
          <ActionOverlay
            isOpen={isActionOverlayActive}
            actionType={actionOverlay.type}
            clipName={actionOverlay.clipName}
            step={actionOverlay.step}
            totalSteps={actionOverlay.totalSteps}
            onCancel={cancelActionOverlay}
            tr={t}
          />
        )}

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
          onClipMove={context.moveClip}
          onClipUpdate={updateClip}
          onClipRemove={handleRemoveClip}
          onClipDuplicate={duplicateClip}
          onClipFade={context.setClipFade || (() => {})}
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
          onToggleLoop={handleToggleTimelineLoop}
          onUpdateClipDuration={handleUpdateClipDuration}
          onSplitClip={(trackId, clipId, splitTime) => {
            return splitClip?.(trackId, clipId, splitTime)
          }}
          markers={context.markers}
          onAddMarker={handleAddMarker}
          onRemoveMarker={handleRemoveMarker}
          onUpdateMarker={handleUpdateMarker}
          onNavigateToMarker={handleNavigateToMarker}
          tr={t}
          addToast={addToast}
          onPlayClip={(clip, trackId) => {
            playClipOnly(clip, trackId)
          }}
          onStopClip={stop}
          onCopyClip={handleCopyClip}
          onCutClip={handleCutClip}
          onPasteClip={handlePasteClip}
          store={store}
          loopState={loopState}
          onToggleClipLoop={(clipId, options) => {
            toggleClipLoop(clipId, options)
          }}
          isPendingAction={isActionOverlayActive}
          pendingAction={actionOverlay}
          onExecutePendingAction={executeActionOverlay}
          onCancelPendingAction={cancelActionOverlay}
          onToggleTimelineLoop={handleToggleTimelineLoop}
          onSetTimelineLoop={handleSetTimelineLoop}
          onOpenLoopPanel={handleOpenLoopPanel}
          onActivateTimelineLoopManualClick={activateTimelineLoopManualClick}
          isTimelineClickModeActive={isTimelineClickModeActive}
          onTimelineClickForLoop={handleTimelineClickForLoop}
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
            showAddMenu={showEffectsAddMenu}
            onShowAddMenuChange={setShowEffectsAddMenu}
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
          onVolumeChange={handleMasterVolumeChange}
          isMuted={isMasterMuted}
          onMuteToggle={handleMasterMuteToggle}
          onReset={handleResetVolumes}
          tr={t}
        />
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', gap: 12 }}>
          <span>{t('editorClips')}: {tracks.flatMap(t => t.clips).length}</span>
          <span>{t('editorTracks')}: {tracks.length}</span>
          <span>{t('editorDuration')}: {formatTime(totalDuration)}</span>
        </div>
      </div>

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
            setIsExporting(true)
            
            try {
              const buffer = await mixdownProject(project, clipDurations, 44100)
              
              if (!buffer) {
                throw new Error('Erreur lors du mixage')
              }
              
              const exportResults = []
              
              if (options.exportLocation === 'file' || options.exportLocation === 'both') {
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

      {showTrimModal && (() => {
        const clip = getClipById(tracks, trimClipId)
        if (!clip) return null
        
        const duration = clipDurations[clip.id] || clip.duration || 3
        
        return createPortal(
          <TrimClipModal
            isOpen={showTrimModal}
            clip={clip}
            trackId={selectedTrackId}
            clipDuration={duration}
            onClose={() => {
              setShowTrimModal(false)
              setTrimClipId(null)
            }}
            onTrim={handleTrimClip}
            tr={t}
            addToast={addToast}
          />,
          document.body
        )
      })()}

      {showNormalizeModal && (() => {
        const clip = getClipById(tracks, normalizeClipId)
        if (!clip) return null
        
        return createPortal(
          <NormalizeModal
            isOpen={showNormalizeModal}
            clip={clip}
            trackId={selectedTrackId}
            onClose={() => {
              setShowNormalizeModal(false)
              setNormalizeClipId(null)
            }}
            onNormalize={handleNormalizeWithOptions}
            tr={t}
          />,
          document.body
        )
      })()}

      {showTimelineLoopModal && createPortal(
        <TimelineLoopModal
          isOpen={showTimelineLoopModal}
          onClose={() => setShowTimelineLoopModal(false)}
          loopState={loopState}
          onApply={handleSetTimelineLoop}
          currentTime={currentTime}
          totalDuration={totalDuration}
          tr={t}
          onActivateClickMode={handleActivateTimelineClickMode}
          isClickModeActive={isTimelineClickModeActive}
          clickModeData={timelineClickData}
        />,
        document.body
      )}

      {clipMenu && (
        <ClipActionsMenu
          clip={selectedClipForMenu}
          trackId={selectedTrackForMenu}
          position={clipMenu}
          onClose={() => {
            setClipMenu(null)
            setSelectedClipForMenu(null)
            setSelectedTrackForMenu(null)
          }}
          onSplit={(trackId, clipId, splitTime) => {
            const clip = getClipById(tracks, clipId)
            if (clip) {
              const duration = clipDurations[clip.id] || clip.duration || 3
              const start = clip.start || 0
              const midPoint = start + duration / 2
              splitClip(trackId, clipId, midPoint)
            }
            setClipMenu(null)
          }}
          onLoop={() => {
            const clip = selectedClipForMenu
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
          onNormalize={(clipId) => {
            setNormalizeClipId(clipId)
            setShowNormalizeModal(true)
            setClipMenu(null)
          }}
          onAddEffect={handleAddEffectFromMenu}
          onDuplicate={(trackId, clipId) => {
            duplicateClip(trackId, clipId)
            setClipMenu(null)
          }}
          onCopy={(clipId, trackId) => {
            const clip = getClipById(tracks, clipId)
            if (clip) handleCopyClip(clip)
            setClipMenu(null)
          }}
          onCut={(clipId, trackId) => {
            const clip = getClipById(tracks, clipId)
            if (clip) handleCutClip(clip)
            setClipMenu(null)
          }}
          onDelete={handleDeleteWithConfirm}
          onFadeIn={context.setClipFade}
          onFadeOut={context.setClipFade}
          onPreviewEffects={handlePreviewEffects}
          isPlaying={isPlaying}
          isLoopEnabled={loopRegion.enabled}
          tr={t}
          onToggleClipLoop={(clipId, options) => {
            toggleClipLoop(clipId, options)
          }}
          onActivateLoopManualClick={activateLoopManualClick}
          onActivateSplitManualClick={activateSplitManualClick}
          loopState={loopState}
          onMoveUp={moveClipUp}
          onMoveDown={moveClipDown}
          canMoveUp={getCanMoveUp(selectedTrackForMenu)}
          canMoveDown={getCanMoveDown(selectedTrackForMenu)}
        />
      )}

      <ConfirmWrapper />
    </div>
  )
}