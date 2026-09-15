// src/features/editor/contexts/EditorContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

let __sharedDurationCtx = null

function getSharedDurationCtx() {
  if (!__sharedDurationCtx || __sharedDurationCtx.state === 'closed') {
    __sharedDurationCtx = new (window.AudioContext ||
      window.webkitAudioContext)()
  }
  return __sharedDurationCtx
}

// ✅ Générateur d'ID robuste
function generateId(prefix) {
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}-${Date.now()}-${rand}`
}

// ✅ Logger dev-only
const __DEBUG__ = typeof import.meta !== 'undefined' && import.meta.env?.DEV
const log = __DEBUG__ ? console.log.bind(console) : () => {}

const EditorContext = createContext(null)

// ✅ CONSTANTES
const HISTORY_LIMIT = 50

const LOOP_START_MODES = {
  TIMELINE_START: 'timelineStart',
  PLAYHEAD: 'playhead',
  MANUAL_CLICK: 'manualClick'
}

const LOOP_END_MODES = {
  END_OF_TRACK: 'endOfTrack',
  CYCLES: 'cycles',
  MANUAL: 'manual',
  MANUAL_CLICK: 'manualClick',
  PLAYHEAD: 'playhead'
}

const INITIAL_OVERLAY_STATE = {
  type: null,
  clipId: null,
  trackId: null,
  options: null,
  step: 0,
  totalSteps: 1,
  clipName: null,
  data: {}
}

const DEFAULT_TIMELINE_LOOP = {
  enabled: false,
  start: 0,
  end: 10,
  color: '#7C6FF7',
  startMode: LOOP_START_MODES.TIMELINE_START,
  endMode: LOOP_END_MODES.END_OF_TRACK,
  cycleCount: 3,
  manualDuration: 10,
  startManualTime: 0,
  endManualTime: 10
}

export function EditorProvider({ children, store, addToast }) {
  const { t } = useLanguage()

  // ─── ÉTATS ──────────────────────────────────────────────────────────────
  const [project, setProject] = useState(null)
  const [selectedClipId, setSelectedClipId] = useState(null)
  const [selectedTrackId, setSelectedTrackId] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [loopRegion, setLoopRegion] = useState({ enabled: false, start: 0, end: 10 })
  const [autoCrossfade, setAutoCrossfade] = useState(true)
  const [clipDurations, setClipDurations] = useState({})
  const [waveformData, setWaveformData] = useState({})
  const [isDurationsLoaded, setIsDurationsLoaded] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [totalDuration, setTotalDuration] = useState(10)
  const [isLoading, setIsLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [stopAtTime, setStopAtTime] = useState(null)
  const [soloPlayClipId, setSoloPlayClipId] = useState(null)
  const [masterGain, setMasterGain] = useState(1)
  const [actionOverlay, setActionOverlay] = useState(INITIAL_OVERLAY_STATE)

  // ✅ NOUVEAU : États undo/redo (visibles en React)
  const [canUndoEditor, setCanUndoEditor] = useState(false)
  const [canRedoEditor, setCanRedoEditor] = useState(false)

  const [loopState, setLoopState] = useState({
    clips: {},
    tracks: {},
    timeline: { ...DEFAULT_TIMELINE_LOOP }
  })

  // ─── REFS ──────────────────────────────────────────────────────────────
  const isLoadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const audioContextRef = useRef(null)
  const audioSourcesRef = useRef({})
  const animationRef = useRef(null)

  const projectRef = useRef(null)
  const storeRef = useRef(store)
  const clipDurationsRef = useRef({})
  const loopStateRef = useRef(loopState)
  const totalDurationRef = useRef(10)
  const autoCrossfadeRef = useRef(true)
  const actionOverlayRef = useRef(INITIAL_OVERLAY_STATE)
  const addToastRef = useRef(addToast)
  const tRef = useRef(t)

  const lastPlayedClipsRef = useRef(new Set())
  const currentTimeRef = useRef(0)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const selectedClipIdRef = useRef(null)
  const stopAtTimeRef = useRef(null)
  const soloPlayClipIdRef = useRef(null)
  const idCounterRef = useRef(0)
  const masterGainRef = useRef(1)

  // ✅ NOUVEAU : Stacks undo/redo + flag de blocage
  const undoStackRef = useRef([])
  const redoStackRef = useRef([])
  const isUndoingRef = useRef(false)

  // ✅ Sync des refs
  useEffect(() => { projectRef.current = project }, [project])
  useEffect(() => { storeRef.current = store }, [store])
  useEffect(() => { clipDurationsRef.current = clipDurations }, [clipDurations])
  useEffect(() => { loopStateRef.current = loopState }, [loopState])
  useEffect(() => { totalDurationRef.current = totalDuration }, [totalDuration])
  useEffect(() => { autoCrossfadeRef.current = autoCrossfade }, [autoCrossfade])
  useEffect(() => { actionOverlayRef.current = actionOverlay }, [actionOverlay])
  useEffect(() => { addToastRef.current = addToast }, [addToast])
  useEffect(() => { tRef.current = t }, [t])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  useEffect(() => { selectedClipIdRef.current = selectedClipId }, [selectedClipId])
  useEffect(() => { stopAtTimeRef.current = stopAtTime }, [stopAtTime])
  useEffect(() => { soloPlayClipIdRef.current = soloPlayClipId }, [soloPlayClipId])

  // ─── PERSISTANCE DIRECTE (bypass store) ────────────────────────────────
  const persistProject = useCallback((projectData) => {
    if (!projectData?.id) return
    try {
      window.electronAPI?.saveEditorProject?.(projectData).catch(() => {})
    } catch (e) {
    }
  }, [])

  // ─── ✅ NOUVEAU : COMMIT WRAPPER (avec historique) ──────────────────────
  // Utilisé par TOUTES les mutations qui doivent être undoables.
  // skipHistory: true pour les updates fréquents (drag fade, drag volume...).
  const commitProject = useCallback((newProject, options = {}) => {
    if (!newProject) return
    const { skipHistory = false } = options
    const currentProject = projectRef.current

    // Push dans l'historique (sauf si explicitement skip)
    if (!skipHistory && currentProject && !isUndoingRef.current) {
      undoStackRef.current.push(currentProject)
      if (undoStackRef.current.length > HISTORY_LIMIT) {
        undoStackRef.current.shift()
      }
      redoStackRef.current = []
      setCanUndoEditor(true)
      setCanRedoEditor(false)
    }

    setProject(newProject)
    projectRef.current = newProject
    persistProject(newProject)
  }, [persistProject])

  // ✅ Push manuel (avant un drag)
  const pushEditorHistoryCheckpoint = useCallback(() => {
    const currentProject = projectRef.current
    if (!currentProject) return
    undoStackRef.current.push(currentProject)
    if (undoStackRef.current.length > HISTORY_LIMIT) {
      undoStackRef.current.shift()
    }
    redoStackRef.current = []
    setCanUndoEditor(true)
    setCanRedoEditor(false)
  }, [])

  // ✅ Undo
  const undoEditor = useCallback(() => {
    if (undoStackRef.current.length === 0) return false
    const previous = undoStackRef.current.pop()
    const current = projectRef.current
    if (!previous) return false

    isUndoingRef.current = true
    if (current) redoStackRef.current.push(current)

    setProject(previous)
    projectRef.current = previous
    persistProject(previous)

    setCanUndoEditor(undoStackRef.current.length > 0)
    setCanRedoEditor(true)

    // Reset flag au prochain tick
    setTimeout(() => { isUndoingRef.current = false }, 0)
    return true
  }, [persistProject])

  // ✅ Redo
  const redoEditor = useCallback(() => {
    if (redoStackRef.current.length === 0) return false
    const next = redoStackRef.current.pop()
    const current = projectRef.current
    if (!next) return false

    isUndoingRef.current = true
    if (current) undoStackRef.current.push(current)

    setProject(next)
    projectRef.current = next
    persistProject(next)

    setCanUndoEditor(true)
    setCanRedoEditor(redoStackRef.current.length > 0)

    setTimeout(() => { isUndoingRef.current = false }, 0)
    return true
  }, [persistProject])

  // ─── FONCTIONS VOLUME ──────────────────────────────────────────────────

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
  }, [])

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
  }, [])

  useEffect(() => {
    masterGainRef.current = masterGain
    updateMasterGain(masterGain)
  }, [masterGain, updateMasterGain])

  // ─── FONCTIONS HELPER ──────────────────────────────────────────────────

  const generateUniqueId = useCallback((prefix) => {
    idCounterRef.current += 1
    return `${prefix}-${Date.now()}-${idCounterRef.current}`
  }, [])

  const findPreviousClip = useCallback((clip, track) => {
    if (!track || !track.clips) return null
    const previous = track.clips
      .filter(c => c.id !== clip.id && c.start < clip.start)
      .sort((a, b) => b.start - a.start)[0]
    return previous || null
  }, [])

  const calculateOverlap = useCallback((clipA, clipB) => {
    const durations = clipDurationsRef.current
    const endA = clipA.start + (durations[clipA.id] || clipA.duration || 3)
    return Math.max(0, endA - clipB.start)
  }, [])

  const getAudioDuration = useCallback(async (filePath) => {
    try {
      const fileUrl = filePath.startsWith('file://')
        ? filePath
        : 'file:///' + filePath.replace(/\\/g, '/')
      const response = await fetch(fileUrl)
      if (!response.ok) return 3
      const arrayBuffer = await response.arrayBuffer()
      const ctx = getSharedDurationCtx()
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {})
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      return audioBuffer.duration
    } catch (e) {
      return 3
    }
  }, [])

  // ─── CHARGEMENT DU PROJET ──────────────────────────────────────────────

  const loadProject = useCallback(async (projectData) => {
    if (!projectData) {
      setIsInitialized(true)
      return
    }

    const currentProject = projectRef.current
    const isSameProject = currentProject?.id === projectData.id
    if (isSameProject && initialLoadDoneRef.current) {
      projectRef.current = projectData
      setProject(projectData)
      setIsInitialized(true)
      return
    }

    if (currentProject?.id === projectData.id && currentProject?.tracks?.length === projectData.tracks?.length) {
      setIsInitialized(true)
      return
    }

    if (!projectData.name) projectData.name = 'Nouveau projet'

    // ✅ Chargement de projet = PAS d'historique (vidé)
    setProject(projectData)
    projectRef.current = projectData
    undoStackRef.current = []
    redoStackRef.current = []
    setCanUndoEditor(false)
    setCanRedoEditor(false)

    setSelectedClipId(null)
    setSelectedTrackId(null)
    setCurrentTime(0)
    setIsPlaying(false)
    setIsPaused(false)
    setIsDurationsLoaded(false)
    setIsInitialized(true)
    setSoloPlayClipId(null)

    try {
      await window.electronAPI.storeSet?.('currentEditorProjectId', projectData.id)
      persistProject(projectData)
    } catch (e) {
      console.warn('⚠️ [EditorContext] Erreur sauvegarde:', e)
    }

    if (projectData.loops) {
      setLoopState(projectData.loops)
      loopStateRef.current = projectData.loops
    }

    let maxDuration = 10
    if (projectData.tracks) {
      for (const track of projectData.tracks) {
        for (const clip of track.clips) {
          const duration = clip.duration || 3
          const end = (clip.start || 0) + duration
          if (end > maxDuration) maxDuration = end
        }
      }
      const td = Math.max(maxDuration + 2, 10)
      setTotalDuration(td)
      totalDurationRef.current = td
    }

    if (projectData.tracks) {
      const durations = {}
      for (const track of projectData.tracks) {
        for (const clip of track.clips) {
          if (clip.id) durations[clip.id] = clip.duration || 3
        }
      }
      setClipDurations(durations)
      clipDurationsRef.current = durations
      setIsDurationsLoaded(true)
    }
  }, [persistProject])

  // ─── INITIALISATION ─────────────────────────────────────────────────────

  useEffect(() => {
    if (initialLoadDoneRef.current || isLoadingRef.current) return
    isLoadingRef.current = true

    const init = async () => {
      try {
        let currentProjectId = null
        try {
          currentProjectId = await window.electronAPI.storeGet?.('currentEditorProjectId')
        } catch (e) {}

        let editorProject = null
        
        if (currentProjectId) {
          try {
            const result = await window.electronAPI.loadEditorProject?.(currentProjectId)
            if (result?.success) {
              editorProject = result.project
              log('📂 [EditorContext] Projet chargé depuis ID:', editorProject?.name)
            }
          } catch (e) {
            console.warn('Erreur chargement projet depuis ID:', e)
          }
        }
        
        // ✅ MIGRATION : si rien trouvé mais qu'un ancien format (singulier) existe
        if (!editorProject && store?.editorProject) {
          editorProject = store.editorProject
          if (editorProject?.id) {
            log('📂 [EditorContext] Migration depuis ancien format:', editorProject.name)
            try {
              await window.electronAPI.saveEditorProject?.(editorProject)
            } catch (e) {
              console.warn('Erreur migration:', e)
            }
          }
        }

        if (editorProject) {
          await loadProject(editorProject)
        } else {
          const newProject = await storeRef.current?.createEditorProject?.('Nouveau projet')
          if (newProject) {
            await loadProject(newProject)
          } else {
            const fallbackProject = {
              id: `project-${Date.now()}`,
              name: 'Nouveau projet',
              tracks: [],
              duration: 60,
              loops: { clips: {}, tracks: {}, timeline: { ...DEFAULT_TIMELINE_LOOP } },
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
            setProject(fallbackProject)
            projectRef.current = fallbackProject
            setTotalDuration(10)
            setIsInitialized(true)
          }
        }
      } catch (e) {
        console.error('❌ Erreur initialisation:', e)
        const fallbackProject = {
          id: `project-${Date.now()}`,
          name: 'Nouveau projet',
          tracks: [],
          duration: 60,
          loops: { clips: {}, tracks: {}, timeline: { ...DEFAULT_TIMELINE_LOOP } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        setProject(fallbackProject)
        projectRef.current = fallbackProject
        setTotalDuration(10)
        setIsInitialized(true)
      } finally {
        isLoadingRef.current = false
        initialLoadDoneRef.current = true
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── FONCTIONS PLAYBACK ─────────────────────────────────────────────────

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
  }, [loadAudioBuffer, findPreviousClip, calculateOverlap])

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

        const loopStateRef_ = loopStateRef.current
        const clipDurationsMap = clipDurationsRef.current
        const timelineLoop = loopStateRef_?.timeline || {
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
              if (loopStateRef_?.clips?.[clip.id]?.enabled) individualLoopClips.add(clip.id)
            }
          }

          for (const track of tracks) {
            if (track.muted) continue

            for (const clip of track.clips) {
              const duration = clipDurationsMap[clip.id] || clip.duration || 3
              const start = clip.start || 0
              const end = start + duration

              const isClipLooping = individualLoopClips.has(clip.id)
              const clipLoopData = loopStateRef_?.clips?.[clip.id]
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

          // Gestion des arrêts
          for (const clipId of playingClips) {
            if (!activeClipsThisFrame.has(clipId)) {
              let clip = null
              let isClipLooping = false
              for (const t of tracks) {
                const found = t.clips.find(c => c.id === clipId)
                if (found) {
                  clip = found
                  isClipLooping = loopStateRef_?.clips?.[clipId]?.enabled || false
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
  }, [playClip])

  // ─── PLAYBACK CONTROLS ─────────────────────────────────────────────────

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
  }, [startPlaybackLoop])

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
  }, [startPlaybackLoop])

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
  }, [startPlaybackLoop])

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
  }, [])

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
  }, [])

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(time, totalDurationRef.current))
    setCurrentTime(clamped)
    currentTimeRef.current = clamped

    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { entry.source.stop(); entry.source.disconnect() } catch (e) {}
    }
    audioSourcesRef.current = {}
    lastPlayedClipsRef.current = new Set()
  }, [])

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
  }, [pause, resume, play])

  // ─── FONCTIONS TRACK ───────────────────────────────────────────────────

  const addTrack = useCallback(async (name, color) => {
    try {
      let currentProject = projectRef.current

      if (!currentProject) {
        const newProject = {
          id: `project-${Date.now()}`,
          name: 'Nouveau projet',
          tracks: [],
          duration: 60,
          loops: { clips: {}, tracks: {}, timeline: { ...DEFAULT_TIMELINE_LOOP } },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        // Création initiale = pas d'historique
        setProject(newProject)
        projectRef.current = newProject
        currentProject = newProject
      }

      const trackIndex = currentProject.tracks?.length || 0
      const trackName = name || `Piste ${trackIndex + 1}`
      const trackColor = color || `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 50%)`

      const newTrack = {
        id: generateId('track'),
        name: trackName,
        color: trackColor,
        clips: [],
        volume: 1,
        muted: false,
        solo: false,
        effects: []
      }

      const updatedProject = {
        ...currentProject,
        tracks: [...(currentProject.tracks || []), newTrack],
        updatedAt: Date.now()
      }

      // ✅ Action utilisateur → historique
      commitProject(updatedProject)

      const durations = {}
      for (const track of updatedProject.tracks) {
        for (const clip of track.clips) {
          if (clip.id) durations[clip.id] = clip.duration || 3
        }
      }
      setClipDurations(durations)
      clipDurationsRef.current = durations

      setIsDirty(true)
      addToastRef.current?.(`${trackName} ajoutée`, 'success')
      return newTrack
    } catch (e) {
      addToastRef.current?.('Erreur lors de l\'ajout de la piste: ' + e.message, 'error')
      return null
    }
  }, [commitProject])

  const removeTrack = useCallback(async (trackId) => {
    const currentProject = projectRef.current
    if (!currentProject) {
      addToastRef.current?.('Aucun projet', 'error')
      return
    }

    const trackToRemove = currentProject.tracks.find(t => t.id === trackId)
    if (!trackToRemove) {
      addToastRef.current?.('Piste non trouvée', 'error')
      return
    }

    if (currentProject.tracks.length <= 1) {
      addToastRef.current?.('Impossible de supprimer la dernière piste', 'warning')
      return
    }

    if (trackToRemove.clips.length > 0) {
      const confirmed = window.confirm(
        `La piste "${trackToRemove.name}" contient ${trackToRemove.clips.length} clip(s). Voulez-vous vraiment la supprimer ?`
      )
      if (!confirmed) return
    }

    const updatedTracks = currentProject.tracks.filter(track => track.id !== trackId)
    const updatedProject = { ...currentProject, tracks: updatedTracks, updatedAt: Date.now() }

    commitProject(updatedProject)

    const durations = { ...clipDurationsRef.current }
    for (const clip of trackToRemove.clips) delete durations[clip.id]
    setClipDurations(durations)
    clipDurationsRef.current = durations

    setIsDirty(true)
    addToastRef.current?.(`Piste "${trackToRemove.name}" supprimée`, 'info')

    if (selectedClipIdRef.current && !updatedTracks.some(t => t.clips.some(c => c.id === selectedClipIdRef.current))) {
      setSelectedTrackId(null)
      setSelectedClipId(null)
    }
  }, [commitProject])

  const renameTrack = useCallback(async (trackId, newName) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track =>
        track.id === trackId ? { ...track, name: newName } : track
      ),
      updatedAt: Date.now()
    }
    commitProject(updatedProject)
    setIsDirty(true)
  }, [commitProject])

  const muteTrack = useCallback((trackId, muted) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track =>
        track.id === trackId ? { ...track, muted } : track
      ),
      updatedAt: Date.now()
    }
    commitProject(updatedProject)
    setIsDirty(true)
  }, [commitProject])

  const soloTrack = useCallback((trackId, solo) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id === trackId) return { ...track, solo }
        if (solo) return { ...track, muted: true, solo: false }
        return { ...track, solo: false }
      }),
      updatedAt: Date.now()
    }
    commitProject(updatedProject)
    setIsDirty(true)
  }, [commitProject])

  // ✅ skipHistory: true → le slider de volume piste déclenche 30 updates/s
  const setTrackVolume = useCallback((trackId, volume) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const clampedVolume = Math.max(0, Math.min(5, volume))
    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track =>
        track.id === trackId ? { ...track, volume: clampedVolume } : track
      ),
      updatedAt: Date.now()
    }
    // ✅ Pas d'historique pendant le drag du slider
    commitProject(updatedProject, { skipHistory: true })
    updateTrackVolume(trackId, clampedVolume)
    setIsDirty(true)
  }, [commitProject, updateTrackVolume])

  // ✅ NOUVEAU : Réorganisation des pistes (drag & drop)
  const reorderTracks = useCallback((startIndex, endIndex) => {
    const currentProject = projectRef.current
    if (!currentProject) return false

    const tracks = [...currentProject.tracks]
    if (startIndex < 0 || startIndex >= tracks.length) return false
    if (endIndex < 0 || endIndex >= tracks.length) return false
    if (startIndex === endIndex) return false

    const [moved] = tracks.splice(startIndex, 1)
    tracks.splice(endIndex, 0, moved)

    const updatedProject = {
      ...currentProject,
      tracks,
      updatedAt: Date.now()
    }
    commitProject(updatedProject)
    setIsDirty(true)
    return true
  }, [commitProject])

  // ─── FONCTIONS CLIP ────────────────────────────────────────────────────

  const addClip = useCallback(async (trackId, soundId, startPosition = null) => {
    const currentStore = storeRef.current
    if (!currentStore) {
      addToastRef.current?.('Store non disponible', 'error')
      return null
    }

    const sound = currentStore.sounds?.find(s => s.id === soundId)
    if (!sound) {
      addToastRef.current?.('Son non trouvé', 'error')
      return null
    }

    try {
      const clip = await currentStore.addClipToTrack?.(trackId, soundId, startPosition)
      const currentProject = projectRef.current

      if (clip && currentProject) {
        const updatedProject = {
          ...currentProject,
          tracks: currentProject.tracks.map(track =>
            track.id === trackId ? { ...track, clips: [...track.clips, clip] } : track
          ),
          updatedAt: Date.now()
        }
        commitProject(updatedProject)

        if (clip.duration) {
          const newDurations = { ...clipDurationsRef.current, [clip.id]: clip.duration }
          setClipDurations(newDurations)
          clipDurationsRef.current = newDurations
        }

        setIsDirty(true)
        addToastRef.current?.(`"${sound.name}" ajouté`, 'success')
        setSelectedClipId(clip.id)
        setSelectedTrackId(trackId)
        return clip
      }
      addToastRef.current?.('Erreur lors de l\'ajout du clip', 'error')
      return null
    } catch (e) {
      addToastRef.current?.(e.message || 'Erreur lors de l\'ajout du clip', 'error')
      return null
    }
  }, [commitProject])

  const addClipFromFile = useCallback(async (trackId, filePath, startPosition = null) => {
    if (!filePath) {
      addToastRef.current?.('Aucun fichier sélectionné', 'error')
      return null
    }

    try {
      const currentProject = projectRef.current
      const track = currentProject?.tracks?.find(t => t.id === trackId)
      if (!track) {
        addToastRef.current?.('Piste non trouvée', 'error')
        return null
      }

      const importResult = await window.electronAPI.importSoundFile(filePath)
      if (!importResult?.success) {
        addToastRef.current?.('Erreur lors de l\'import du fichier', 'error')
        return null
      }

      const fileName = filePath.split(/[\\/]/).pop() || 'Fichier audio'
      const actualDuration = await getAudioDuration(importResult.path)

      let actualStart = startPosition
      if (actualStart === null || actualStart === undefined) {
        if (track.clips.length > 0) {
          const lastClip = track.clips.reduce((max, clip) => {
            const clipEnd = clip.start + (clip.duration || 3)
            return clipEnd > max.end ? { start: clip.start, end: clipEnd } : max
          }, { start: 0, end: 0 })
          actualStart = lastClip.end + 0.5
        } else {
          actualStart = 0
        }
      }

      const newClip = {
        id: generateUniqueId('clip'),
        soundId: null,
        name: fileName,
        path: importResult.path,
        start: actualStart,
        duration: actualDuration,
        offset: 0,
        volume: 0,
        volumeDb: 0,
        effects: [],
        fadeIn: 0,
        fadeOut: 0,
        pitch: 0,
        speed: 1,
        isExternal: true
      }

      const updatedProject = {
        ...currentProject,
        tracks: currentProject.tracks.map(t => {
          if (t.id === trackId) {
            const clips = [...t.clips, newClip]
            clips.sort((a, b) => a.start - b.start)
            return { ...t, clips }
          }
          return t
        }),
        updatedAt: Date.now()
      }

      commitProject(updatedProject)

      const newDurations = { ...clipDurationsRef.current, [newClip.id]: actualDuration }
      setClipDurations(newDurations)
      clipDurationsRef.current = newDurations

      setIsDirty(true)
      addToastRef.current?.(`"${fileName}" importé`, 'success')
      setSelectedClipId(newClip.id)
      setSelectedTrackId(trackId)

      return newClip
    } catch (e) {
      addToastRef.current?.(e.message || 'Erreur lors de l\'import du fichier', 'error')
      return null
    }
  }, [commitProject, getAudioDuration, generateUniqueId])

  const removeClip = useCallback((trackId, clipId) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const track = currentProject.tracks.find(t => t.id === trackId)
    if (!track) return
    if (!track.clips.some(c => c.id === clipId)) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(t =>
        t.id === trackId ? { ...t, clips: t.clips.filter(c => c.id !== clipId) } : t
      ),
      updatedAt: Date.now()
    }

    const newDurations = { ...clipDurationsRef.current }
    delete newDurations[clipId]
    setClipDurations(newDurations)
    clipDurationsRef.current = newDurations

    // Nettoyer le loopState si le clip avait une boucle
    if (loopStateRef.current.clips[clipId]) {
      const updatedLoopState = {
        ...loopStateRef.current,
        clips: { ...loopStateRef.current.clips }
      }
      delete updatedLoopState.clips[clipId]
      setLoopState(updatedLoopState)
      loopStateRef.current = updatedLoopState

      const projectWithLoop = { ...updatedProject, loops: updatedLoopState }
      commitProject(projectWithLoop)
    } else {
      commitProject(updatedProject)
    }

    if (selectedClipIdRef.current === clipId) {
      setSelectedClipId(null)
      setSelectedTrackId(null)
    }

    setIsDirty(true)
    addToastRef.current?.('Clip supprimé', 'info')
  }, [commitProject])

  const updateClip = useCallback((trackId, clipId, updates, options = {}) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id !== clipId ? clip : { ...clip, ...updates }
          )
        }
      }),
      updatedAt: Date.now()
    }
    commitProject(updatedProject, options)
    setIsDirty(true)
  }, [commitProject])

  const duplicateClip = useCallback((trackId, clipId) => {
    const currentProject = projectRef.current
    if (!currentProject) return null

    const track = currentProject.tracks.find(t => t.id === trackId)
    if (!track) return null
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return null

    const duration = clipDurationsRef.current[clip.id] || clip.duration || 3

    const newClip = {
      ...clip,
      id: generateUniqueId('clip'),
      start: (clip.start || 0) + duration + 0.5,
      effects: (clip.effects || []).map(e => ({ ...e, id: generateUniqueId('effect') }))
    }

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(t => {
        if (t.id === trackId) {
          const clips = [...t.clips, newClip].sort((a, b) => a.start - b.start)
          return { ...t, clips }
        }
        return t
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)

    const newDurations = { ...clipDurationsRef.current, [newClip.id]: newClip.duration || 3 }
    setClipDurations(newDurations)
    clipDurationsRef.current = newDurations

    setIsDirty(true)
    addToastRef.current?.('Clip dupliqué', 'success')
    return newClip
  }, [commitProject, generateUniqueId])

  // ✅ Accepte options.skipHistory (utilisé pendant le drag)
  const moveClip = useCallback((trackId, clipId, newStart, newTrackId, options = {}) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    let sourceTrack = currentProject.tracks.find(t => t.id === trackId)
    let clipToMove = sourceTrack?.clips.find(c => c.id === clipId)

    if (!clipToMove) {
      for (const track of currentProject.tracks) {
        const clip = track.clips.find(c => c.id === clipId)
        if (clip) { clipToMove = clip; sourceTrack = track; break }
      }
    }
    if (!clipToMove) return

    const actualTrackId = sourceTrack?.id || trackId
    const targetTrackId = newTrackId || actualTrackId
    const clampedStart = Math.max(0, newStart)
    const updatedClip = { ...clipToMove, start: clampedStart }

    let finalTracks
    if (actualTrackId === targetTrackId) {
      finalTracks = currentProject.tracks.map(track => {
        if (track.id === actualTrackId) {
          const clips = track.clips
            .map(c => c.id === clipId ? updatedClip : c)
            .sort((a, b) => a.start - b.start)
          return { ...track, clips }
        }
        return track
      })
    } else {
      const without = currentProject.tracks.map(track =>
        track.id === actualTrackId ? { ...track, clips: track.clips.filter(c => c.id !== clipId) } : track
      )
      finalTracks = without.map(track => {
        if (track.id === targetTrackId) {
          const clips = [...track.clips, updatedClip].sort((a, b) => a.start - b.start)
          return { ...track, clips }
        }
        return track
      })
    }

    const updatedProject = { ...currentProject, tracks: finalTracks, updatedAt: Date.now() }
    commitProject(updatedProject, options)
    setIsDirty(true)

    if (updatedClip.duration) {
      const newDurations = { ...clipDurationsRef.current, [clipId]: updatedClip.duration }
      setClipDurations(newDurations)
      clipDurationsRef.current = newDurations
    }
  }, [commitProject])

  // ─── SELECTION ─────────────────────────────────────────────────────────

  const selectClip = useCallback((clipId, trackId) => {
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId)
  }, [])

  const deselectClip = useCallback(() => {
    setSelectedClipId(null)
    setSelectedTrackId(null)
  }, [])

  // ─── SPLIT CLIP ────────────────────────────────────────────────────────

  const splitClip = useCallback((trackId, clipId, splitTime) => {
    const currentProject = projectRef.current
    if (!currentProject) {
      addToastRef.current?.('Aucun projet', 'error')
      return null
    }

    const track = currentProject.tracks.find(t => t.id === trackId)
    if (!track) {
      addToastRef.current?.('Piste non trouvée', 'error')
      return null
    }

    const clipIndex = track.clips.findIndex(c => c.id === clipId)
    if (clipIndex === -1) {
      addToastRef.current?.('Clip non trouvé', 'error')
      return null
    }

    const clip = track.clips[clipIndex]
    const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
    const start = clip.start || 0
    const end = start + duration

    const clampedSplitTime = Math.max(start + 0.05, Math.min(end - 0.05, splitTime))
    if (clampedSplitTime - start < 0.05 || end - clampedSplitTime < 0.05) {
      addToastRef.current?.('Position de coupe trop proche du bord', 'warning')
      return null
    }

    const leftDuration = clampedSplitTime - start
    const rightDuration = end - clampedSplitTime
    const currentOffset = clip.offset || 0

    const leftClip = {
      ...clip,
      id: generateUniqueId('clip'),
      duration: leftDuration,
      offset: currentOffset,
      start,
      effects: clip.effects ? clip.effects.map(e => ({ ...e })) : [],
    }

    const rightClip = {
      ...clip,
      id: generateUniqueId('clip'),
      duration: rightDuration,
      offset: currentOffset + leftDuration,
      start: clampedSplitTime,
      effects: clip.effects ? clip.effects.map(e => ({ ...e })) : [],
    }

    if (leftClip.effects) {
      const fadeOut = leftClip.effects.find(e => e.type === 'fadeOut')
      if (fadeOut && fadeOut.params.duration > leftDuration * 0.5) {
        fadeOut.params.duration = Math.min(fadeOut.params.duration, leftDuration * 0.5)
      }
    }
    if (rightClip.effects) {
      const fadeIn = rightClip.effects.find(e => e.type === 'fadeIn')
      if (fadeIn && fadeIn.params.duration > rightDuration * 0.5) {
        fadeIn.params.duration = Math.min(fadeIn.params.duration, rightDuration * 0.5)
      }
    }

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(t => {
        if (t.id === trackId) {
          const newClips = [
            ...track.clips.slice(0, clipIndex),
            leftClip,
            rightClip,
            ...track.clips.slice(clipIndex + 1)
          ].sort((a, b) => a.start - b.start)
          return { ...t, clips: newClips }
        }
        return t
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)

    const newDurations = {
      ...clipDurationsRef.current,
      [leftClip.id]: leftDuration,
      [rightClip.id]: rightDuration,
    }
    setClipDurations(newDurations)
    clipDurationsRef.current = newDurations

    setIsDirty(true)
    addToastRef.current?.(`Clip "${clip.name}" coupé en deux`, 'success')
    selectClip(leftClip.id, trackId)

    return { leftClip, rightClip }
  }, [commitProject, selectClip, generateUniqueId])

  // ─── EFFETS ────────────────────────────────────────────────────────────

  const addEffectToClip = useCallback(async (trackId, clipId, effectType, params = {}) => {
    const currentProject = projectRef.current
    if (!currentProject) return null

    const effect = {
      id: generateUniqueId('effect'),
      type: effectType,
      params,
      enabled: true
    }

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id === clipId ? { ...clip, effects: [...(clip.effects || []), effect] } : clip
          )
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
    return effect
  }, [commitProject, generateUniqueId])

  const removeEffectFromClip = useCallback(async (trackId, clipId, effectId) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip =>
            clip.id === clipId
              ? { ...clip, effects: (clip.effects || []).filter(e => e.id !== effectId) }
              : clip
          )
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
  }, [commitProject])

  // ✅ skipHistory: true (drag de slider)
  const updateEffectParam = useCallback(async (trackId, clipId, effectId, param, value) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            return {
              ...clip,
              effects: (clip.effects || []).map(effect =>
                effect.id === effectId
                  ? { ...effect, params: { ...effect.params, [param]: value } }
                  : effect
              )
            }
          })
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject, { skipHistory: true })
    setIsDirty(true)
  }, [commitProject])

  const toggleEffect = useCallback(async (trackId, clipId, effectId, enabled) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip
            return {
              ...clip,
              effects: (clip.effects || []).map(effect =>
                effect.id === effectId ? { ...effect, enabled } : effect
              )
            }
          })
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
  }, [commitProject])

  // ✅ skipHistory: true (drag des poignées de fade)
  const setClipFade = useCallback((trackId, clipId, edge, duration) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const clampedDuration = Math.max(0.05, Math.min(10, duration))
    const effectType = edge === 'in' ? 'fadeIn' : 'fadeOut'

    const updatedProject = {
      ...currentProject,
      tracks: currentProject.tracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== clipId) return clip

            const existingEffect = (clip.effects || []).find(e => e.type === effectType)

            if (existingEffect) {
              return {
                ...clip,
                effects: (clip.effects || []).map(e =>
                  e.type === effectType
                    ? {
                        ...e,
                        params: { ...e.params, duration: clampedDuration },
                        enabled: clampedDuration > 0.05
                      }
                    : e
                )
              }
            }
            return {
              ...clip,
              effects: [
                ...(clip.effects || []),
                {
                  id: generateUniqueId('effect'),
                  type: effectType,
                  params: { duration: clampedDuration },
                  enabled: clampedDuration > 0.05
                }
              ]
            }
          })
        }
      }),
      updatedAt: Date.now()
    }

    commitProject(updatedProject, { skipHistory: true })
    setIsDirty(true)
  }, [commitProject, generateUniqueId])

  // ─── BOUCLE CLIP ───────────────────────────────────────────────────────

  const toggleClipLoop = useCallback((clipId, options = {}) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const track = currentProject.tracks.find(t => t.clips.some(c => c.id === clipId))
    if (!track) return
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return

    const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
    const start = clip.start || 0
    const currentLoopState = loopStateRef.current

    if (options.enabled === false || currentLoopState.clips[clipId]?.enabled) {
      const updatedLoopState = {
        ...currentLoopState,
        clips: {
          ...currentLoopState.clips,
          [clipId]: { ...currentLoopState.clips[clipId], enabled: false }
        }
      }
      setLoopState(updatedLoopState)
      loopStateRef.current = updatedLoopState

      const updatedProject = { ...currentProject, loops: updatedLoopState, updatedAt: Date.now() }
      commitProject(updatedProject)
      addToastRef.current?.(`Boucle désactivée sur "${clip.name}"`, 'info')
      return
    }

    const arrowColor = options.arrowColor || '#22c55e'
    const loopMode = options.loopMode || 'endOfTrack'
    const cycleCount = options.cycleCount || 3
    const manualDuration = options.manualDuration || 10

    let loopEnd = totalDurationRef.current

    if (loopMode === 'endOfTrack') {
      const normalClips = currentProject.tracks.flatMap(t => t.clips)
        .filter(c => c.id !== clipId && !currentLoopState.clips[c.id]?.enabled)
      if (normalClips.length > 0) {
        const lastNormalClip = normalClips.reduce((max, c) => {
          const end = (c.start || 0) + (clipDurationsRef.current[c.id] || c.duration || 3)
          return end > max ? end : max
        }, 0)
        loopEnd = Math.max(lastNormalClip + 2, start + duration * 2)
      } else {
        loopEnd = Math.max(totalDurationRef.current, start + duration * 4)
      }
    } else if (loopMode === 'cycles') {
      loopEnd = start + (duration * cycleCount)
    } else if (loopMode === 'manualDuration') {
      loopEnd = Math.max(start + duration, start + manualDuration)
    } else if (loopMode === 'manualClick') {
      loopEnd = Math.max(start + duration, totalDurationRef.current)
    }

    const updatedLoopState = {
      ...currentLoopState,
      clips: {
        ...currentLoopState.clips,
        [clipId]: {
          enabled: true,
          start,
          end: loopEnd,
          visual: 'arrow',
          arrowColor,
          followClip: true,
          loopMode,
          cycleCount: loopMode === 'cycles' ? cycleCount : undefined,
          manualDuration: loopMode === 'manualDuration' ? manualDuration : undefined,
          manualEndTime: loopMode === 'manualClick' ? null : undefined,
          cycleCountCurrent: 0,
          totalCycles: loopMode === 'cycles' ? cycleCount : undefined,
        }
      }
    }
    setLoopState(updatedLoopState)
    loopStateRef.current = updatedLoopState

    const updatedProject = { ...currentProject, loops: updatedLoopState, updatedAt: Date.now() }
    commitProject(updatedProject)

    let toastMessage = `Boucle activée sur "${clip.name}"`
    if (loopMode === 'cycles') toastMessage += ` (${cycleCount} cycles)`
    else if (loopMode === 'endOfTrack') toastMessage += ` (jusqu'à la fin de la piste)`
    else if (loopMode === 'manualDuration') toastMessage += ` (${manualDuration}s)`
    else if (loopMode === 'manualClick') toastMessage += ` (clic sur la timeline)`
    addToastRef.current?.(toastMessage, 'success')
  }, [commitProject])

  const updateClipLoopOptions = useCallback((clipId, options) => {
    const currentProject = projectRef.current
    const currentLoopState = loopStateRef.current
    if (!currentProject || !currentLoopState.clips[clipId]) return

    const updatedLoopState = {
      ...currentLoopState,
      clips: {
        ...currentLoopState.clips,
        [clipId]: { ...currentLoopState.clips[clipId], ...options }
      }
    }
    setLoopState(updatedLoopState)
    loopStateRef.current = updatedLoopState

    const updatedProject = { ...currentProject, loops: updatedLoopState, updatedAt: Date.now() }
    commitProject(updatedProject)
  }, [commitProject])

  // ─── BOUCLE TIMELINE ───────────────────────────────────────────────────

  const setTimelineLoop = useCallback((options) => {
    const currentProject = projectRef.current
    const currentLoopState = loopStateRef.current
    if (!currentProject) return

    const updatedLoopState = {
      ...currentLoopState,
      timeline: { ...currentLoopState.timeline, ...options }
    }
    setLoopState(updatedLoopState)
    loopStateRef.current = updatedLoopState

    const updatedProject = { ...currentProject, loops: updatedLoopState, updatedAt: Date.now() }
    commitProject(updatedProject)
    setIsDirty(true)
  }, [commitProject])

  const toggleTimelineLoop = useCallback(() => {
    const timeline = loopStateRef.current.timeline
    const newEnabled = !timeline.enabled

    if (newEnabled) {
      const start = timeline.start
      const end = timeline.end
      if (start >= end) {
        setTimelineLoop({ enabled: true, end: Math.max(start + 1, 10) })
        return
      }
    }
    setTimelineLoop({ enabled: newEnabled })
  }, [setTimelineLoop])

  // ─── OVERLAY ───────────────────────────────────────────────────────────

  const cancelActionOverlay = useCallback(() => {
    setActionOverlay(INITIAL_OVERLAY_STATE)
    actionOverlayRef.current = INITIAL_OVERLAY_STATE
  }, [])

  const activateLoopManualClick = useCallback((clipId, trackId, options = {}) => {
    const currentProject = projectRef.current
    const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)

    const newOverlay = {
      type: 'loop-clip',
      clipId,
      trackId,
      options: { arrowColor: options.arrowColor || '#22c55e', loopMode: 'manualClick', ...options },
      step: 0,
      totalSteps: 1,
      clipName: clip?.name || null,
      data: {}
    }
    setActionOverlay(newOverlay)
    actionOverlayRef.current = newOverlay
    addToastRef.current?.('🖱️ Mode clic activé', 'info')
  }, [])

  const activateTimelineLoopManualClick = useCallback(() => {
    const newOverlay = {
      type: 'loop-timeline',
      clipId: null,
      trackId: null,
      options: null,
      step: 0,
      totalSteps: 3,
      clipName: null,
      data: { start: null, end: null, duration: null }
    }
    setActionOverlay(newOverlay)
    actionOverlayRef.current = newOverlay
    addToastRef.current?.('🖱️ Mode clic activé - Étape 1/3', 'info')
  }, [])

  const activateSplitManualClick = useCallback((clipId, trackId) => {
    const currentProject = projectRef.current
    const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)

    const newOverlay = {
      type: 'split',
      clipId,
      trackId,
      options: null,
      step: 0,
      totalSteps: 1,
      clipName: clip?.name || null,
      data: {}
    }
    setActionOverlay(newOverlay)
    actionOverlayRef.current = newOverlay
    addToastRef.current?.('✂️ Mode clic activé', 'info')
  }, [])

  const executeActionOverlay = useCallback((clickTime) => {
    const overlay = actionOverlayRef.current
    if (!overlay.type) return

    const { type, clipId, trackId, options, step, data } = overlay
    const clampedTime = Math.max(0, Math.min(clickTime, totalDurationRef.current))

    if (type === 'loop-clip') {
      const currentProject = projectRef.current
      const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        addToastRef.current?.('Clip non trouvé', 'error')
        cancelActionOverlay()
        return
      }
      const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const manualDuration = Math.max(duration, clampedTime - start)

      toggleClipLoop(clipId, { ...options, loopMode: 'manualDuration', manualDuration })
      addToastRef.current?.(`🔄 Boucle définie jusqu'à ${manualDuration.toFixed(1)}s`, 'success')
      cancelActionOverlay()
    } else if (type === 'loop-timeline') {
      const newData = { ...data }

      if (step === 0) {
        newData.start = clampedTime
        const next = { ...overlay, step: 1, data: newData }
        setActionOverlay(next)
        actionOverlayRef.current = next
        addToastRef.current?.(`🖱️ Début défini à ${clampedTime.toFixed(1)}s (2/3)`, 'info')
      } else if (step === 1) {
        if (clampedTime > data.start) {
          newData.end = clampedTime
          const next = { ...overlay, step: 2, data: newData }
          setActionOverlay(next)
          actionOverlayRef.current = next
          addToastRef.current?.(`🖱️ Fin définie à ${clampedTime.toFixed(1)}s (3/3)`, 'info')
        } else {
          addToastRef.current?.('⚠️ La fin doit être après le début', 'warning')
        }
      } else if (step === 2) {
        const duration = clampedTime - data.start
        if (duration > 0.1) {
          setTimelineLoop({
            enabled: true,
            start: data.start,
            end: data.end || clampedTime,
            manualDuration: duration,
            durationMode: 'manualDuration'
          })
          addToastRef.current?.(`✅ Boucle définie: ${data.start.toFixed(1)}s → ${(data.end || clampedTime).toFixed(1)}s`, 'success')
          cancelActionOverlay()
        } else {
          addToastRef.current?.('⚠️ La durée doit être d\'au moins 0.1s', 'warning')
        }
      }
    } else if (type === 'split') {
      const currentProject = projectRef.current
      const clip = currentProject?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        addToastRef.current?.('Clip non trouvé', 'error')
        cancelActionOverlay()
        return
      }
      const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const end = start + duration

      if (clampedTime > start + 0.05 && clampedTime < end - 0.05) {
        splitClip(trackId, clipId, clampedTime)
        addToastRef.current?.(`✂️ Clip coupé à ${clampedTime.toFixed(1)}s`, 'success')
      } else {
        addToastRef.current?.('❌ Position invalide pour couper le clip', 'warning')
      }
      cancelActionOverlay()
    }
  }, [toggleClipLoop, setTimelineLoop, splitClip, cancelActionOverlay])

  // ─── LOOP REGION ───────────────────────────────────────────────────────

  const setLoopRegionFn = useCallback((start, end) => {
    setLoopRegion(prev => ({
      ...prev,
      start: Math.max(0, start),
      end: Math.min(totalDurationRef.current, end)
    }))
  }, [])

  const toggleLoop = useCallback(() => {
    toggleTimelineLoop()
  }, [toggleTimelineLoop])

  const clearLoop = useCallback(() => {
    setLoopRegion({ enabled: false, start: 0, end: 10 })
    setTimelineLoop({ enabled: false, start: 0, end: 10 })
  }, [setTimelineLoop])

  // ─── ZOOM ──────────────────────────────────────────────────────────────

  const handleZoomChange = useCallback((newZoom) => {
    setZoomLevel(Math.max(0.05, Math.min(10, newZoom)))
  }, [])

  // ─── MARKERS ───────────────────────────────────────────────────────────

  const addMarker = useCallback((markerData) => {
    const currentProject = projectRef.current
    if (!currentProject) return null

    const newMarker = {
      id: generateId('marker'),
      name: markerData.name || `Marqueur ${(currentProject.markers?.length || 0) + 1}`,
      time: markerData.time || currentTimeRef.current,
      color: markerData.color || '#3b82f6'
    }

    const updatedProject = {
      ...currentProject,
      markers: [...(currentProject.markers || []), newMarker],
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
    addToastRef.current?.(`Marqueur "${newMarker.name}" ajouté`, 'success')
    return newMarker
  }, [commitProject])

  const removeMarker = useCallback((markerId) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const markerToRemove = currentProject.markers?.find(m => m.id === markerId)
    if (!markerToRemove) return

    const updatedProject = {
      ...currentProject,
      markers: (currentProject.markers || []).filter(m => m.id !== markerId),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
    addToastRef.current?.(`Marqueur "${markerToRemove.name}" supprimé`, 'info')
  }, [commitProject])

  const updateMarker = useCallback((markerId, updates) => {
    const currentProject = projectRef.current
    if (!currentProject) return

    const updatedProject = {
      ...currentProject,
      markers: (currentProject.markers || []).map(m =>
        m.id === markerId ? { ...m, ...updates } : m
      ),
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
  }, [commitProject])

  const navigateToMarker = useCallback((time) => {
    seek(time)
  }, [seek])

  // ✅ NOUVEAU : Renommer le projet
  const updateEditorProjectName = useCallback((newName) => {
    const currentProject = projectRef.current
    if (!currentProject) return false
    if (!newName || !newName.trim()) return false

    const trimmed = newName.trim()
    if (trimmed === currentProject.name) return true

    const updatedProject = {
      ...currentProject,
      name: trimmed,
      updatedAt: Date.now()
    }

    commitProject(updatedProject)
    setIsDirty(true)
    return true
  }, [commitProject])

  // ─── VALUE ─────────────────────────────────────────────────────────────

  const value = useMemo(() => ({
    project,
    setProject,
    tracks: project?.tracks || [],
    selectedClipId,
    setSelectedClipId,
    selectedTrackId,
    setSelectedTrackId,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    isPaused,
    setIsPaused,
    isPlayingRef,
    isPausedRef,
    currentTimeRef,
    zoomLevel,
    setZoomLevel,
    snapEnabled,
    setSnapEnabled,
    loopRegion,
    setLoopRegion: setLoopRegionFn,
    autoCrossfade,
    setAutoCrossfade,
    clipDurations,
    setClipDurations,
    waveformData,
    setWaveformData,
    isDurationsLoaded,
    isInitialized,
    totalDuration,
    isLoading,
    isDirty,
    isAutoSaving,
    stopAtTime,
    setStopAtTime,
    soloPlayClipId,
    setSoloPlayClipId,
    masterGain,
    setMasterGain,
    actionOverlay,
    isActionOverlayActive: actionOverlay.type !== null,
    cancelActionOverlay,
    executeActionOverlay,
    loopState,
    setLoopState,
    toggleClipLoop,
    updateClipLoopOptions,
    setTimelineLoop,
    toggleTimelineLoop,
    activateTimelineLoopManualClick,
    isPendingAction: actionOverlay.type !== null,
    pendingAction: actionOverlay,
    activateLoopManualClick,
    activateSplitManualClick,
    // ✅ NOUVEAU : Historique undo/redo
    canUndoEditor,
    canRedoEditor,
    undoEditor,
    redoEditor,
    pushEditorHistoryCheckpoint,
    // ✅ NOUVEAU : Réorganisation + Rename
    reorderTracks,
    updateEditorProjectName,
    // Fonctions principales
    addTrack,
    removeTrack,
    renameTrack,
    muteTrack,
    soloTrack,
    setTrackVolume,
    addClip,
    addClipFromFile,
    removeClip,
    updateClip,
    duplicateClip,
    moveClip,
    splitClip,
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    toggleEffect,
    setClipFade,
    play,
    pause,
    resume,
    stop,
    seek,
    togglePlay,
    playClipOnly,
    selectClip,
    deselectClip,
    toggleLoop,
    clearLoop,
    handleZoomChange,
    markers: project?.markers || [],
    addMarker,
    removeMarker,
    updateMarker,
    navigateToMarker,
    store: storeRef.current,
    addToast,
    t,
  }), [
    project,
    selectedClipId,
    selectedTrackId,
    currentTime,
    isPlaying,
    isPaused,
    zoomLevel,
    snapEnabled,
    loopRegion,
    autoCrossfade,
    clipDurations,
    waveformData,
    isDurationsLoaded,
    isInitialized,
    totalDuration,
    isLoading,
    isDirty,
    isAutoSaving,
    stopAtTime,
    soloPlayClipId,
    masterGain,
    actionOverlay,
    loopState,
    canUndoEditor,
    canRedoEditor,
    setLoopRegionFn,
    cancelActionOverlay,
    executeActionOverlay,
    toggleClipLoop,
    updateClipLoopOptions,
    setTimelineLoop,
    toggleTimelineLoop,
    activateTimelineLoopManualClick,
    activateLoopManualClick,
    activateSplitManualClick,
    undoEditor,
    redoEditor,
    pushEditorHistoryCheckpoint,
    reorderTracks,
    updateEditorProjectName,
    addTrack,
    removeTrack,
    renameTrack,
    muteTrack,
    soloTrack,
    setTrackVolume,
    addClip,
    addClipFromFile,
    removeClip,
    updateClip,
    duplicateClip,
    moveClip,
    splitClip,
    addEffectToClip,
    removeEffectFromClip,
    updateEffectParam,
    toggleEffect,
    setClipFade,
    play,
    pause,
    resume,
    stop,
    seek,
    togglePlay,
    playClipOnly,
    selectClip,
    deselectClip,
    toggleLoop,
    clearLoop,
    handleZoomChange,
    addMarker,
    removeMarker,
    updateMarker,
    navigateToMarker,
    addToast,
    t,
  ])

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return context
}

export default EditorContext