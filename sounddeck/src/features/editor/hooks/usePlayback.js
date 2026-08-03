// src/features/editor/hooks/usePlayback.js
import { useState, useEffect, useCallback, useRef } from 'react'
import { AudioEditorService } from '@core/services'

export function usePlayback({
  project,
  clipDurations,
  store,
  masterVolume = 100,
  isMasterMuted = false,
  loopRegion = null,
  onError = null
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(10)

  const isMountedRef = useRef(true)
  const prevProjectRef = useRef(null)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      AudioEditorService.disposeEditor()
    }
  }, [])

  useEffect(() => {
    if (!project || !project.id) return
    
    if (prevProjectRef.current === project.id && isInitializedRef.current) {
      return
    }
    
    prevProjectRef.current = project.id
    
    const state = AudioEditorService.initEditor(
      project,
      clipDurations,
      loopRegion,
      onError
    )
    
    if (state) {
      setTotalDuration(state.totalDuration)
      setCurrentTime(state.currentTime)
      setIsPlaying(state.isPlaying)
      setIsPaused(state.isPaused)
      isInitializedRef.current = true
    }
    
    return () => {
      if (isMountedRef.current) {
        // Ne pas nettoyer complètement
      }
    }
  }, [project?.id, clipDurations, loopRegion, onError])

  useEffect(() => {
    if (project?.tracks) {
      let maxDuration = 10
      for (const track of project.tracks) {
        for (const clip of track.clips) {
          const duration = clipDurations[clip.id] || clip.duration || 3
          const end = clip.start + duration
          if (end > maxDuration) maxDuration = end
        }
      }
      const newDuration = Math.max(maxDuration + 2, 10)
      if (newDuration !== totalDuration) {
        setTotalDuration(newDuration)
      }
    }
  }, [project?.tracks, clipDurations, totalDuration])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMountedRef.current) return
      const state = AudioEditorService.getEditorState()
      if (state) {
        setCurrentTime(state.currentTime)
        setIsPlaying(state.isPlaying)
        setIsPaused(state.isPaused)
        if (state.totalDuration !== totalDuration) {
          setTotalDuration(state.totalDuration)
        }
      }
    }, 50)

    return () => clearInterval(interval)
  }, [totalDuration])

  const play = useCallback((startAt = 0) => {
    if (!isMountedRef.current) return
    AudioEditorService.playEditor(startAt)
  }, [])

  const pause = useCallback(() => {
    if (!isMountedRef.current) return
    AudioEditorService.pauseEditor()
  }, [])

  const resume = useCallback(() => {
    if (!isMountedRef.current) return
    AudioEditorService.resumeEditor()
  }, [])

  const stop = useCallback(() => {
    if (!isMountedRef.current) return
    AudioEditorService.stopEditor()
    setCurrentTime(0)
  }, [])

  const seek = useCallback((time) => {
    if (!isMountedRef.current) return
    AudioEditorService.seekEditor(time)
    setCurrentTime(time)
  }, [])

  const togglePlay = useCallback(() => {
    if (!isMountedRef.current) return
    AudioEditorService.toggleEditorPlay()
  }, [])

  const updateClipEffects = useCallback((clipId) => {
    console.log(`🔄 Mise à jour des effets pour le clip ${clipId}`)
  }, [])

  useEffect(() => {
    return () => {
      AudioEditorService.disposeEditor()
    }
  }, [])

  return {
    isPlaying,
    isPaused,
    currentTime,
    totalDuration,
    play,
    pause,
    resume,
    stop,
    seek,
    togglePlay,
    updateClipEffects,
    isEngineReady: true,
    engine: null,
    getAudioContext: () => null,
    loadBuffer: () => null,
    startClip: () => null,
    applyEffects: () => null,
    getActiveClips: () => [],
    audioContext: null,
    rebuildEngine: stop,
  }
}

export default usePlayback