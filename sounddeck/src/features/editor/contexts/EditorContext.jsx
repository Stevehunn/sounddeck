// src/features/editor/contexts/EditorContext.jsx
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
// ✅ CORRIGER L'IMPORT
import { generateWaveformData } from '@shared/utils/waveformGenerator'

const EditorContext = createContext(null)

export function EditorProvider({ store, addToast, children }) {
  const project = store.editorProject

  console.log('🔵 [EditorContext] Rendu du provider, project:', project?.id || 'null', 'tracks:', project?.tracks?.length || 0)

  // ─── ÉTATS ──────────────────────────────────────────────────────────────────
  const [selectedClipId, setSelectedClipId] = useState(null)
  const [selectedTrackId, setSelectedTrackId] = useState(null)
  const [waveformData, setWaveformData] = useState({})
  const [clipDurations, setClipDurations] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // ─── REFS ──────────────────────────────────────────────────────────────────
  const waveformCacheRef = useRef(new Map())
  const loadingRefsRef = useRef(new Map())
  const autoSaveTimerRef = useRef(null)
  const isMountedRef = useRef(true)
  
  const prevProjectSnapshotRef = useRef(null)
  const isInitialMountRef = useRef(true)
  const isSavingRef = useRef(false)
  const isProcessingChangeRef = useRef(false)
  
  const isLoadingRef = useRef(false)
  const isWaveformLoadingRef = useRef(false)
  const isDurationsLoadedRef = useRef(false)
  const hasLoadedWaveformsRef = useRef(false)
  const initialLoadDoneRef = useRef(false)

  // ─── NETTOYAGE ─────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
    }
  }, [])

  // ─── INITIALISATION DU PROJET ──────────────────────────────────────────────
  useEffect(() => {
    const initProject = async () => {
      if (project && project.id) {
        setIsInitialized(true)
        return
      }

      if (!store.editorProject || !store.editorProject.id) {
        console.log('🔄 [EditorContext] Création d\'un nouveau projet...')
        const newProject = await store.createEditorProject('Nouveau projet')
        if (newProject) {
          setIsInitialized(true)
        }
      }
    }

    initProject()
  }, [project, store])

  // ─── SAUVEGARDE AUTOMATIQUE ──────────────────────────────────────────────
  const saveProject = useCallback(async () => {
    if (!store.editorProject?.id || !isMountedRef.current) return
    if (isSavingRef.current) return
    
    isSavingRef.current = true
    setIsAutoSaving(true)
    
    try {
      await window.electronAPI.storeSet('editorProject', store.editorProject)
      if (isMountedRef.current) {
        setIsDirty(false)
      }
    } catch (e) {
      console.warn('❌ [saveProject] Erreur:', e)
    } finally {
      if (isMountedRef.current) {
        setIsAutoSaving(false)
        isSavingRef.current = false
      }
    }
  }, [store.editorProject])

  const markDirty = useCallback(() => {
    if (!isMountedRef.current || isSavingRef.current) return
    
    setIsDirty(true)
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      saveProject()
      autoSaveTimerRef.current = null
    }, 3000)
  }, [saveProject])

  // ─── SUIVI DES CHANGEMENTS DU PROJET ──────────────────────────────────────
  useEffect(() => {
    if (!project || !project.id) return
    
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      prevProjectSnapshotRef.current = JSON.stringify(project)
      
      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true
        isDurationsLoadedRef.current = true
        hasLoadedWaveformsRef.current = true
        setIsLoading(false)
        console.log('✅ [EditorContext] Initialisation terminée (projet vide)')
      }
      return
    }
    
    if (isProcessingChangeRef.current || isSavingRef.current) return
    
    const currentSnapshot = JSON.stringify(project)
    const prevSnapshot = prevProjectSnapshotRef.current
    
    if (currentSnapshot === prevSnapshot) return
    
    prevProjectSnapshotRef.current = currentSnapshot
    isProcessingChangeRef.current = true
    
    setTimeout(() => {
      isProcessingChangeRef.current = false
    }, 200)
    
    markDirty()
    
    if (project.tracks?.some(t => t.clips.length > 0) && !isDurationsLoadedRef.current) {
      loadClipDurations()
    }
    
  }, [project, markDirty])

  // ─── DURÉES DES CLIPS ──────────────────────────────────────────────────────
  const loadClipDurations = useCallback(async () => {
    if (isLoadingRef.current) return
    
    if (!project?.tracks) {
      console.log('⏭️ [loadClipDurations] Pas de pistes')
      return
    }

    const hasClips = project.tracks.some(t => t.clips.length > 0)
    if (!hasClips) {
      console.log('⏭️ [loadClipDurations] Aucun clip, marquer comme chargé')
      isDurationsLoadedRef.current = true
      return
    }

    console.log('🔄 [loadClipDurations] Chargement des durées...')
    isLoadingRef.current = true
    
    const newClipDurations = {}
    let hasChanges = false

    const getRealDuration = async (filePath) => {
      try {
        const fileUrl = filePath.startsWith('file://') 
          ? filePath 
          : 'file:///' + filePath.replace(/\\/g, '/')
        
        const response = await fetch(fileUrl)
        if (!response.ok) return null
        
        const arrayBuffer = await response.arrayBuffer()
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const duration = audioBuffer.duration
        await audioContext.close()
        return duration
      } catch (e) {
        console.warn(`⚠️ Erreur chargement durée:`, e.message)
        return null
      }
    }

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.path) {
          if (clipDurations[clip.id]) {
            newClipDurations[clip.id] = clipDurations[clip.id]
            continue
          }
          
          try {
            const realDuration = await getRealDuration(clip.path)
            if (realDuration !== null && realDuration > 0) {
              newClipDurations[clip.id] = realDuration
              hasChanges = true
              console.log(`📏 Durée chargée pour "${clip.name}": ${realDuration.toFixed(2)}s`)
            } else {
              newClipDurations[clip.id] = clip.duration || 3
            }
          } catch (e) {
            newClipDurations[clip.id] = clip.duration || 3
          }
        }
      }
    }

    if (isMountedRef.current) {
      if (hasChanges) {
        setClipDurations(newClipDurations)
      }
      isDurationsLoadedRef.current = true
    }
    
    isLoadingRef.current = false
    console.log('✅ [loadClipDurations] Terminé, hasChanges:', hasChanges)
  }, [project, clipDurations])

  // ─── WAVEFORMS ─────────────────────────────────────────────────────────────
  const loadWaveforms = useCallback(async () => {
    console.log('🔴 [loadWaveforms] APPELÉ !')
    
    if (isWaveformLoadingRef.current) {
      console.log('⏭️ [loadWaveforms] Déjà en cours, ignoré')
      return
    }
    
    if (!project?.tracks) {
      console.log('⏭️ [loadWaveforms] Pas de pistes')
      return
    }

    if (hasLoadedWaveformsRef.current) {
      console.log('⏭️ [loadWaveforms] Déjà chargé, ignoré')
      return
    }

    // ✅ Vérifier s'il y a des clips dans les pistes
    const hasClips = project.tracks.some(t => t.clips.length > 0)
    if (!hasClips) {
      console.log('⏭️ [loadWaveforms] Aucun clip à charger, marquer comme chargé')
      hasLoadedWaveformsRef.current = true
      return
    }

    console.log('🔄 [loadWaveforms] Chargement des waveforms...')
    isWaveformLoadingRef.current = true
    
    if (isMountedRef.current) {
      setIsLoading(true)
    }
    
    const newWaveformData = {}
    let hasNewData = false

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (clip.path && !waveformData[clip.id]) {
          if (loadingRefsRef.current.has(clip.id)) continue
          loadingRefsRef.current.set(clip.id, true)

          try {
            const sliceDuration = clipDurations[clip.id] || clip.duration || null
            console.log(`  📁 Génération waveform pour "${clip.name}"`)
            const data = await generateWaveformData(
              clip.path, 
              200, 
              clip.offset || 0, 
              sliceDuration
            )
            if (data) {
              newWaveformData[clip.id] = data
              waveformCacheRef.current.set(clip.id, data)
              hasNewData = true
              console.log(`  ✅ Waveform généré pour "${clip.name}"`)
            }
          } catch (e) {
            console.warn(`  ❌ Erreur pour "${clip.name}":`, e)
          } finally {
            loadingRefsRef.current.delete(clip.id)
          }
        }
      }
    }

    if (isMountedRef.current && hasNewData) {
      console.log(`  📝 Mise à jour avec ${Object.keys(newWaveformData).length} nouveaux clips`)
      setWaveformData(prev => ({ ...prev, ...newWaveformData }))
    }
    
    if (isMountedRef.current) {
      setIsLoading(false)
    }
    
    hasLoadedWaveformsRef.current = true
    isWaveformLoadingRef.current = false
    console.log('✅ [loadWaveforms] Terminé')
  }, [project, clipDurations, waveformData])

  // ─── ÉCOUTEUR D'ÉVÉNEMENT POUR LES MISES À JOUR DE DURÉE ────────────────
  useEffect(() => {
    const handleClipDurationUpdate = (event) => {
      const { clipId, duration } = event.detail
      if (clipId && duration && duration > 0) {
        console.log(`📏 Mise à jour durée du clip ${clipId}: ${duration.toFixed(2)}s`)
        setClipDurations(prev => ({
          ...prev,
          [clipId]: duration
        }))
        isDurationsLoadedRef.current = true
        
        // ✅ FORCER LE RECHARGEMENT DES WAVEFORMS
        console.log('🔄 [EditorContext] Réinitialisation des flags pour recharger les waveforms')
        hasLoadedWaveformsRef.current = false
        isWaveformLoadingRef.current = false
        
        // ✅ Déclencher le rechargement après un court délai
        setTimeout(() => {
          console.log('🔄 [EditorContext] Tentative de rechargement des waveforms après délai')
          loadWaveforms()
        }, 100)
      }
    }
    
    window.addEventListener('clip-duration-updated', handleClipDurationUpdate)
    
    return () => {
      window.removeEventListener('clip-duration-updated', handleClipDurationUpdate)
    }
  }, [loadWaveforms])

  // ─── ÉCOUTEUR D'ÉVÉNEMENT POUR LES MISES À JOUR DU PROJET ────────────────
  useEffect(() => {
    const handleProjectUpdated = (event) => {
      const { project: updatedProject } = event.detail
      if (updatedProject?.tracks?.some(t => t.clips.length > 0)) {
        console.log('🔄 [EditorContext] Projet mis à jour, rechargement des waveforms')
        // Réinitialiser les flags
        hasLoadedWaveformsRef.current = false
        isWaveformLoadingRef.current = false
        // Forcer le rechargement
        setTimeout(() => {
          loadWaveforms()
        }, 50)
      }
    }
    
    window.addEventListener('project-updated', handleProjectUpdated)
    
    return () => {
      window.removeEventListener('project-updated', handleProjectUpdated)
    }
  }, [loadWaveforms])

  // ─── CHARGEMENT INITIAL ──────────────────────────────────────────────────
  useEffect(() => {
    console.log('🔍 [useEffect 1] project?.id:', project?.id, 'isDurationsLoaded:', isDurationsLoadedRef.current)
    if (project?.id && !isDurationsLoadedRef.current && !isLoadingRef.current) {
      loadClipDurations()
    }
  }, [project?.id, loadClipDurations])

  useEffect(() => {
    console.log('🔍 [useEffect 2] Vérification loadWaveforms:', {
      hasTracks: !!project?.tracks,
      isDurationsLoaded: isDurationsLoadedRef.current,
      clipDurationsLength: Object.keys(clipDurations).length,
      hasLoadedWaveforms: hasLoadedWaveformsRef.current,
      isWaveformLoading: isWaveformLoadingRef.current,
      hasClips: project?.tracks?.some(t => t.clips.length > 0) || false
    })
    
    if (project?.tracks && 
        isDurationsLoadedRef.current &&
        !hasLoadedWaveformsRef.current &&
        !isWaveformLoadingRef.current) {
      console.log('🔴 [useEffect 2] CONDITIONS RÉUNIES, appel à loadWaveforms')
      loadWaveforms()
    } else {
      console.log('⏭️ [useEffect 2] Conditions non réunies')
    }
  }, [project?.tracks, clipDurations, loadWaveforms, isDurationsLoadedRef.current])

  // ─── CALCULS ──────────────────────────────────────────────────────────────
  const totalDuration = useMemo(() => {
    if (!project?.tracks) return 10
    let maxDuration = 10
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        const duration = clipDurations[clip.id] || clip.duration || 3
        const end = clip.start + duration
        if (end > maxDuration) maxDuration = end
      }
    }
    return Math.max(maxDuration + 2, 10)
  }, [project, clipDurations])

  const selectedClip = useMemo(() => {
    if (!selectedClipId || !project?.tracks) return null
    for (const track of project.tracks) {
      const clip = track.clips.find(c => c.id === selectedClipId)
      if (clip) return clip
    }
    return null
  }, [selectedClipId, project])

  const selectedTrack = useMemo(() => {
    if (!selectedTrackId || !project?.tracks) return null
    return project.tracks.find(t => t.id === selectedTrackId) || null
  }, [selectedTrackId, project])

  // ─── ACTIONS ──────────────────────────────────────────────────────────────
  const selectClip = useCallback((clipId, trackId) => {
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId || null)
  }, [])

  const deselectClip = useCallback(() => {
    setSelectedClipId(null)
    setSelectedTrackId(null)
  }, [])

  const updateWaveform = useCallback(async (clipId, filePath, offset = 0, duration = null) => {
    try {
      const data = await generateWaveformData(filePath, 200, offset || 0, duration || null, false)
      if (data && isMountedRef.current) {
        setWaveformData(prev => ({ ...prev, [clipId]: data }))
        waveformCacheRef.current.set(clipId, data)
      }
    } catch (e) {
      console.warn('Erreur mise à jour waveform:', e)
    }
  }, [])

  // ─── VALEUR DU CONTEXTE ──────────────────────────────────────────────────
  const value = useMemo(() => ({
    project,
    selectedClipId,
    selectedTrackId,
    waveformData,
    clipDurations,
    isLoading,
    isDirty,
    isAutoSaving,
    totalDuration,
    selectedClip,
    selectedTrack,
    selectClip,
    deselectClip,
    setSelectedClipId,
    setSelectedTrackId,
    updateWaveform,
    loadClipDurations,
    loadWaveforms,
    markDirty,
    saveProject,
    store,
    addToast,
    editorLoopRegion: store.editorLoopRegion || { enabled: false, start: 0, end: 10 },
    setEditorLoopRegion: store.setEditorLoopRegion,
    toggleEditorLoop: store.toggleEditorLoop,
    clearEditorLoopRegion: store.clearEditorLoopRegion,
    isInitialized,
  }), [
    project,
    selectedClipId,
    selectedTrackId,
    waveformData,
    clipDurations,
    isLoading,
    isDirty,
    isAutoSaving,
    totalDuration,
    selectedClip,
    selectedTrack,
    selectClip,
    deselectClip,
    updateWaveform,
    loadClipDurations,
    loadWaveforms,
    markDirty,
    saveProject,
    store,
    addToast,
    isInitialized,
  ])

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}

export default EditorContext