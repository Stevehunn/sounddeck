/**
 * @file Sequencer player hook — plays a playlist of sounds one after another.
 *
 * This hook is the "conductor" of the sequencer:
 * - Plays each item with `Howl` (html5: false) for low latency.
 * - Waits `item.delay` seconds between sounds.
 * - Loops the whole playlist if `loopPlaylist` is `true`.
 * - Registers external playback handlers with `AudioService` so the
 *   sound popup (and other UI) can pause/resume the current sound.
 * - Exposes `start`, `stop`, `pause`, `resume`, `goNext`, `goPrev`.
 *
 * The sound popup is shown for each item as it plays (see
 * `SoundPopupService.showSoundPopup`).
 *
 * @see @core/services/AudioService.js
 * @see @core/services/SoundPopupService.js
 */

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
import {
  showSoundPopup,
  onSoundPopupAction,
} from '@core/services/SoundPopupService'
import { buildFileUrl } from '@shared/utils/fileUrl'

/**
 * Sequencer playback hook.
 *
 * @param {Object} options
 * @param {Array<{id: string, soundId: string, delay: number}>} options.items
 * @param {{current: Array}} options.itemsRef
 * @param {Array<Object>} options.sounds - Full sound list.
 * @param {string} options.audioDevice - Output device ID.
 *   Currently accepted for API compatibility but not applied to the
 *   Howl output (see TODO below).
 * @param {number} options.volume - Master volume (0-100).
 * @param {boolean} options.loopPlaylist - Loop the whole playlist.
 * @param {'small'|'medium'|'large'} [options.cardSize='medium']
 * @returns {Object}
 */
export function useSequencePlayer({
  items,
  itemsRef,
  sounds,
  // TODO(audio-routing): route the Howl output to this device via
  // `setSinkId()` on the underlying HTML5 audio node. Currently the
  // sequencer plays on the system default output.
  audioDevice: _audioDevice,
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

  // Stable ref to `playFrom` — used for recursion (avoids TDZ warnings).
  const playFromRef = useRef(null)

  const loopPlaylistRef = useRef(loopPlaylist)
  useEffect(() => {
    loopPlaylistRef.current = loopPlaylist
  }, [loopPlaylist])

  const cardSizeRef = useRef(cardSize)
  useEffect(() => {
    cardSizeRef.current = cardSize || 'medium'
  }, [cardSize])

  const lastRegisteredSoundIdRef = useRef(null)

  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    currentIdxRef.current = currentIdx
  }, [currentIdx])
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  /**
   * Unregisters any external playback handlers (idempotent).
   * @returns {void}
   */
  const cleanupExternalPlayback = useCallback(() => {
    if (lastRegisteredSoundIdRef.current) {
      unregisterExternalPlayback(lastRegisteredSoundIdRef.current)
      lastRegisteredSoundIdRef.current = null
    }
  }, [])

  // ─── PROGRESS POLLING ─────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || currentIdx < 0) {
      const timer = setTimeout(() => setCurrentProgress(null), 0)
      return () => clearTimeout(timer)
    }
    const item = items[currentIdx]
    if (!item) return

    const interval = setInterval(() => {
      const howl = howlRef.current
      if (!howl) return
      const isHowlPlaying = howl.playing()
      if (!isHowlPlaying && !pausedRef.current) {
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

  // ─── PLAYBACK ─────────────────────────────────────────────────────────

  const playFrom = useCallback(
    async (idx) => {
      cleanupExternalPlayback()
      setPaused(false)

      if (idx >= items.length) {
        if (loopPlaylistRef.current) {
          playFromRef.current(0)
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
        playFromRef.current(idx + 1)
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
            if (sequenceRef.current !== null) playFromRef.current(idx + 1)
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
    [items, sounds, volume, itemsRef, cleanupExternalPlayback]
  )

  // Keep the ref in sync so the recursive calls above always see the
  // latest `playFrom` (up-to-date deps).
  useEffect(() => {
    playFromRef.current = playFrom
  }, [playFrom])

  /**
   * Starts the sequence from the first item.
   * @returns {boolean} `false` if the playlist is empty.
   */
  const start = useCallback(() => {
    if (items.length === 0) return false
    setPlaying(true)
    playFrom(0)
    return true
  }, [items.length, playFrom])

  /**
   * Stops the sequence and resets all internal state.
   * @returns {void}
   */
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
  }, [playFrom, itemsRef, stop])

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

  // ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────
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

  // ─── POPUP ACTIONS (prev / next / pause) ──────────────────────────────
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
    return () => {
      if (typeof off === 'function') off()
    }
  }, [goNext, goPrev])

  // ─── STOP CALLBACK REGISTRATION ───────────────────────────────────────
  useEffect(() => {
    registerStopSequencerCallback(stop)
    return () => registerStopSequencerCallback(null)
  }, [stop])

  // ─── CLEANUP ON UNMOUNT ───────────────────────────────────────────────
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