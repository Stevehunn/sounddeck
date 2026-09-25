// src/shared/hooks/useCurrentPlaying.js
import { useState, useEffect, useRef } from 'react'
import {
  subscribeToPlayback,
  isPlaying,
  getSoundProgress,
  isPausedSound,
} from '@core/services/AudioService'

const PROGRESS_POLL_MS = 250
const MIN_DURATION_FOR_BAR = 2
const MAX_MISS_TOLERANCE = 4

/**
 * Hook qui retourne le son actuellement en lecture + sa progression + état pause
 * @param {Array} sounds - Liste de tous les sons du store
 * @returns {{ sound: object|null, progress: object|null, isPaused: boolean }}
 */
export function useCurrentPlaying(sounds) {
  const [playingId, setPlayingId] = useState(null)
  const [progress, setProgress] = useState(null)
  const [isPaused, setIsPaused] = useState(false)
  const soundsRef = useRef(sounds)
  const missCountRef = useRef(0)

  useEffect(() => {
    soundsRef.current = sounds
  }, [sounds])

  useEffect(() => {
    const unsubscribe = subscribeToPlayback((state) => {
      const newId = state.id || null
      setPlayingId(newId)
      missCountRef.current = 0
      if (!newId) {
        setProgress(null)
        setIsPaused(false)
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!playingId) {
      setProgress(null)
      setIsPaused(false)
      missCountRef.current = 0
      return
    }

    const interval = setInterval(() => {
      // Sync pause state
      setIsPaused(isPausedSound(playingId))

      if (!isPlaying(playingId)) {
        missCountRef.current += 1
        if (missCountRef.current >= MAX_MISS_TOLERANCE) {
          if (!isPausedSound(playingId)) {
            setPlayingId(null)
            setProgress(null)
            setIsPaused(false)
            missCountRef.current = 0
          }
        }
        return
      }

      missCountRef.current = 0

      const p = getSoundProgress(playingId)
      if (p && p.duration > MIN_DURATION_FOR_BAR) {
        setProgress(p)
      } else {
        setProgress(null)
      }
    }, PROGRESS_POLL_MS)

    return () => clearInterval(interval)
  }, [playingId])

  const sound = playingId
    ? soundsRef.current?.find((s) => s.id === playingId) || null
    : null

  return { sound, progress, isPaused }
}

export default useCurrentPlaying