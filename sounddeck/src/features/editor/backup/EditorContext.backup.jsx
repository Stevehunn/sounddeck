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
  
  // ─── REFS ──────────────────────────────────────────────────────────────
  const isLoadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const audioContextRef = useRef(null)
  const audioSourcesRef = useRef({})
  const animationRef = useRef(null)

  // ─── CHARGEMENT DU PROJET ──────────────────────────────────────────────

  const loadProject = useCallback(async (projectData) => {
    console.log('📂 [EditorContext] loadProject:', projectData?.id)
    
    if (!projectData) {
      setIsInitialized(true)
      return
    }

    if (project?.id === projectData.id && project?.tracks?.length === projectData.tracks?.length) {
      console.log('⏭️ [EditorContext] Projet identique, ignoré')
      setIsInitialized(true)
      return
    }

    setProject(projectData)
    setSelectedClipId(null)
    setSelectedTrackId(null)
    setCurrentTime(0)
    setIsPlaying(false)
    setIsPaused(false)
    setIsDurationsLoaded(false)
    setIsInitialized(true)
    
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
    if (initialLoadDoneRef.current || isLoadingRef.current) {
      console.log('⏭️ [EditorContext] Initialisation déjà en cours ou terminée')
      return
    }
    
    console.log('🔵 [EditorContext] Initialisation...')
    isLoadingRef.current = true
    
    const init = async () => {
      try {
        const editorProject = store?.editorProject
        
        if (editorProject) {
          console.log('📂 [EditorContext] Projet trouvé:', editorProject.id)
          await loadProject(editorProject)
        } else {
          console.log('📂 [EditorContext] Aucun projet trouvé, création...')
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
            setTotalDuration(10)
            setIsInitialized(true)
          }
        }
      } catch (e) {
        console.error('❌ [EditorContext] Erreur initialisation:', e)
        const fallbackProject = {
          id: `project-${Date.now()}`,
          name: 'Nouveau projet',
          tracks: [],
          duration: 60,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        setProject(fallbackProject)
        setTotalDuration(10)
        setIsInitialized(true)
      } finally {
        isLoadingRef.current = false
        initialLoadDoneRef.current = true
      }
    }
    
    init()
  }, [store, loadProject])

  // ─── FONCTIONS TRACK ──────────────────────────────────────────────────

  const addTrack = useCallback(async (name, color) => {
    console.log('🎵 [EditorContext] addTrack appelé:', name, color)
    
    if (!store) {
      console.error('❌ [EditorContext] Store non disponible')
      addToast?.(t('editorErrorStoreNotAvailable') || 'Erreur: Store non disponible', 'error')
      return null
    }

    try {
      const trackIndex = project?.tracks?.length || 0
      const trackName = name || t('editorTrackDefault')?.replace('{index}', trackIndex + 1) || `Piste ${trackIndex + 1}`
      const trackColor = color || `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 50%)`
      
      let savedTrack = null
      
      if (store.addTrack) {
        savedTrack = await store.addTrack(trackName, trackColor)
      }
      
      const newTrack = savedTrack || {
        id: `track-${Date.now()}`,
        name: trackName,
        color: trackColor,
        clips: [],
        volume: 1,
        muted: false,
        solo: false,
        effects: []
      }
      
      setProject(prev => {
        if (!prev) return prev
        return {
          ...prev,
          tracks: [...prev.tracks, newTrack]
        }
      })
      setIsDirty(true)
      addToast?.(`${trackName} ${t('editorTrackAdded') || 'ajoutée'}`, 'success')
      return newTrack
      
    } catch (e) {
      console.error('❌ [EditorContext] Erreur addTrack:', e)
      addToast?.(t('editorErrorAddingTrack') || 'Erreur lors de l\'ajout de la piste', 'error')
      return null
    }
  }, [project, store, addToast, t])

  const removeTrack = useCallback(async (trackId) => {
    console.log('🗑️ [EditorContext] removeTrack:', trackId)
    
    if (!store) {
      console.error('❌ [EditorContext] Store non disponible')
      return
    }

    try {
      if (store.removeTrack) {
        await store.removeTrack(trackId)
      }
      
      setProject(prev => {
        if (!prev) return prev
        return {
          ...prev,
          tracks: prev.tracks.filter(track => track.id !== trackId)
        }
      })
      setIsDirty(true)
      addToast?.(t('editorTrackRemoved') || 'Piste supprimée', 'info')
      
    } catch (e) {
      console.error('❌ [EditorContext] Erreur removeTrack:', e)
      addToast?.(t('editorErrorRemovingTrack') || 'Erreur lors de la suppression de la piste', 'error')
    }
  }, [store, addToast, t])

  const renameTrack = useCallback(async (trackId, newName) => {
    console.log('✏️ [EditorContext] renameTrack:', trackId, newName)
    
    if (!store) {
      console.error('❌ [EditorContext] Store non disponible')
      return
    }

    try {
      if (store.renameTrack) {
        await store.renameTrack(trackId, newName)
      }
      
      setProject(prev => {
        if (!prev) return prev
        return {
          ...prev,
          tracks: prev.tracks.map(track => {
            if (track.id === trackId) {
              return { ...track, name: newName }
            }
            return track
          })
        }
      })
      setIsDirty(true)
      
    } catch (e) {
      console.error('❌ [EditorContext] Erreur renameTrack:', e)
    }
  }, [store])

  const muteTrack = useCallback((trackId, muted) => {
    console.log('🔇 [EditorContext] muteTrack:', trackId, muted)
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id === trackId) {
            return { ...track, muted }
          }
          return track
        })
      }
    })
    setIsDirty(true)
  }, [])

  const soloTrack = useCallback((trackId, solo) => {
    console.log('🎧 [EditorContext] soloTrack:', trackId, solo)
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id === trackId) {
            return { ...track, solo }
          }
          return track
        })
      }
    })
    setIsDirty(true)
  }, [])

  const setTrackVolume = useCallback((trackId, volume) => {
    console.log('🔊 [EditorContext] setTrackVolume:', trackId, volume)
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id === trackId) {
            return { ...track, volume }
          }
          return track
        })
      }
    })
    setIsDirty(true)
  }, [])

  // ─── FONCTIONS CLIP ──────────────────────────────────────────────────

  const addClip = useCallback(async (trackId, soundId, startPosition = null) => {
    console.log('🎵 [EditorContext] addClip:', { trackId, soundId, startPosition })
    
    if (!store) {
      console.error('❌ [EditorContext] Store non disponible')
      addToast?.('Store non disponible', 'error')
      return null
    }
    
    const sound = store.sounds?.find(s => s.id === soundId)
    if (!sound) {
      console.error('❌ [EditorContext] Son non trouvé:', soundId)
      addToast?.(t('editorSoundNotFound') || 'Son non trouvé', 'error')
      return null
    }

    try {
      // Utiliser la fonction du store pour ajouter le clip
      const clip = await store.addClipToTrack?.(trackId, soundId, startPosition)
      
      if (clip) {
        console.log('✅ [EditorContext] Clip ajouté:', clip)
        
        // Mettre à jour le projet localement
        setProject(prev => {
          if (!prev) return prev
          return {
            ...prev,
            tracks: prev.tracks.map(track => {
              if (track.id !== trackId) return track
              return {
                ...track,
                clips: [...track.clips, clip]
              }
            })
          }
        })
        
        // Mettre à jour la durée du clip
        if (clip.duration) {
          setClipDurations(prev => ({
            ...prev,
            [clip.id]: clip.duration
          }))
        }
        
        setIsDirty(true)
        addToast?.(`"${sound.name}" ${t('editorClipAdded') || 'ajouté'}`, 'success')
        setSelectedClipId(clip.id)
        setSelectedTrackId(trackId)
        return clip
      } else {
        console.error('❌ [EditorContext] Échec ajout clip')
        addToast?.('Erreur lors de l\'ajout du clip', 'error')
        return null
      }
    } catch (e) {
      console.error('❌ [EditorContext] Erreur addClip:', e)
      addToast?.(e.message || 'Erreur lors de l\'ajout du clip', 'error')
      return null
    }
  }, [store, addToast, t])

  const removeClip = useCallback((trackId, clipId) => {
    console.log('🗑️ [EditorContext] removeClip:', trackId, clipId)
    
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id !== trackId) return track
          return {
            ...track,
            clips: track.clips.filter(clip => clip.id !== clipId)
          }
        })
      }
    })
    
    setClipDurations(prev => {
      const newDurations = { ...prev }
      delete newDurations[clipId]
      return newDurations
    })
    
    if (selectedClipId === clipId) {
      setSelectedClipId(null)
      setSelectedTrackId(null)
    }
    setIsDirty(true)
    addToast?.(t('editorClipRemoved') || 'Clip supprimé', 'info')
  }, [selectedClipId, addToast, t])

  const updateClip = useCallback((trackId, clipId, updates) => {
    console.log('✏️ [EditorContext] updateClip:', trackId, clipId, updates)
    
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map(track => {
          if (track.id !== trackId) return track
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id !== clipId) return clip
              return { ...clip, ...updates }
            })
          }
        })
      }
    })
    setIsDirty(true)
  }, [])

  const duplicateClip = useCallback((trackId, clipId) => {
    console.log('📋 [EditorContext] duplicateClip:', trackId, clipId)
    
    const track = project?.tracks?.find(t => t.id === trackId)
    if (!track) return null
    
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return null
    
    const newClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      start: (clip.start || 0) + (clip.duration || 3) + 0.5
    }
    
    setProject(prev => {
      if (!prev) return prev
      return {
        ...prev,
        tracks: prev.tracks.map(t => {
          if (t.id !== trackId) return t
          return {
            ...t,
            clips: [...t.clips, newClip]
          }
        })
      }
    })
    setIsDirty(true)
    addToast?.(t('editorClipDuplicated') || 'Clip dupliqué', 'success')
    return newClip
  }, [project, addToast, t])

  // ─── FONCTIONS PLAYBACK ──────────────────────────────────────────────

  const play = useCallback(() => {
    console.log('▶️ [EditorContext] play')
    setIsPlaying(true)
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    console.log('⏸️ [EditorContext] pause')
    setIsPaused(true)
    setIsPlaying(false)
  }, [])

  const stop = useCallback(() => {
    console.log('⏹️ [EditorContext] stop')
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
  }, [])

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(time, totalDuration))
    console.log('🎯 [EditorContext] seek:', clamped)
    setCurrentTime(clamped)
  }, [totalDuration])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else if (isPaused) {
      play()
    } else {
      play()
    }
  }, [isPlaying, isPaused, play, pause])

  // ─── FONCTIONS SELECTION ──────────────────────────────────────────────

  const selectClip = useCallback((clipId, trackId) => {
    console.log('🎯 [EditorContext] selectClip:', clipId, trackId)
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId)
  }, [])

  const deselectClip = useCallback(() => {
    console.log('🎯 [EditorContext] deselectClip')
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

  // ─── VALUE ──────────────────────────────────────────────────────────────

  const value = {
    // États
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
    
    // Fonctions Track
    addTrack,
    removeTrack,
    renameTrack,
    muteTrack,
    soloTrack,
    setTrackVolume,
    
    // Fonctions Clip
    addClip,
    removeClip,
    updateClip,
    duplicateClip,
    
    // Fonctions Playback
    play,
    pause,
    stop,
    seek,
    togglePlay,
    
    // Fonctions Selection
    selectClip,
    deselectClip,
    
    // Fonctions Loop
    setLoopRegion: setLoopRegionFn,
    toggleLoop,
    clearLoop,
    
    // Zoom
    handleZoomChange,
    
    // Utilitaires
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