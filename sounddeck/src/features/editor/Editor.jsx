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

function EditorTimelineContent() {
  const { t, currentLang } = useLanguage()
  const context = useEditor()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })
  
  const {
    project,
    setProject,
    tracks,
    selectedClipId,
    selectedTrackId,
    setSelectedClipId,
    setSelectedTrackId,
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
    splitClip,
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
    playClipOnly,
    loopState,
    toggleClipLoop,
    isPendingAction,
    pendingAction,
    activateLoopManualClick,
    activateSplitManualClick,
    cancelPendingAction,
    executePendingAction,
    moveClip,
    setTimelineLoop,
    toggleTimelineLoop,
    activateTimelineLoopManualClick,
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

  // ✅ ÉTATS POUR LE MODE CLIC DE LA BOUCLE TIMELINE
  const [isTimelineClickModeActive, setIsTimelineClickModeActive] = useState(false)
  const [timelineClickData, setTimelineClickData] = useState({ start: null, end: null, duration: null })
  const [timelineClickStep, setTimelineClickStep] = useState(0)

  // ✅ PRESSE-PAPIERS POUR COPIE/COLLER
  const [clipboard, setClipboard] = useState(null)

  // ─── GUARD POUR LES MARQUEURS ──────────────────────────────────────────
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

  // ─── HANDLERS ──────────────────────────────────────────────────────────

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
    console.log('🗑️ [Editor] removeClip appelé:', { trackId, clipId })
    removeClip(trackId, clipId)
  }, [removeClip])

  const handleClipSelect = useCallback((clipId, trackId) => {
    selectClip(clipId, trackId)
  }, [selectClip])

  const handleClipContextMenu = useCallback((e, clipId, trackId) => {
    console.log('🖱️ [Editor] handleClipContextMenu appelé !')
    console.log('🖱️ [Editor] clipId:', clipId, 'trackId:', trackId)
    
    e.preventDefault()
    e.stopPropagation()
    
    const clip = getClipById(tracks, clipId)
    console.log('🖱️ [Editor] clip trouvé:', clip?.name)
    
    if (!clip) {
      console.warn('🖱️ [Editor] Clip non trouvé !')
      return
    }
    
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

  // ─── HANDLER POUR AJOUTER UN EFFET DEPUIS LE MENU CONTEXTUEL ─────────

  const handleAddEffectFromMenu = useCallback((clipId, trackId) => {
    console.log('✨ [Editor] handleAddEffectFromMenu appelé pour:', clipId, trackId)
    
    selectClip(clipId, trackId)
    setShowEffectsPanel(true)
    setShowEffectsAddMenu(true)
    
    const clipName = getClipById(tracks, clipId)?.name || 'clip'
    addToast?.(`Panneau des effets ouvert pour "${clipName}"`, 'info')
  }, [selectClip, tracks, addToast])

  // ─── HANDLER NORMALISER AVEC OPTIONS ──────────────────────────────────

  const handleNormalizeWithOptions = useCallback(async (clipId, options) => {
    console.log('📊 [Editor] Normalisation avec options:', { clipId, options })
    
    const clip = getClipById(tracks, clipId)
    if (!clip) {
      console.warn('📊 [Editor] Clip non trouvé')
      addToast?.('Clip non trouvé', 'error')
      return
    }
    
    const { method, target, maxGain, outputFormat = 'wav' } = options
    
    console.log('📊 [Editor] Clip trouvé:', clip.name)
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
      
      console.log('📊 [Editor] Résultat normalisation:', result)
      
      if (result?.normalized) {
        console.log('✅ [Editor] Clip normalisé avec succès')
        console.log('  Gain appliqué:', result.gain)
        console.log('  Pic original:', result.originalPeak)
        console.log('  Pic final:', result.finalPeak)
        console.log('  Nouveau chemin:', result.newPath)
        
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
        console.warn('📊 [Editor] Échec de la normalisation')
        addToast?.(`Erreur lors de la normalisation de "${clip.name}"`, 'error')
      } else {
        console.log('📊 [Editor] Clip déjà à un niveau optimal')
        addToast?.(`"${clip.name}" est déjà à un niveau optimal`, 'info')
      }
    } catch (e) {
      console.error('❌ [Editor] Erreur normalisation:', e)
      addToast?.(`Erreur: ${e.message}`, 'error')
    }
  }, [tracks, selectedTrackId, project, store, setProject, addToast])

  // ─── HANDLERS COPIER/COUPER/COLLER ────────────────────────────────────

  const handleCopyClip = useCallback((clip) => {
    if (!clip) {
      addToast?.('Aucun clip à copier', 'warning')
      return
    }
    
    console.log('📋 [Editor] Copie du clip:', clip.id, clip.name)
    
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
    
    console.log('✂️ [Editor] Coupe du clip:', clip.id, clip.name)
    
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
    
    console.log('📋 [Editor] Collage du clip:', clip.id, clip.name)
    
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
    
    console.log('📋 [Editor] Nouveau clip créé:', newClip.id, newClip.name)
    
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
    
    console.log('📋 [Editor] Sauvegarde du projet avec nouveau clip')
    
    await store.updateEditorProject(updatedProject)
    setProject(updatedProject)
    
    setClipDurations(prev => ({
      ...prev,
      [newClip.id]: newClip.duration || 3
    }))
    
    addToast?.(`"${newClip.name}" ${t('editorPasted')}`, 'success')
    setSelectedClipId(newClip.id)
    setSelectedTrackId(targetTrackId)
    
    console.log('📋 [Editor] Collage terminé avec succès')
    
  }, [clipboard, selectedTrackId, tracks, project, store, setProject, setClipDurations, setSelectedClipId, setSelectedTrackId, addToast, t])

  // ─── HANDLER SUPPRESSION AVEC CONFIRMATION ────────────────────────────

  const handleDeleteWithConfirm = useCallback(async (trackId, clipId) => {
    console.log('🗑️ [Editor] handleDeleteWithConfirm appelé:', { trackId, clipId })
    
    const clip = getClipById(tracks, clipId)
    if (!clip) {
      console.warn('🗑️ [Editor] Clip non trouvé')
      return
    }
    
    const confirmed = await confirm({
      title: t('confirmDeleteClip') || 'Confirmer la suppression du clip',
      message: t('confirmDeleteClipMessage') || `Voulez-vous vraiment supprimer le clip "${clip.name}" ?`,
      type: 'danger',
      confirmText: t('editorDelete') || 'Supprimer',
      cancelText: t('cancel') || 'Annuler'
    })
    
    if (confirmed) {
      console.log('🗑️ [Editor] Suppression confirmée pour:', clipId)
      removeClip(trackId, clipId)
      addToast?.('Clip supprimé', 'info')
    } else {
      console.log('🗑️ [Editor] Suppression annulée')
    }
  }, [tracks, removeClip, addToast, confirm, t])

  // ─── HANDLER TRIM ──────────────────────────────────────────────────────

  const handleTrimClip = useCallback(async (trackId, clipId, newPath, newDuration) => {
    if (!trackId || !clipId) return
    
    console.log('✂️ [Editor] handleTrimClip appelé:', { trackId, clipId, newPath, newDuration })
    console.log('✂️ [Editor] project.tracks avant modification:', project?.tracks?.length)
    
    try {
      if (store?.updateClipWithPath) {
        console.log('✂️ [Editor] Mise à jour du chemin dans le store')
        await store.updateClipWithPath(clipId, newPath)
      }
      
      console.log('✂️ [Editor] Mise à jour du clip dans le projet local')
      
      const track = project.tracks.find(t => t.id === trackId)
      const clip = track?.clips.find(c => c.id === clipId)
      
      if (!clip) {
        console.warn('✂️ [Editor] Clip non trouvé dans le projet')
        if (store?.editorProject) {
          console.log('✂️ [Editor] Rafraîchissement depuis le store')
          setProject(store.editorProject)
        }
        return
      }
      
      console.log('✂️ [Editor] Clip trouvé:', clip.name, 'ancien chemin:', clip.path)
      
      const updatedTracks = project.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            clips: t.clips.map(c => {
              if (c.id === clipId) {
                const updatedClip = {
                  ...c,
                  path: newPath,
                  duration: newDuration || c.duration,
                  offset: c.offset || 0
                }
                console.log('✂️ [Editor] Clip mis à jour:', updatedClip)
                return updatedClip
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
      
      console.log('✂️ [Editor] Mise à jour du projet local')
      setProject(updatedProject)
      
      if (newDuration) {
        console.log('✂️ [Editor] Mise à jour de la durée:', newDuration)
        setClipDurations(prev => ({ 
          ...prev, 
          [clipId]: newDuration 
        }))
      }
      
      if (store?.updateEditorProject) {
        console.log('✂️ [Editor] Sauvegarde dans le store')
        await store.updateEditorProject(updatedProject)
      }
      
      console.log('✅ [Editor] Clip rogné avec succès')
      addToast?.(t('editorTrimSuccess') || 'Clip rogné avec succès', 'success')
      
    } catch (e) {
      console.error('❌ [Editor] Erreur lors du rognage:', e)
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

  // ─── HANDLERS MARKERS ──────────────────────────────────────────────────

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

  // ─── FONCTIONS DE DÉPLACEMENT VERTICAL DES CLIPS ─────────────────────

  const moveClipUp = useCallback((trackId, clipId) => {
    console.log('⬆️ [Editor] Déplacement du clip vers le haut:', { trackId, clipId })
    
    const currentTrackIndex = tracks.findIndex(t => t.id === trackId)
    if (currentTrackIndex <= 0) {
      console.warn('⬆️ [Editor] Impossible de monter, piste déjà en haut')
      return
    }
    
    const targetTrackIndex = currentTrackIndex - 1
    const targetTrack = tracks[targetTrackIndex]
    
    if (!targetTrack) {
      console.warn('⬆️ [Editor] Piste cible non trouvée')
      return
    }
    
    moveClip(trackId, clipId, 0, targetTrack.id)
    setSelectedTrackId(targetTrack.id)
    addToast?.(t('editorClipMovedUp') || 'Clip déplacé vers le haut', 'info')
  }, [tracks, moveClip, setSelectedTrackId, addToast, t])

  const moveClipDown = useCallback((trackId, clipId) => {
    console.log('⬇️ [Editor] Déplacement du clip vers le bas:', { trackId, clipId })
    
    const currentTrackIndex = tracks.findIndex(t => t.id === trackId)
    if (currentTrackIndex >= tracks.length - 1) {
      console.warn('⬇️ [Editor] Impossible de descendre, piste déjà en bas')
      return
    }
    
    const targetTrackIndex = currentTrackIndex + 1
    const targetTrack = tracks[targetTrackIndex]
    
    if (!targetTrack) {
      console.warn('⬇️ [Editor] Piste cible non trouvée')
      return
    }
    
    moveClip(trackId, clipId, 0, targetTrack.id)
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

  // ─── HANDLERS BOUCLE TIMELINE ─────────────────────────────────────────

  const handleSetTimelineLoop = useCallback((options) => {
    console.log('🔄 [Editor] setTimelineLoop:', options)
    setTimelineLoop?.(options)
  }, [setTimelineLoop])

  const handleToggleTimelineLoop = useCallback(() => {
    console.log('🔄 [Editor] toggleTimelineLoop')
    toggleTimelineLoop?.()
  }, [toggleTimelineLoop])

  const handleOpenLoopPanel = useCallback(() => {
    console.log('🔄 [Editor] openLoopPanel')
    setShowTimelineLoopModal(true)
  }, [])

  const handleActivateTimelineLoopManualClick = useCallback((mode) => {
    console.log('🖱️ [Editor] activateTimelineLoopManualClick:', mode)
    activateTimelineLoopManualClick?.(mode)
  }, [activateTimelineLoopManualClick])

  // ✅ ACTIVER LE MODE CLIC POUR LA BOUCLE TIMELINE
  const handleActivateTimelineClickMode = useCallback((active = true) => {
    console.log('🖱️ [Editor] handleActivateTimelineClickMode:', active)
    setIsTimelineClickModeActive(active)
    if (active) {
      setTimelineClickStep(0)
      setTimelineClickData({ start: null, end: null, duration: null })
      addToast?.('🖱️ Cliquez sur la timeline pour définir le début (1/3)', 'info')
    } else {
      setTimelineClickStep(0)
      setTimelineClickData({ start: null, end: null, duration: null })
    }
  }, [addToast])

  // ✅ GÉRER LES CLICS SUR LA TIMELINE POUR LE MODE CLIC
  const handleTimelineClickForLoop = useCallback((time) => {
    if (!isTimelineClickModeActive) return
    
    console.log('🖱️ [Editor] Clic timeline pour boucle:', time, 'étape:', timelineClickStep)
    
    const clampedTime = Math.max(0, Math.min(time, totalDuration))
    
    if (timelineClickStep === 0) {
      // ✅ 1er clic = Début
      setTimelineClickData(prev => ({ ...prev, start: clampedTime }))
      setTimelineClickStep(1)
      addToast?.(`🖱️ Début défini à ${formatTime(clampedTime)} - Cliquez pour la fin (2/3)`, 'info')
    } else if (timelineClickStep === 1) {
      // ✅ 2ème clic = Fin
      if (clampedTime > timelineClickData.start) {
        setTimelineClickData(prev => ({ ...prev, end: clampedTime }))
        setTimelineClickStep(2)
        const duration = clampedTime - timelineClickData.start
        addToast?.(`🖱️ Fin définie à ${formatTime(clampedTime)} - Durée: ${formatTime(duration)} - Cliquez pour la durée (3/3)`, 'info')
      } else {
        addToast?.('⚠️ La fin doit être après le début', 'warning')
      }
    } else if (timelineClickStep === 2) {
      // ✅ 3ème clic = Durée ou temps manuel
      const duration = clampedTime - timelineClickData.start
      if (duration > 0.1) {
        setTimelineClickData(prev => ({ ...prev, duration: duration }))
        // ✅ Appliquer automatiquement
        const start = timelineClickData.start
        const end = timelineClickData.end
        
        // ✅ Mettre à jour le loopState
        const updatedLoopState = {
          ...loopState,
          timeline: {
            ...loopState.timeline,
            start: start,
            end: end,
            manualDuration: duration,
            durationMode: 'manualDuration'
          }
        }
        
        // ✅ Appliquer via le contexte
        setTimelineLoop(updatedLoopState.timeline)
        
        addToast?.(`✅ Boucle définie: ${formatTime(start)} → ${formatTime(end)} (${formatTime(duration)})`, 'success')
        
        // ✅ Désactiver le mode clic
        setIsTimelineClickModeActive(false)
        setTimelineClickStep(0)
        setTimelineClickData({ start: null, end: null, duration: null })
        
        // ✅ Fermer le modal
        setShowTimelineLoopModal(false)
      } else {
        addToast?.('⚠️ La durée doit être d\'au moins 0.1s', 'warning')
      }
    }
  }, [isTimelineClickModeActive, timelineClickStep, timelineClickData, totalDuration, loopState, setTimelineLoop, addToast])

  // ✅ FORMATER LE TEMPS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return `${s.toFixed(1)}s`
  }

  // ─── RACCOURCIS CLAVIER ──────────────────────────────────────────────

  const undoEditor = store?.undoEditor || (() => addToast?.('Undo non disponible', 'info'))
  const redoEditor = store?.redoEditor || (() => addToast?.('Redo non disponible', 'info'))
  const canUndo = store?.canUndoEditor || false
  const canRedo = store?.canRedoEditor || false

  useKeyboardShortcuts({
    onPlay: () => {
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
        console.log('🗑️ [Keyboard] Suppression du clip:', selectedClipId)
        handleDeleteWithConfirm(selectedTrackId, selectedClipId)
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
    isPlaying: isPlaying || isPaused,
    canUndo: canUndo,
    canRedo: canRedo,
    isEnabled: true
  })

  // ─── RENDU ──────────────────────────────────────────────────────────────

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
        onRenameProject={store?.updateEditorProjectName || (() => {})}
        onRefreshDurations={handleRefreshDurations}
        tr={t}
        addToast={addToast}
        loopState={loopState}
        onToggleTimelineLoop={handleToggleTimelineLoop}
        onOpenLoopPanel={handleOpenLoopPanel}
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
            console.log('🔄 [Editor] onToggleClipLoop appelé avec:', { clipId, options })
            toggleClipLoop(clipId, options)
          }}
          isPendingAction={isPendingAction}
          pendingAction={pendingAction}
          onExecutePendingAction={executePendingAction}
          onCancelPendingAction={cancelPendingAction}
          onToggleTimelineLoop={handleToggleTimelineLoop}
          onSetTimelineLoop={handleSetTimelineLoop}
          onOpenLoopPanel={handleOpenLoopPanel}
          onActivateTimelineLoopManualClick={handleActivateTimelineLoopManualClick}
          // ✅ MODE CLIC POUR LA BOUCLE TIMELINE
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

      {/* MODAL EXPORT */}
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

      {/* MODAL TRIM */}
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

      {/* MODAL NORMALIZE */}
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

      {/* ✅ MODAL BOUCLE TIMELINE */}
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

      {/* CLIP ACTIONS MENU */}
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
            console.log('✂️ [Editor] onTrim appelé avec clipId:', clipId)
            setTrimClipId(clipId)
            setShowTrimModal(true)
            setClipMenu(null)
          }}
          onNormalize={(clipId) => {
            console.log('📊 [Editor] Normaliser depuis menu:', clipId)
            setNormalizeClipId(clipId)
            setShowNormalizeModal(true)
            setClipMenu(null)
          }}
          onAddEffect={handleAddEffectFromMenu}
          onDuplicate={(trackId, clipId) => {
            console.log('📋 [Editor] Dupliquer depuis menu:', { trackId, clipId })
            duplicateClip(trackId, clipId)
            setClipMenu(null)
          }}
          onCopy={(clipId, trackId) => {
            console.log('📋 [Editor] Copier depuis menu:', { clipId, trackId })
            const clip = getClipById(tracks, clipId)
            if (clip) handleCopyClip(clip)
            setClipMenu(null)
          }}
          onCut={(clipId, trackId) => {
            console.log('✂️ [Editor] Couper depuis menu:', { clipId, trackId })
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
            console.log('🔄 [Editor] onToggleClipLoop appelé avec:', { clipId, options })
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

      {/* ✅ ConfirmWrapper */}
      <ConfirmWrapper />
    </div>
  )
}