// src/features/editor/contexts/hooks/useEditorAudioPlayback.js
import { useCallback, useRef, useEffect } from 'react'
import {
  getSharedAudioContext,
  loadAudioBuffer as loadAudioBufferShared,
} from '@shared/utils/audioContext'
import { useLatestRef } from '@shared/hooks/useLatestRefs'
import { logWarn, logError, logInfo } from '@shared/utils/logger'

// ─── HELPERS PURS ──────────────────────────────────────────────────────

function computeLoopTiming(globalTime, timelineLoop) {
  if (!timelineLoop?.enabled) {
    return { loopTime: globalTime, isInLoopZone: false, currentCycle: -1 }
  }

  const loopStart = timelineLoop.start || 0
  const loopEnd = timelineLoop.end || 10
  const loopTotalDuration = Math.max(0.1, loopEnd - loopStart)
  const cycleCount = timelineLoop.cycleCount || 3
  const manualDuration = timelineLoop.manualDuration || 10

  let maxLoopDuration = loopTotalDuration
  if (timelineLoop.durationMode === 'cycles') {
    maxLoopDuration = loopTotalDuration * cycleCount
  } else if (timelineLoop.durationMode === 'manualDuration') {
    maxLoopDuration = manualDuration
  }

  const elapsed = globalTime - loopStart
  const isInLoopZone = elapsed >= 0 && elapsed < maxLoopDuration

  if (!isInLoopZone) {
    return { loopTime: globalTime, isInLoopZone: false, currentCycle: -1 }
  }

  const positionInCycle = elapsed % loopTotalDuration
  const currentCycle = Math.floor(elapsed / loopTotalDuration)

  return {
    loopTime: loopStart + positionInCycle,
    isInLoopZone: true,
    currentCycle,
  }
}

function isClipInZone(start, end, loopStart, loopEnd) {
  return (
    (start >= loopStart && start < loopEnd) ||
    (end > loopStart && end <= loopEnd) ||
    (start <= loopStart && end >= loopEnd)
  )
}

/**
 * Cherche le clip qui chevauche `clip` et qui démarre juste avant lui,
 * dans TOUTES les pistes non-mutées (pas juste la track courante).
 * Retourne { clip, track } ou null.
 */
function findOverlappingPreviousClip(clip, project, clipDurations) {
  const tracks = project?.tracks || []
  let best = null
  let bestTrack = null

  for (const t of tracks) {
    if (t.muted) continue
    for (const c of t.clips || []) {
      if (c.id === clip.id) continue
      if (c.start >= clip.start) continue

      const cDur = clipDurations[c.id] || c.duration || 3
      const cEnd = c.start + cDur

      // Ne garde que ceux qui chevauchent le clip courant
      if (cEnd > clip.start + 0.01) {
        if (!best || c.start > best.start) {
          best = c
          bestTrack = t
        }
      }
    }
  }

  return best ? { clip: best, track: bestTrack } : null
}

// ─── HOOK ──────────────────────────────────────────────────────────────

