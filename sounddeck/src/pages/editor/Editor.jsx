import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '../../i18n'
import { Howl } from 'howler'
import EditorTimeline from './EditorTimeline'
import EditorToolbar from './EditorToolbar'
import EditorEffectsPanel from './EditorEffectsPanel'
import EditorNormalize from './EditorNormalize'
import EditorMasterVolume from './EditorMasterVolume'
import { generateWaveformData } from '../../utils/waveformGenerator'
import { normalizeClip, normalizeAll } from '../../utils/normalizeUtils'
import { mixdownProject, exportMixdown } from '../../utils/mixdown'

const EMOJIS = ['🔊','🎵','😂','💥','🔔','🎺','🎻','🐸','🤣','😱','🎮','🔥','💀','👏','🚨','🎉','🐧','😬','🥁','😋']

export default function Editor({ store, addToast, lang = 'fr' }) {
  const tr = useTranslation(lang)
  
  // ─── ÉTATS PRINCIPAUX ──────────────────────────────────────────────────────
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
  const [autoPlayOnClick, setAutoPlayOnClick] = useState(false)
  
  // ─── ÉTATS COPIER/COLLER ──────────────────────────────────────────────────
  const [clipboard, setClipboard] = useState({ clips: [], trackId: null, copiedAt: null })
  
  // ─── ÉTATS MARQUEURS ──────────────────────────────────────────────────────
  const [markers, setMarkers] = useState([])
  
  // ─── ÉTATS MÉTRONOME ──────────────────────────────────────────────────────
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [metronomeBpm, setMetronomeBpm] = useState(120)
  
  // ─── ÉTATS NORMALISATION ──────────────────────────────────────────────────
  const [isNormalizing, setIsNormalizing] = useState(false)
  
  // ─── ÉTATS MASTER VOLUME ──────────────────────────────────────────────────
  const [masterVolume, setMasterVolume] = useState(100)
  const [isMasterMuted, setIsMasterMuted] = useState(false)
  const [peakMeter, setPeakMeter] = useState(0)
  
  // ─── ÉTATS PRÉVISUALISATION EFFETS ────────────────────────────────────────
  const [isPreviewingEffect, setIsPreviewingEffect] = useState(false)
  const previewHowlRef = useRef(null)
  
  // ─── ÉTATS EXPORT ──────────────────────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportName, setExportName] = useState('')
  const [exportEmoji, setExportEmoji] = useState('🔊')
  const [exportImage, setExportImage] = useState(null)
  const [exportProfiles, setExportProfiles] = useState(['all'])
  const [exportAddToLibrary, setExportAddToLibrary] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('mp3')
  const [exportBitrate, setExportBitrate] = useState(192)
  
  // ─── RÉFÉRENCES ────────────────────────────────────────────────────────────
  const audioRef = useRef(null)
  const animationRef = useRef(null)
  const projectRef = useRef(store.editorProject)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)
  const allHowlsRef = useRef([])
  const isPlayingRef = useRef(false)
  const loopRegionRef = useRef(store.editorLoopRegion)
  const playAllClipsRef = useRef(null)

  // ─── SYNC DES REFS ────────────────────────────────────────────────────────
  useEffect(() => {
    loopRegionRef.current = store.editorLoopRegion
  }, [store.editorLoopRegion])

  useEffect(() => {
    projectRef.current = store.editorProject
  }, [store.editorProject])

  // ─── PISTE PAR DÉFAUT ──────────────────────────────────────────────────────
  useEffect(() => {
    const project = store.editorProject
    if (project && project.id && project.tracks?.length === 0) {
      const timer = setTimeout(async () => {
        await store.addTrack()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [store.editorProject?.id, store.editorProject?.tracks?.length])

  // ─── CHARGEMENT DES MARQUEURS ─────────────────────────────────────────────
  useEffect(() => {
    const savedMarkers = store.editorProject?.markers || []
    if (savedMarkers.length > 0) {
      setMarkers(savedMarkers)
    }
  }, [store.editorProject?.markers])

  // ─── CALCUL DE LA DURÉE TOTALE ────────────────────────────────────────────
  useEffect(() => {
    const calculateTotalDuration = async () => {
      const project = store.editorProject
      if (!project || !project.tracks) return

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
                audio.addEventListener('loadedmetadata', () => {
                  resolve(audio.duration)
                })
                audio.addEventListener('error', () => {
                  resolve(3)
                })
                setTimeout(() => resolve(3), 3000)
              })
              
              newClipDurations[clip.id] = duration
              if (duration > 0 && clip.duration !== duration) {
                store.updateClip(track.id, clip.id, { duration })
              }
            } catch (e) {
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

  // ─── CHARGEMENT DES WAVEFORMS ─────────────────────────────────────────────
  useEffect(() => {
    const loadWaveforms = async () => {
      const project = store.editorProject
      if (!project || !project.tracks) return

      setIsLoading(true)
      const newWaveformData = {}

      for (const track of project.tracks) {
        for (const clip of track.clips) {
          if (clip.path && !waveformData[clip.id]) {
            try {
              const sliceDuration = clipDurations[clip.id] || clip.duration || null
              const data = await generateWaveformData(clip.path, 200, clip.offset || 0, sliceDuration)
              if (data) {
                newWaveformData[clip.id] = data
              }
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
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
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
      if (previewHowlRef.current) {
        previewHowlRef.current.stop()
        previewHowlRef.current.unload()
        previewHowlRef.current = null
      }
    }
  }, [])

  // ─── CRÉATION DU PROJET ──────────────────────────────────────────────────
  useEffect(() => {
    const project = store.editorProject
    if (!project || !project.id) {
      store.createEditorProject('Nouveau projet')
    }
  }, [])

  // ─── GESTION DU PROJET ────────────────────────────────────────────────────
  const handleAddTrack = async () => {
    await store.addTrack()
    addToast(tr('editorTrackAdded'), 'success')
  }

  const handleRemoveTrack = async (trackId) => {
    await store.removeTrack(trackId)
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null)
      setSelectedClipId(null)
    }
    addToast(tr('editorTrackRemoved'), 'info')
  }

  const handleAddClip = async (trackId, soundId) => {
    const sound = store.sounds.find(s => s.id === soundId)
    if (!sound) {
      addToast(tr('editorSoundNotFound'), 'error')
      return
    }

    const track = store.editorProject.tracks.find(t => t.id === trackId)
    let start = 0
    if (track && track.clips.length > 0) {
      const lastClip = track.clips.reduce((max, clip) => 
        clip.start + clip.duration > max.start + max.duration ? clip : max
      )
      start = lastClip.start + lastClip.duration + 0.5
    }

    const clip = await store.addClipToTrack(trackId, soundId, start, 3)
    if (clip) {
      addToast(`"${sound.name}" ${tr('editorClipAdded')}`, 'success')
      setSelectedClipId(clip.id)
      setSelectedTrackId(trackId)
    }
  }

  const handleAddClipFromFile = async (trackId, filePath) => {
    try {
      const exists = await window.electronAPI.fileExists?.(filePath)
      if (!exists) {
        addToast('Fichier introuvable', 'error')
        return
      }

      const clip = await store.addClipFromFile(trackId, filePath)
      if (clip) {
        addToast(`"${clip.name}" ${tr('editorClipAdded')}`, 'success')
        setSelectedClipId(clip.id)
        setSelectedTrackId(trackId)
      }
    } catch (e) {
      console.error('Erreur ajout fichier:', e)
      addToast('Erreur lors de l\'import du fichier', 'error')
    }
  }

  const handleRemoveClip = async (trackId, clipId) => {
    await store.removeClip(trackId, clipId)
    if (selectedClipId === clipId) {
      setSelectedClipId(null)
    }
    addToast(tr('editorClipRemoved'), 'info')
  }

  const handleClipSelect = (clipId, trackId) => {
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId)
  }

  const handleRenameProject = async (newName) => {
    try {
      await store.updateEditorProjectName?.(newName)
      addToast(`Projet renommé en "${newName}"`, 'success')
    } catch (e) {
      console.error('Erreur renommage:', e)
    }
  }

  // ─── WAVEFORM DYNAMIQUE ──────────────────────────────────────────────────
  const handleWaveformUpdate = useCallback(async (clipId, filePath, offset, duration) => {
    try {
      const data = await generateWaveformData(filePath, 200, offset || 0, duration || null, false)
      if (data) {
        setWaveformData(prev => ({ ...prev, [clipId]: data }))
      }
    } catch (e) {
      console.warn('Erreur mise à jour waveform:', e)
    }
  }, [])

  // ─── COPIER/COLLER ────────────────────────────────────────────────────────
  const handleCopyClip = useCallback((clipId, trackId) => {
    const track = store.editorProject.tracks.find(t => t.id === trackId)
    if (!track) return
    
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return

    const { id, ...clipData } = clip
    setClipboard({
      clips: [{ ...clipData }],
      trackId: trackId,
      copiedAt: Date.now()
    })
    addToast(`"${clip.name}" ${tr('editorCopied')}`, 'info')
  }, [store.editorProject, tr, addToast])

  const handleCutClip = useCallback((clipId, trackId) => {
    handleCopyClip(clipId, trackId)
    handleRemoveClip(trackId, clipId)
    addToast(tr('editorCutAction'), 'info')
    setSelectedClipId(null)
  }, [handleCopyClip, handleRemoveClip, tr, addToast])

  const handlePasteClip = useCallback(async (targetTrackId) => {
    if (clipboard.clips.length === 0) {
      addToast(tr('editorClipboardEmpty'), 'info')
      return
    }

    if (Date.now() - (clipboard.copiedAt || 0) > 300000) {
      setClipboard({ clips: [], trackId: null, copiedAt: null })
      addToast(tr('editorClipboardExpired'), 'info')
      return
    }

    let trackId = targetTrackId || clipboard.trackId || selectedTrackId
    if (!trackId) {
      if (store.editorProject.tracks.length > 0) {
        trackId = store.editorProject.tracks[0].id
      } else {
        addToast(tr('editorNoTracks'), 'error')
        return
      }
    }

    const track = store.editorProject.tracks.find(t => t.id === trackId)
    let start = 0
    if (track && track.clips.length > 0) {
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
          start: start,
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

    // ✅ Utiliser commitEditorProject qui existe déjà
    try {
      await store.commitEditorProject(updatedProject, { skipHistory: true })
      await store.pushEditorHistoryCheckpoint()
      addToast(`${clipboard.clips.length} clip(s) ${tr('editorPasted')}`, 'success')
      setSelectedTrackId(trackId)
    } catch (e) {
      console.error('Erreur lors du collage:', e)
      addToast('Erreur lors du collage: ' + e.message, 'error')
    }
  }, [clipboard, selectedTrackId, store, clipDurations, tr, addToast])

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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipId, selectedTrackId, handleCopyClip, handleCutClip, handlePasteClip])

  // ─── LECTURE ──────────────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    allHowlsRef.current.forEach(item => {
      if (item.howl) {
        if (item.howl.playing()) item.howl.stop()
        item.howl.unload()
      }
    })
    allHowlsRef.current = []

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    startTimeRef.current = 0
    pausedTimeRef.current = 0
    isPlayingRef.current = false
  }, [])

  const pausePlayback = useCallback(() => {
    if (isPlayingRef.current) {
      allHowlsRef.current.forEach(item => {
        if (item.howl && item.howl.playing()) {
          item.howl.pause()
        }
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
      addToast(tr('editorNoTracks'), 'info')
      return
    }

    let hasClips = false
    project.tracks.forEach(track => {
      if (track.clips.length > 0) hasClips = true
    })

    if (!hasClips) {
      addToast(tr('editorNoClips'), 'info')
      return
    }

    stopPlayback()
    setIsPlaying(true)
    setIsPaused(false)
    isPlayingRef.current = true
    setCurrentTime(startAt)
    startTimeRef.current = Date.now() - startAt * 1000
    pausedTimeRef.current = 0

    const howls = []
    const masterVol = isMasterMuted ? 0 : masterVolume / 100

    project.tracks.forEach(track => {
      track.clips.forEach(clip => {
        const fileUrl = clip.path.startsWith('file://') 
          ? clip.path 
          : 'file:///' + clip.path.replace(/\\/g, '/')

        const clipDuration = clipDurations[clip.id] || clip.duration || 3

        let volume = 1.0
        let speed = 1.0

        clip.effects?.forEach(effect => {
          if (effect.enabled) {
            switch (effect.type) {
              case 'volume':
                volume = effect.params.value || 1.0
                break
              case 'speed':
                speed = effect.params.value || 1.0
                break
            }
          }
        })

        const howl = new Howl({
          src: [fileUrl],
          volume: volume * (store.volume / 100) * masterVol,
          rate: speed,
          html5: true,
          onloaderror: (id, err) => {
            console.error('Erreur lecture clip:', clip.name, err)
          }
        })

        howls.push({
          howl,
          clip,
          startOffset: clip.start,
          started: false,
          duration: clipDuration
        })
      })
    })

    allHowlsRef.current = howls

    const startClipsAtTime = (time) => {
      howls.forEach(item => {
        if (!item.started && time >= item.startOffset) {
          try {
            item.howl.play()
            const sourceOffset = item.clip.offset || 0
            const seekTime = Math.min(time - item.startOffset, item.duration) + sourceOffset
            if (seekTime > 0) {
              item.howl.seek(seekTime)
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
  }, [store.editorProject, store.volume, totalDuration, clipDurations, addToast, tr, stopPlayback, masterVolume, isMasterMuted])

  const resumePlayback = useCallback(() => {
    if (isPaused) {
      playAllClipsRef.current?.(pausedTimeRef.current)
    }
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
        if (item.howl && item.howl.playing()) {
          const clipStart = item.clip.start
          const clipDuration = clipDurations[item.clip.id] || item.clip.duration || 3
          const sourceOffset = item.clip.offset || 0
          const seekInClip = Math.max(0, Math.min(clampedTime - clipStart, clipDuration)) + sourceOffset
          if (seekInClip >= 0 && seekInClip <= clipDuration + sourceOffset) {
            try {
              item.howl.seek(seekInClip)
            } catch (e) {}
          }
        }
      })
    }
    
    if (isPaused) {
      pausedTimeRef.current = clampedTime
    }
  }, [totalDuration, isPlaying, isPaused, clipDurations])

  // ─── SPLIT ─────────────────────────────────────────────────────────────────
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
      addToast(tr('editorSplitNoClipHere'), 'info')
      return
    }
    
    const newClip = await store.splitClip(target.trackId, target.clip.id, currentTime, clipDurations[target.clip.id])
    
    if (newClip) {
      const updatedClipDurations = { ...clipDurations }
      updatedClipDurations[target.clip.id] = currentTime - target.clip.start
      setClipDurations(updatedClipDurations)
      
      // ✅ Régénérer le waveform du nouveau clip
      try {
        const sliceDuration = updatedClipDurations[newClip.id] || newClip.duration || null
        const data = await generateWaveformData(newClip.path, 200, newClip.offset || 0, sliceDuration, false)
        if (data) {
          setWaveformData(prev => ({ ...prev, [newClip.id]: data }))
        }
      } catch (e) {
        console.warn('Erreur génération waveform:', e)
      }
      
      setSelectedTrackId(target.trackId)
      setSelectedClipId(newClip.id)
      addToast(tr('editorClipSplit'), 'success')
    } else {
      addToast(tr('editorSplitOutOfRange'), 'info')
    }
  }, [getClipUnderPlayhead, currentTime, clipDurations, store, addToast, tr])

  // ─── SPLIT ET SÉPARER ─────────────────────────────────────────────────────
  const handleSplitAndScatter = useCallback(async () => {
    const target = getClipUnderPlayhead()
    if (!target) return

    const newClip = await store.splitClip(target.trackId, target.clip.id, currentTime, clipDurations[target.clip.id])
    
    if (newClip) {
      await store.addTrack()
      const newTrackId = store.editorProject.tracks[store.editorProject.tracks.length - 1].id
      
      await store.moveClip(target.trackId, newClip.id, 0, newTrackId, { skipHistory: true })
      
      const updatedClipDurations = { ...clipDurations }
      updatedClipDurations[target.clip.id] = currentTime - target.clip.start
      setClipDurations(updatedClipDurations)
      
      // Régénérer le waveform du nouveau clip
      try {
        const data = await generateWaveformData(newClip.path, 200, newClip.offset || 0, null, false)
        if (data) {
          setWaveformData(prev => ({ ...prev, [newClip.id]: data }))
        }
      } catch (e) {}
      
      setSelectedTrackId(newTrackId)
      setSelectedClipId(newClip.id)
      addToast('Clip séparé et déplacé vers une nouvelle piste', 'success')
    }
  }, [getClipUnderPlayhead, currentTime, clipDurations, store, addToast])

  // ─── ROGNER UN SON ────────────────────────────────────────────────────────
  const handleTrimClip = useCallback(async (clipId, start, end) => {
    const clip = store.editorProject.tracks
      .flatMap(t => t.clips)
      .find(c => c.id === clipId)
    
    if (!clip) return

    try {
      const result = await window.electronAPI.trimSoundFile(clip.path, start, end)
      
      if (result.success) {
        await store.updateClipWithPath(clipId, result.path)
        addToast(`"${clip.name}" rogné avec succès`, 'success')
        
        // Régénérer le waveform
        const data = await generateWaveformData(result.path, 200, 0, end - start, false)
        if (data) {
          setWaveformData(prev => ({ ...prev, [clipId]: data }))
        }
      } else {
        addToast('Erreur lors du rognage', 'error')
      }
    } catch (e) {
      console.error('Erreur rognage:', e)
      addToast('Erreur lors du rognage', 'error')
    }
  }, [store, addToast])

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
          addToast(`"${clip.name}" ${tr('editorNormalized')} (gain: ${result.gain.toFixed(2)})`, 'success')
          // Régénérer le waveform après normalisation
          const data = await generateWaveformData(result.newPath || clip.path, 200, 0, null, false)
          if (data) {
            setWaveformData(prev => ({ ...prev, [clipId]: data }))
          }
        } else {
          addToast(`"${clip.name}" ${tr('editorAlreadyNormalized')}`, 'info')
        }
      } else {
        addToast(tr('editorNormalizeError'), 'error')
      }
    } catch (e) {
      console.error('Erreur normalisation:', e)
      addToast(tr('editorNormalizeError'), 'error')
    } finally {
      setIsNormalizing(false)
    }
  }, [store, tr, addToast])

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
      addToast(tr('editorNoClipsToNormalize'), 'info')
      return
    }
    
    setIsNormalizing(true)
    try {
      const results = await normalizeAll(clips, targetPeak, store)
      const normalized = results.filter(r => r.normalized)
      if (normalized.length > 0) {
        addToast(`${normalized.length} ${tr('editorClipsNormalized')}`, 'success')
      } else {
        addToast(tr('editorAlreadyNormalized'), 'info')
      }
    } catch (e) {
      console.error('Erreur normalisation:', e)
      addToast(tr('editorNormalizeError'), 'error')
    } finally {
      setIsNormalizing(false)
    }
  }, [store, selectedClipId, selectedTrackId, tr, addToast])

  // ─── MARQUEURS ────────────────────────────────────────────────────────────
  const handleAddMarker = useCallback((marker) => {
    setMarkers(prev => [...prev, marker])
    store.saveEditorMarkers?.([...markers, marker])
  }, [markers])

  const handleRemoveMarker = useCallback((markerId) => {
    const newMarkers = markers.filter(m => m.id !== markerId)
    setMarkers(newMarkers)
    store.saveEditorMarkers?.(newMarkers)
  }, [markers])

  const handleMarkersChange = useCallback((updatedMarkers) => {
    setMarkers(updatedMarkers)
    store.saveEditorMarkers?.(updatedMarkers)
  }, [store])

  // ─── MÉTRONOME ────────────────────────────────────────────────────────────
  const handleMetronomeToggle = useCallback((enabled) => {
    setMetronomeEnabled(enabled)
  }, [])

  const handleMetronomeBpmChange = useCallback((bpm) => {
    setMetronomeBpm(bpm)
  }, [])

  // ─── EXPORT RÉEL ──────────────────────────────────────────────────────────
  const handleExportClick = () => {
    const project = store.editorProject
    if (!project || project.tracks.length === 0 || project.tracks.every(t => t.clips.length === 0)) {
      addToast(tr('editorNothingToExport'), 'info')
      return
    }
    setExportName(project.name || 'Mon mix')
    setExportEmoji('🔊')
    setExportProfiles(['all'])
    setExportFormat('mp3')
    setExportBitrate(192)
    setShowExportModal(true)
  }

  const handleExportConfirm = async () => {
    if (!exportName.trim()) {
      addToast(tr('editorExportNameRequired'), 'error')
      return
    }

    if (exportAddToLibrary && exportProfiles.length === 0) {
      addToast(tr('editorExportProfileRequired'), 'error')
      return
    }

    setIsExporting(true)
    setShowExportModal(false)

    try {
      addToast('🎛️ Mixage en cours...', 'info')
      
      const project = store.editorProject
      const buffer = await mixdownProject(
        project,
        clipDurations,
        44100,
        (progress) => {
          console.log(`Mixage: ${Math.round(progress * 100)}%`)
        }
      )

      if (!buffer) {
        throw new Error('Erreur lors du mixage')
      }

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
        (progress) => {
          console.log(`Export: ${Math.round(progress * 100)}%`)
        }
      )

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'export')
      }

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
        addToast(`"${exportName.trim()}" exporté avec succès ! ${sizeStr}`, 'success')
      } else {
        addToast(`Fichier exporté : ${fileName}`, 'success')
      }

    } catch (e) {
      console.error('Export error:', e)
      addToast(tr('editorExportError') + ': ' + e.message, 'error')
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

  const handlePickImage = async () => {
    const imgPath = await window.electronAPI.openImageDialog()
    if (imgPath) {
      const result = await window.electronAPI.importImageFile(imgPath)
      if (result.success) {
        setExportImage(result.path)
        addToast(tr('editorExportImageAdded'), 'success')
      }
    }
  }

  // ─── MASTER VOLUME ────────────────────────────────────────────────────────
  const handleMasterVolumeChange = useCallback((newVolume) => {
    setMasterVolume(newVolume)
  }, [])

  const handleMasterMuteToggle = useCallback(() => {
    setIsMasterMuted(prev => !prev)
  }, [])

  // ─── FORMATAGE ────────────────────────────────────────────────────────────
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ─── RENDU ─────────────────────────────────────────────────────────────────
  const selectedClip = selectedClipId 
    ? store.editorProject.tracks
        .flatMap(t => t.clips)
        .find(c => c.id === selectedClipId)
    : null

  const project = store.editorProject

  if (!project || !project.id) {
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
        <span>{tr('editorLoading')}</span>
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
        lang={lang}
        tr={tr}
        isLoading={isLoading}
        isExporting={isExporting}
        onUndo={store.undoEditor}
        onRedo={store.redoEditor}
        canUndo={store.canUndoEditor}
        canRedo={store.canRedoEditor}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(prev => !prev)}
        onSplit={handleSplit}
        canSplit={!!getClipUnderPlayhead()}
        loopEnabled={store.editorLoopRegion.enabled}
        onToggleLoop={() => {
          const loop = store.editorLoopRegion
          if (loop.end <= loop.start) {
            addToast(tr('editorLoopNoRegion'), 'info')
            return
          }
          store.toggleEditorLoop()
        }}
        projectName={project?.name || 'Nouveau projet'}
        onRenameProject={handleRenameProject}
        isPreviewingEffect={isPreviewingEffect}
        autoPlayOnClick={autoPlayOnClick}
        onToggleAutoPlay={() => setAutoPlayOnClick(prev => !prev)}
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
          onClipUpdate={(trackId, clipId, updates) => store.updateClip(trackId, clipId, updates, { skipHistory: true })}
          onClipRemove={handleRemoveClip}
          onClipDuplicate={store.duplicateClip}
          onClipFade={(trackId, clipId, edge, duration) => store.setClipFade(trackId, clipId, edge, duration)}
          onClipCopy={handleCopyClip}
          onClipCut={handleCutClip}
          onClipPaste={handlePasteClip}
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
          markers={markers}
          onAddMarker={handleAddMarker}
          onRemoveMarker={handleRemoveMarker}
          onMarkersChange={handleMarkersChange}
          metronomeEnabled={metronomeEnabled}
          metronomeBpm={metronomeBpm}
          onMetronomeToggle={handleMetronomeToggle}
          onMetronomeBpmChange={handleMetronomeBpmChange}
          onWaveformUpdate={handleWaveformUpdate}
          autoPlayOnClick={autoPlayOnClick}
          lang={lang}
          tr={tr}
        />
      </div>

      {/* Panneau d'effets */}
      {selectedClip && (
        <EditorEffectsPanel
          clip={selectedClip}
          trackId={selectedTrackId}
          onEffectAdd={store.addEffectToClip}
          onEffectRemove={store.removeEffectFromClip}
          onEffectUpdate={store.updateEffectParam}
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
          onNormalize={handleNormalizeClip}
          onTrim={handleTrimClip}
          lang={lang}
          tr={tr}
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
        <EditorNormalize
          clip={selectedClip}
          onNormalize={handleNormalizeClip}
          onNormalizeAll={handleNormalizeAll}
          isNormalizing={isNormalizing}
          tr={tr}
        />

        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

        <EditorMasterVolume
          volume={isMasterMuted ? 0 : masterVolume}
          onVolumeChange={handleMasterVolumeChange}
          isMuted={isMasterMuted}
          onMuteToggle={handleMasterMuteToggle}
          peakMeter={peakMeter}
          tr={tr}
        />

        <div style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          display: 'flex',
          gap: 12,
          alignItems: 'center'
        }}>
          <span>
            {tr('editorClips') || 'Clips'}: {store.editorProject.tracks.flatMap(t => t.clips).length}
          </span>
          <span>
            {tr('editorTracks') || 'Pistes'}: {store.editorProject.tracks.length}
          </span>
          <span>
            {tr('editorDuration') || 'Durée'}: {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      {/* Modal d'export */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" style={{ width: 460, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <i className="ti ti-package-export" style={{ color: 'var(--accent)' }} />
              {tr('editorExportTitle')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {tr('soundName')} *
                </label>
                <input
                  value={exportName}
                  onChange={e => setExportName(e.target.value)}
                  placeholder={tr('editorExportNamePlaceholder')}
                  className="input-lg"
                  style={{ fontSize: 13, borderRadius: 'var(--radius-md)' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {tr('image')}
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
                    <i className="ti ti-photo" /> {exportImage ? tr('editorImageChange') : tr('editorImageChoose')}
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
                  {tr('editorEmojiLabel')}
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
                    {tr('editorExportFormat') || 'Format'}
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
                    {tr('editorExportQuality') || 'Qualité'}
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
                  {tr('editorAddToLibrary')}
                </label>
              </div>

              {exportAddToLibrary && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                    {tr('editorProfilesLabel')} *
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
                        {p.id === 'all' ? tr('allSounds') : p.name}
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
                {tr('editorExportNote')}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary btn-lg"
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                {tr('cancel')}
              </button>
              <button
                className="btn-primary btn-lg"
                onClick={handleExportConfirm}
                disabled={isExporting || !exportName.trim() || (exportAddToLibrary && exportProfiles.length === 0)}
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                {isExporting ? (
                  <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('editorExporting')}</>
                ) : (
                  <><i className="ti ti-check" /> {tr('editorExport')}</>
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
          <span>{tr('editorLoading')}</span>
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