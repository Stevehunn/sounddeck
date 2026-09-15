// src/features/editor/contexts/hooks/useEditorAudioPlayback.js
import { useCallback, useRef, useEffect } from 'react'

export function useEditorAudioPlayback(core) {
  const {
    projectRef, clipDurationsRef, totalDurationRef, autoCrossfadeRef,
    loopStateRef, soloPlayClipIdRef, currentTimeRef,
    isPlayingRef, isPausedRef, masterGainRef,
    stopAtTimeRef,
    setCurrentTime, setIsPlaying, setIsPaused,
    setStopAtTime, setSoloPlayClipId,
    masterGain, findPreviousClip, calculateOverlap,
  } = core

  const audioContextRef = useRef(null)
  const audioSourcesRef = useRef({})
  const animationRef = useRef(null)
  const lastPlayedClipsRef = useRef(new Set())

  // ─── MASTER GAIN SYNC ──────────────────────────────────────────────────
  const updateMasterGain = useCallback((newGain) => {
    for (const [clipId, entry] of Object.entries(audioSourcesRef.current)) {
      if (entry?.gainNode) {
        let trackVolume = 1
        if (projectRef.current?.tracks) {
          for (const track of projectRef.current.tracks) {
            const clip = track.clips.find(c => c.id === clipId)
            if (clip) {
              trackVolume = track.volume || 1
              break
            }
          }
        }
        entry.gainNode.gain.value = trackVolume * newGain
      }
    }
  }, [projectRef])

  const updateTrackVolume = useCallback((trackId, newVolume) => {
    const masterVolume = masterGainRef.current || 1
    for (const [clipId, entry] of Object.entries(audioSourcesRef.current)) {
      if (entry?.gainNode) {
        if (projectRef.current?.tracks) {
          for (const track of projectRef.current.tracks) {
            if (track.id === trackId) {
              const clip = track.clips.find(c => c.id === clipId)
              if (clip) {
                entry.gainNode.gain.value = newVolume * masterVolume
                break
              }
            }
          }
        }
      }
    }
  }, [projectRef, masterGainRef])

  useEffect(() => {
    masterGainRef.current = masterGain
    updateMasterGain(masterGain)
  }, [masterGain, updateMasterGain, masterGainRef])

  // ─── LOAD BUFFER ───────────────────────────────────────────────────────
  const loadAudioBuffer = useCallback(async (filePath) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') await ctx.resume()

      const fileUrl = filePath.startsWith('file://')
        ? filePath
        : 'file:///' + filePath.replace(/\\/g, '/')

      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      return await ctx.decodeAudioData(arrayBuffer)
    } catch (e) {
      return null
    }
  }, [])

  // ─── PLAY CLIP ─────────────────────────────────────────────────────────
  const playClip = useCallback(async (clip, track, customOffset = null) => {
    if (!clip?.path) return

    const oldEntry = audioSourcesRef.current[clip.id]
    if (oldEntry) {
      try { oldEntry.source.stop(); oldEntry.source.disconnect() } catch (e) {}
      delete audioSourcesRef.current[clip.id]
    }

    try {
      const buffer = await loadAudioBuffer(clip.path)
      if (!buffer) return

      const ctx = audioContextRef.current
      if (!ctx) return

      let sourceBuffer = buffer

      if (clip.effects && clip.effects.length > 0) {
        const activeEffects = clip.effects.filter(e => e.enabled)
        if (activeEffects.length > 0) {
          try {
            const { applyEffectsToBuffer } = await import('@shared/utils/realTimeEffects')
            const processedBuffer = applyEffectsToBuffer(buffer, clip.effects, ctx.sampleRate, true)
            if (processedBuffer) sourceBuffer = processedBuffer
          } catch (e) {}
        }
      }

      const source = ctx.createBufferSource()
      source.buffer = sourceBuffer

      const gainNode = ctx.createGain()
      const trackVolume = track?.volume || 1
      const masterVolume = masterGainRef.current || 1
      gainNode.gain.value = trackVolume * masterVolume

      if (autoCrossfadeRef.current) {
        const previousClip = findPreviousClip(clip, track)
        if (previousClip) {
          const overlap = calculateOverlap(previousClip, clip)
          if (overlap > 0.01) {
            const fadeDuration = Math.min(overlap, 0.1)
            const now = ctx.currentTime
            const prevEntry = audioSourcesRef.current[previousClip.id]
            if (prevEntry) {
              const prevGain = prevEntry.gainNode
              const currentGain = prevGain.gain.value
              prevGain.gain.setValueAtTime(currentGain, now)
              prevGain.gain.linearRampToValueAtTime(0, now + fadeDuration)
            }
            gainNode.gain.setValueAtTime(0, now)
            gainNode.gain.linearRampToValueAtTime(trackVolume * masterVolume, now + fadeDuration)
          }
        }
      }

      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      let offset = 0
      if (customOffset !== null && customOffset !== undefined) {
        offset = Math.max(0, Math.min(customOffset, sourceBuffer.duration - 0.01))
      } else {
        const clipOffset = clip.offset || 0
        const timeInClip = Math.max(0, currentTimeRef.current - (clip.start || 0))
        offset = Math.min(clipOffset + timeInClip, sourceBuffer.duration - 0.01)
      }

      source.start(0, offset)
      audioSourcesRef.current[clip.id] = { source, gainNode }
      source.onended = () => {}
    } catch (e) {
      console.error('❌ [playClip] Erreur:', e)
    }
  }, [loadAudioBuffer, findPreviousClip, calculateOverlap, autoCrossfadeRef, masterGainRef, currentTimeRef])

  // ─── PLAYBACK LOOP ─────────────────────────────────────────────────────
  const startPlaybackLoop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    let lastTime = performance.now()
    let accumulated = 0
    let isLoopRunning = true

    const playingClips = new Set()
    const clipsStartedThisCycle = new Map()
    const generalLoopClipsStarted = new Map()

    const loop = () => {
      if (!isPlayingRef.current || isPausedRef.current) {
        animationRef.current = requestAnimationFrame(loop)
        return
      }

      const now = performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now
      accumulated += delta

      if (accumulated >= 0.016) {
        let globalTime = currentTimeRef.current + accumulated
        accumulated = 0

        const ls = loopStateRef.current
        const clipDurationsMap = clipDurationsRef.current
        const timelineLoop = ls?.timeline || {
          enabled: false, start: 0, end: 10,
          durationMode: 'cycles', cycleCount: 3, manualDuration: 10
        }

        const loopStart = timelineLoop.start || 0
        const loopEnd = timelineLoop.end || 10
        const loopTotalDuration = Math.max(0.1, loopEnd - loopStart)

        let maxLoopDuration = loopTotalDuration
        const cycleCount = timelineLoop.cycleCount || 3
        const manualDuration = timelineLoop.manualDuration || 10

        if (timelineLoop.durationMode === 'cycles') {
          maxLoopDuration = loopTotalDuration * cycleCount
        } else if (timelineLoop.durationMode === 'manualDuration') {
          maxLoopDuration = manualDuration
        }

        const elapsedSinceLoopStart = globalTime - loopStart
        const isInLoopZone = timelineLoop.enabled &&
          elapsedSinceLoopStart >= 0 &&
          elapsedSinceLoopStart < maxLoopDuration

        let loopTime = globalTime
        let currentCycle = -1
        if (isInLoopZone) {
          const positionInCycle = elapsedSinceLoopStart % loopTotalDuration
          currentCycle = Math.floor(elapsedSinceLoopStart / loopTotalDuration)
          loopTime = loopStart + positionInCycle
        }

        if (projectRef.current?.tracks) {
          const tracks = projectRef.current.tracks
          const soloClipId = soloPlayClipIdRef.current
          const activeClipsThisFrame = new Set()

          const individualLoopClips = new Set()
          for (const track of tracks) {
            for (const clip of track.clips) {
              if (ls?.clips?.[clip.id]?.enabled) individualLoopClips.add(clip.id)
            }
          }

          for (const track of tracks) {
            if (track.muted) continue

            for (const clip of track.clips) {
              const duration = clipDurationsMap[clip.id] || clip.duration || 3
              const start = clip.start || 0
              const end = start + duration

              const isClipLooping = individualLoopClips.has(clip.id)
              const clipLoopData = ls?.clips?.[clip.id]
              const clipLoopStart = clipLoopData?.start || start
              const clipLoopEnd = clipLoopData?.end || end

              if (soloClipId && clip.id !== soloClipId) {
                if (playingClips.has(clip.id)) {
                  const entry = audioSourcesRef.current[clip.id]
                  if (entry) {
                    try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
                    delete audioSourcesRef.current[clip.id]
                  }
                  playingClips.delete(clip.id)
                  generalLoopClipsStarted.delete(clip.id)
                  clipsStartedThisCycle.delete(clip.id)
                }
                continue
              }

              let shouldPlay = false
              let customOffset = null
              let isGeneralLoop = false

              // CAS 1 : boucle individuelle
              if (isClipLooping) {
                if (globalTime >= clipLoopStart && globalTime < clipLoopEnd) {
                  const elapsedInLoop = globalTime - clipLoopStart
                  const positionInClip = elapsedInLoop % duration
                  const currentCycleNumber = Math.floor(elapsedInLoop / duration)

                  if (positionInClip < duration) {
                    shouldPlay = true
                    customOffset = positionInClip
                    const lastCycleForClip = clipsStartedThisCycle.get(clip.id)
                    if (lastCycleForClip !== currentCycleNumber) {
                      clipsStartedThisCycle.set(clip.id, currentCycleNumber)
                      playClip(clip, track, customOffset)
                      playingClips.add(clip.id)
                      activeClipsThisFrame.add(clip.id)
                    } else {
                      activeClipsThisFrame.add(clip.id)
                    }
                  }
                } else if (globalTime >= clipLoopEnd) {
                  if (playingClips.has(clip.id)) {
                    const entry = audioSourcesRef.current[clip.id]
                    if (entry) {
                      try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
                      delete audioSourcesRef.current[clip.id]
                    }
                    playingClips.delete(clip.id)
                    clipsStartedThisCycle.delete(clip.id)
                  }
                }
                continue
              }

              // CAS 2 : boucle générale
              if (!isClipLooping && isInLoopZone) {
                const isClipInZone = (start >= loopStart && start < loopEnd) ||
                  (end > loopStart && end <= loopEnd) ||
                  (start <= loopStart && end >= loopEnd)

                if (isClipInZone) {
                  const offsetInClip = (loopTime - start) % duration
                  const positionInClip = Math.max(0, Math.min(duration, offsetInClip))

                  if (positionInClip < duration && positionInClip >= 0) {
                    shouldPlay = true
                    customOffset = positionInClip
                    isGeneralLoop = true

                    const lastCycleForClip = generalLoopClipsStarted.get(clip.id)
                    if (lastCycleForClip !== currentCycle) {
                      generalLoopClipsStarted.set(clip.id, currentCycle)
                      playClip(clip, track, customOffset)
                      playingClips.add(clip.id)
                      activeClipsThisFrame.add(clip.id)
                    } else {
                      activeClipsThisFrame.add(clip.id)
                    }
                  }
                }
              }

              // CAS 3 : lecture normale
              if (!shouldPlay && !isClipLooping && !isInLoopZone) {
                if (globalTime >= start && globalTime < end) {
                  shouldPlay = true
                  const clipOffset = clip.offset || 0
                  customOffset = clipOffset + (globalTime - start)
                }
              }

              if (shouldPlay && !isClipLooping) {
                activeClipsThisFrame.add(clip.id)
                if (!playingClips.has(clip.id)) {
                  playClip(clip, track, customOffset || 0)
                  playingClips.add(clip.id)
                }
              }
            }
          }

          for (const clipId of playingClips) {
            if (!activeClipsThisFrame.has(clipId)) {
              let clip = null
              let isClipLooping = false
              for (const t of tracks) {
                const found = t.clips.find(c => c.id === clipId)
                if (found) {
                  clip = found
                  isClipLooping = ls?.clips?.[clipId]?.enabled || false
                  break
                }
              }
              if (isClipLooping) continue

              let shouldContinue = false
              if (isInLoopZone && clip) {
                const start = clip.start || 0
                const duration = clipDurationsMap[clip.id] || clip.duration || 3
                const isClipInZone = (start >= loopStart && start < loopEnd) ||
                  (start + duration > loopStart && start + duration <= loopEnd) ||
                  (start <= loopStart && start + duration >= loopEnd)
                if (isClipInZone) {
                  const offsetInClip = (loopTime - start) % duration
                  const positionInClip = Math.max(0, Math.min(duration, offsetInClip))
                  if (positionInClip >= 0 && positionInClip < duration) shouldContinue = true
                }
              }

              if (!shouldContinue) {
                const entry = audioSourcesRef.current[clipId]
                if (entry) {
                  try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
                  delete audioSourcesRef.current[clipId]
                }
                playingClips.delete(clipId)
                generalLoopClipsStarted.delete(clipId)
                clipsStartedThisCycle.delete(clipId)
              }
            }
          }

          if (isInLoopZone) {
            const keysToRemove = []
            for (const [clipId, cycle] of generalLoopClipsStarted) {
              if (cycle < currentCycle) keysToRemove.push(clipId)
            }
            for (const clipId of keysToRemove) {
              if (!playingClips.has(clipId)) generalLoopClipsStarted.delete(clipId)
            }
          } else {
            generalLoopClipsStarted.clear()
          }
        }

        setCurrentTime(globalTime)
        currentTimeRef.current = globalTime

        const td = totalDurationRef.current
        if (globalTime >= td) {
          setIsPlaying(false)
          setCurrentTime(td)
          setStopAtTime(null)
          stopAtTimeRef.current = null
          setSoloPlayClipId(null)
          soloPlayClipIdRef.current = null

          for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
            try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
          }
          audioSourcesRef.current = {}
          playingClips.clear()
          clipsStartedThisCycle.clear()
          generalLoopClipsStarted.clear()
          isLoopRunning = false
          return
        }
      }

      if (isLoopRunning) {
        animationRef.current = requestAnimationFrame(loop)
      }
    }

    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
    }
    audioSourcesRef.current = {}

    animationRef.current = requestAnimationFrame(loop)
  }, [playClip, projectRef, clipDurationsRef, loopStateRef, soloPlayClipIdRef,
      currentTimeRef, isPlayingRef, isPausedRef, totalDurationRef,
      setCurrentTime, setIsPlaying, setStopAtTime, setSoloPlayClipId])

  // ─── CONTROLS ──────────────────────────────────────────────────────────
  const play = useCallback(async () => {
    setIsPaused(false)
    isPausedRef.current = false
    setStopAtTime(null)
    stopAtTimeRef.current = null

    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
    }
    audioSourcesRef.current = {}
    lastPlayedClipsRef.current = new Set()

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
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
      setIsPlaying(false)
      isPlayingRef.current = false
    }
  }, [startPlaybackLoop, currentTimeRef, isPlayingRef, isPausedRef,
      setCurrentTime, setIsPlaying, setIsPaused, setStopAtTime])

  const playClipOnly = useCallback(async (clip, trackId) => {
    setSoloPlayClipId(clip.id)
    soloPlayClipIdRef.current = clip.id

    const clipStart = clip.start || 0
    const clipDuration = clipDurationsRef.current[clip.id] || clip.duration || 3
    const clipEnd = clipStart + clipDuration

    setCurrentTime(clipStart)
    currentTimeRef.current = clipStart
    setStopAtTime(clipEnd)
    stopAtTimeRef.current = clipEnd

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
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
      setIsPlaying(false)
      isPlayingRef.current = false
      setSoloPlayClipId(null)
      soloPlayClipIdRef.current = null
    }
  }, [startPlaybackLoop, clipDurationsRef, currentTimeRef, isPlayingRef,
      isPausedRef, soloPlayClipIdRef, setCurrentTime, setIsPlaying,
      setIsPaused, setSoloPlayClipId, setStopAtTime])

  const resume = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
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

  const pause = useCallback(() => {
    setIsPaused(true)
    isPausedRef.current = true
    setIsPlaying(false)
    isPlayingRef.current = false

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend().catch(() => {})
    }
  }, [isPlayingRef, isPausedRef, setIsPlaying, setIsPaused])

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

    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
    }
    audioSourcesRef.current = {}
  }, [currentTimeRef, isPlayingRef, isPausedRef, soloPlayClipIdRef,
      stopAtTimeRef, setCurrentTime, setIsPlaying, setIsPaused,
      setStopAtTime, setSoloPlayClipId])

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(time, totalDurationRef.current))
    setCurrentTime(clamped)
    currentTimeRef.current = clamped

    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
    }
    audioSourcesRef.current = {}
    lastPlayedClipsRef.current = new Set()
  }, [totalDurationRef, currentTimeRef, setCurrentTime])

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) { pause(); return }
    if (isPausedRef.current) { resume(); return }
    setSoloPlayClipId(null)
    soloPlayClipIdRef.current = null
    setCurrentTime(0)
    currentTimeRef.current = 0
    play()
  }, [pause, resume, play, isPlayingRef, isPausedRef, currentTimeRef,
      soloPlayClipIdRef, setCurrentTime, setSoloPlayClipId])

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