export function useEditorAudioPlayback(core) {
  const {
    projectRef,
    clipDurationsRef,
    totalDurationRef,
    autoCrossfadeRef,
    loopStateRef,
    soloPlayClipIdRef,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    masterGainRef,
    stopAtTimeRef,
    setCurrentTime,
    setIsPlaying,
    setIsPaused,
    setStopAtTime,
    setSoloPlayClipId,
    masterGain,
  } = core

  // ─── REFS INTERNES ──────────────────────────────────────────────────
  const audioContextRef = useRef(null)
  const audioSourcesRef = useRef({})
  const animationRef = useRef(null)
  const lastPlayedClipsRef = useRef(new Set())

  // ─── STOP SOURCE ────────────────────────────────────────────────────
  const stopSource = useCallback((clipId) => {
    const entry = audioSourcesRef.current[clipId]
    if (entry) {
      try {
        entry.source.stop()
        entry.source.disconnect()
      } catch (e) {}
      delete audioSourcesRef.current[clipId]
    }
  }, [])

  const stopAllSources = useCallback(() => {
    for (const id of Object.keys(audioSourcesRef.current)) {
      stopSource(id)
    }
  }, [stopSource])

  // ─── LOAD BUFFER ────────────────────────────────────────────────────
  const loadAudioBuffer = useCallback(async (filePath) => {
    return await loadAudioBufferShared(filePath)
  }, [])

  // ─── MASTER GAIN ────────────────────────────────────────────────────
  const updateMasterGain = useCallback(
    (newGain) => {
      for (const [clipId, entry] of Object.entries(audioSourcesRef.current)) {
        if (!entry?.gainNode) continue

        let trackVolume = 1
        if (projectRef.current?.tracks) {
          for (const track of projectRef.current.tracks) {
            const clip = track.clips.find((c) => c.id === clipId)
            if (clip) {
              trackVolume = track.volume || 1
              break
            }
          }
        }
        entry.gainNode.gain.value = trackVolume * newGain
      }
    },
    [projectRef]
  )

  const updateTrackVolume = useCallback(
    (trackId, newVolume) => {
      const masterVolume = masterGainRef.current || 1
      for (const [clipId, entry] of Object.entries(audioSourcesRef.current)) {
        if (!entry?.gainNode) continue
        if (!projectRef.current?.tracks) continue

        for (const track of projectRef.current.tracks) {
          if (track.id !== trackId) continue
          const clip = track.clips.find((c) => c.id === clipId)
          if (clip) {
            entry.gainNode.gain.value = newVolume * masterVolume
            break
          }
        }
      }
    },
    [projectRef, masterGainRef]
  )

  useEffect(() => {
    masterGainRef.current = masterGain
    updateMasterGain(masterGain)
  }, [masterGain, updateMasterGain, masterGainRef])

  // ─── PLAY CLIP ──────────────────────────────────────────────────────
  const playClip = useCallback(
    async (clip, track, customOffset = null) => {
      if (!clip?.path) return

      stopSource(clip.id)

      try {
        const buffer = await loadAudioBuffer(clip.path)
        if (!buffer) return

        const ctx = getSharedAudioContext()
        if (!ctx) return

        let sourceBuffer = buffer

        // Effets
        if (clip.effects?.length > 0) {
          const hasActive = clip.effects.some((e) => e.enabled)
          if (hasActive) {
            try {
              const { applyEffectsToBuffer } = await import(
                '@shared/utils/realTimeEffects'
              )
              const processed = applyEffectsToBuffer(
                buffer,
                clip.effects,
                ctx.sampleRate,
                true
              )
              if (processed) sourceBuffer = processed
            } catch (e) {
              logWarn('AudioPlayback', 'Erreur application effets', e)
            }
          }
        }

        const source = ctx.createBufferSource()
        source.buffer = sourceBuffer

        const gainNode = ctx.createGain()
        const trackVolume = track?.volume || 1
        const masterVolume = masterGainRef.current || 1
        const targetGain = trackVolume * masterVolume
        gainNode.gain.value = targetGain

        // ─── CROSSFADE AUTOMATIQUE ─────────────────────────────────────
        if (autoCrossfadeRef.current) {
          const prev = findOverlappingPreviousClip(
            clip,
            projectRef.current,
            clipDurationsRef.current
          )

          if (prev) {
            const prevDur =
              clipDurationsRef.current[prev.clip.id] ||
              prev.clip.duration ||
              3
            const prevEnd = prev.clip.start + prevDur
            const overlap = Math.max(0, prevEnd - clip.start)

            if (overlap > 0.05) {
              const fadeDuration = Math.min(overlap, 0.5)
              const now = ctx.currentTime

              // Fade OUT du clip précédent
              const prevEntry = audioSourcesRef.current[prev.clip.id]
              if (prevEntry) {
                const prevGain = prevEntry.gainNode
                const prevTarget =
                  (prev.track?.volume || 1) * (masterGainRef.current || 1)

                prevGain.gain.cancelScheduledValues(now)
                prevGain.gain.setValueAtTime(prevTarget, now)
                prevGain.gain.linearRampToValueAtTime(0, now + fadeDuration)
              }

              // Fade IN du nouveau clip
              gainNode.gain.cancelScheduledValues(now)
              gainNode.gain.setValueAtTime(0, now)
              gainNode.gain.linearRampToValueAtTime(
                targetGain,
                now + fadeDuration
              )

              if (import.meta.env.DEV) {
                logInfo(
                  'AudioPlayback',
                  `🎚️ Crossfade ${overlap.toFixed(2)}s : "${prev.clip.name}" → "${clip.name}"`
                )
              }
            }
          }
        }

        source.connect(gainNode)
        gainNode.connect(ctx.destination)

        // Offset
        let offset = 0
        if (customOffset !== null && customOffset !== undefined) {
          offset = Math.max(
            0,
            Math.min(customOffset, sourceBuffer.duration - 0.01)
          )
        } else {
          const clipOffset = clip.offset || 0
          const timeInClip = Math.max(
            0,
            currentTimeRef.current - (clip.start || 0)
          )
          offset = Math.min(
            clipOffset + timeInClip,
            sourceBuffer.duration - 0.01
          )
        }

        source.start(0, offset)
        audioSourcesRef.current[clip.id] = { source, gainNode }
        source.onended = () => {}
      } catch (e) {
        logError('AudioPlayback', `Erreur playClip "${clip.name}"`, e)
      }
    },
    [
      loadAudioBuffer,
      stopSource,
      autoCrossfadeRef,
      masterGainRef,
      currentTimeRef,
      projectRef,
      clipDurationsRef,
    ]
  )

  // ─── BOUCLE DE LECTURE ──────────────────────────────────────────────
  const startPlaybackLoop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    stopAllSources()

    let lastTime = performance.now()
    let accumulated = 0
    let isLoopRunning = true

    const playingClips = new Set()
    const clipsStartedThisCycle = new Map()
    const generalLoopClipsStarted = new Map()

    const stopAndForget = (clipId) => {
      stopSource(clipId)
      playingClips.delete(clipId)
      clipsStartedThisCycle.delete(clipId)
      generalLoopClipsStarted.delete(clipId)
    }

    const loop = () => {
      if (!isPlayingRef.current || isPausedRef.current) {
        animationRef.current = requestAnimationFrame(loop)
        return
      }

      const now = performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now
      accumulated += delta

      if (accumulated < 0.016) {
        if (isLoopRunning) animationRef.current = requestAnimationFrame(loop)
        return
      }

      const globalTime = currentTimeRef.current + accumulated
      accumulated = 0

      // Boucle globale
      const timelineLoop = loopStateRef.current?.timeline || {
        enabled: false,
        start: 0,
        end: 10,
        durationMode: 'cycles',
        cycleCount: 3,
        manualDuration: 10,
      }
      const { loopTime, isInLoopZone, currentCycle } = computeLoopTiming(
        globalTime,
        timelineLoop
      )
      const loopStart = timelineLoop.start || 0
      const loopEnd = timelineLoop.end || 10

      const tracks = projectRef.current?.tracks || []
      const clipDurationsMap = clipDurationsRef.current
      const soloClipId = soloPlayClipIdRef.current
      const activeClipsThisFrame = new Set()

      // Clips en boucle individuelle
      const individualLoopClips = new Set()
      for (const track of tracks) {
        for (const clip of track.clips) {
          if (loopStateRef.current?.clips?.[clip.id]?.enabled) {
            individualLoopClips.add(clip.id)
          }
        }
      }

      // Traite chaque clip
      for (const track of tracks) {
        if (track.muted) continue

        for (const clip of track.clips) {
          const duration = clipDurationsMap[clip.id] || clip.duration || 3
          const start = clip.start || 0
          const end = start + duration
          const isClipLooping = individualLoopClips.has(clip.id)

          // Solo
          if (soloClipId && clip.id !== soloClipId) {
            if (playingClips.has(clip.id)) {
              stopAndForget(clip.id)
            }
            continue
          }

          // Cas 1 : boucle individuelle
          if (isClipLooping) {
            const clipLoopData = loopStateRef.current.clips[clip.id]
            const clipLoopStart = clipLoopData?.start || start
            const clipLoopEnd = clipLoopData?.end || end

            if (globalTime >= clipLoopStart && globalTime < clipLoopEnd) {
              const elapsed = globalTime - clipLoopStart
              const positionInClip = elapsed % duration
              const currentClipCycle = Math.floor(elapsed / duration)
              const lastCycle = clipsStartedThisCycle.get(clip.id)

              if (lastCycle !== currentClipCycle) {
                clipsStartedThisCycle.set(clip.id, currentClipCycle)
                playClip(clip, track, positionInClip)
                playingClips.add(clip.id)
              }
              activeClipsThisFrame.add(clip.id)
            } else if (globalTime >= clipLoopEnd) {
              if (playingClips.has(clip.id)) {
                stopAndForget(clip.id)
              }
            }
            continue
          }

          // Cas 2 : boucle globale
          // ✅ FIX 2 : ne joue le clip que si loopTime est DANS [start, end]
          if (isInLoopZone) {
            const inZone = isClipInZone(start, end, loopStart, loopEnd)

            if (inZone) {
              if (loopTime >= start && loopTime < end) {
                const positionInClip = loopTime - start
                const lastCycle = generalLoopClipsStarted.get(clip.id)
                if (lastCycle !== currentCycle) {
                  generalLoopClipsStarted.set(clip.id, currentCycle)
                  playClip(clip, track, positionInClip)
                  playingClips.add(clip.id)
                }
                activeClipsThisFrame.add(clip.id)
              }
            }
            continue
          }

          // Cas 3 : lecture normale
          if (globalTime >= start && globalTime < end) {
            activeClipsThisFrame.add(clip.id)
            if (!playingClips.has(clip.id)) {
              const clipOffset = clip.offset || 0
              const offset = clipOffset + (globalTime - start)
              playClip(clip, track, offset)
              playingClips.add(clip.id)
            }
          }
        }
      }

      // Arrête les clips qui ne jouent plus
      for (const clipId of playingClips) {
        if (activeClipsThisFrame.has(clipId)) continue
        if (individualLoopClips.has(clipId)) continue

        let shouldContinue = false
        if (isInLoopZone) {
          for (const track of tracks) {
            const clip = track.clips.find((c) => c.id === clipId)
            if (!clip) continue
            const start = clip.start || 0
            const duration = clipDurationsMap[clip.id] || clip.duration || 3
            if (isClipInZone(start, start + duration, loopStart, loopEnd)) {
              const offsetInClip = (loopTime - start) % duration
              if (offsetInClip >= 0 && offsetInClip < duration) {
                shouldContinue = true
              }
            }
            break
          }
        }

        if (!shouldContinue) {
          stopAndForget(clipId)
        }
      }

      // Nettoie les cycles obsolètes
      if (isInLoopZone) {
        for (const [clipId, cycle] of generalLoopClipsStarted) {
          if (cycle < currentCycle && !playingClips.has(clipId)) {
            generalLoopClipsStarted.delete(clipId)
          }
        }
      } else {
        generalLoopClipsStarted.clear()
      }

      // Update time
      setCurrentTime(globalTime)
      currentTimeRef.current = globalTime

      // Fin de lecture
      const totalDuration = totalDurationRef.current
      if (globalTime >= totalDuration) {
        setIsPlaying(false)
        setCurrentTime(totalDuration)
        setStopAtTime(null)
        stopAtTimeRef.current = null
        setSoloPlayClipId(null)
        soloPlayClipIdRef.current = null

        stopAllSources()
        playingClips.clear()
        clipsStartedThisCycle.clear()
        generalLoopClipsStarted.clear()
        isLoopRunning = false
        return
      }

      if (isLoopRunning) {
        animationRef.current = requestAnimationFrame(loop)
      }
    }

    animationRef.current = requestAnimationFrame(loop)
  }, [
    playClip,
    stopSource,
    stopAllSources,
    projectRef,
    clipDurationsRef,
    loopStateRef,
    soloPlayClipIdRef,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    totalDurationRef,
    setCurrentTime,
    setIsPlaying,
    setStopAtTime,
    setSoloPlayClipId,
    stopAtTimeRef,
  ])

  // ─── CONTRÔLES ──────────────────────────────────────────────────────
  const play = useCallback(async () => {
    setIsPaused(false)
    isPausedRef.current = false
    setStopAtTime(null)
    stopAtTimeRef.current = null

    stopAllSources()
    lastPlayedClipsRef.current = new Set()

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') await ctx.resume()

      setCurrentTime(0)
      currentTimeRef.current = 0
      setIsPlaying(true)
      isPlayingRef.current = true
      setIsPaused(false)
      isPausedRef.current = false

      setTimeout(() => startPlaybackLoop(), 50)
    } catch (e) {
      logError('AudioPlayback', 'Erreur play', e)
      setIsPlaying(false)
      isPlayingRef.current = false
    }
  }, [
    startPlaybackLoop,
    stopAllSources,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    setCurrentTime,
    setIsPlaying,
    setIsPaused,
    setStopAtTime,
    stopAtTimeRef,
  ])

  const playClipOnly = useCallback(
    async (clip, trackId) => {
      setSoloPlayClipId(clip.id)
      soloPlayClipIdRef.current = clip.id

      const clipStart = clip.start || 0
      const clipDuration =
        clipDurationsRef.current[clip.id] || clip.duration || 3
      const clipEnd = clipStart + clipDuration

      setCurrentTime(clipStart)
      currentTimeRef.current = clipStart
      setStopAtTime(clipEnd)
      stopAtTimeRef.current = clipEnd

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            window.webkitAudioContext)()
        }
        const ctx = audioContextRef.current
        if (ctx.state === 'suspended') await ctx.resume()

        setIsPlaying(true)
        isPlayingRef.current = true
        setIsPaused(false)
        isPausedRef.current = false
        lastPlayedClipsRef.current = new Set()

        setTimeout(() => startPlaybackLoop(), 50)
      } catch (e) {
        logError('AudioPlayback', 'Erreur playClipOnly', e)
        setIsPlaying(false)
        isPlayingRef.current = false
        setSoloPlayClipId(null)
        soloPlayClipIdRef.current = null
      }
    },
    [
      startPlaybackLoop,
      clipDurationsRef,
      currentTimeRef,
      isPlayingRef,
      isPausedRef,
      soloPlayClipIdRef,
      setCurrentTime,
      setIsPlaying,
      setIsPaused,
      setSoloPlayClipId,
      setStopAtTime,
      stopAtTimeRef,
    ]
  )

  const resume = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)()
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    setIsPaused(false)
    isPausedRef.current = false
    setIsPlaying(true)
    isPlayingRef.current = true
    lastPlayedClipsRef.current = new Set()

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    setTimeout(() => startPlaybackLoop(), 50)
  }, [startPlaybackLoop, isPlayingRef, isPausedRef, setIsPlaying, setIsPaused])

  // Coupe les sources audio quand on pause
  const pause = useCallback(() => {
    setIsPaused(true)
    isPausedRef.current = true
    setIsPlaying(false)
    isPlayingRef.current = false

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    // Stoppe toutes les sources (sinon elles continuent en arrière-plan)
    stopAllSources()

    if (
      audioContextRef.current &&
      audioContextRef.current.state === 'running'
    ) {
      audioContextRef.current.suspend().catch(() => {})
    }
  }, [
    stopAllSources,
    isPlayingRef,
    isPausedRef,
    setIsPlaying,
    setIsPaused,
  ])

  const stop = useCallback(() => {
    setIsPlaying(false)
    isPlayingRef.current = false
    setIsPaused(false)
    isPausedRef.current = false
    setCurrentTime(0)
    currentTimeRef.current = 0
    lastPlayedClipsRef.current = new Set()
    setStopAtTime(null)
    stopAtTimeRef.current = null
    setSoloPlayClipId(null)
    soloPlayClipIdRef.current = null

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    stopAllSources()
  }, [
    stopAllSources,
    currentTimeRef,
    isPlayingRef,
    isPausedRef,
    soloPlayClipIdRef,
    stopAtTimeRef,
    setCurrentTime,
    setIsPlaying,
    setIsPaused,
    setStopAtTime,
    setSoloPlayClipId,
  ])

  const seek = useCallback(
    (time) => {
      const clamped = Math.max(0, Math.min(time, totalDurationRef.current))
      setCurrentTime(clamped)
      currentTimeRef.current = clamped

      stopAllSources()
      lastPlayedClipsRef.current = new Set()
    },
    [stopAllSources, totalDurationRef, currentTimeRef, setCurrentTime]
  )

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause()
      return
    }
    if (isPausedRef.current) {
      resume()
      return
    }
    setSoloPlayClipId(null)
    soloPlayClipIdRef.current = null
    setCurrentTime(0)
    currentTimeRef.current = 0
    play()
  }, [
    pause,
    resume,
    play,
    isPlayingRef,
    isPausedRef,
    currentTimeRef,
    soloPlayClipIdRef,
    setCurrentTime,
    setSoloPlayClipId,
  ])

  return {
    audioContextRef,
    audioSourcesRef,
    animationRef,
    loadAudioBuffer,
    playClip,
    startPlaybackLoop,
    play,
    playClipOnly,
    resume,
    pause,
    stop,
    seek,
    togglePlay,
    updateMasterGain,
    updateTrackVolume,
  }
}