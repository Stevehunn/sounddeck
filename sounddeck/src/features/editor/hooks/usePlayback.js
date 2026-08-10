// src/features/editor/hooks/usePlayback.js
import { useState, useCallback, useRef, useEffect } from 'react'

export function usePlayback(project, onTimeUpdate) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(60)
  
  const animationRef = useRef(null)
  const startTimeRef = useRef(0)
  const startTimeOffsetRef = useRef(0)
  const lastTimestampRef = useRef(0)

  // Calculer la durée totale du projet
  useEffect(() => {
    if (project?.tracks) {
      let maxDuration = 10
      for (const track of project.tracks) {
        for (const clip of track.clips) {
          const end = (clip.start || 0) + (clip.duration || 3)
          if (end > maxDuration) maxDuration = end
        }
      }
      setTotalDuration(Math.max(maxDuration + 2, 10))
    }
  }, [project])

  const play = useCallback((startTime = 0) => {
    setIsPlaying(true)
    setIsPaused(false)
    setCurrentTime(startTime)
    startTimeRef.current = performance.now()
    startTimeOffsetRef.current = startTime
    lastTimestampRef.current = startTime
  }, [])

  const pause = useCallback(() => {
    setIsPaused(true)
    setIsPlaying(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const resume = useCallback(() => {
    setIsPlaying(true)
    setIsPaused(false)
    startTimeRef.current = performance.now()
    startTimeOffsetRef.current = currentTime
    lastTimestampRef.current = currentTime
  }, [currentTime])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(time, totalDuration))
    setCurrentTime(clamped)
    startTimeOffsetRef.current = clamped
    lastTimestampRef.current = clamped
  }, [totalDuration])

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return

    const update = (timestamp) => {
      const delta = (timestamp - startTimeRef.current) / 1000
      const newTime = startTimeOffsetRef.current + delta
      
      if (newTime >= totalDuration) {
        setCurrentTime(totalDuration)
        setIsPlaying(false)
        onTimeUpdate?.(totalDuration)
        return
      }
      
      setCurrentTime(newTime)
      onTimeUpdate?.(newTime)
      animationRef.current = requestAnimationFrame(update)
    }

    animationRef.current = requestAnimationFrame(update)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isPlaying, totalDuration, onTimeUpdate])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else if (isPaused) {
      resume()
    } else {
      play(currentTime > 0 ? currentTime : 0)
    }
  }, [isPlaying, isPaused, currentTime, play, pause, resume])

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
    setTotalDuration
  }
}

export default usePlayback