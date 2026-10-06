// src/features/sequencer/hooks/useSequencePlayer.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { Howl } from 'howler'
import {
  registerStopSequencerCallback,
  setCurrentPlayingSound,
  setCurrentPlayingProgress,
  getFinalVolumeForSound,
  analyzeGain,
  registerExternalPlayback,
  unregisterExternalPlayback,
} from '@core/services/AudioService'
import { showSoundPopup, onSoundPopupAction } from '@core/services/SoundPopupService'
import { buildFileUrl } from '@shared/utils/fileUrl'

export function useSequencePlayer({
  items,
  itemsRef,
  sounds,
  audioDevice,
  volume,
  loopPlaylist,
  cardSize = 'medium',
}) {
  const [playing, setPlaying] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [currentProgress, setCurrentProgress] = useState(null)
  const [paused, setPaused] = useState(false)

  const sequenceRef = useRef(null)
  const howlRef = useRef(null)
  const playingRef = useRef(false)
  const currentIdxRef = useRef(-1)
  const pausedRef = useRef(false)

  const loopPlaylistRef = useRef(loopPlaylist)
  useEffect(() => {
    loopPlaylistRef.current = loopPlaylist
  }, [loopPlaylist])

  // Taille des cartes (pour la popup)
  const cardSizeRef = useRef(cardSize)
  useEffect(() => {
    cardSizeRef.current = cardSize || 'medium'
  }, [cardSize])

  const lastRegisteredSoundIdRef = useRef(null)

  useEffect(() => { playingRef.current = playing }, [playing])
  useEffect(() => { currentIdxRef.current = currentIdx }, [currentIdx])
  useEffect(() => { pausedRef.current = paused }, [paused])

  const cleanupExternalPlayback = useCallback(() => {
    if (lastRegisteredSoundIdRef.current) {
      unregisterExternalPlayback(lastRegisteredSoundIdRef.current)
      lastRegisteredSoundIdRef.current = null
    }
  }, [])

  // ─── PROGRESSION ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || currentIdx < 0) {
      setCurrentProgress(null)
      return
    }
    const item = items[currentIdx]
    if (!item) return

    const interval = setInterval(() => {
      const howl = howlRef.current
      if (!howl) return
      const isPlaying = howl.playing()
      if (!isPlaying && !pausedRef.current) {
        setCurrentProgress(null)
        return
      }
      const seek = howl.seek()
      const duration = howl.duration()
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
    }, 100)

    return () => clearInterval(interval)
  }, [playing, currentIdx, items])

  // ─── LECTURE ─────────────────────────────────────────────────────────
  const playFrom = useCallback(
    async (idx) => {
      cleanupExternalPlayback()
      setPaused(false)

      if (idx >= items.length) {
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
        onload: () => {
          const dur = howlRef.current?.duration?.() ?? 0
          showSoundPopup({
            name: sound.name,
            emoji: sound.emoji,
            image: sound.image,
            duration: dur,
            index: idx,
            total: itemsRef.current.length,
            cardSize: cardSizeRef.current,
          })
        },
        onend: () => {
          const delay = item.delay || 0
          sequenceRef.current = setTimeout(() => {
            if (sequenceRef.current !== null) playFrom(idx + 1)
          }, delay * 1000)
        },
      })

      const soundId = item.soundId
      registerExternalPlayback(soundId, {
        isPaused: () => {
          if (!howlRef.current) return false
          return !howlRef.current.playing()
        },
        pause: () => {
          if (howlRef.current && howlRef.current.playing()) {
            howlRef.current.pause()
            setPaused(true)
            return true
          }
          return false
        },
        resume: () => {
          if (howlRef.current) {
            howlRef.current.play()
            setPaused(false)
            return true
          }
          return false
        },
      })
      lastRegisteredSoundIdRef.current = soundId

      howlRef.current.play()
    },
    [items, sounds, volume, cleanupExternalPlayback]
  )

  const start = useCallback(() => {
    if (items.length === 0) return false
    setPlaying(true)
    playFrom(0)
    return true
  }, [items.length, playFrom])

  const stop = useCallback(() => {
    cleanupExternalPlayback()

    setPlaying(false)
    setCurrentIdx(-1)
    setPaused(false)
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
  }, [cleanupExternalPlayback])

  const pause = useCallback(() => {
    if (howlRef.current && howlRef.current.playing()) {
      howlRef.current.pause()
      setPaused(true)
    }
  }, [])

  const resume = useCallback(() => {
    if (howlRef.current && pausedRef.current) {
      howlRef.current.play()
      setPaused(false)
    }
  }, [])

  const togglePause = useCallback(() => {
    if (pausedRef.current) resume()
    else pause()
  }, [pause, resume])

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
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        if (pausedRef.current) resume()
        else pause()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, pause, resume])

  // ─── ACTIONS POPUP (prev / next / pause) ─────────────────────────────
  const togglePauseRef = useRef(null)
  useEffect(() => {
    togglePauseRef.current = togglePause
  }, [togglePause])

  useEffect(() => {
    const off = onSoundPopupAction((action) => {
      if (!playingRef.current) return
      if (action === 'prev') goPrev()
      else if (action === 'next') goNext()
      else if (action === 'pause') togglePauseRef.current?.()
    })
    return () => { if (typeof off === 'function') off() }
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
    paused,
    currentIdx,
    currentProgress,
    start,
    stop,
    pause,
    resume,
    togglePause,
    goNext,
    goPrev,
  }
}

export default useSequencePlayer