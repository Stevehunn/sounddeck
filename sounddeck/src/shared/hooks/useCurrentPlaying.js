// src/shared/hooks/useCurrentPlaying.js
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  subscribeToPlayback,
  getSoundProgress,
  isPausedSound,
  togglePauseSound,
  stopSound,
} from '@core/services/AudioService'

const PROGRESS_POLL_MS = 100
const MIN_DURATION_FOR_BAR = 2

/**
 * Hook qui retourne TOUS les sons en cours de lecture + progression + état pause.
 *
 * AudioService est responsable du cycle de vie :
 *   - Ajout  : playSound() → markSoundPlaying()
 *   - Retrait: stopSound(), onend, onstop, onloaderror → markSoundStopped()
 *   - Clear  : stopAllSounds(), setCurrentPlayingSound(null)
 *
 * @param {Array} sounds - Liste de tous les sons du store
 * @returns {{
 *   sound: object|null,
 *   progress: object|null,
 *   isPaused: boolean,
 *   playingSounds: Array<{
 *     id: string,
 *     sound: object,
 *     progress: object|null,
 *     isPaused: boolean,
 *   }>,
 *   togglePause: (id: string) => void,
 *   stop: (id: string) => void,
 * }}
 */
export function useCurrentPlaying(sounds) {
  const [playingIds, setPlayingIds] = useState([])
  const [stateById, setStateById] = useState({})

  const soundsRef = useRef(sounds)

  useEffect(() => { soundsRef.current = sounds }, [sounds])

  // ─── ABONNEMENT AUX ÉVÉNEMENTS AUDIO ────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToPlayback((snapshot) => {
      const ids = snapshot.playingIds || (snapshot.id ? [snapshot.id] : [])
      setPlayingIds(ids)
    })
    return unsubscribe
  }, [])

  // ─── POLL PROGRESS + ÉTAT PAUSE ─────────────────────────────────────
  useEffect(() => {
    if (playingIds.length === 0) {
      setStateById({})
      return
    }

    const tick = () => {
      const updates = {}
      for (const id of playingIds) {
        const paused = isPausedSound(id)
        const p = getSoundProgress(id)
        const showProgress =
          p && p.duration > MIN_DURATION_FOR_BAR ? p : null
        updates[id] = { progress: showProgress, isPaused: paused }
      }
      setStateById(updates)
    }

    tick()
    const interval = setInterval(tick, PROGRESS_POLL_MS)
    return () => clearInterval(interval)
  }, [playingIds])

  // ─── CONSTRUCTION DE LA LISTE ENRICHIE ─────────────────────────────
  // Ordre : plus récent en premier (Set conserve l'ordre d'insertion)
  const playingSounds = playingIds
    .slice()
    .reverse()
    .map((id) => {
      const sound = soundsRef.current?.find((s) => s.id === id)
      if (!sound) return null
      const s = stateById[id] || { progress: null, isPaused: false }
      return {
        id,
        sound,
        progress: s.progress,
        isPaused: s.isPaused,
      }
    })
    .filter(Boolean)

  // Compat : dernier son (le plus récemment lancé)
  const last = playingSounds[0] || null

  const togglePause = useCallback((id) => togglePauseSound(id), [])
  const stop = useCallback((id) => stopSound(id), [])

  return {
    // Compat (dernier son)
    sound: last?.sound || null,
    progress: last?.progress || null,
    isPaused: last?.isPaused || false,
    // Nouveau (liste complète)
    playingSounds,
    togglePause,
    stop,
  }
}

export default useCurrentPlaying