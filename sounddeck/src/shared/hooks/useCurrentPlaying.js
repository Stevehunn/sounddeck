// src/shared/hooks/useCurrentPlaying.js
import { useState, useEffect, useRef } from 'react'
import {
  subscribeToPlayback,
  isPlaying,
  getSoundProgress,
} from '@core/services/AudioService'

const PROGRESS_POLL_MS = 250
const MIN_DURATION_FOR_BAR = 2

/**
 * Hook qui retourne le son actuellement en lecture + sa progression
 * @param {Array} sounds - Liste de tous les sons du store
 * @returns {{ sound: object|null, progress: {current, duration, ratio}|null }}
 */
export function useCurrentPlaying(sounds) {
  const [playingId, setPlayingId] = useState(null)
  const [progress, setProgress] = useState(null)
  const soundsRef = useRef(sounds)

  useEffect(() => {
    soundsRef.current = sounds
  }, [sounds])

  // S'abonner aux événements de lecture (play / stop)
  useEffect(() => {
    const unsubscribe = subscribeToPlayback((state) => {
      setPlayingId(state.id || null)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!playingId) {
      setProgress(null)
      return
    }

    const interval = setInterval(() => {
      // Guard : si le son n'est plus en lecture, on reset
      if (!isPlaying(playingId)) {
        setPlayingId(null)
        setProgress(null)
        return
      }

      const p = getSoundProgress(playingId)

      // Guard : on n'affiche la barre que pour les sons assez longs
      if (p && p.duration > MIN_DURATION_FOR_BAR) {
        setProgress(p)
      } else if (progress !== null) {
        setProgress(null)
      }
    }, PROGRESS_POLL_MS)

    return () => clearInterval(interval)
  }, [playingId, progress])

  const sound = playingId
    ? soundsRef.current?.find(s => s.id === playingId) || null
    : null

  return { sound, progress }
}

export default useCurrentPlaying