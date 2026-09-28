// src/features/editor/Editor.jsx
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
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
import { getClipById, formatTime } from './utils'
import { mixdownProject, exportMixdown } from '@shared/utils/mixdown'
import { normalizeClip } from '@shared/utils/normalizeUtils'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'
import useConfirm from '@shared/hooks/useConfirm'
import useProjectManager from './hooks/useProjectManager'
import { buildFileUrl } from '@shared/utils/fileUrl'
import { getBoolean, getNumber, setItem } from '@shared/utils/appStorage'
import { uuid } from '@shared/utils/uuid'
import { logError } from '@shared/utils/logger'

const __DEBUG__ = typeof import.meta !== 'undefined' && import.meta.env?.DEV

const STORE_KEY_METRONOME_ENABLED = 'sounddeck_metronome_enabled'
const STORE_KEY_METRONOME_BPM = 'sounddeck_metronome_bpm'
const STORE_KEY_MASTER_VOLUME = 'sounddeck_master_volume'

export default function Editor({ store, addToast }) {
  const { currentLang } = useLanguage()
  const { confirm, ConfirmWrapper } = useConfirm({ lang: currentLang })

  return (
    <>
      <EditorProvider store={store} addToast={addToast} confirm={confirm}>
        <EditorContent />
      </EditorProvider>
      <ConfirmWrapper />
    </>
  )
}

