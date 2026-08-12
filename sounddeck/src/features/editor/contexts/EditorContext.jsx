// src/features/editor/contexts/EditorContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

const EditorContext = createContext(null)

export function EditorProvider({ children, store, addToast }) {
  const { t } = useLanguage()
  
  // ─── ÉTATS ──────────────────────────────────────────────────────────────
  const [project, setProject] = useState(null)
  const [selectedClipId, setSelectedClipId] = useState(null)
  const [selectedTrackId, setSelectedTrackId] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [loopRegion, setLoopRegion] = useState({ enabled: false, start: 0, end: 10 })
  const [autoCrossfade, setAutoCrossfade] = useState(true)
  const [clipDurations, setClipDurations] = useState({})
  const [waveformData, setWaveformData] = useState({})
  const [isDurationsLoaded, setIsDurationsLoaded] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [totalDuration, setTotalDuration] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [stopAtTime, setStopAtTime] = useState(null)
  
  // ✅ État pour le solo de lecture (indépendant de la sélection)
  const [soloPlayClipId, setSoloPlayClipId] = useState(null)
  
  // ─── REFS ──────────────────────────────────────────────────────────────
  const isLoadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const audioContextRef = useRef(null)
  const audioSourcesRef = useRef({})
  const animationRef = useRef(null)
  const projectRef = useRef(null)
  const lastPlayedClipsRef = useRef(new Set())
  const currentTimeRef = useRef(0)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const selectedClipIdRef = useRef(null)
  const stopAtTimeRef = useRef(null)
  const soloPlayClipIdRef = useRef(null)

  // Mettre à jour les refs quand les états changent
  useEffect(() => {
    projectRef.current = project
  }, [project])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    selectedClipIdRef.current = selectedClipId
  }, [selectedClipId])

  useEffect(() => {
    stopAtTimeRef.current = stopAtTime
  }, [stopAtTime])

  useEffect(() => {
    soloPlayClipIdRef.current = soloPlayClipId
  }, [soloPlayClipId])

  // ─── FONCTIONS HELPER ──────────────────────────────────────────────

  const findPreviousClip = useCallback((clip, track) => {
    if (!track || !track.clips) return null
    const previous = track.clips
      .filter(c => c.id !== clip.id && c.start < clip.start)
      .sort((a, b) => b.start - a.start)[0]
    return previous || null
  }, [])

  const calculateOverlap = useCallback((clipA, clipB) => {
    const endA = clipA.start + (clipDurations[clipA.id] || clipA.duration || 3)
    const startB = clipB.start
    return Math.max(0, endA - startB)
  }, [clipDurations])

  const getAudioDuration = useCallback(async (filePath) => {
    try {
      const fileUrl = filePath.startsWith('file://') 
        ? filePath 
        : 'file:///' + filePath.replace(/\\/g, '/')
      
      const response = await fetch(fileUrl)
      if (!response.ok) return 3
      
      const arrayBuffer = await response.arrayBuffer()
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const duration = audioBuffer.duration
      await audioContext.close()
      return duration
    } catch (e) {
      return 3
    }
  }, [])

  // ─── CHARGEMENT DU PROJET ──────────────────────────────────────────────

  const loadProject = useCallback(async (projectData) => {
    if (!projectData) {
      setIsInitialized(true)
      return
    }

    if (project?.id === projectData.id && project?.tracks?.length === projectData.tracks?.length) {
      setIsInitialized(true)
      return
    }

    setProject(projectData)
    projectRef.current = projectData
    setSelectedClipId(null)
    setSelectedTrackId(null)
    setCurrentTime(0)
    setIsPlaying(false)
    setIsPaused(false)
    setIsDurationsLoaded(false)
    setIsInitialized(true)
    setSoloPlayClipId(null)
    
    let maxDuration = 10
    if (projectData.tracks) {
      for (const track of projectData.tracks) {
        for (const clip of track.clips) {
          const duration = clip.duration || 3
          const end = (clip.start || 0) + duration
          if (end > maxDuration) maxDuration = end
        }
      }
      setTotalDuration(Math.max(maxDuration + 2, 10))
    }
    
    if (projectData.tracks) {
      const durations = {}
      for (const track of projectData.tracks) {
        for (const clip of track.clips) {
          if (clip.id) {
            durations[clip.id] = clip.duration || 3
          }
        }
      }
      setClipDurations(durations)
      setIsDurationsLoaded(true)
    }
  }, [project])

  // ─── INITIALISATION ──────────────────────────────────────────────────────

  useEffect(() => {
    if (initialLoadDoneRef.current || isLoadingRef.current) return
    
    isLoadingRef.current = true
    
    const init = async () => {
      try {
        const editorProject = store?.editorProject
        
        if (editorProject) {
          await loadProject(editorProject)
        } else {
          const newProject = await store?.createEditorProject?.('Nouveau projet')
          if (newProject) {
            await loadProject(newProject)
          } else {
            const fallbackProject = {
              id: `project-${Date.now()}`,
              name: 'Nouveau projet',
              tracks: [],
              duration: 60,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
            setProject(fallbackProject)
            projectRef.current = fallbackProject
            setTotalDuration(10)
            setIsInitialized(true)
          }
        }
      } catch (e) {
        const fallbackProject = {
          id: `project-${Date.now()}`,
          name: 'Nouveau projet',
          tracks: [],
          duration: 60,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        setProject(fallbackProject)
        projectRef.current = fallbackProject
        setTotalDuration(10)
        setIsInitialized(true)
      } finally {
        isLoadingRef.current = false
        initialLoadDoneRef.current = true
      }
    }
    
    init()
  }, [store, loadProject])

  // ─── FONCTIONS PLAYBACK ──────────────────────────────────────────────
  
  const loadAudioBuffer = useCallback(async (filePath) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      
      const fileUrl = filePath.startsWith('file://') 
        ? filePath 
        : 'file:///' + filePath.replace(/\\/g, '/')
      
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      return audioBuffer
    } catch (e) {
      return null
    }
  }, [])

  const playClip = useCallback(async (clip, track) => {
    if (!clip?.path) return
    
    try {
      const buffer = await loadAudioBuffer(clip.path)
      if (!buffer) return
      
      const ctx = audioContextRef.current
      if (!ctx) return
      
      let sourceBuffer = buffer
      
      if (clip.effects && clip.effects.length > 0) {
        const activeEffects = clip.effects.filter(e => e.enabled)
        if (activeEffects.length > 0) {
          try {
            const { applyEffectsToBuffer } = await import('@shared/utils/realTimeEffects')
            const processedBuffer = applyEffectsToBuffer(buffer, clip.effects, ctx.sampleRate, true)
            if (processedBuffer) {
              sourceBuffer = processedBuffer
            }
          } catch (e) {}
        }
      }
      
      const source = ctx.createBufferSource()
      source.buffer = sourceBuffer
      
      const gainNode = ctx.createGain()
      const trackVolume = track?.volume || 1
      gainNode.gain.value = trackVolume
      
      if (autoCrossfade) {
        const previousClip = findPreviousClip(clip, track)
        if (previousClip) {
          const overlap = calculateOverlap(previousClip, clip)
          if (overlap > 0.01) {
            const fadeDuration = Math.min(overlap, 0.1)
            const now = ctx.currentTime
            
            const prevEntry = audioSourcesRef.current[previousClip.id]
            if (prevEntry) {
              const prevGain = prevEntry.gainNode
              const currentGain = prevGain.gain.value
              prevGain.gain.setValueAtTime(currentGain, now)
              prevGain.gain.linearRampToValueAtTime(0, now + fadeDuration)
            }
            
            gainNode.gain.setValueAtTime(0, now)
            gainNode.gain.linearRampToValueAtTime(trackVolume, now + fadeDuration)
          }
        }
      }
      
      source.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      const offset = Math.max(0, currentTime - (clip.start || 0))
      const startTime = Math.min(offset, sourceBuffer.duration - 0.01)
      
      source.start(0, startTime)
      audioSourcesRef.current[clip.id] = { source, gainNode }
      
      source.onended = () => {
        delete audioSourcesRef.current[clip.id]
      }
      
    } catch (e) {}
  }, [loadAudioBuffer, currentTime, autoCrossfade, findPreviousClip, calculateOverlap])

  const startPlaybackLoop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    let lastTime = performance.now()
    let accumulated = 0
    let isLoopRunning = true

    const loop = () => {
      if (!isPlayingRef.current || isPausedRef.current) {
        if (isLoopRunning) {
          animationRef.current = requestAnimationFrame(loop)
        }
        return
      }

      const now = performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now
      accumulated += delta

      if (accumulated >= 0.016) {
        const newTime = currentTimeRef.current + accumulated
        accumulated = 0
        
        if (projectRef.current?.tracks) {
          const tracks = projectRef.current.tracks
          const activeClips = new Set()
          const soloClipId = soloPlayClipIdRef.current
          
          for (const track of tracks) {
            if (track.muted) continue
            
            for (const clip of track.clips) {
              const duration = clipDurations[clip.id] || clip.duration || 3
              const start = clip.start || 0
              const end = start + duration
              
              let shouldPlay = false
              
              if (soloClipId) {
                if (clip.id === soloClipId && newTime >= start && newTime < end) {
                  shouldPlay = true
                }
              } else if (newTime >= start && newTime < end) {
                shouldPlay = true
              }
              
              if (shouldPlay) {
                activeClips.add(clip.id)
                if (!lastPlayedClipsRef.current.has(clip.id)) {
                  playClip(clip, track)
                  lastPlayedClipsRef.current.add(clip.id)
                }
              } else if (newTime >= end || (soloClipId && clip.id !== soloClipId)) {
                lastPlayedClipsRef.current.delete(clip.id)
              }
            }
          }
          
          for (const clipId of lastPlayedClipsRef.current) {
            if (!activeClips.has(clipId)) {
              const entry = audioSourcesRef.current[clipId]
              if (entry) {
                try { 
                  entry.source.stop() 
                  entry.source.disconnect() 
                } catch (e) {}
                delete audioSourcesRef.current[clipId]
              }
              lastPlayedClipsRef.current.delete(clipId)
            }
          }
        }
        
        const shouldStop = (stopAtTimeRef.current !== null && newTime >= stopAtTimeRef.current) || newTime >= totalDuration
        
        if (shouldStop) {
          const stopPosition = stopAtTimeRef.current !== null ? stopAtTimeRef.current : totalDuration
          setIsPlaying(false)
          setCurrentTime(stopPosition)
          setStopAtTime(null)
          stopAtTimeRef.current = null
          setSoloPlayClipId(null)
          soloPlayClipIdRef.current = null
          for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
            try { source.stop() } catch (e) {}
          }
          audioSourcesRef.current = {}
          lastPlayedClipsRef.current = new Set()
          isLoopRunning = false
          return
        }
        
        setCurrentTime(newTime)
      }
      
      if (isLoopRunning) {
        animationRef.current = requestAnimationFrame(loop)
      }
    }
    
    lastTime = performance.now()
    accumulated = 0
    isLoopRunning = true
    
    lastPlayedClipsRef.current = new Set()
    for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
      try { source.stop() } catch (e) {}
    }
    audioSourcesRef.current = {}
    
    animationRef.current = requestAnimationFrame(loop)
  }, [totalDuration, playClip, clipDurations])

  // ─── PLAYBACK CONTROLS ──────────────────────────────────────────────

  const play = useCallback(async () => {
    setStopAtTime(null)
    stopAtTimeRef.current = null
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      
      setIsPlaying(true)
      setIsPaused(false)
      lastPlayedClipsRef.current = new Set()
      
      setTimeout(() => {
        startPlaybackLoop()
      }, 50)
      
    } catch (e) {
      setIsPlaying(false)
    }
  }, [startPlaybackLoop])

  const playClipOnly = useCallback(async (clip, trackId) => {
    setSoloPlayClipId(clip.id)
    soloPlayClipIdRef.current = clip.id
    
    const clipStart = clip.start || 0
    const clipDuration = clipDurations[clip.id] || clip.duration || 3
    const clipEnd = clipStart + clipDuration
    
    setCurrentTime(clipStart)
    currentTimeRef.current = clipStart
    
    setStopAtTime(clipEnd)
    stopAtTimeRef.current = clipEnd
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      
      setIsPlaying(true)
      setIsPaused(false)
      lastPlayedClipsRef.current = new Set()
      
      setTimeout(() => {
        startPlaybackLoop()
      }, 50)
      
    } catch (e) {
      setIsPlaying(false)
      setSoloPlayClipId(null)
      soloPlayClipIdRef.current = null
    }
  }, [clipDurations, startPlaybackLoop])

  const resume = useCallback(async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    
    setIsPaused(false)
    setIsPlaying(true)
    
    setTimeout(() => {
      startPlaybackLoop()
    }, 50)
  }, [startPlaybackLoop])

  const pause = useCallback(() => {
    setIsPaused(true)
    setIsPlaying(false)
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend().catch(() => {})
    }
    
    for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
      try { source.stop() } catch (e) {}
    }
    audioSourcesRef.current = {}
  }, [])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    lastPlayedClipsRef.current = new Set()
    setStopAtTime(null)
    stopAtTimeRef.current = null
    
    setSoloPlayClipId(null)
    soloPlayClipIdRef.current = null
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
      try { source.stop() } catch (e) {}
    }
    audioSourcesRef.current = {}
  }, [])

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(time, totalDuration))
    setCurrentTime(clamped)
    currentTimeRef.current = clamped
    
    for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
      try { 
        source.stop() 
        source.disconnect() 
      } catch (e) {}
    }
    audioSourcesRef.current = {}
    lastPlayedClipsRef.current = new Set()
  }, [totalDuration])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else if (isPaused) {
      resume()
    } else {
      setSoloPlayClipId(null)
      soloPlayClipIdRef.current = null
      play()
    }
  }, [isPlaying, isPaused, play, pause, resume])

  // ─── FONCTIONS TRACK ──────────────────────────────────────────────────

  const addTrack = useCallback(async (name, color) => {
    try {
      let currentProject = project || projectRef.current
      
      if (!currentProject) {
        const newProject = {
          id: `project-${Date.now()}`,
          name: 'Nouveau projet',
          tracks: [],
          duration: 60,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        setProject(newProject)
        projectRef.current = newProject
        currentProject = newProject
      }
      
      const trackIndex = currentProject.tracks?.length || 0
      const trackName = name || `Piste ${trackIndex + 1}`
      const trackColor = color || `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 50%)`
      
      const newTrack = {
        id: `track-${Date.now()}`,
        name: trackName,
        color: trackColor,
        clips: [],
        volume: 1,
        muted: false,
        solo: false,
        effects: []
      }
      
      const updatedProject = {
        ...currentProject,
        tracks: [...(currentProject.tracks || []), newTrack],
        updatedAt: Date.now()
      }
      
      setProject(updatedProject)
      projectRef.current = updatedProject
      
      if (store?.updateEditorProject) {
        await store.updateEditorProject(updatedProject)
      }
      
      const durations = {}
      for (const track of updatedProject.tracks) {
        for (const clip of track.clips) {
          if (clip.id) {
            durations[clip.id] = clip.duration || 3
          }
        }
      }
      setClipDurations(durations)
      
      setIsDirty(true)
      addToast?.(`${trackName} ajoutée`, 'success')
      return newTrack
      
    } catch (e) {
      addToast?.('Erreur lors de l\'ajout de la piste: ' + e.message, 'error')
      return null
    }
  }, [project, addToast, store])

  const removeTrack = useCallback(async (trackId) => {
    if (!project) {
      addToast?.('Aucun projet', 'error')
      return
    }
    
    const trackToRemove = project.tracks.find(t => t.id === trackId)
    if (!trackToRemove) {
      addToast?.('Piste non trouvée', 'error')
      return
    }
    
    if (project.tracks.length <= 1) {
      addToast?.('Impossible de supprimer la dernière piste', 'warning')
      return
    }
    
    if (trackToRemove.clips.length > 0) {
      const confirmed = window.confirm(
        `La piste "${trackToRemove.name}" contient ${trackToRemove.clips.length} clip(s). Voulez-vous vraiment la supprimer ?`
      )
      if (!confirmed) return
    }
    
    const updatedTracks = project.tracks.filter(track => track.id !== trackId)
    
    const updatedProject = {
      ...project,
      tracks: updatedTracks,
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    const durations = { ...clipDurations }
    for (const clip of trackToRemove.clips) {
      delete durations[clip.id]
    }
    setClipDurations(durations)
    
    setIsDirty(true)
    addToast?.(`Piste "${trackToRemove.name}" supprimée`, 'info')
    
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null)
      setSelectedClipId(null)
    }
  }, [project, addToast, store, clipDurations, selectedTrackId])

  const renameTrack = useCallback(async (trackId, newName) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, name: newName }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  const muteTrack = useCallback((trackId, muted) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, muted }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  const soloTrack = useCallback((trackId, solo) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, solo }
        } else if (solo) {
          return { ...track, muted: true, solo: false }
        } else {
          return { ...track, solo: false }
        }
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  const setTrackVolume = useCallback((trackId, volume) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, volume }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  // ─── FONCTIONS CLIP ──────────────────────────────────────────────────

  const addClip = useCallback(async (trackId, soundId, startPosition = null) => {
    if (!store) {
      addToast?.('Store non disponible', 'error')
      return null
    }
    
    const sound = store.sounds?.find(s => s.id === soundId)
    if (!sound) {
      addToast?.('Son non trouvé', 'error')
      return null
    }

    try {
      const clip = await store.addClipToTrack?.(trackId, soundId, startPosition)
      
      if (clip && project) {
        const updatedProject = {
          ...project,
          tracks: project.tracks.map(track => {
            if (track.id === trackId) {
              return {
                ...track,
                clips: [...track.clips, clip]
              }
            }
            return track
          }),
          updatedAt: Date.now()
        }
        setProject(updatedProject)
        projectRef.current = updatedProject
        
        if (clip.duration) {
          setClipDurations(prev => ({
            ...prev,
            [clip.id]: clip.duration
          }))
        }
        
        if (store?.updateEditorProject) {
          await store.updateEditorProject(updatedProject)
        }
        
        setIsDirty(true)
        addToast?.(`"${sound.name}" ajouté`, 'success')
        setSelectedClipId(clip.id)
        setSelectedTrackId(trackId)
        return clip
      } else {
        addToast?.('Erreur lors de l\'ajout du clip', 'error')
        return null
      }
    } catch (e) {
      addToast?.(e.message || 'Erreur lors de l\'ajout du clip', 'error')
      return null
    }
  }, [store, project, addToast])

  const addClipFromFile = useCallback(async (trackId, filePath, startPosition = null) => {
    if (!filePath) {
      addToast?.('Aucun fichier sélectionné', 'error')
      return null
    }

    try {
      const track = project?.tracks?.find(t => t.id === trackId)
      if (!track) {
        addToast?.('Piste non trouvée', 'error')
        return null
      }

      const importResult = await window.electronAPI.importSoundFile(filePath)
      if (!importResult?.success) {
        addToast?.('Erreur lors de l\'import du fichier', 'error')
        return null
      }

      const fileName = filePath.split(/[\\/]/).pop() || 'Fichier audio'
      const actualDuration = await getAudioDuration(importResult.path)
      
      let actualStart = startPosition
      if (actualStart === null || actualStart === undefined) {
        if (track.clips.length > 0) {
          const lastClip = track.clips.reduce((max, clip) => {
            const clipEnd = clip.start + (clip.duration || 3)
            return clipEnd > max.end ? { start: clip.start, end: clipEnd } : max
          }, { start: 0, end: 0 })
          actualStart = lastClip.end + 0.5
        } else {
          actualStart = 0
        }
      }

      const newClip = {
        id: `clip-${Date.now()}`,
        soundId: null,
        name: fileName,
        path: importResult.path,
        start: actualStart,
        duration: actualDuration,
        offset: 0,
        volume: 0,
        volumeDb: 0,
        effects: [],
        fadeIn: 0,
        fadeOut: 0,
        pitch: 0,
        speed: 1,
        isExternal: true
      }

      const updatedProject = {
        ...project,
        tracks: project.tracks.map(t => {
          if (t.id === trackId) {
            const clips = [...t.clips, newClip]
            clips.sort((a, b) => a.start - b.start)
            return { ...t, clips }
          }
          return t
        }),
        updatedAt: Date.now()
      }

      setProject(updatedProject)
      projectRef.current = updatedProject
      
      setClipDurations(prev => ({
        ...prev,
        [newClip.id]: actualDuration
      }))
      
      if (store?.updateEditorProject) {
        await store.updateEditorProject(updatedProject)
      }
      
      setIsDirty(true)
      addToast?.(`"${fileName}" ${t('editorFileImported')}`, 'success')
      setSelectedClipId(newClip.id)
      setSelectedTrackId(trackId)
      
      return newClip
      
    } catch (e) {
      addToast?.(e.message || 'Erreur lors de l\'import du fichier', 'error')
      return null
    }
  }, [project, addToast, store, t, getAudioDuration])

  const removeClip = useCallback((trackId, clipId) => {
    if (!project) return
    
    const track = project.tracks.find(t => t.id === trackId)
    if (!track) return
    
    const clipExists = track.clips.some(c => c.id === clipId)
    if (!clipExists) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            clips: t.clips.filter(c => c.id !== clipId)
          }
        }
        return t
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    setClipDurations(prev => {
      const newDurations = { ...prev }
      delete newDurations[clipId]
      return newDurations
    })
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    if (selectedClipId === clipId) {
      setSelectedClipId(null)
      setSelectedTrackId(null)
    }
    
    setIsDirty(true)
    addToast?.('Clip supprimé', 'info')
  }, [project, selectedClipId, addToast, store])

  const updateClip = useCallback((trackId, clipId, updates) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id !== clipId) return clip
              return { ...clip, ...updates }
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  const duplicateClip = useCallback((trackId, clipId) => {
    if (!project) return null
    
    const track = project.tracks.find(t => t.id === trackId)
    if (!track) return null
    
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return null
    
    const duration = clipDurations[clip.id] || clip.duration || 3
    const newClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      start: (clip.start || 0) + duration + 0.5,
      effects: (clip.effects || []).map(e => ({ ...e, id: `effect-${Date.now()}-${e.id || Math.random().toString(36).slice(2, 6)}` }))
    }
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(t => {
        if (t.id === trackId) {
          const clips = [...t.clips, newClip]
          clips.sort((a, b) => a.start - b.start)
          return { ...t, clips }
        }
        return t
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    setClipDurations(prev => ({
      ...prev,
      [newClip.id]: newClip.duration || 3
    }))
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
    addToast?.('Clip dupliqué', 'success')
    return newClip
  }, [project, clipDurations, addToast, store])

  const moveClip = useCallback((trackId, clipId, newStart, newTrackId, options = {}) => {
    if (!project) return
    
    let sourceTrack = project.tracks.find(t => t.id === trackId)
    let clipToMove = sourceTrack?.clips.find(c => c.id === clipId)
    
    if (!clipToMove) {
      for (const track of project.tracks) {
        const clip = track.clips.find(c => c.id === clipId)
        if (clip) {
          clipToMove = clip
          sourceTrack = track
          break
        }
      }
    }
    
    if (!clipToMove) return
    
    const actualTrackId = sourceTrack?.id || trackId
    const targetTrackId = newTrackId || actualTrackId
    const clampedStart = Math.max(0, newStart)
    
    const updatedClip = { ...clipToMove, start: clampedStart }
    
    let finalTracks
    
    if (actualTrackId === targetTrackId) {
      finalTracks = project.tracks.map(track => {
        if (track.id === actualTrackId) {
          const clips = track.clips.map(c => 
            c.id === clipId ? updatedClip : c
          )
          clips.sort((a, b) => a.start - b.start)
          return { ...track, clips }
        }
        return track
      })
    } else {
      const tracksWithoutClip = project.tracks.map(track => {
        if (track.id === actualTrackId) {
          return { ...track, clips: track.clips.filter(c => c.id !== clipId) }
        }
        return track
      })
      
      finalTracks = tracksWithoutClip.map(track => {
        if (track.id === targetTrackId) {
          const clips = [...track.clips, updatedClip]
          clips.sort((a, b) => a.start - b.start)
          return { ...track, clips }
        }
        return track
      })
    }
    
    const updatedProject = {
      ...project,
      tracks: finalTracks,
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    setIsDirty(true)
    
    const newDurations = { ...clipDurations }
    if (updatedClip.duration) {
      newDurations[clipId] = updatedClip.duration
    }
    setClipDurations(newDurations)
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
  }, [project, store, clipDurations])

  // ─── FONCTIONS EFFETS ──────────────────────────────────────────────────

  const addEffectToClip = useCallback(async (trackId, clipId, effectType, params = {}) => {
    if (!project) return null
    
    const effect = {
      id: `effect-${Date.now()}`,
      type: effectType,
      params: params,
      enabled: true
    }
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: [...(clip.effects || []), effect]
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
    return effect
  }, [project, store])

  const removeEffectFromClip = useCallback(async (trackId, clipId, effectId) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: (clip.effects || []).filter(e => e.id !== effectId)
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  const updateEffectParam = useCallback(async (trackId, clipId, effectId, param, value) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: (clip.effects || []).map(effect => {
                    if (effect.id === effectId) {
                      return {
                        ...effect,
                        params: { ...effect.params, [param]: value }
                      }
                    }
                    return effect
                  })
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  const toggleEffect = useCallback(async (trackId, clipId, effectId, enabled) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: (clip.effects || []).map(effect => {
                    if (effect.id === effectId) {
                      return { ...effect, enabled }
                    }
                    return effect
                  })
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  const setClipFade = useCallback(async (trackId, clipId, edge, duration) => {
    if (!project) return
    
    const clampedDuration = Math.max(0.05, Math.min(10, duration))
    const effectType = edge === 'in' ? 'fadeIn' : 'fadeOut'
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                const existingEffect = (clip.effects || []).find(e => e.type === effectType)
                
                if (existingEffect) {
                  return {
                    ...clip,
                    effects: (clip.effects || []).map(e => {
                      if (e.type === effectType) {
                        return {
                          ...e,
                          params: { duration: clampedDuration },
                          enabled: clampedDuration > 0.05
                        }
                      }
                      return e
                    })
                  }
                } else {
                  return {
                    ...clip,
                    effects: [
                      ...(clip.effects || []),
                      {
                        id: `effect-${Date.now()}`,
                        type: effectType,
                        params: { duration: clampedDuration },
                        enabled: clampedDuration > 0.05
                      }
                    ]
                  }
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  // ─── FONCTIONS SELECTION ──────────────────────────────────────────────

  const selectClip = useCallback((clipId, trackId) => {
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId)
  }, [])

  const deselectClip = useCallback(() => {
    setSelectedClipId(null)
    setSelectedTrackId(null)
  }, [])

  // ─── FONCTIONS LOOP ──────────────────────────────────────────────────

  const setLoopRegionFn = useCallback((start, end) => {
    setLoopRegion(prev => ({
      ...prev,
      start: Math.max(0, start),
      end: Math.min(totalDuration, end)
    }))
  }, [totalDuration])

  const toggleLoop = useCallback(() => {
    setLoopRegion(prev => ({
      ...prev,
      enabled: !prev.enabled
    }))
  }, [])

  const clearLoop = useCallback(() => {
    setLoopRegion({ enabled: false, start: 0, end: 10 })
  }, [])

  // ─── ZOOM ─────────────────────────────────────────────────────────────

  const handleZoomChange = useCallback((newZoom) => {
    setZoomLevel(Math.max(0.05, Math.min(10, newZoom)))
  }, [])

  // ─── FONCTIONS MARKERS ──────────────────────────────────────────────────

  const addMarker = useCallback((markerData) => {
    if (!project) return null
    
    const newMarker = {
      id: `marker-${Date.now()}`,
      name: markerData.name || `Marqueur ${(project.markers?.length || 0) + 1}`,
      time: markerData.time || currentTime,
      color: markerData.color || '#3b82f6'
    }
    
    const updatedProject = {
      ...project,
      markers: [...(project.markers || []), newMarker],
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
    addToast?.(`Marqueur "${newMarker.name}" ajouté`, 'success')
    return newMarker
  }, [project, store, currentTime, addToast])

  const removeMarker = useCallback((markerId) => {
    if (!project) return
    
    const markerToRemove = project.markers?.find(m => m.id === markerId)
    if (!markerToRemove) return
    
    const updatedProject = {
      ...project,
      markers: (project.markers || []).filter(m => m.id !== markerId),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
    addToast?.(`Marqueur "${markerToRemove.name}" supprimé`, 'info')
  }, [project, store, addToast])

  const updateMarker = useCallback((markerId, updates) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      markers: (project.markers || []).map(marker => {
        if (marker.id === markerId) {
          return { ...marker, ...updates }
        }
        return marker
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  const navigateToMarker = useCallback((time) => {
    seek(time)
  }, [seek])

  // ─── VALUE ──────────────────────────────────────────────────────────────

  const value = {
    project,
    setProject,
    tracks: project?.tracks || [],
    selectedClipId,
    setSelectedClipId,
    selectedTrackId,
    setSelectedTrackId,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    isPaused,
    setIsPaused,
    zoomLevel,
    setZoomLevel,
    snapEnabled,
    setSnapEnabled,
    loopRegion,
    setLoopRegion: setLoopRegionFn,
    autoCrossfade,
    setAutoCrossfade,
    clipDurations,
    setClipDurations,
    waveformData,
    setWaveformData,
    isDurationsLoaded,
    isInitialized,
    totalDuration,
    isLoading,
    isDirty,
    isAutoSaving,
    stopAtTime,
    setStopAtTime,
    soloPlayClipId,
    setSoloPlayClipId,
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
    moveClip,
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    toggleEffect,
    setClipFade,
    play,
    pause,
    stop,
    seek,
    togglePlay,
    playClipOnly,
    selectClip,
    deselectClip,
    toggleLoop,
    clearLoop,
    handleZoomChange,
    markers: project?.markers || [],
    addMarker,
    removeMarker,
    updateMarker,
    navigateToMarker,
    store,
    addToast,
    t,
  }

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return context
}

export default EditorContext