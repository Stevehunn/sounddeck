// src/shared/hooks/useCurrentPlaying.js
import { useState, useEffect, useRef } from 'react'
import { 
  subscribeToPlayback, 
  isPlaying, 
  getSoundProgress 
} from '@core/services/AudioService'

/**
 * Hook qui retourne le son actuellement en lecture + sa progression
 * @param {Array} sounds - Liste de tous les sons du store
 * @returns {{ sound: object|null, progress: {current, duration, ratio}|null }}
 */
export function useCurrentPlaying(sounds) {
  const [playingId, setPlayingId] = useState(null)
  const [progress, setProgress] = useState(null)
  const soundsRef = useRef(sounds)

  // Garder la ref à jour sans redéclencher le useEffect
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

  // Poller la progression tant qu'un son joue
  useEffect(() => {
    if (!playingId) {
      setProgress(null)
      return
    }

    const interval = setInterval(() => {
      if (!isPlaying(playingId)) {
        setPlayingId(null)
        setProgress(null)
        return
      }
      const p = getSoundProgress(playingId)
      // Ne pas afficher la barre pour les très courts sons (bruitages)
      setProgress(p && p.duration > 2 ? p : null)
    }, 100)

    return () => clearInterval(interval)
  }, [playingId])

  const sound = playingId
    ? soundsRef.current?.find(s => s.id === playingId) || null
    : null

  return { sound, progress }
}

export default useCurrentPlaying