function EditorContent() {
  const { t } = useLanguage()
  const context = useEditor()

  if (!context || !context.isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-tertiary)',
          gap: 12,
        }}
      >
        <i
          className="ti ti-loader"
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <span>{t('editorLoading')}</span>
      </div>
    )
  }

  if (!context.project || !context.project.id) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-tertiary)',
          gap: 12,
          padding: 20,
        }}
      >
        <i
          className="ti ti-folder-plus"
          style={{ fontSize: 32, color: 'var(--accent)' }}
        />
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {t('editorNoProject')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {t('editorNoProjectDesc')}
        </div>
        <button
          className="btn-primary btn-sm"
          onClick={() => {
            const newProject = {
              id: uuid('project'),
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
                  manualDuration: 10,
                },
              },
              duration: 60,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }
            context.setProject(newProject)
            context.commitProject(newProject, { skipHistory: true })
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
  const { t } = useLanguage()
  const context = useEditor()
  const { confirm } = context

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
  const [timelineClickData, setTimelineClickData] = useState({
    start: null,
    end: null,
    duration: null,
  })
  const [timelineClickStep, setTimelineClickStep] = useState(0)

  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [clipboard, setClipboard] = useState(null)
  const [isDeletingClip, setIsDeletingClip] = useState(false)

  const masterVolumeRef = useRef(100)

  const projectManager = useProjectManager(store, project, setProject, addToast)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [savedEnabled, savedBpm, savedVolume] = await Promise.all([
          getBoolean(STORE_KEY_METRONOME_ENABLED, false),
          getNumber(STORE_KEY_METRONOME_BPM, 120),
          getNumber(STORE_KEY_MASTER_VOLUME, 100),
        ])

        if (!mounted) return

        setMetronomeEnabled(savedEnabled)
        setBpm(savedBpm)

        const clampedVolume = Math.max(0, Math.min(200, savedVolume))
        setMasterVolume(clampedVolume)
        masterVolumeRef.current = clampedVolume
        setMasterGain(clampedVolume / 100)
      } catch (e) {
        if (__DEBUG__) console.warn('[Editor] Erreur chargement prefs:', e)
      }
    })()

    return () => { mounted = false }
  }, [setMasterGain])

  const selectedClipForPanel = useMemo(() => {
    if (!selectedClipId) return null
    return getClipById(tracks, selectedClipId)
  }, [tracks, selectedClipId])

  const totalClipCount = useMemo(
    () => tracks.reduce((sum, t) => sum + (t.clips?.length || 0), 0),
    [tracks]
  )

  // ─── HANDLERS ───────────────────────────────────────────────────────────

  const handleAddTrack = useCallback(() => {
    const trackIndex = tracks.length + 1
    const defaultName = t('editorTrackDefault').replace('{index}', trackIndex)
    setPendingTrackName(defaultName)
    setShowAddTrackModal(true)
  }, [tracks.length, t])

  const handleAddTrackConfirm = useCallback(
    async (name, color) => {
      if (typeof addTrack !== 'function') {
        addToast?.(t('toastEditorAddTrackUnavailable'), 'error')
        setShowAddTrackModal(false)
        return null
      }

      try {
        const result = await addTrack(name, color)
        if (result) {
          addToast?.(t('toastEditorTrackAdded', { name: result.name }), 'success')
        } else {
          addToast?.(t('toastEditorTrackAddError'), 'error')
        }
        setShowAddTrackModal(false)
        return result
      } catch (e) {
        addToast?.(`${t('toastEditorTrackAddError')}: ${e.message}`, 'error')
        setShowAddTrackModal(false)
        return null
      }
    },
    [addTrack, addToast, t]
  )

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
  }, [
    isPlaying,
    isPaused,
    pause,
    resume,
    play,
    isPlayingRef,
    isPausedRef,
    currentTimeRef,
    setCurrentTime,
    setSoloPlayClipId,
  ])

  const handleRemoveTrack = useCallback(
    async (trackId) => {
      try {
        const track = tracks.find((t) => t.id === trackId)
        if (!track) return

        if (tracks.length <= 1) {
          addToast?.(t('toastEditorLastTrackCannotBeRemoved'), 'warning')
          return
        }

        if (track.clips.length > 0) {
          const confirmed = await confirm({
            title: t('confirmDeleteTrack'),
            message:
              t('confirmDeleteTrackMessage') ||
              'Voulez-vous vraiment supprimer cette piste ?',
            type: 'danger',
            confirmText: t('delete') || 'Supprimer',
            cancelText: t('cancel') || 'Annuler',
          })
          if (!confirmed) return
        }

        await removeTrack(trackId)
        addToast?.(t('toastEditorTrackRemoved', { name: track.name }), 'info')
      } catch (e) {
        logError('Editor', 'Erreur lors de la suppression de piste', e)
        addToast?.(t('toastProjectDeleteError'), 'error')
      }
    },
    [tracks, removeTrack, addToast, confirm, t]
  )

  const handleAddClip = useCallback(
    async (trackId, soundId, startPosition) => {
      await addClip(trackId, soundId, startPosition)
    },
    [addClip]
  )

  const handleAddFileClick = useCallback(async () => {
    if (tracks.length === 0) {
      addToast?.(t('editorNoTracks'), 'error')
      return
    }

    try {
      const result = await window.electronAPI.openFileDialog?.()
      if (!result || result.length === 0) return

      const filePath = result[0]
      const fileName = filePath.split(/[\\/]/).pop() || 'Fichier audio'

      setPendingImportFile(filePath)
      setPendingImportFileName(fileName)
      setSelectedImportTrackId(tracks[0].id)
      setShowImportModal(true)
    } catch (e) {
      logError('Editor', 'Erreur ouverture dialog fichier', e)
      addToast?.(`${t('editorFileImportError')}: ${e.message}`, 'error')
    }
  }, [tracks, addToast, t])

  const handleImportConfirm = useCallback(
    async ({ filePath, fileName, trackId, startTime }) => {
      if (!filePath) {
        addToast?.(t('toastEditorNoTrackAvailable'), 'error')
        return
      }

      try {
        const result = await addClipFromFile(trackId, filePath, startTime)
        if (result) {
          addToast?.(t('editorFileImported'), 'success')
        } else {
          addToast?.(t('editorFileImportError'), 'error')
        }
      } catch (e) {
        logError('Editor', 'Erreur import fichier', e)
        addToast?.(`${t('editorFileImportError')}: ${e.message}`, 'error')
      }

      setShowImportModal(false)
      setPendingImportFile(null)
      setPendingImportFileName('')
    },
    [addClipFromFile, addToast, t]
  )

  const handleRemoveClip = useCallback(
    (trackId, clipId) => {
      removeClip(trackId, clipId)
    },
    [removeClip]
  )

  const handleClipSelect = useCallback(
    (clipId, trackId) => {
      selectClip(clipId, trackId)
    },
    [selectClip]
  )

  const handleClipContextMenu = useCallback(
    (e, clipId, trackId) => {
      e.preventDefault()
      e.stopPropagation()

      const clip = getClipById(tracks, clipId)
      if (!clip) return

      setSelectedClipForMenu(clip)
      setSelectedTrackForMenu(trackId)
      setClipMenu({ top: e.clientY, left: e.clientX })
    },
    [tracks]
  )

  const handleUpdateClipDuration = useCallback(
    (clipId, newDuration) => {
      if (selectedTrackId) {
        updateClip(selectedTrackId, clipId, { duration: newDuration })
        setClipDurations((prev) => ({ ...prev, [clipId]: newDuration }))
      }
    },
    [selectedTrackId, updateClip, setClipDurations]
  )

  const handleExportClick = useCallback(() => {
    if (
      !project ||
      project.tracks.length === 0 ||
      project.tracks.every((t) => t.clips.length === 0)
    ) {
      addToast?.(t('editorNothingToExport'), 'info')
      return
    }
    setExportName(project.name || 'Mon mix')
    setShowExportModal(true)
  }, [project, addToast, t])

  const handleMasterVolumeChange = useCallback(
    (value) => {
      const normalized = Math.max(0, Math.min(200, value))
      setMasterVolume(normalized)
      masterVolumeRef.current = normalized
      setMasterGain(normalized / 100)
      setItem(STORE_KEY_MASTER_VOLUME, normalized).catch(() => {})
    },
    [setMasterGain]
  )

  const handleMasterMuteToggle = useCallback(() => {
    const newMuted = !isMasterMuted
    setIsMasterMuted(newMuted)
    if (newMuted) {
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
    setItem(STORE_KEY_MASTER_VOLUME, 100).catch(() => {})

    if (project?.tracks) {
      const updatedTracks = project.tracks.map((track) => ({
        ...track,
        volume: 1,
      }))

      const updatedProject = {
        ...project,
        tracks: updatedTracks,
        updatedAt: Date.now(),
      }

      context.commitProject(updatedProject, { skipHistory: true })

      if (context.setTrackVolume) {
        for (const track of updatedTracks) {
          context.setTrackVolume(track.id, 1)
        }
      }

      context.setMasterGain(1)
      addToast?.(
        t('editorResetVolumesSuccess') || 'Tous les volumes réinitialisés à 100%',
        'success'
      )
    }
  }, [project, context, addToast, setMasterVolume, setMasterGain, t])

  const handleToggleMetronome = useCallback((enabled) => {
    setMetronomeEnabled(enabled)
    setItem(STORE_KEY_METRONOME_ENABLED, enabled).catch(() => {})
  }, [])

  const handleBpmChange = useCallback((newBpm) => {
    setBpm(newBpm)
    setItem(STORE_KEY_METRONOME_BPM, newBpm).catch(() => {})
  }, [])

  const handleAddEffectFromMenu = useCallback(
    (clipId, trackId) => {
      selectClip(clipId, trackId)
      setShowEffectsPanel(true)
      setShowEffectsAddMenu(true)

      const clipName = getClipById(tracks, clipId)?.name || 'clip'
      addToast?.(t('toastEditorEffectPanelOpened', { name: clipName }), 'info')
    },
    [selectClip, tracks, addToast, t]
  )

  const handleNormalizeWithOptions = useCallback(
    async (clipId, options) => {
      const clip = getClipById(tracks, clipId)
      if (!clip) {
        addToast?.(t('toastEditorClipNotFound'), 'error')
        return
      }

      const { method, target, maxGain, outputFormat = 'wav' } = options
      addToast?.(t('toastEditorNormalizing', { name: clip.name }), 'info')

      try {
        const result = await normalizeClip(clip, target, store, {
          outputFormat,
          preserveOriginal: false,
          maxGain: maxGain || 10,
          minGain: 0.1,
          useRMS: method === 'rms',
          targetRMS: target * 0.3,
        })

        if (result?.normalized) {
          if (result.newPath) {
            const updatedTracks = tracks.map((t) => {
              if (t.id !== selectedTrackId) return t
              return {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === clipId
                    ? { ...c, path: result.newPath, duration: clip.duration }
                    : c
                ),
              }
            })

            const updatedProject = {
              ...project,
              tracks: updatedTracks,
              updatedAt: Date.now(),
            }

            context.commitProject(updatedProject)
          }

          addToast?.(
            t('toastEditorNormalizeSuccess', {
              name: clip.name,
              gain: result.gain.toFixed(2),
            }),
            'success'
          )
        } else if (result === null) {
          addToast?.(t('toastEditorNormalizeError', { name: clip.name }), 'error')
        } else {
          addToast?.(t('toastEditorAlreadyOptimal', { name: clip.name }), 'info')
        }
      } catch (e) {
        addToast?.(`${t('error')}: ${e.message}`, 'error')
      }
    },
    [tracks, selectedTrackId, project, store, context, addToast, t]
  )

  const handleCopyClip = useCallback(
    (clip) => {
      if (!clip) {
        addToast?.(t('toastEditorNoClipToCopy'), 'warning')
        return
      }

      setClipboard({
        clip: {
          ...clip,
          _sourceId: clip.id,
          _copiedAt: Date.now(),
        },
        trackId: selectedTrackId,
      })

      addToast?.(`"${clip.name}" ${t('editorCopied')}`, 'success')
    },
    [selectedTrackId, addToast, t]
  )

  const handleCutClip = useCallback(
    (clip) => {
      if (!clip) {
        addToast?.(t('toastEditorNoClipToCut'), 'warning')
        return
      }

      setClipboard({
        clip: {
          ...clip,
          _sourceId: clip.id,
          _copiedAt: Date.now(),
        },
        trackId: selectedTrackId,
      })

      if (selectedTrackId && clip.id) {
        removeClip(selectedTrackId, clip.id)
        addToast?.(`"${clip.name}" ${t('editorCutAction')}`, 'info')
      } else {
        addToast?.(t('toastEditorClipCannotBeCut'), 'error')
      }
    },
    [selectedTrackId, removeClip, addToast, t]
  )

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
      addToast?.(t('toastEditorNoTrackAvailable'), 'error')
      return
    }

    if (!project) {
      addToast?.(t('toastEditorClipCannotBeCut'), 'error')
      return
    }

    const clipId = uuid('clip')

    const newClip = {
      id: clipId,
      name: clip.name || 'Clip collé',
      path: clip.path,
      start: (clip.start || 0) + 1,
      duration: clip.duration || 3,
      offset: clip.offset || 0,
      volume: clip.volume || 0,
      volumeDb: clip.volumeDb || 0,
      effects: (clip.effects || []).map((e) => ({ ...e, id: uuid('effect') })),
      fadeIn: clip.fadeIn || 0,
      fadeOut: clip.fadeOut || 0,
      pitch: clip.pitch || 0,
      speed: clip.speed || 1,
      isExternal: clip.isExternal || false,
    }

    const updatedTracks = project.tracks.map((t) => {
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
      updatedAt: Date.now(),
    }

    context.commitProject(updatedProject)
    setClipDurations((prev) => ({ ...prev, [newClip.id]: newClip.duration || 3 }))

    addToast?.(`"${newClip.name}" ${t('editorPasted')}`, 'success')
    setSelectedClipId(newClip.id)
    setSelectedTrackId(targetTrackId)
  }, [
    clipboard,
    selectedTrackId,
    tracks,
    project,
    context,
    setClipDurations,
    setSelectedClipId,
    setSelectedTrackId,
    addToast,
    t,
  ])

  const handleDeleteWithConfirm = useCallback(
    async (trackId, clipId, clipName) => {
      if (isDeletingClip) return
      setIsDeletingClip(true)

      try {
        let name = clipName
        if (!name) {
          const clip = getClipById(tracks, clipId)
          name = clip?.name || 'ce clip'
        }

        const message = t('confirmDeleteClipMessage', { name })

        const confirmed = await confirm({
          title: t('confirmDeleteClip') || 'Confirmer la suppression du clip',
          message,
          type: 'danger',
          confirmText: t('editorDelete') || 'Supprimer',
          cancelText: t('cancel') || 'Annuler',
        })

        if (confirmed) {
          removeClip(trackId, clipId)
          addToast?.(t('toastEditorClipRemoved', { name }), 'info')
        }
      } catch (e) {
        logError('Editor', 'Erreur suppression clip', e)
      } finally {
        setTimeout(() => setIsDeletingClip(false), 400)
      }
    },
    [tracks, removeClip, addToast, confirm, t, isDeletingClip]
  )

  const handlePreviewEffects = useCallback(
    async (clip) => {
      if (!clip || !clip.path) return

      try {
        const { applyEffectsToBuffer } = await import(
          '@shared/utils/realTimeEffects'
        )

        const fileUrl = buildFileUrl(clip.path)

        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const arrayBuffer = await response.arrayBuffer()

        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        const hasActiveEffects = clip.effects?.some((e) => e.enabled) || false
        let processedBuffer = audioBuffer

        if (hasActiveEffects) {
          processedBuffer = applyEffectsToBuffer(
            audioBuffer,
            clip.effects,
            audioContext.sampleRate,
            true
          )
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
        logError('Editor', 'Erreur prévisualisation effets', e)
        addToast?.(
          t('editorEffectPreviewError') || 'Erreur lors de la prévisualisation',
          'error'
        )
      }
    },
    [addToast, t]
  )

  const handleAddMarker = useCallback(
    (markerData) => {
      const { addMarker } = context
      if (addMarker) addMarker(markerData)
      else addToast?.(t('toastEditorAddMarkerUnavailable'), 'error')
    },
    [context, addToast, t]
  )

  const handleRemoveMarker = useCallback(
    (markerId) => {
      const { removeMarker } = context
      if (removeMarker) removeMarker(markerId)
    },
    [context]
  )

  const handleUpdateMarker = useCallback(
    (markerId, updates) => {
      const { updateMarker } = context
      if (updateMarker) updateMarker(markerId, updates)
    },
    [context]
  )

  const handleNavigateToMarker = useCallback(
    (time) => {
      const { navigateToMarker } = context
      if (navigateToMarker) navigateToMarker(time)
      else seek(time)
    },
    [context, seek]
  )

  const moveClipUp = useCallback(
    (trackId, clipId) => {
      const currentTrackIndex = tracks.findIndex((t) => t.id === trackId)
      if (currentTrackIndex <= 0) return

      const clip = getClipById(tracks, clipId)
      if (!clip) return

      const targetTrack = tracks[currentTrackIndex - 1]
      if (!targetTrack) return

      moveClip(trackId, clipId, clip.start || 0, targetTrack.id)
      setSelectedTrackId(targetTrack.id)
      addToast?.(t('editorClipMovedUp') || 'Clip déplacé vers le haut', 'info')
    },
    [tracks, moveClip, setSelectedTrackId, addToast, t]
  )

  const moveClipDown = useCallback(
    (trackId, clipId) => {
      const currentTrackIndex = tracks.findIndex((t) => t.id === trackId)
      if (currentTrackIndex >= tracks.length - 1) return

      const clip = getClipById(tracks, clipId)
      if (!clip) return

      const targetTrack = tracks[currentTrackIndex + 1]
      if (!targetTrack) return

      moveClip(trackId, clipId, clip.start || 0, targetTrack.id)
      setSelectedTrackId(targetTrack.id)
      addToast?.(t('editorClipMovedDown') || 'Clip déplacé vers le bas', 'info')
    },
    [tracks, moveClip, setSelectedTrackId, addToast, t]
  )

  const getCanMoveUp = useCallback(
    (trackId) => {
      const currentTrackIndex = tracks.findIndex((t) => t.id === trackId)
      return currentTrackIndex > 0
    },
    [tracks]
  )

  const getCanMoveDown = useCallback(
    (trackId) => {
      const currentTrackIndex = tracks.findIndex((t) => t.id === trackId)
      return currentTrackIndex < tracks.length - 1
    },
    [tracks]
  )

  const handleSetTimelineLoop = useCallback(
    (options) => {
      setTimelineLoop?.(options)
    },
    [setTimelineLoop]
  )

  const handleToggleTimelineLoop = useCallback(() => {
    toggleTimelineLoop?.()
  }, [toggleTimelineLoop])

  const handleOpenLoopPanel = useCallback(() => {
    setShowTimelineLoopModal(true)
  }, [])

  const handleActivateTimelineClickMode = useCallback(
    (active = true) => {
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
    },
    [activateTimelineLoopManualClick, cancelActionOverlay]
  )

  const handleTimelineClickForLoop = useCallback(
    (time) => {
      if (!isTimelineClickModeActive) return
      if (executeActionOverlay) executeActionOverlay(time)

      const clampedTime = Math.max(0, Math.min(time, totalDuration))

      if (timelineClickStep === 0) {
        setTimelineClickData((prev) => ({ ...prev, start: clampedTime }))
        setTimelineClickStep(1)
      } else if (timelineClickStep === 1) {
        if (clampedTime > timelineClickData.start) {
          setTimelineClickData((prev) => ({ ...prev, end: clampedTime }))
          setTimelineClickStep(2)
        }
      } else if (timelineClickStep === 2) {
        const duration = clampedTime - timelineClickData.start
        if (duration > 0.1) {
          setTimelineClickData((prev) => ({ ...prev, duration }))
          setShowTimelineLoopModal(false)
        }
      }
    },
    [
      isTimelineClickModeActive,
      executeActionOverlay,
      totalDuration,
      timelineClickStep,
      timelineClickData,
      setShowTimelineLoopModal,
    ]
  )

  const undoEditor = context.undoEditor
  const redoEditor = context.redoEditor
  const canUndo = context.canUndoEditor
  const canRedo = context.canRedoEditor

  const handleToggleEffectsPanel = useCallback((show) => {
    setShowEffectsPanel(show)
    if (!show) setShowEffectsAddMenu(false)
  }, [])

  useEffect(() => {
    window.__editorHasClips = () =>
      tracks.some((t) => t.clips && t.clips.length > 0)

    window.__editorGetFirstClipId = () => {
      for (const track of tracks) {
        if (track.clips && track.clips.length > 0) return track.clips[0].id
      }
      return null
    }

    window.__editorSelectClip = (clipId, openEffects = true) => {
      for (const track of tracks) {
        const clip = track.clips.find((c) => c.id === clipId)
        if (clip) {
          selectClip(clipId, track.id)
          if (openEffects) setShowEffectsPanel(true)
          return true
        }
      }
      return false
    }

    window.__editorSelectFirstClip = (openEffects = true) => {
      const clipId = window.__editorGetFirstClipId?.()
      if (!clipId) return false
      return window.__editorSelectClip?.(clipId, openEffects) || false
    }

    window.__editorOpenClipMenu = (clipId = null) => {
      const targetId = clipId || window.__editorGetFirstClipId?.()
      if (!targetId) return false

      window.__editorSelectClip?.(targetId, false)

      const clipEl =
        document.querySelector(`[data-clip-id="${targetId}"]`) ||
        document.querySelector('[data-testid="editor-clip"]') ||
        document.querySelector('.editor-clip-wrapper')

      if (!clipEl) return false

      const rect = clipEl.getBoundingClientRect()

      const event = new MouseEvent('contextmenu', {
        view: window,
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX: rect.left + Math.min(rect.width / 2, 60),
        clientY: rect.top + Math.min(rect.height / 2, 20),
      })
      clipEl.dispatchEvent(event)
      return true
    }

    window.__editorCloseClipMenu = () => {
      const evt = new MouseEvent('mousedown', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: 5,
        clientY: 5,
      })
      document.body.dispatchEvent(evt)
    }

    window.__editorOpenMarkersPanel = () => {
      const btn = document.querySelector(
        '[data-testid="editor-add-marker-button"]'
      )
      if (btn) {
        btn.click()
        return true
      }
      const panel = document.querySelector(
        '[data-testid="editor-markers-panel"]'
      )
      if (panel) return true
      return false
    }

    return () => {
      delete window.__editorHasClips
      delete window.__editorGetFirstClipId
      delete window.__editorSelectClip
      delete window.__editorSelectFirstClip
      delete window.__editorOpenClipMenu
      delete window.__editorCloseClipMenu
      delete window.__editorOpenMarkersPanel
    }
  }, [tracks, selectClip])

  useKeyboardShortcuts({
    onPlay: handlePlayToggle,
    onPause: pause,
    onStop: stop,
    onUndo: undoEditor,
    onRedo: redoEditor,
    onAddTrack: handleAddTrack,
    onAddMarker: () => {
      const markers = project?.markers || []
      context.addMarker({
        name: `Marqueur ${markers.length + 1}`,
        time: currentTime,
        color: '#3b82f6',
      })
    },
    onDelete: () => {
      if (selectedClipId && selectedTrackId) {
        const clip = getClipById(tracks, selectedClipId)
        handleDeleteWithConfirm(selectedTrackId, selectedClipId, clip?.name)
      } else {
        addToast?.(t('toastEditorNoClipSelected'), 'info')
      }
    },
    onCopy: () => {
      const clip = getClipById(tracks, selectedClipId)
      if (clip) handleCopyClip(clip)
      else addToast?.(t('toastEditorNoClipSelected'), 'warning')
    },
    onCut: () => {
      const clip = getClipById(tracks, selectedClipId)
      if (clip) handleCutClip(clip)
      else addToast?.(t('toastEditorNoClipSelected'), 'warning')
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
            addToast?.(t('toastEditorPlayheadMustBeInside'), 'warning')
          }
        }
      } else {
        addToast?.(t('toastEditorNoClipSelected'), 'info')
      }
    },
    onToggleSnap: () => setSnapEnabled(!snapEnabled),
    onZoomIn: () => handleZoomChange(zoomLevel + 0.1),
    onZoomOut: () => handleZoomChange(zoomLevel - 0.1),
    onZoomReset: () => handleZoomChange(1),
    onToggleMetronome: () => handleToggleMetronome(!metronomeEnabled),
    isPlaying: isPlaying || isPaused,
    canUndo,
    canRedo,
    isEnabled: true,
  })

  return (
    <div
      data-testid="editor-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}
    >
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
            addToast?.(t('toastProjectRenameError'), 'warning')
            return
          }
          const trimmed = newName.trim()
          const ok = context.updateEditorProjectName(trimmed)
          if (ok) {
            try {
              await projectManager.renameProject(project.id, trimmed)
            } catch (e) {
              logError('Editor', 'Erreur rename fallback', e)
            }
          }
        }}
        onRefreshDurations={() => {}}
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
        showEffectsPanel={showEffectsPanel}
        onToggleEffectsPanel={handleToggleEffectsPanel}
      />

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          minHeight: '320px',
        }}
      >
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
          onDragCheckpoint={context.pushEditorHistoryCheckpoint}
          onTrackRemove={handleRemoveTrack}
          onSeek={seek}
          onTrackMute={muteTrack}
          onTrackSolo={soloTrack}
          onTrackVolume={setTrackVolume}
          onTrackReorder={context.reorderTracks}
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

      <EffectsPanelSlot
        visible={showEffectsPanel}
        clip={selectedClipForPanel}
        trackId={selectedTrackId}
        context={context}
        updateClip={updateClip}
        tr={t}
        showAddMenu={showEffectsAddMenu}
        onShowAddMenuChange={setShowEffectsAddMenu}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <EditorMasterVolume
          volume={isMasterMuted ? 0 : masterVolume}
          onVolumeChange={handleMasterVolumeChange}
          isMuted={isMasterMuted}
          onMuteToggle={handleMasterMuteToggle}
          onReset={handleResetVolumes}
          tr={t}
        />
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-tertiary)',
            display: 'flex',
            gap: 12,
          }}
        >
          <span>
            {t('editorClips')}: {totalClipCount}
          </span>
          <span>
            {t('editorTracks')}: {tracks.length}
          </span>
          <span>
            {t('editorDuration')}: {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      {showAddTrackModal &&
        createPortal(
          <AddTrackModal
            isOpen={showAddTrackModal}
            onConfirm={handleAddTrackConfirm}
            onCancel={() => setShowAddTrackModal(false)}
            defaultName={pendingTrackName}
            tr={t}
          />,
          document.body
        )}

      {showImportModal &&
        createPortal(
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
            initialFilePath={pendingImportFile}
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

              if (!buffer) throw new Error('Erreur lors du mixage')

              const exportResults = []

              if (
                options.exportLocation === 'file' ||
                options.exportLocation === 'both'
              ) {
                const saveResult = await window.electronAPI.saveFileDialog?.(
                  options.outputPath ||
                    `${options.name}.${
                      options.format === 'wav' ? 'wav' : options.format
                    }`,
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
                    addToast?.(
                      `${t('editorExportSuccess')}: ${saveResult.path}`,
                      'success'
                    )
                  } else {
                    throw new Error(result.error || 'Erreur export fichier')
                  }
                } else if (saveResult?.canceled) {
                  setIsExporting(false)
                  setShowExportModal(false)
                  return
                } else {
                  const fallbackPath =
                    options.outputPath ||
                    `${options.name}.${
                      options.format === 'wav' ? 'wav' : options.format
                    }`
                  const result = await exportMixdown(
                    buffer,
                    options.format,
                    options.bitrate,
                    fallbackPath
                  )
                  if (result.success) {
                    exportResults.push({ type: 'file', path: fallbackPath })
                    addToast?.(
                      `${t('editorExportSuccess')}: ${fallbackPath}`,
                      'success'
                    )
                  } else {
                    throw new Error(result.error || 'Erreur export fichier')
                  }
                }
              }

              if (
                options.exportLocation === 'library' ||
                options.exportLocation === 'both'
              ) {
                const tempPath = `temp_${Date.now()}.wav`
                const tempResult = await exportMixdown(
                  buffer,
                  'wav',
                  44100,
                  tempPath
                )

                if (tempResult.success) {
                  const profiles = options.profiles || ['all']
                  await store.addSound({
                    name: options.name || 'Export',
                    path: tempResult.path,
                    emoji: '🎵',
                    profiles,
                  })
                  exportResults.push({ type: 'library', name: options.name })
                  addToast?.(t('editorCreated'), 'success')
                } else {
                  throw new Error('Erreur ajout à la bibliothèque')
                }
              }

              setIsExporting(false)
              setShowExportModal(false)
              return { success: true, results: exportResults }
            } catch (e) {
              logError('Editor', 'Erreur export', e)
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

      {showTrimModal &&
        (() => {
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
              onTrim={() => {}}
              tr={t}
              addToast={addToast}
            />,
            document.body
          )
        })()}

      {showNormalizeModal &&
        (() => {
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

      {showTimelineLoopModal &&
        createPortal(
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
          onSplit={(trackId, clipId) => {
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
          onCopy={(clipId) => {
            const clip = getClipById(tracks, clipId)
            if (clip) handleCopyClip(clip)
            setClipMenu(null)
          }}
          onCut={(clipId) => {
            const clip = getClipById(tracks, clipId)
            if (clip) handleCutClip(clip)
            setClipMenu(null)
          }}
          onDelete={handleDeleteWithConfirm}
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
    </div>
  )
}

function EffectsPanelSlot({
  visible,
  clip,
  trackId,
  context,
  updateClip,
  tr,
  showAddMenu,
  onShowAddMenuChange,
}) {
  if (!visible || !clip) return null

  const {
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    toggleEffect,
    setClipFade,
  } = context

  return (
    <EditorEffectsPanel
      key={clip.id}
      clip={clip}
      trackId={trackId}
      onEffectAdd={addEffectToClip}
      onEffectRemove={removeEffectFromClip}
      onEffectUpdate={updateEffectParam}
      onEffectToggle={toggleEffect}
      onClipUpdate={updateClip}
      onFadeUpdate={setClipFade}
      tr={tr}
      showAddMenu={showAddMenu}
      onShowAddMenuChange={onShowAddMenuChange}
    />
  )
}