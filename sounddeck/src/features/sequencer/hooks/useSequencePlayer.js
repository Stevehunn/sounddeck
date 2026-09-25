// src/features/sequencer/hooks/useSequencePlayer.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import {
  registerStopSequencerCallback,
  setCurrentPlayingSound,
  setCurrentPlayingProgress,
  getFinalVolumeForSound,
  analyzeGain,
} from '@core/services/AudioService'
import { buildFileUrl } from '@shared/utils/fileUrl'

export function useSequencePlayer({
  items,
  itemsRef,
  sounds,
  audioDevice,
  volume,
  loopPlaylist,
}) {
  const [playing, setPlaying] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [currentProgress, setCurrentProgress] = useState(null)

  const sequenceRef = useRef(null)
  const howlRef = useRef(null)
  const playingRef = useRef(false)
  const currentIdxRef = useRef(-1)

  // ✅ FIX : ref pour loopPlaylist (évite les stale closures)
  const loopPlaylistRef = useRef(loopPlaylist)
  useEffect(() => {
    loopPlaylistRef.current = loopPlaylist
  }, [loopPlaylist])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    currentIdxRef.current = currentIdx
  }, [currentIdx])

  // ─── PROGRESSION ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || currentIdx < 0) {
      setCurrentProgress(null)
      return
    }
    const item = items[currentIdx]
    if (!item) return

    const interval = setInterval(() => {
      if (howlRef.current && howlRef.current.playing()) {
        const seek = howlRef.current.seek()
        const duration = howlRef.current.duration()
        if (
          typeof seek === 'number' &&
          typeof duration === 'number' &&
          duration > 0
        ) {
          setCurrentProgress({
            current: seek,
            duration,
            ratio: Math.min(1, seek / duration),
          })
          setCurrentPlayingProgress(item.soundId, seek, duration)
        }
      } else {
        setCurrentProgress(null)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [playing, currentIdx, items])

  // ─── LECTURE ─────────────────────────────────────────────────────────
  const playFrom = useCallback(
    async (idx) => {
      if (idx >= items.length) {
        // ✅ FIX : on lit loopPlaylistRef.current (valeur actuelle)
        // et non loopPlaylist capturé dans la closure
        if (loopPlaylistRef.current) {
          playFrom(0)
          return
        }
        setPlaying(false)
        setCurrentIdx(-1)
        setCurrentPlayingSound(null)
        return
      }

      const item = items[idx]
      setCurrentIdx(idx)

      const sound = sounds.find((s) => s.id === item.soundId)
      if (!sound) {
        playFrom(idx + 1)
        return
      }

      setCurrentPlayingSound(item.soundId)

      const fileUrl = buildFileUrl(sound.path)

      if (sound.path) {
        analyzeGain(sound.path).catch(() => {})
      }

      const volumeRatio = getFinalVolumeForSound(sound, volume)

      if (howlRef.current) {
        howlRef.current.stop()
        howlRef.current.unload()
      }

      howlRef.current = new Howl({
        src: [fileUrl],
        volume: volumeRatio,
        html5: false,
        onend: () => {
          const delay = item.delay || 0
          sequenceRef.current = setTimeout(() => {
            if (sequenceRef.current !== null) playFrom(idx + 1)
          }, delay * 1000)
        },
      })
      howlRef.current.play()
    },
    // ✅ FIX : loopPlaylist retiré des dépendances (via ref désormais)
    [items, sounds, volume]
  )

  const start = useCallback(() => {
    if (items.length === 0) return false
    setPlaying(true)
    playFrom(0)
    return true
  }, [items.length, playFrom])

  const stop = useCallback(() => {
    setPlaying(false)
    setCurrentIdx(-1)
    playingRef.current = false
    if (sequenceRef.current) {
      clearTimeout(sequenceRef.current)
      sequenceRef.current = null
    }
    if (howlRef.current) {
      howlRef.current.stop()
      howlRef.current.unload()
      howlRef.current = null
    }
    setCurrentPlayingSound(null)
  }, [])

  const goNext = useCallback(() => {
    if (sequenceRef.current) {
      clearTimeout(sequenceRef.current)
      sequenceRef.current = null
    }
    if (howlRef.current) {
      howlRef.current.stop()
      howlRef.current.unload()
      howlRef.current = null
    }
    const next = currentIdxRef.current + 1
    if (next < itemsRef.current.length) {
      playFrom(next)
    } else if (loopPlaylistRef.current) {
      // ✅ FIX : ref
      playFrom(0)
    } else {
      stop()
    }
  }, [playFrom, stop])

  const goPrev = useCallback(() => {
    if (sequenceRef.current) {
      clearTimeout(sequenceRef.current)
      sequenceRef.current = null
    }
    if (howlRef.current) {
      howlRef.current.stop()
      howlRef.current.unload()
      howlRef.current = null
    }
    const prev = Math.max(0, currentIdxRef.current - 1)
    playFrom(prev)
  }, [playFrom])

  // ─── RACCOURCIS CLAVIER ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!playingRef.current) return
      if (e.key === 'ArrowRight' || e.key === 'MediaTrackNext') {
        e.preventDefault()
        goNext()
      }
      if (e.key === 'ArrowLeft' || e.key === 'MediaTrackPrevious') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  // ─── REGISTER STOP CALLBACK ──────────────────────────────────────────
  useEffect(() => {
    registerStopSequencerCallback(stop)
    return () => registerStopSequencerCallback(null)
  }, [stop])

  // ─── CLEANUP AU DÉMONTAGE ────────────────────────────────────────────
  useEffect(() => () => stop(), [stop])

  return {
    playing,
    currentIdx,
    currentProgress,
    start,
    stop,
    goNext,
    goPrev,
  }
}

export default useSequencePlayer