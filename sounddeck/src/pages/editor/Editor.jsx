import { useState, useEffect, useRef, useCallback } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { Howl } from 'howler'
import EditorTimeline from './EditorTimeline'
import EditorToolbar from './EditorToolbar'
import EditorEffectsPanel from './EditorEffectsPanel'
import EditorMasterVolume from './EditorMasterVolume'
import ClipActionsMenu from './components/ClipActionsMenu'
import EditorMarkersPanel from './components/EditorMarkersPanel'
import AddTrackModal from './components/AddTrackModal'
import { generateWaveformData } from '../../utils/waveformGenerator'
import { normalizeClip, normalizeAll } from '../../utils/normalizeUtils'
import { mixdownProject, exportMixdown } from '../../utils/mixdown'
import { applyEffectsToFile } from '../../utils/audioEffects'

const EMOJIS = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋']
const effectBlobCache = new Map()

export default function Editor({ store, addToast }) {
  const { t, currentLang } = useLanguage()

  // ─── ÉTATS ────────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(10)
  const [selectedClipId, setSelectedClipId] = useState(null)
  const [selectedTrackId, setSelectedTrackId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [waveformData, setWaveformData] = useState({})
  const [clipDurations, setClipDurations] = useState({})
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [clipboard, setClipboard] = useState({ clips: [], trackId: null, copiedAt: null })
  const [markers, setMarkers] = useState([])
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [metronomeBpm, setMetronomeBpm] = useState(120)
  const [isNormalizing, setIsNormalizing] = useState(false)
  const [normalizeTarget, setNormalizeTarget] = useState(0.95)
  const [masterVolume, setMasterVolume] = useState(100)
  const [isMasterMuted, setIsMasterMuted] = useState(false)
  const [peakMeter, setPeakMeter] = useState(0)
  const [isPreviewingEffect, setIsPreviewingEffect] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportName, setExportName] = useState('')
  const [exportEmoji, setExportEmoji] = useState('🔊')
  const [exportImage, setExportImage] = useState(null)
  const [exportProfiles, setExportProfiles] = useState(['all'])
  const [exportAddToLibrary, setExportAddToLibrary] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('mp3')
  const [exportBitrate, setExportBitrate] = useState(192)
  const [isDirty, setIsDirty] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = useState(null)
  const [autoCrossfade, setAutoCrossfade] = useState(true)
  const [clipMenu, setClipMenu] = useState(null)
  const [selectedClipForMenu, setSelectedClipForMenu] = useState(null)
  const [selectedTrackForMenu, setSelectedTrackForMenu] = useState(null)
  const [showTrimModal, setShowTrimModal] = useState(false)
  const [trimClipId, setTrimClipId] = useState(null)
  const [showAddTrackModal, setShowAddTrackModal] = useState(false)
  const [pendingTrackName, setPendingTrackName] = useState('')
  const previewHowlRef = useRef(null)

  // ─── RÉFÉRENCES ──────────────────────────────────────────────────────────
  const audioRef = useRef(null)
  const animationRef = useRef(null)
  const projectRef = useRef(store.editorProject)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const allHowlsRef = useRef([])
  const isPlayingRef = useRef(false)
  const loopRegionRef = useRef(store.editorLoopRegion)
  const playAllClipsRef = useRef(null)
  const trackHowlsRef = useRef({})
  const effectBlobsRef = useRef([])

  // ─── SYNC DES REFS ──────────────────────────────────────────────────────
  useEffect(() => {
    loopRegionRef.current = store.editorLoopRegion
  }, [store.editorLoopRegion])

  useEffect(() => {
    projectRef.current = store.editorProject
  }, [store.editorProject])

  // ─── SAUVEGARDE AUTOMATIQUE ─────────────────────────────────────────────
  const saveProject = useCallback(async () => {
    if (!store.editorProject?.id) return
    setIsAutoSaving(true)
    try {
      await window.electronAPI.storeSet('editorProject', store.editorProject)
      setIsDirty(false)
    } catch (e) {
      console.warn('Erreur sauvegarde auto:', e)
    } finally {
      setIsAutoSaving(false)
    }
  }, [store.editorProject])

  const markDirty = useCallback(() => {
    setIsDirty(true)
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    const timer = setTimeout(saveProject, 3000)
    setAutoSaveTimer(timer)
  }, [autoSaveTimer, saveProject])

  useEffect(() => {
    if (store.editorProject?.id) markDirty()
  }, [store.editorProject?.tracks, store.editorProject?.name, store.editorProject?.markers])

  useEffect(() => () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
  }, [autoSaveTimer])

  // ─── MARQUEURS ────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedMarkers = store.editorProject?.markers || []
    if (savedMarkers.length > 0) {
      const uniqueMarkers = savedMarkers.filter((m, i, self) => 
        i === self.findIndex(x => x.id === m.id)
      )
      setMarkers(uniqueMarkers)
    }
  }, [store.editorProject?.markers])

  const handleAddMarker = useCallback((marker) => {
    setMarkers(prev => {
      const exists = prev.some(m => m.id === marker.id)
      const newMarkers = exists 
        ? prev.map(m => m.id === marker.id ? marker : m)
        : [...prev, marker]
      queueMicrotask(() => store.saveEditorMarkers?.(newMarkers))
      return newMarkers
    })
  }, [store])

  const handleRemoveMarker = useCallback((markerId) => {
    setMarkers(prev => {
      const newMarkers = prev.filter(m => m.id !== markerId)
      queueMicrotask(() => store.saveEditorMarkers?.(newMarkers))
      return newMarkers
    })
  }, [store])

  const handleMarkersChange = useCallback((updatedMarkers) => {
    const uniqueMarkers = updatedMarkers.filter((m, i, self) => 
      i === self.findIndex(x => x.id === m.id)
    )
    setMarkers(uniqueMarkers)
    queueMicrotask(() => store.saveEditorMarkers?.(uniqueMarkers))
  }, [store])

  // ─── DURÉE TOTALE ────────────────────────────────────────────────────────
  useEffect(() => {
    const calculateTotalDuration = async () => {
      const project = store.editorProject
      if (!project?.tracks) return

      let maxDuration = 10
      const newClipDurations = { ...clipDurations }

      for (const track of project.tracks) {
        for (const clip of track.clips) {
          if (!newClipDurations[clip.id] && clip.path) {
            try {
              const fileUrl = clip.path.startsWith('file://') 
                ? clip.path 
                : 'file:///' + clip.path.replace(/\\/g, '/')
              const audio = new Audio()
              audio.src = fileUrl
              const duration = await new Promise((resolve) => {
                audio.addEventListener('loadedmetadata', () => resolve(audio.duration))
                audio.addEventListener('error', () => resolve(3))
                setTimeout(() => resolve(3), 3000)
              })
              newClipDurations[clip.id] = duration
              if (duration > 0 && clip.duration !== duration) {
                store.updateClip(track.id, clip.id, { duration })
              }
            } catch {
              newClipDurations[clip.id] = clip.duration || 3
            }
          }

          const clipDuration = newClipDurations[clip.id] || clip.duration || 3
          const end = clip.start + clipDuration
          if (end > maxDuration) maxDuration = end
        }
      }

      setClipDurations(newClipDurations)
      setTotalDuration(Math.max(maxDuration + 2, 10))
    }

    calculateTotalDuration()
  }, [store.editorProject?.tracks])

  // ─── WAVEFORMS ────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadWaveforms = async () => {
      const project = store.editorProject
      if (!project?.tracks) return

      setIsLoading(true)
      const newWaveformData = {}

      for (const track of project.tracks) {
        for (const clip of track.clips) {
          if (clip.path && !waveformData[clip.id]) {
            try {
              const sliceDuration = clipDurations[clip.id] || clip.duration || null
              const data = await generateWaveformData(clip.path, 200, clip.offset || 0, sliceDuration)
              if (data) newWaveformData[clip.id] = data
            } catch (e) {
              console.warn('Erreur génération waveform:', e)
            }
          }
        }
      }

      setWaveformData(prev => ({ ...prev, ...newWaveformData }))
      setIsLoading(false)
    }

    loadWaveforms()
  }, [store.editorProject?.tracks])

  // ─── NETTOYAGE ────────────────────────────────────────────────────────────
  const cleanupEffectBlobs = useCallback(() => {
    effectBlobsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url) } catch {}
    })
    effectBlobsRef.current = []
    effectBlobCache.clear()
  }, [])

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (audioRef.current) {
        audioRef.current.stop()
        audioRef.current.unload()
      }
      allHowlsRef.current.forEach(item => {
        if (item.howl) {
          if (item.howl.playing()) item.howl.stop()
          item.howl.unload()
        }
      })
      allHowlsRef.current = []
      trackHowlsRef.current = {}
      if (previewHowlRef.current) {
        previewHowlRef.current.stop()
        previewHowlRef.current.unload()
        previewHowlRef.current = null
      }
      cleanupEffectBlobs()
    }
  }, [cleanupEffectBlobs])

  // ─── CRÉATION DU PROJET ─────────────────────────────────────────────────
  useEffect(() => {
    if (!store.editorProject?.id) {
      store.createEditorProject(t('editorNewProject') || 'Nouveau projet')
    }
  }, [])

  // ─── VOLUME EN TEMPS RÉEL ────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return

    const intervalId = setInterval(() => {
      const project = store.editorProject
      if (!project) return

      const masterVol = isMasterMuted ? 0 : masterVolume / 100
      project.tracks.forEach(track => {
        const howls = trackHowlsRef.current[track.id] || []
        const trackVolume = track.volume ?? 1

        howls.forEach(({ howl, clipVolume, clip }) => {
          if (howl?.playing?.()) {
            const finalVolume = clipVolume * trackVolume * (store.volume / 100) * masterVol
            const clampedVolume = Math.min(1, Math.max(0.001, finalVolume))
            try {
              if (Math.abs(howl.volume() - clampedVolume) > 0.001) {
                howl.volume(clampedVolume)
              }
            } catch {}
          }
        })
      })
    }, 100)

    return () => clearInterval(intervalId)
  }, [isPlaying, store.editorProject?.tracks, store.volume, masterVolume, isMasterMuted])

  // ─── GESTION DES PISTES ──────────────────────────────────────────────────
  const handleAddTrack = async () => {
    const trackIndex = store.editorProject.tracks.length + 1
    setPendingTrackName(t('editorTrackDefault').replace('{index}', trackIndex))
    setShowAddTrackModal(true)
  }

  const handleAddTrackConfirm = async (name, color) => {
    await store.addTrack(name, color)
    addToast(t('editorTrackAdded'), 'success')
    setShowAddTrackModal(false)
  }

  const handleRenameTrack = async (trackId, newName) => {
    await store.renameTrack(trackId, newName)
    addToast(t('editorTrackRenamed'), 'success')
  }

  const handleRemoveTrack = async (trackId) => {
    await store.removeTrack(trackId)
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null)
      setSelectedClipId(null)
    }
    addToast(t('editorTrackRemoved'), 'info')
  }

  // ─── GESTION DES CLIPS ────────────────────────────────────────────────────
  const handleAddClip = async (trackId, soundId) => {
    const sound = store.sounds.find(s => s.id === soundId)
    if (!sound) {
      addToast(t('editorSoundNotFound'), 'error')
      return
    }

    const track = store.editorProject.tracks.find(t => t.id === trackId)
    let start = 0
    if (track?.clips.length > 0) {
      const lastClip = track.clips.reduce((max, clip) => 
        clip.start + clip.duration > max.start + max.duration ? clip : max
      )
      start = lastClip.start + lastClip.duration + 0.5
    }

    const clip = await store.addClipToTrack(trackId, soundId, start, 3)
    if (clip) {
      addToast(`"${sound.name}" ${t('editorClipAdded')}`, 'success')
      setSelectedClipId(clip.id)
      setSelectedTrackId(trackId)
    }
  }

  const handleAddClipFromFile = async (trackId, filePath) => {
    try {
      const exists = await window.electronAPI.fileExists?.(filePath)
      if (!exists) {
        addToast(t('editorFileNotFound'), 'error')
        return
      }

      const clip = await store.addClipFromFile(trackId, filePath)
      if (clip) {
        addToast(`"${clip.name}" ${t('editorClipAdded')}`, 'success')
        setSelectedClipId(clip.id)
        setSelectedTrackId(trackId)
      }
    } catch (e) {
      console.error('Erreur ajout fichier:', e)
      addToast(t('editorFileImportError'), 'error')
    }
  }

  const handleRemoveClip = async (trackId, clipId) => {
    await store.removeClip(trackId, clipId)
    if (selectedClipId === clipId) setSelectedClipId(null)
    addToast(t('editorClipRemoved'), 'info')
  }

  const handleClipSelect = (clipId, trackId) => {
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId)
  }

  const handleRenameProject = async (newName) => {
    try {
      await store.updateEditorProjectName?.(newName)
      addToast(t('editorProjectRenamed').replace('{name}', newName), 'success')
    } catch (e) {
      console.error('Erreur renommage:', e)
    }
  }

  const handleWaveformUpdate = useCallback(async (clipId, filePath, offset, duration) => {
    try {
      const data = await generateWaveformData(filePath, 200, offset || 0, duration || null, false)
      if (data) setWaveformData(prev => ({ ...prev, [clipId]: data }))
    } catch (e) {
      console.warn('Erreur mise à jour waveform:', e)
    }
  }, [])

  // ─── COPIER/COLLER ──────────────────────────────────────────────────────
  const handleCopyClip = useCallback((clipId, trackId) => {
    const track = store.editorProject.tracks.find(t => t.id === trackId)
    const clip = track?.clips.find(c => c.id === clipId)
    if (!clip) return

    const { id, ...clipData } = clip
    setClipboard({
      clips: [{ ...clipData }],
      trackId,
      copiedAt: Date.now()
    })
    addToast(`"${clip.name}" ${t('editorCopied')}`, 'info')
  }, [store.editorProject, t, addToast])

  const handleCutClip = useCallback((clipId, trackId) => {
    handleCopyClip(clipId, trackId)
    handleRemoveClip(trackId, clipId)
    addToast(t('editorCutAction'), 'info')
    setSelectedClipId(null)
  }, [handleCopyClip, handleRemoveClip, t, addToast])

  const handlePasteClip = useCallback(async (targetTrackId) => {
    if (clipboard.clips.length === 0) {
      addToast(t('editorClipboardEmpty'), 'info')
      return
    }

    if (Date.now() - (clipboard.copiedAt || 0) > 300000) {
      setClipboard({ clips: [], trackId: null, copiedAt: null })
      addToast(t('editorClipboardExpired'), 'info')
      return
    }

    let trackId = targetTrackId || clipboard.trackId || selectedTrackId
    if (!trackId) {
      if (store.editorProject.tracks.length > 0) {
        trackId = store.editorProject.tracks[0].id
      } else {
        addToast(t('editorNoTracks'), 'error')
        return
      }
    }

    const track = store.editorProject.tracks.find(t => t.id === trackId)
    let start = 0
    if (track?.clips.length > 0) {
      const lastClip = track.clips.reduce((max, clip) => 
        clip.start + (clipDurations[clip.id] || clip.duration || 3) > 
        max.start + (clipDurations[max.id] || max.duration || 3) ? clip : max
      )
      start = lastClip.start + (clipDurations[lastClip.id] || lastClip.duration || 3) + 0.5
    }

    const project = store.editorProject
    const newTracks = project.tracks.map(t => {
      if (t.id === trackId) {
        const newClips = clipboard.clips.map(clipData => ({
          ...clipData,
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          start,
          effects: clipData.effects?.map(e => ({
            ...e,
            id: `effect-${Date.now()}-${e.id || Math.random().toString(36).slice(2, 6)}`
          })) || []
        }))
        let currentStart = start
        newClips.forEach(c => {
          c.start = currentStart
          currentStart += (c.duration || 3) + 0.5
        })
        return { ...t, clips: [...t.clips, ...newClips] }
      }
      return t
    })

    const updatedProject = {
      ...project,
      tracks: newTracks,
      updatedAt: Date.now()
    }

    try {
      await store.commitEditorProject(updatedProject, { skipHistory: true })
      await store.pushEditorHistoryCheckpoint()
      addToast(`${clipboard.clips.length} clip(s) ${t('editorPasted')}`, 'success')
      setSelectedTrackId(trackId)
    } catch (e) {
      console.error('Erreur lors du collage:', e)
      addToast(t('editorPasteError') + ': ' + e.message, 'error')
    }
  }, [clipboard, selectedTrackId, store, clipDurations, t, addToast])

  // ─── RACCOURCIS CLAVIER ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedClipId && selectedTrackId) {
        e.preventDefault()
        handleCopyClip(selectedClipId, selectedTrackId)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedClipId && selectedTrackId) {
        e.preventDefault()
        handleCutClip(selectedClipId, selectedTrackId)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        handlePasteClip(selectedTrackId)
      }
      if (e.key === 'z' && !e.ctrlKey && !e.metaKey && selectedClipId) {
        const clip = store.editorProject.tracks
          .flatMap(t => t.clips)
          .find(c => c.id === selectedClipId)
        if (clip) {
          const duration = clipDurations[clip.id] || clip.duration || 3
          handleZoomToRange(clip.start, clip.start + duration)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        const allClips = store.editorProject.tracks.flatMap(t => t.clips)
        if (allClips.length > 0) {
          setSelectedClipId(allClips[0].id)
          setSelectedTrackId(allClips[0].trackId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId, selectedTrackId, handleCopyClip, handleCutClip, handlePasteClip, store.editorProject, clipDurations])

  const handleZoomToRange = useCallback((start, end) => {
    if (window.editorTimelineRef) {
      window.editorTimelineRef.zoomToRange(start, end)
    }
  }, [])

  // ─── LECTURE ──────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    allHowlsRef.current.forEach(item => {
      if (item.howl) {
        if (item.howl.playing()) item.howl.stop()
        item.howl.unload()
      }
    })
    allHowlsRef.current = []
    trackHowlsRef.current = {}

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    cleanupEffectBlobs()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    startTimeRef.current = 0
    pausedTimeRef.current = 0
    isPlayingRef.current = false
  }, [cleanupEffectBlobs])

  const pausePlayback = useCallback(() => {
    if (isPlayingRef.current) {
      allHowlsRef.current.forEach(item => {
        if (item.howl?.playing()) item.howl.pause()
      })
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      setIsPaused(true)
      setIsPlaying(false)
      pausedTimeRef.current = currentTime
      isPlayingRef.current = false
    }
  }, [currentTime])

  const playAllClips = useCallback((startAt = 0) => {
    const project = store.editorProject
    if (!project || project.tracks.length === 0) {
      addToast(t('editorNoTracks'), 'info')
      return
    }

    const hasClips = project.tracks.some(t => t.clips.length > 0)
    if (!hasClips) {
      addToast(t('editorNoClips'), 'info')
      return
    }

    stopPlayback()
    setIsPlaying(true)
    setIsPaused(false)
    isPlayingRef.current = true
    setCurrentTime(startAt)
    startTimeRef.current = Date.now() - startAt * 1000
    pausedTimeRef.current = 0

    trackHowlsRef.current = {}
    const howls = []
    const masterVol = isMasterMuted ? 0 : masterVolume / 100

    const trackVolumes = {}
    const trackSolos = {}
    const trackMutes = {}
    project.tracks.forEach(t => {
      trackVolumes[t.id] = t.volume ?? 1
      trackSolos[t.id] = t.solo || false
      trackMutes[t.id] = t.muted || false
    })

    const hasSolo = Object.values(trackSolos).some(s => s)

    const createHowlForClip = async (clip, trackId, trackVolume, clipVolume, finalVolume) => {
      const fileUrl = clip.path.startsWith('file://') 
        ? clip.path 
        : 'file:///' + clip.path.replace(/\\/g, '/')

      const hasActiveEffects = clip.effects?.some(e => e.enabled) || false
      let src = fileUrl
      let isBlob = false

      if (hasActiveEffects) {
        const cacheKey = `${clip.id}_${clip.effects.map(e => `${e.id}_${e.enabled}`).join('_')}`
        if (effectBlobCache.has(cacheKey)) {
          src = effectBlobCache.get(cacheKey)
          isBlob = true
        } else {
          try {
            const result = await applyEffectsToFile(clip.path, clip.effects)
            if (result.success && result.needsProcessing && result.url) {
              src = result.url
              isBlob = true
              effectBlobCache.set(cacheKey, src)
              effectBlobsRef.current.push(src)
            }
          } catch (e) {
            console.warn('Erreur application effets:', e)
          }
        }
      }

      const speed = clip.effects?.find(e => e.type === 'speed' && e.enabled)?.params?.value || 1

      const howl = new Howl({
        src: [src],
        volume: Math.min(1, Math.max(0.001, finalVolume)),
        rate: speed,
        html5: true,
        format: isBlob ? ['wav'] : ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'],
        onloaderror: (id, err) => {
          console.error('Erreur lecture clip:', clip.name, err)
        }
      })

      return { howl, clip, clipVolume, trackId, isBlob }
    }

    const loadClips = async () => {
      for (const track of project.tracks) {
        if (hasSolo && !trackSolos[track.id]) continue
        if (trackMutes[track.id]) continue

        const trackVolume = track.volume ?? 1
        if (!trackHowlsRef.current[track.id]) {
          trackHowlsRef.current[track.id] = []
        }

        for (const clip of track.clips) {
          let clipVolume = 1.0
          clip.effects?.forEach(effect => {
            if (effect.enabled && effect.type === 'volume') {
              clipVolume = effect.params.value || 1.0
            }
          })

          const finalVolume = clipVolume * trackVolume * (store.volume / 100) * masterVol
          const clampedVolume = Math.min(1, Math.max(0.001, finalVolume))

          try {
            const howlData = await createHowlForClip(clip, track.id, trackVolume, clipVolume, clampedVolume)
            trackHowlsRef.current[track.id].push(howlData)
            howls.push({
              howl: howlData.howl,
              clip: howlData.clip,
              startOffset: clip.start,
              started: false,
              duration: clipDurations[clip.id] || clip.duration || 3,
              trackId: track.id,
              clipVolume,
              isBlob: howlData.isBlob
            })
          } catch (e) {
            console.warn('Erreur chargement clip:', clip.name, e)
          }
        }
      }

      allHowlsRef.current = howls

      const startClipsAtTime = (time) => {
        howls.forEach(item => {
          if (!item.started && time >= item.startOffset) {
            try {
              item.howl.play()
              const sourceOffset = item.clip.offset || 0
              const seekTime = Math.min(time - item.startOffset, item.duration) + sourceOffset
              if (seekTime > 0) item.howl.seek(seekTime)

              const project = store.editorProject
              if (project) {
                const track = project.tracks.find(t => t.id === item.trackId)
                if (track) {
                  const trackVolume = track.volume ?? 1
                  const masterVol = isMasterMuted ? 0 : masterVolume / 100
                  const finalVolume = item.clipVolume * trackVolume * (store.volume / 100) * masterVol
                  const clampedVolume = Math.min(1, Math.max(0.001, finalVolume))
                  item.howl.volume(clampedVolume)
                }
              }
              item.started = true
            } catch (e) {
              console.warn('Erreur démarrage clip:', e)
            }
          }
        })
      }

      const updateProgress = () => {
        if (!isPlayingRef.current) return

        const elapsed = (Date.now() - startTimeRef.current) / 1000
        let current = Math.min(elapsed, totalDuration)

        const loop = loopRegionRef.current
        if (loop?.enabled && current >= loop.end) {
          const loopDuration = loop.end - loop.start
          if (loopDuration > 0.1) {
            const offset = (current - loop.end) % loopDuration
            current = loop.start + offset
            startTimeRef.current = Date.now() - current * 1000
          }
        }

        startClipsAtTime(current)
        setCurrentTime(current)

        if (current >= totalDuration) {
          stopPlayback()
          return
        }

        animationRef.current = requestAnimationFrame(updateProgress)
      }

      startClipsAtTime(startAt)
      updateProgress()
    }

    loadClips()
  }, [store.editorProject, store.volume, totalDuration, clipDurations, addToast, t, stopPlayback, masterVolume, isMasterMuted, cleanupEffectBlobs])

  const resumePlayback = useCallback(() => {
    if (isPaused) playAllClipsRef.current?.(pausedTimeRef.current)
  }, [isPaused])

  useEffect(() => {
    playAllClipsRef.current = playAllClips
  }, [playAllClips])

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      pausePlayback()
    } else if (isPaused) {
      resumePlayback()
    } else {
      playAllClips(currentTime > 0 ? currentTime : 0)
    }
  }, [isPlaying, isPaused, currentTime, pausePlayback, resumePlayback, playAllClips])

  const handleStop = useCallback(() => {
    stopPlayback()
    setCurrentTime(0)
  }, [stopPlayback])

  const handleSeek = useCallback((time) => {
    const clampedTime = Math.max(0, Math.min(totalDuration, time))
    setCurrentTime(clampedTime)

    if (isPlaying) {
      startTimeRef.current = Date.now() - clampedTime * 1000
      allHowlsRef.current.forEach(item => {
        if (item.howl?.playing()) {
          const clipStart = item.clip.start
          const clipDuration = clipDurations[item.clip.id] || item.clip.duration || 3
          const sourceOffset = item.clip.offset || 0
          const seekInClip = Math.max(0, Math.min(clampedTime - clipStart, clipDuration)) + sourceOffset
          if (seekInClip >= 0 && seekInClip <= clipDuration + sourceOffset) {
            try { item.howl.seek(seekInClip) } catch {}
          }
        }
      })
    }

    if (isPaused) pausedTimeRef.current = clampedTime
  }, [totalDuration, isPlaying, isPaused, clipDurations])

  // ─── SPLIT ────────────────────────────────────────────────────────────────
  const getClipUnderPlayhead = useCallback(() => {
    const project = store.editorProject
    if (!project) return null

    const isUnderPlayhead = (c) => {
      const dur = clipDurations[c.id] || c.duration || 3
      return currentTime > c.start + 0.05 && currentTime < c.start + dur - 0.05
    }

    const selectedTrack = project.tracks.find(t => t.id === selectedTrackId)
    const selectedClip = selectedTrack?.clips.find(c => c.id === selectedClipId)
    if (selectedClip && isUnderPlayhead(selectedClip)) {
      return { trackId: selectedTrackId, clip: selectedClip }
    }

    for (const track of project.tracks) {
      const found = track.clips.find(isUnderPlayhead)
      if (found) return { trackId: track.id, clip: found }
    }
    return null
  }, [store.editorProject, selectedTrackId, selectedClipId, currentTime, clipDurations])

  const handleSplit = useCallback(async () => {
    const target = getClipUnderPlayhead()
    if (!target) {
      addToast(t('editorSplitNoClipHere'), 'info')
      return
    }

    const newClip = await store.splitClip(target.trackId, target.clip.id, currentTime, clipDurations[target.clip.id])

    if (newClip) {
      const updatedClipDurations = { ...clipDurations }
      updatedClipDurations[target.clip.id] = currentTime - target.clip.start
      setClipDurations(updatedClipDurations)

      try {
        const sliceDuration = updatedClipDurations[newClip.id] || newClip.duration || null
        const data = await generateWaveformData(newClip.path, 200, newClip.offset || 0, sliceDuration, false)
        if (data) setWaveformData(prev => ({ ...prev, [newClip.id]: data }))
      } catch (e) {
        console.warn('Erreur génération waveform:', e)
      }

      setSelectedTrackId(target.trackId)
      setSelectedClipId(newClip.id)
      addToast(t('editorClipSplit'), 'success')
    } else {
      addToast(t('editorSplitOutOfRange'), 'info')
    }
  }, [getClipUnderPlayhead, currentTime, clipDurations, store, addToast, t])

  // ─── ROGNAGE ──────────────────────────────────────────────────────────────
  const handleTrimClip = useCallback(async (clipId, start, end) => {
    const clip = store.editorProject.tracks
      .flatMap(t => t.clips)
      .find(c => c.id === clipId)
    if (!clip) return

    try {
      const result = await window.electronAPI.trimSoundFile(clip.path, start, end)
      if (result.success) {
        await store.updateClipWithPath(clipId, result.path)
        addToast(`"${clip.name}" ${t('editorTrimSuccess')}`, 'success')
        const data = await generateWaveformData(result.path, 200, 0, end - start, false)
        if (data) setWaveformData(prev => ({ ...prev, [clipId]: data }))
      } else {
        addToast(t('editorTrimError'), 'error')
      }
    } catch (e) {
      console.error('Erreur rognage:', e)
      addToast(t('editorTrimError'), 'error')
    }
  }, [store, addToast, t])

  // ─── PRÉVISUALISATION EFFETS ─────────────────────────────────────────────
  const handlePreviewEffects = useCallback((clip, processedBuffer) => {
    if (previewHowlRef.current) {
      previewHowlRef.current.stop()
      previewHowlRef.current.unload()
      previewHowlRef.current = null
    }

    if (!clip) return
    setIsPreviewingEffect(true)

    try {
      const fileUrl = clip.path.startsWith('file://') 
        ? clip.path 
        : 'file:///' + clip.path.replace(/\\/g, '/')

      const howl = new Howl({
        src: [fileUrl],
        volume: (store.volume / 100) * (isMasterMuted ? 0 : masterVolume / 100),
        html5: true,
        onend: () => {
          setIsPreviewingEffect(false)
          previewHowlRef.current = null
        },
        onstop: () => {
          setIsPreviewingEffect(false)
          previewHowlRef.current = null
        }
      })

      previewHowlRef.current = howl
      howl.play()
    } catch (e) {
      console.warn('Erreur prévisualisation:', e)
      setIsPreviewingEffect(false)
    }
  }, [store.volume, masterVolume, isMasterMuted])

  // ─── NORMALISATION ────────────────────────────────────────────────────────
  const handleNormalizeClip = useCallback(async (clipId, targetPeak = 0.95) => {
    const clip = store.editorProject.tracks
      .flatMap(t => t.clips)
      .find(c => c.id === clipId)
    if (!clip) return

    setIsNormalizing(true)
    try {
      const result = await normalizeClip(clip, targetPeak, store)
      if (result) {
        if (result.normalized) {
          addToast(`"${clip.name}" ${t('editorNormalized')} (gain: ${result.gain.toFixed(2)}x)`, 'success')
          if (result.newPath) {
            const data = await generateWaveformData(result.newPath, 200, 0, null, false)
            if (data) setWaveformData(prev => ({ ...prev, [clipId]: data }))
          }
        } else {
          addToast(`"${clip.name}" ${t('editorAlreadyNormalized')}`, 'info')
        }
      } else {
        addToast(t('editorNormalizeError'), 'error')
      }
    } catch (e) {
      console.error('Erreur normalisation:', e)
      addToast(t('editorNormalizeError') + ': ' + e.message, 'error')
    } finally {
      setIsNormalizing(false)
    }
  }, [store, t, addToast])

  const handleNormalizeAll = useCallback(async (scope = 'track', targetPeak = 0.95) => {
    let clips = []

    if (scope === 'clip' && selectedClipId) {
      const clip = store.editorProject.tracks
        .flatMap(t => t.clips)
        .find(c => c.id === selectedClipId)
      if (clip) clips = [clip]
    } else if (scope === 'track' && selectedTrackId) {
      const track = store.editorProject.tracks.find(t => t.id === selectedTrackId)
      if (track) clips = track.clips
    } else {
      clips = store.editorProject.tracks.flatMap(t => t.clips)
    }

    if (clips.length === 0) {
      addToast(t('editorNoClipsToNormalize'), 'info')
      return
    }

    setIsNormalizing(true)
    try {
      const results = await normalizeAll(clips, targetPeak, store)
      const normalized = results.filter(r => r.normalized)
      if (normalized.length > 0) {
        addToast(`${normalized.length} ${t('editorClipsNormalized')}`, 'success')
        for (const result of normalized) {
          if (result.newPath && result.clipId) {
            const data = await generateWaveformData(result.newPath, 200, 0, null, false)
            if (data) setWaveformData(prev => ({ ...prev, [result.clipId]: data }))
          }
        }
      } else {
        addToast(t('editorAlreadyNormalized'), 'info')
      }
    } catch (e) {
      console.error('Erreur normalisation:', e)
      addToast(t('editorNormalizeError') + ': ' + e.message, 'error')
    } finally {
      setIsNormalizing(false)
    }
  }, [store, selectedClipId, selectedTrackId, t, addToast])

  // ─── MÉTRONOME ────────────────────────────────────────────────────────────
  const handleMetronomeToggle = useCallback((enabled) => setMetronomeEnabled(enabled), [])
  const handleMetronomeBpmChange = useCallback((bpm) => setMetronomeBpm(bpm), [])

  // ─── MASTER VOLUME ────────────────────────────────────────────────────────
  const handleMasterVolumeChange = useCallback((newVolume) => setMasterVolume(newVolume), [])
  const handleMasterMuteToggle = useCallback(() => setIsMasterMuted(prev => !prev), [])

  // ─── EXPORT ───────────────────────────────────────────────────────────────
  const handleExportClick = () => {
    const project = store.editorProject
    if (!project || project.tracks.length === 0 || project.tracks.every(t => t.clips.length === 0)) {
      addToast(t('editorNothingToExport'), 'info')
      return
    }
    setExportName(project.name || 'Mon mix')
    setExportEmoji('🔊')
    setExportProfiles(['all'])
    setExportFormat('mp3')
    setExportBitrate(192)
    setShowExportModal(true)
  }

  const handlePickImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) {
        setExportImage(result.path)
        addToast(t('editorExportImageAdded'), 'success')
      }
    }
  }

  const handleExportConfirm = async () => {
    if (!exportName.trim()) {
      addToast(t('editorExportNameRequired'), 'error')
      return
    }

    if (exportAddToLibrary && exportProfiles.length === 0) {
      addToast(t('editorExportProfileRequired'), 'error')
      return
    }

    setIsExporting(true)
    setShowExportModal(false)

    try {
      const loop = store.editorLoopRegion
      const exportStart = loop?.enabled ? loop.start : 0
      const exportEnd = loop?.enabled ? loop.end : null

      if (loop?.enabled) {
        addToast(`${t('editorExportSelection')} ${exportStart.toFixed(1)}s - ${exportEnd.toFixed(1)}s`, 'info')
      } else {
        addToast('🎛️ Mixage en cours...', 'info')
      }

      const project = store.editorProject
      const buffer = await mixdownProject(
        project,
        clipDurations,
        44100,
        (progress) => console.log(`Mixage: ${Math.round(progress * 100)}%`),
        exportStart,
        exportEnd
      )

      if (!buffer) throw new Error('Erreur lors du mixage')

      addToast(`📦 Export en ${exportFormat.toUpperCase()}...`, 'info')

      const safeName = exportName.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `${safeName}.${exportFormat}`
      const soundsDir = await window.electronAPI.getSoundsDir()
      const outputPath = `${soundsDir}/${fileName}`

      const result = await exportMixdown(
        buffer,
        exportFormat,
        exportBitrate,
        outputPath,
        (progress) => console.log(`Export: ${Math.round(progress * 100)}%`)
      )

      if (!result.success) throw new Error(result.error || 'Erreur lors de l\'export')

      if (exportAddToLibrary) {
        const soundData = {
          name: exportName.trim(),
          path: result.path,
          image: exportImage || null,
          emoji: exportEmoji,
          profiles: exportProfiles
        }
        await store.addSound(soundData)
        const sizeStr = result.size ? `${(result.size / 1024 / 1024).toFixed(1)} MB` : ''
        addToast(`"${exportName.trim()}" ${t('editorExportSuccess')} ${sizeStr}`, 'success')
      } else {
        addToast(`${t('editorExportFile')} : ${fileName}`, 'success')
      }

    } catch (e) {
      console.error('Export error:', e)
      addToast(t('editorExportError') + ': ' + e.message, 'error')
    } finally {
      setIsExporting(false)
      setExportName('')
      setExportEmoji('🔊')
      setExportImage(null)
      setExportProfiles(['all'])
      setExportAddToLibrary(true)
      setExportFormat('mp3')
      setExportBitrate(192)
    }
  }

  // ─── MENU CONTEXTUEL ──────────────────────────────────────────────────────
  const handleClipContextMenu = useCallback((clipId, trackId, e) => {
    e.preventDefault()
    e.stopPropagation()

    const clip = store.editorProject.tracks
      .flatMap(t => t.clips)
      .find(c => c.id === clipId)
    if (!clip) return

    setSelectedClipForMenu(clipId)
    setSelectedTrackForMenu(trackId)

    const rect = e.currentTarget?.getBoundingClientRect() || e.target?.getBoundingClientRect()
    const top = Math.min(e.clientY || rect?.bottom || 0, window.innerHeight - 40)
    const left = Math.min(e.clientX || rect?.left || 0, window.innerWidth - 40)

    setClipMenu({ top, left })
  }, [store.editorProject])

  const handleLoopFromMenu = useCallback((clipId) => {
    const clip = store.editorProject.tracks
      .flatMap(t => t.clips)
      .find(c => c.id === clipId)
    if (clip) {
      const clipDuration = clipDurations[clipId] || clip.duration || 3
      store.setEditorLoopRegion(clip.start, clip.start + clipDuration)
      store.toggleEditorLoop()
      addToast(t('editorLoopSet'), 'success')
    }
    setClipMenu(null)
  }, [store, clipDurations, t, addToast])

  const handleSplitFromMenu = useCallback((trackId, clipId) => {
    const clip = store.editorProject.tracks
      .flatMap(t => t.clips)
      .find(c => c.id === clipId)
    if (clip) {
      const clipDuration = clipDurations[clipId] || clip.duration || 3
      const splitTime = clip.start + clipDuration / 2
      setCurrentTime(splitTime)
      handleSplit()
    }
    setClipMenu(null)
  }, [store, clipDurations, handleSplit])

  const handleTrimFromMenu = useCallback((clipId) => {
    setTrimClipId(clipId)
    setShowTrimModal(true)
    setClipMenu(null)
  }, [])

  const handleNormalizeFromMenu = useCallback((clipId) => {
    handleNormalizeClip(clipId, normalizeTarget)
    setClipMenu(null)
  }, [handleNormalizeClip, normalizeTarget])

  const handleAddEffectFromMenu = useCallback((trackId, clipId) => {
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId)
    setClipMenu(null)
  }, [])

  const handleDuplicateFromMenu = useCallback(async (trackId, clipId) => {
    await store.duplicateClip(trackId, clipId)
    addToast(t('editorClipDuplicated'), 'success')
    setClipMenu(null)
  }, [store, t, addToast])

  const handleDeleteFromMenu = useCallback(async (trackId, clipId) => {
    await store.removeClip(trackId, clipId)
    addToast(t('editorClipRemoved'), 'info')
    setClipMenu(null)
  }, [store, t, addToast])

  // ─── FORMATAGE ────────────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ─── RENDU ────────────────────────────────────────────────────────────────
  const selectedClip = selectedClipId 
    ? store.editorProject.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)
    : null

  const project = store.editorProject

  if (!project?.id) {
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
        key={`editor-toolbar-${currentLang}`}
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentTime={currentTime}
        totalDuration={totalDuration}
        onPlay={handlePlay}
        onStop={handleStop}
        onExport={handleExportClick}
        onAddTrack={handleAddTrack}
        onAddClip={handleAddClip}
        onAddClipFromFile={handleAddClipFromFile}
        tracks={project?.tracks || []}
        sounds={store.sounds}
        lang={currentLang}
        tr={t}
        isLoading={isLoading}
        isExporting={isExporting}
        onUndo={store.undoEditor}
        onRedo={store.redoEditor}
        canUndo={store.canUndoEditor}
        canRedo={store.canRedoEditor}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(prev => !prev)}
        projectName={project?.name || 'Nouveau projet'}
        onRenameProject={handleRenameProject}
        isPreviewingEffect={isPreviewingEffect}
        autoCrossfade={autoCrossfade}
        onToggleCrossfade={() => setAutoCrossfade(!autoCrossfade)}
        isDirty={isDirty}
        isAutoSaving={isAutoSaving}
        metronomeEnabled={metronomeEnabled}
        metronomeBpm={metronomeBpm}
        onMetronomeToggle={handleMetronomeToggle}
        onMetronomeBpmChange={handleMetronomeBpmChange}
        addToast={addToast}
      />

      {/* Timeline */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <EditorTimeline
          tracks={project?.tracks || []}
          selectedClipId={selectedClipId}
          selectedTrackId={selectedTrackId}
          totalDuration={totalDuration}
          onClipSelect={handleClipSelect}
          onClipMove={(trackId, clipId, newStart, newTrackId = null) => {
            if (newTrackId && newTrackId !== trackId) {
              store.moveClip(trackId, clipId, newStart, newTrackId, { skipHistory: true })
            } else {
              store.moveClip(trackId, clipId, newStart, null, { skipHistory: true })
            }
          }}
          onClipUpdate={(trackId, clipId, updates) => {
            store.updateClip(trackId, clipId, updates, { skipHistory: true })
          }}
          onClipRemove={handleRemoveClip}
          onClipDuplicate={(trackId, clipId) => store.duplicateClip(trackId, clipId)}
          onClipFade={(trackId, clipId, edge, duration) => {
            store.setClipFade(trackId, clipId, edge, duration)
          }}
          onClipCopy={handleCopyClip}
          onClipCut={handleCutClip}
          onClipPaste={handlePasteClip}
          onClipContextMenu={handleClipContextMenu}
          onDragCheckpoint={store.pushEditorHistoryCheckpoint}
          onTrackRemove={handleRemoveTrack}
          onSeek={handleSeek}
          onTrackMute={(trackId, muted) => store.updateTrack(trackId, { muted })}
          onTrackSolo={(trackId, solo) => store.updateTrack(trackId, { solo })}
          onTrackVolume={(trackId, volume) => store.updateTrack(trackId, { volume })}
          onTrackReorder={store.reorderTracks}
          waveformData={waveformData}
          currentTime={currentTime}
          isPlaying={isPlaying || isPaused}
          clipDurations={clipDurations}
          snapEnabled={snapEnabled}
          loopRegion={store.editorLoopRegion}
          onSetLoopRegion={store.setEditorLoopRegion}
          metronomeEnabled={metronomeEnabled}
          metronomeBpm={metronomeBpm}
          onMetronomeToggle={handleMetronomeToggle}
          onMetronomeBpmChange={handleMetronomeBpmChange}
          onWaveformUpdate={handleWaveformUpdate}
          autoCrossfade={autoCrossfade}
          addToast={addToast}
          lang={currentLang}
          tr={t}
          onRenameTrack={handleRenameTrack}
          markers={markers}
          onAddMarker={handleAddMarker}
          onRemoveMarker={handleRemoveMarker}
          onMarkersChange={handleMarkersChange}
        />
      </div>

      {/* Panneau d'effets */}
      {selectedClip && (
        <EditorEffectsPanel
          clip={selectedClip}
          trackId={selectedTrackId}
          onEffectAdd={(trackId, clipId, effectType, params) => {
            store.addEffectToClip(trackId, clipId, effectType, params)
          }}
          onEffectRemove={(trackId, clipId, effectId) => {
            store.removeEffectFromClip(trackId, clipId, effectId)
          }}
          onEffectUpdate={(trackId, clipId, effectId, param, value) => {
            store.updateEffectParam(trackId, clipId, effectId, param, value)
          }}
          onEffectToggle={(trackId, clipId, effectId, enabled) => {
            const clip = store.editorProject.tracks
              .flatMap(t => t.clips)
              .find(c => c.id === clipId)
            if (clip) {
              const effects = clip.effects.map(e => 
                e.id === effectId ? { ...e, enabled } : e
              )
              store.updateClip(trackId, clipId, { effects })
            }
          }}
          onClipUpdate={store.updateClip}
          onPreview={handlePreviewEffects}
          isPreviewing={isPreviewingEffect}
          lang={currentLang}
          tr={t}
        />
      )}

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
          onVolumeChange={handleMasterVolumeChange}
          isMuted={isMasterMuted}
          onMuteToggle={handleMasterMuteToggle}
          peakMeter={peakMeter}
          tr={t}
        />

        <div style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          display: 'flex',
          gap: 12,
          alignItems: 'center'
        }}>
          <span>{t('editorClips')}: {store.editorProject.tracks.flatMap(t => t.clips).length}</span>
          <span>{t('editorTracks')}: {store.editorProject.tracks.length}</span>
          <span>{t('editorDuration')}: {formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Menu contextuel des clips */}
      {clipMenu && selectedClipForMenu && (
        <ClipActionsMenu
          clip={store.editorProject.tracks
            .flatMap(t => t.clips)
            .find(c => c.id === selectedClipForMenu)}
          trackId={selectedTrackForMenu}
          position={clipMenu}
          onClose={() => setClipMenu(null)}
          onSplit={handleSplitFromMenu}
          onLoop={handleLoopFromMenu}
          onTrim={handleTrimFromMenu}
          onNormalize={handleNormalizeFromMenu}
          onAddEffect={handleAddEffectFromMenu}
          onDuplicate={handleDuplicateFromMenu}
          onCopy={handleCopyClip}
          onCut={handleCutClip}
          onDelete={handleDeleteFromMenu}
          onFadeIn={store.setClipFade}
          onFadeOut={store.setClipFade}
          onPreviewEffects={handlePreviewEffects}
          isPlaying={isPlaying}
          isLoopEnabled={store.editorLoopRegion.enabled}
          tr={t}
        />
      )}

      {/* Panneau flottant des marqueurs */}
      <EditorMarkersPanel
        markers={markers}
        currentTime={currentTime}
        onAddMarker={handleAddMarker}
        onRemoveMarker={handleRemoveMarker}
        onSeek={handleSeek}
        tr={t}
      />

      {/* Modal d'ajout de piste */}
      {showAddTrackModal && (
        <AddTrackModal
          onConfirm={handleAddTrackConfirm}
          onCancel={() => setShowAddTrackModal(false)}
          defaultName={pendingTrackName}
          tr={t}
        />
      )}

      {/* Modal d'export */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" style={{ width: 460, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <i className="ti ti-package-export" style={{ color: 'var(--accent)' }} />
              {t('editorExportTitle')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {t('soundName')} *
                </label>
                <input
                  value={exportName}
                  onChange={e => setExportName(e.target.value)}
                  placeholder={t('editorExportNamePlaceholder')}
                  className="input-lg"
                  style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {t('image')}
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {exportImage && (
                    <img 
                      src={`file:///${exportImage.replace(/\\/g, '/')}`} 
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} 
                      alt="Aperçu"
                    />
                  )}
                  <button 
                    className="btn-secondary btn-sm" 
                    onClick={handlePickImage}
                    style={{ fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius-sm)' }}
                  >
                    <i className="ti ti-photo" /> {exportImage ? t('editorImageChange') : t('editorImageChoose')}
                  </button>
                  {exportImage && (
                    <button 
                      className="btn-ghost btn-sm" 
                      onClick={() => setExportImage(null)}
                      style={{ fontSize: 12, padding: '4px 6px', borderRadius: 'var(--radius-sm)', color: 'var(--danger)' }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {t('editorEmojiLabel')}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setExportEmoji(e)}
                      style={{
                        width: 34,
                        height: 34,
                        fontSize: 16,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: `1px solid ${exportEmoji === e ? 'var(--accent)' : 'var(--border)'}`,
                        background: exportEmoji === e ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {t('editorExportFormat') || 'Format'}
                  </label>
                  <select
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value)}
                    style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="mp3">MP3</option>
                    <option value="wav">WAV</option>
                    <option value="ogg">OGG</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {t('editorExportQuality') || 'Qualité'}
                  </label>
                  <select
                    value={exportBitrate}
                    onChange={e => setExportBitrate(Number(e.target.value))}
                    style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}
                  >
                    <option value="128">128 kbps</option>
                    <option value="192">192 kbps</option>
                    <option value="256">256 kbps</option>
                    <option value="320">320 kbps</option>
                  </select>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${exportAddToLibrary ? 'var(--accent)' : 'var(--border)'}`,
                background: exportAddToLibrary ? 'var(--accent-light)' : 'transparent'
              }}>
                <input
                  type="checkbox"
                  id="exportAddToLibrary"
                  checked={exportAddToLibrary}
                  onChange={e => setExportAddToLibrary(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', width: 'auto' }}
                />
                <label htmlFor="exportAddToLibrary" style={{ fontSize: 13, cursor: 'pointer', flex: 1 }}>
                  {t('editorAddToLibrary')}
                </label>
              </div>

              {exportAddToLibrary && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {t('editorProfilesLabel')} *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {store.profiles.map(p => (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          border: `1px solid ${exportProfiles.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                          background: exportProfiles.includes(p.id) ? 'var(--accent-light)' : 'transparent',
                          fontSize: 12
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={exportProfiles.includes(p.id)}
                          onChange={() => {
                            setExportProfiles(prev =>
                              prev.includes(p.id)
                                ? prev.filter(id => id !== p.id)
                                : [...prev, p.id]
                            )
                          }}
                          style={{ accentColor: 'var(--accent)', width: 'auto' }}
                        />
                        <i className={`ti ${p.isDefault ? 'ti-stack' : 'ti-user'}`} style={{ color: 'var(--text-secondary)' }} />
                        {p.id === 'all' ? t('allSounds') : p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                lineHeight: 1.6
              }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
                {t('editorExportNote')}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary btn-lg"
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                {t('cancel')}
              </button>
              <button
                className="btn-primary btn-lg"
                onClick={handleExportConfirm}
                disabled={isExporting || !exportName.trim() || (exportAddToLibrary && exportProfiles.length === 0)}
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                {isExporting ? (
                  <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {t('editorExporting')}</>
                ) : (
                  <><i className="ti ti-check" /> {t('editorExport')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-secondary)',
          padding: '20px 30px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 20 }} />
          <span>{t('editorLoading')}</span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal {
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: 24px;
          max-width: 90vw;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border);
        }
        .modal-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .btn-lg {
          padding: 8px 20px;
          font-size: 13px;
          min-height: 40px;
          border-radius: var(--radius-md);
        }
        .input-lg {
          padding: 8px 12px;
          font-size: 13px;
          border-radius: var(--radius-md);
          width: 100%;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          color: var(--text-primary);
        }
        .input-lg:focus {
          outline: none;
          border-color: var(--accent);
        }
      `}</style>
    </div>
  )
}