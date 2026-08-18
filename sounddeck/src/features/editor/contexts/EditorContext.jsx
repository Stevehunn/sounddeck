// src/features/editor/contexts/EditorContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

const EditorContext = createContext(null)

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

  // ✅ ÉTATS POUR LE MODE D'ATTENTE (clic sur timeline)
  const [pendingAction, setPendingAction] = useState(null)
  const [isPendingAction, setIsPendingAction] = useState(false)

  // ✅ BOUCLES
  const [loopState, setLoopState] = useState({
    clips: {},
    tracks: {},
    timeline: {
      enabled: false,
      start: 0,
      end: 10,
      color: '#7C6FF7'
    }
  })
  
  // ─── REFS ──────────────────────────────────────────────────────────────
  const isLoadingRef = useRef(false)
  const initialLoadDoneRef = useRef(false)
  const audioContextRef = useRef(null)
  const audioSourcesRef = useRef({})
  const animationRef = useRef(null)
  const projectRef = useRef(null)
  const lastPlayedClipsRef = useRef(new Set())
  const currentTimeRef = useRef(0)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const selectedClipIdRef = useRef(null)
  const stopAtTimeRef = useRef(null)
  const soloPlayClipIdRef = useRef(null)
  const idCounterRef = useRef(0)

  // Mettre à jour les refs
  useEffect(() => { projectRef.current = project }, [project])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  useEffect(() => { selectedClipIdRef.current = selectedClipId }, [selectedClipId])
  useEffect(() => { stopAtTimeRef.current = stopAtTime }, [stopAtTime])
  useEffect(() => { soloPlayClipIdRef.current = soloPlayClipId }, [soloPlayClipId])

  // ─── FONCTIONS HELPER ──────────────────────────────────────────────

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
    const endA = clipA.start + (clipDurations[clipA.id] || clipA.duration || 3)
    const startB = clipB.start
    return Math.max(0, endA - startB)
  }, [clipDurations])

  const getAudioDuration = useCallback(async (filePath) => {
    try {
      const fileUrl = filePath.startsWith('file://') 
        ? filePath 
        : 'file:///' + filePath.replace(/\\/g, '/')
      
      const response = await fetch(fileUrl)
      if (!response.ok) return 3
      
      const arrayBuffer = await response.arrayBuffer()
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const duration = audioBuffer.duration
      await audioContext.close()
      return duration
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

    if (project?.id === projectData.id && project?.tracks?.length === projectData.tracks?.length) {
      setIsInitialized(true)
      return
    }

    setProject(projectData)
    projectRef.current = projectData
    setSelectedClipId(null)
    setSelectedTrackId(null)
    setCurrentTime(0)
    setIsPlaying(false)
    setIsPaused(false)
    setIsDurationsLoaded(false)
    setIsInitialized(true)
    setSoloPlayClipId(null)
    
    if (projectData.loops) {
      console.log('🔄 [EditorContext] Chargement des boucles:', projectData.loops)
      setLoopState(projectData.loops)
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
      setTotalDuration(Math.max(maxDuration + 2, 10))
    }
    
    if (projectData.tracks) {
      const durations = {}
      for (const track of projectData.tracks) {
        for (const clip of track.clips) {
          if (clip.id) {
            durations[clip.id] = clip.duration || 3
          }
        }
      }
      setClipDurations(durations)
      setIsDurationsLoaded(true)
    }
  }, [project])

  // ─── INITIALISATION ──────────────────────────────────────────────────────

  useEffect(() => {
    if (initialLoadDoneRef.current || isLoadingRef.current) return
    
    isLoadingRef.current = true
    
    const init = async () => {
      try {
        const editorProject = store?.editorProject
        
        if (editorProject) {
          await loadProject(editorProject)
        } else {
          const newProject = await store?.createEditorProject?.('Nouveau projet')
          if (newProject) {
            await loadProject(newProject)
          } else {
            const fallbackProject = {
              id: `project-${Date.now()}`,
              name: 'Nouveau projet',
              tracks: [],
              duration: 60,
              loops: {
                clips: {},
                tracks: {},
                timeline: { enabled: false, start: 0, end: 10, color: '#7C6FF7' }
              },
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
        const fallbackProject = {
          id: `project-${Date.now()}`,
          name: 'Nouveau projet',
          tracks: [],
          duration: 60,
          loops: {
            clips: {},
            tracks: {},
            timeline: { enabled: false, start: 0, end: 10, color: '#7C6FF7' }
          },
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
  }, [store, loadProject])

  // ─── FONCTIONS PLAYBACK ──────────────────────────────────────────────
  
  const loadAudioBuffer = useCallback(async (filePath) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      
      const fileUrl = filePath.startsWith('file://') 
        ? filePath 
        : 'file:///' + filePath.replace(/\\/g, '/')
      
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      return audioBuffer
    } catch (e) {
      return null
    }
  }, [])

  const playClip = useCallback(async (clip, track) => {
    if (!clip?.path) {
      console.warn('⚠️ [playClip] clip.path est undefined pour:', clip?.name)
      return
    }
    
    console.log(`🎵 [playClip] Tentative de lecture: ${clip.name} (${clip.id}) path: ${clip.path}`)
    
    try {
      const buffer = await loadAudioBuffer(clip.path)
      if (!buffer) {
        console.warn(`⚠️ [playClip] Buffer null pour: ${clip.name}`)
        return
      }
      
      console.log(`🎵 [playClip] Buffer chargé: ${clip.name} durée: ${buffer.duration.toFixed(2)}s`)
      
      const ctx = audioContextRef.current
      if (!ctx) {
        console.warn('⚠️ [playClip] AudioContext null')
        return
      }
      
      let sourceBuffer = buffer
      
      if (clip.effects && clip.effects.length > 0) {
        const activeEffects = clip.effects.filter(e => e.enabled)
        if (activeEffects.length > 0) {
          try {
            const { applyEffectsToBuffer } = await import('@shared/utils/realTimeEffects')
            const processedBuffer = applyEffectsToBuffer(buffer, clip.effects, ctx.sampleRate, true)
            if (processedBuffer) {
              sourceBuffer = processedBuffer
              console.log(`🎵 [playClip] Effets appliqués pour: ${clip.name}`)
            }
          } catch (e) {
            console.warn('⚠️ [playClip] Erreur effets:', e)
          }
        }
      }
      
      const source = ctx.createBufferSource()
      source.buffer = sourceBuffer
      
      const gainNode = ctx.createGain()
      const trackVolume = track?.volume || 1
      gainNode.gain.value = trackVolume
      
      if (autoCrossfade) {
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
            gainNode.gain.linearRampToValueAtTime(trackVolume, now + fadeDuration)
          }
        }
      }
      
      source.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      const clipOffset = clip.offset || 0
      const timeInClip = Math.max(0, currentTime - (clip.start || 0))
      const offset = Math.min(clipOffset + timeInClip, sourceBuffer.duration - 0.01)
      
      console.log(`🎵 [playClip] Lecture: ${clip.name} offset=${offset.toFixed(2)}s, timeInClip=${timeInClip.toFixed(2)}s, duration=${sourceBuffer.duration.toFixed(2)}s`)
      
      source.start(0, offset)
      audioSourcesRef.current[clip.id] = { source, gainNode }
      
      source.onended = () => {
        console.log(`⏹️ [playClip] Fin du clip: ${clip.name}`)
        delete audioSourcesRef.current[clip.id]
      }
      
    } catch (e) {
      console.error('❌ [playClip] Erreur:', e)
    }
  }, [loadAudioBuffer, currentTime, autoCrossfade, findPreviousClip, calculateOverlap])

  // ✅ startPlaybackLoop - CORRIGÉE (version finale avec gestion des lancements multiples)
  const startPlaybackLoop = useCallback(() => {
    console.log('[LOOP-FIX] 🔄 startPlaybackLoop() appelée')
    
    // ✅ Arrêter l'ancienne boucle
    if (animationRef.current) {
      console.log('[LOOP-FIX] 🛑 Arrêt de l\'ancienne animation')
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    let lastTime = performance.now()
    let accumulated = 0
    let isLoopRunning = true
    let frameCount = 0

    // ✅ Suivi des clips en cours de démarrage (pour éviter les doubles lancements)
    const startingClips = new Set()
    // ✅ Suivi des clips démarrés dans ce frame
    const clipsStartedThisFrame = new Set()

    const loop = () => {
      // ✅ Vérifier l'état de lecture
      if (!isPlayingRef.current || isPausedRef.current) {
        if (isLoopRunning) {
          animationRef.current = requestAnimationFrame(loop)
        }
        return
      }

      const now = performance.now()
      const delta = (now - lastTime) / 1000
      lastTime = now
      accumulated += delta

      if (accumulated >= 0.016) {
        let newTime = currentTimeRef.current + accumulated
        accumulated = 0
        frameCount++
        
        // ✅ Réinitialiser les clips démarrés ce frame
        clipsStartedThisFrame.clear()
        
        const loopStart = loopRegion.start || 0
        const loopEnd = loopRegion.end || totalDuration
        
        // ✅ Gestion de la boucle de la timeline
        if (loopRegion.enabled && newTime >= loopEnd) {
          console.log(`[LOOP-FIX] 🔄 Boucle TIMELINE: retour à ${loopStart.toFixed(2)}s`)
          newTime = loopStart
          
          // ✅ Arrêter TOUTES les sources audio
          for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
            try { 
              console.log(`[LOOP-FIX]   - Arrêt de la source (timeline loop): ${id}`)
              entry.source.stop() 
              entry.source.disconnect()
            } catch (e) {}
          }
          audioSourcesRef.current = {}
          lastPlayedClipsRef.current = new Set()
          startingClips.clear()
        }
        
        if (projectRef.current?.tracks) {
          const tracks = projectRef.current.tracks
          const activeClips = new Set()
          const soloClipId = soloPlayClipIdRef.current
          
          // ✅ LOG : État des boucles à chaque frame (toutes les 10 frames)
          if (frameCount % 10 === 0) {
            console.log('[LOOP-FIX] 📊 État des boucles - frame', frameCount, {
              loopStateClips: Object.keys(loopState?.clips || {}).filter(k => loopState.clips[k]?.enabled),
              audioSources: Object.keys(audioSourcesRef.current),
              lastPlayed: Array.from(lastPlayedClipsRef.current),
              startingClips: Array.from(startingClips)
            })
          }
          
          for (const track of tracks) {
            if (track.muted) continue
            
            for (const clip of track.clips) {
              const duration = clipDurations[clip.id] || clip.duration || 3
              const start = clip.start || 0
              const end = start + duration
              
              const isClipLooping = loopState?.clips?.[clip.id]?.enabled || false
              const clipLoopData = loopState?.clips?.[clip.id]
              const clipLoopStart = clipLoopData?.start || start
              const clipLoopEnd = clipLoopData?.end || end
              
              let shouldPlay = false
              let clipTime = newTime
              let shouldRestart = false
              
              // ✅ Si le clip est en boucle
              if (isClipLooping) {
                if (newTime >= clipLoopStart && newTime < clipLoopEnd) {
                  const elapsedInLoop = newTime - clipLoopStart
                  const clipDuration = end - start
                  const positionInClip = elapsedInLoop % clipDuration
                  
                  const shouldPlayCycle = positionInClip < clipDuration
                  
                  if (shouldPlayCycle) {
                    shouldPlay = true
                    clipTime = clipLoopStart + positionInClip
                    
                    // ✅ Vérifier si le clip est déjà en cours de lecture OU en cours de démarrage
                    const isCurrentlyPlaying = audioSourcesRef.current[clip.id] !== undefined
                    const isStarting = startingClips.has(clip.id)
                    const isNearCycleStart = positionInClip < 0.05
                    
                    // ✅ LOG détaillé pour le clip bouclé
                    if (isNearCycleStart || !isCurrentlyPlaying) {
                      console.log(`[LOOP-FIX] 🔁 Clip "${clip.name}" - position: ${positionInClip.toFixed(3)}s, isPlaying: ${isCurrentlyPlaying}, isStarting: ${isStarting}, nearStart: ${isNearCycleStart}`)
                    }
                    
                    // ✅ [FIX] - On ne relance le clip que s'il n'est PAS déjà en cours de lecture ET PAS en cours de démarrage
                    if (!isCurrentlyPlaying && !isStarting) {
                      // ✅ Vérifier si le clip n'a pas déjà été démarré dans ce frame
                      if (!clipsStartedThisFrame.has(clip.id)) {
                        shouldRestart = true
                        // ✅ Marquer le clip comme "en cours de démarrage"
                        startingClips.add(clip.id)
                        clipsStartedThisFrame.add(clip.id)
                        console.log(`[LOOP-FIX] 🚀 ${clip.name} - Nouveau lancement (cycle ${Math.floor(elapsedInLoop / clipDuration) + 1})`)
                      } else {
                        console.log(`[LOOP-FIX] ⏭️ ${clip.name} - Déjà lancé dans ce frame, ignoré`)
                      }
                    }
                  }
                } else if (newTime >= clipLoopEnd) {
                  // ✅ Fin de la boucle - arrêter le clip
                  if (lastPlayedClipsRef.current.has(clip.id)) {
                    console.log(`[LOOP-FIX] 🛑 ${clip.name} - Fin de la boucle à ${newTime.toFixed(2)}s`)
                    const entry = audioSourcesRef.current[clip.id]
                    if (entry) {
                      try { 
                        entry.source.stop() 
                        entry.source.disconnect()
                      } catch (e) {}
                      delete audioSourcesRef.current[clip.id]
                    }
                    lastPlayedClipsRef.current.delete(clip.id)
                    startingClips.delete(clip.id)
                  }
                }
              } else if (soloClipId) {
                if (clip.id === soloClipId && newTime >= start && newTime < end) {
                  shouldPlay = true
                }
              } else if (newTime >= start && newTime < end) {
                shouldPlay = true
              }
              
              if (shouldPlay) {
                activeClips.add(clip.id)
                
                if (!isClipLooping && !lastPlayedClipsRef.current.has(clip.id)) {
                  // ✅ Clip normal - lancement unique
                  console.log(`[LOOP-FIX] ▶️ ${clip.name} (${clip.id}) - Lancement à ${clipTime.toFixed(2)}s`)
                  playClip(clip, track)
                  lastPlayedClipsRef.current.add(clip.id)
                } else if (isClipLooping && shouldRestart) {
                  // ✅ Clip en boucle - relancement
                  console.log(`[LOOP-FIX] ▶️ ${clip.name} (${clip.id}) - Lancement à ${clipTime.toFixed(2)}s [BOUCLE]`)
                  playClip(clip, track)
                  lastPlayedClipsRef.current.add(clip.id)
                  
                  // ✅ Planifier la suppression du flag "en cours de démarrage" après un court délai
                  setTimeout(() => {
                    startingClips.delete(clip.id)
                  }, 100)
                }
              } else if (lastPlayedClipsRef.current.has(clip.id) && !isClipLooping) {
                // ✅ Clip normal qui n'est plus actif - arrêt
                console.log(`[LOOP-FIX] ⏹️ ${clip.name} - Arrêt (fini) à ${newTime.toFixed(2)}s`)
                const entry = audioSourcesRef.current[clip.id]
                if (entry) {
                  try { 
                    entry.source.stop() 
                    entry.source.disconnect()
                  } catch (e) {}
                  delete audioSourcesRef.current[clip.id]
                }
                lastPlayedClipsRef.current.delete(clip.id)
                startingClips.delete(clip.id)
              }
            }
          }
          
          // ✅ Nettoyer les clips qui ne sont plus actifs (sécurité supplémentaire)
          for (const clipId of lastPlayedClipsRef.current) {
            if (!activeClips.has(clipId) && !clipsStartedThisFrame.has(clipId)) {
              const entry = audioSourcesRef.current[clipId]
              if (entry) {
                try { 
                  entry.source.stop() 
                  entry.source.disconnect()
                } catch (e) {}
                delete audioSourcesRef.current[clipId]
              }
              lastPlayedClipsRef.current.delete(clipId)
              startingClips.delete(clipId)
            }
          }
        }
        
        const shouldStopGlobal = (stopAtTimeRef.current !== null && newTime >= stopAtTimeRef.current) || newTime >= totalDuration
        
        if (shouldStopGlobal) {
          const stopPosition = stopAtTimeRef.current !== null ? stopAtTimeRef.current : totalDuration
          console.log(`[LOOP-FIX] ⏹️ Fin de la lecture globale à ${newTime.toFixed(2)}s`)
          setIsPlaying(false)
          setCurrentTime(stopPosition)
          setStopAtTime(null)
          stopAtTimeRef.current = null
          setSoloPlayClipId(null)
          soloPlayClipIdRef.current = null
          for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
            try { 
              console.log(`[LOOP-FIX]   - Arrêt de la source (fin globale): ${id}`)
              entry.source.stop() 
              entry.source.disconnect()
            } catch (e) {}
          }
          audioSourcesRef.current = {}
          lastPlayedClipsRef.current = new Set()
          startingClips.clear()
          isLoopRunning = false
          return
        }
        
        setCurrentTime(newTime)
      }
      
      if (isLoopRunning) {
        animationRef.current = requestAnimationFrame(loop)
      }
    }
    
    lastTime = performance.now()
    accumulated = 0
    isLoopRunning = true
    
    // ✅ NETTOYER TOUT AVANT DE DÉMARRER
    console.log('[LOOP-FIX] 🧹 Nettoyage avant démarrage')
    lastPlayedClipsRef.current = new Set()
    startingClips.clear()
    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { 
        console.log('[LOOP-FIX]   - Arrêt de la source:', id)
        entry.source.stop() 
        entry.source.disconnect()
      } catch (e) {}
    }
    audioSourcesRef.current = {}
    
    animationRef.current = requestAnimationFrame(loop)
    console.log('[LOOP-FIX] ✅ Animation démarrée')
  }, [totalDuration, playClip, clipDurations, loopRegion, loopState])

  // ─── PLAYBACK CONTROLS ──────────────────────────────────────────────

    const play = useCallback(async () => {
    console.log('[LOOP-FIX] 🎬 play() appelé - RÉINITIALISATION TOTALE')
    
    setStopAtTime(null)
    stopAtTimeRef.current = null
    
    // ✅ RÉINITIALISER TOUT AVANT DE JOUER
    // Arrêter tous les sons en cours
    console.log('[LOOP-FIX] 🔇 Arrêt de toutes les sources audio')
    for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
      try { 
        console.log('[LOOP-FIX]   - Arrêt de la source:', id)
        source.stop() 
      } catch (e) {}
    }
    audioSourcesRef.current = {}
    lastPlayedClipsRef.current = new Set()
    console.log('[LOOP-FIX] ✅ Sources arrêtées, lastPlayedClips vidé')
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      
      // ✅ Remettre le temps à 0 si on joue depuis le début
      setCurrentTime(0)
      currentTimeRef.current = 0
      
      setIsPlaying(true)
      setIsPaused(false)
      
      console.log('[LOOP-FIX] ▶️ Lecture démarrée, appel à startPlaybackLoop dans 50ms')
      
      setTimeout(() => {
        startPlaybackLoop()
      }, 50)
      
    } catch (e) {
      console.error('[LOOP-FIX] ❌ Erreur dans play():', e)
      setIsPlaying(false)
    }
  }, [startPlaybackLoop])


  const playClipOnly = useCallback(async (clip, trackId) => {
    setSoloPlayClipId(clip.id)
    soloPlayClipIdRef.current = clip.id
    
    const clipStart = clip.start || 0
    const clipDuration = clipDurations[clip.id] || clip.duration || 3
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
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      
      setIsPlaying(true)
      setIsPaused(false)
      lastPlayedClipsRef.current = new Set()
      
      setTimeout(() => {
        startPlaybackLoop()
      }, 50)
      
    } catch (e) {
      setIsPlaying(false)
      setSoloPlayClipId(null)
      soloPlayClipIdRef.current = null
    }
  }, [clipDurations, startPlaybackLoop])

  const resume = useCallback(async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
    }
    
    setIsPaused(false)
    setIsPlaying(true)
    
    setTimeout(() => {
      startPlaybackLoop()
    }, 50)
  }, [startPlaybackLoop])

  const pause = useCallback(() => {
    setIsPaused(true)
    setIsPlaying(false)
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend().catch(() => {})
    }
    
    for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
      try { source.stop() } catch (e) {}
    }
    audioSourcesRef.current = {}
  }, [])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
    lastPlayedClipsRef.current = new Set()
    setStopAtTime(null)
    stopAtTimeRef.current = null
    
    setSoloPlayClipId(null)
    soloPlayClipIdRef.current = null
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
      try { source.stop() } catch (e) {}
    }
    audioSourcesRef.current = {}
  }, [])

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(time, totalDuration))
    setCurrentTime(clamped)
    currentTimeRef.current = clamped
    
    for (const [id, { source }] of Object.entries(audioSourcesRef.current)) {
      try { 
        source.stop() 
        source.disconnect() 
      } catch (e) {}
    }
    audioSourcesRef.current = {}
    lastPlayedClipsRef.current = new Set()
  }, [totalDuration])

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause()
    } else if (isPaused) {
      resume()
    } else {
      setSoloPlayClipId(null)
      soloPlayClipIdRef.current = null
      play()
    }
  }, [isPlaying, isPaused, play, pause, resume])

  // ─── FONCTIONS TRACK ──────────────────────────────────────────────────

  const addTrack = useCallback(async (name, color) => {
    try {
      let currentProject = project || projectRef.current
      
      if (!currentProject) {
        const newProject = {
          id: `project-${Date.now()}`,
          name: 'Nouveau projet',
          tracks: [],
          duration: 60,
          loops: {
            clips: {},
            tracks: {},
            timeline: { enabled: false, start: 0, end: 10, color: '#7C6FF7' }
          },
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        setProject(newProject)
        projectRef.current = newProject
        currentProject = newProject
      }
      
      const trackIndex = currentProject.tracks?.length || 0
      const trackName = name || `Piste ${trackIndex + 1}`
      const trackColor = color || `hsl(${(trackIndex * 30 + 200) % 360}, 60%, 50%)`
      
      const newTrack = {
        id: `track-${Date.now()}`,
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
      
      setProject(updatedProject)
      projectRef.current = updatedProject
      
      if (store?.updateEditorProject) {
        await store.updateEditorProject(updatedProject)
      }
      
      const durations = {}
      for (const track of updatedProject.tracks) {
        for (const clip of track.clips) {
          if (clip.id) {
            durations[clip.id] = clip.duration || 3
          }
        }
      }
      setClipDurations(durations)
      
      setIsDirty(true)
      addToast?.(`${trackName} ajoutée`, 'success')
      return newTrack
      
    } catch (e) {
      addToast?.('Erreur lors de l\'ajout de la piste: ' + e.message, 'error')
      return null
    }
  }, [project, addToast, store])

  const removeTrack = useCallback(async (trackId) => {
    if (!project) {
      addToast?.('Aucun projet', 'error')
      return
    }
    
    const trackToRemove = project.tracks.find(t => t.id === trackId)
    if (!trackToRemove) {
      addToast?.('Piste non trouvée', 'error')
      return
    }
    
    if (project.tracks.length <= 1) {
      addToast?.('Impossible de supprimer la dernière piste', 'warning')
      return
    }
    
    if (trackToRemove.clips.length > 0) {
      const confirmed = window.confirm(
        `La piste "${trackToRemove.name}" contient ${trackToRemove.clips.length} clip(s). Voulez-vous vraiment la supprimer ?`
      )
      if (!confirmed) return
    }
    
    const updatedTracks = project.tracks.filter(track => track.id !== trackId)
    
    const updatedProject = {
      ...project,
      tracks: updatedTracks,
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    const durations = { ...clipDurations }
    for (const clip of trackToRemove.clips) {
      delete durations[clip.id]
    }
    setClipDurations(durations)
    
    setIsDirty(true)
    addToast?.(`Piste "${trackToRemove.name}" supprimée`, 'info')
    
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null)
      setSelectedClipId(null)
    }
  }, [project, addToast, store, clipDurations, selectedTrackId])

  const renameTrack = useCallback(async (trackId, newName) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, name: newName }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  const muteTrack = useCallback((trackId, muted) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, muted }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  const soloTrack = useCallback((trackId, solo) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, solo }
        } else if (solo) {
          return { ...track, muted: true, solo: false }
        } else {
          return { ...track, solo: false }
        }
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  const setTrackVolume = useCallback((trackId, volume) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return { ...track, volume }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  // ─── FONCTIONS CLIP ──────────────────────────────────────────────────

  const addClip = useCallback(async (trackId, soundId, startPosition = null) => {
    if (!store) {
      addToast?.('Store non disponible', 'error')
      return null
    }
    
    const sound = store.sounds?.find(s => s.id === soundId)
    if (!sound) {
      addToast?.('Son non trouvé', 'error')
      return null
    }

    try {
      const clip = await store.addClipToTrack?.(trackId, soundId, startPosition)
      
      if (clip && project) {
        const updatedProject = {
          ...project,
          tracks: project.tracks.map(track => {
            if (track.id === trackId) {
              return {
                ...track,
                clips: [...track.clips, clip]
              }
            }
            return track
          }),
          updatedAt: Date.now()
        }
        setProject(updatedProject)
        projectRef.current = updatedProject
        
        if (clip.duration) {
          setClipDurations(prev => ({
            ...prev,
            [clip.id]: clip.duration
          }))
        }
        
        if (store?.updateEditorProject) {
          await store.updateEditorProject(updatedProject)
        }
        
        setIsDirty(true)
        addToast?.(`"${sound.name}" ajouté`, 'success')
        setSelectedClipId(clip.id)
        setSelectedTrackId(trackId)
        return clip
      } else {
        addToast?.('Erreur lors de l\'ajout du clip', 'error')
        return null
      }
    } catch (e) {
      addToast?.(e.message || 'Erreur lors de l\'ajout du clip', 'error')
      return null
    }
  }, [store, project, addToast])

  const addClipFromFile = useCallback(async (trackId, filePath, startPosition = null) => {
    if (!filePath) {
      addToast?.('Aucun fichier sélectionné', 'error')
      return null
    }

    try {
      const track = project?.tracks?.find(t => t.id === trackId)
      if (!track) {
        addToast?.('Piste non trouvée', 'error')
        return null
      }

      const importResult = await window.electronAPI.importSoundFile(filePath)
      if (!importResult?.success) {
        addToast?.('Erreur lors de l\'import du fichier', 'error')
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
        ...project,
        tracks: project.tracks.map(t => {
          if (t.id === trackId) {
            const clips = [...t.clips, newClip]
            clips.sort((a, b) => a.start - b.start)
            return { ...t, clips }
          }
          return t
        }),
        updatedAt: Date.now()
      }

      setProject(updatedProject)
      projectRef.current = updatedProject
      
      setClipDurations(prev => ({
        ...prev,
        [newClip.id]: actualDuration
      }))
      
      if (store?.updateEditorProject) {
        await store.updateEditorProject(updatedProject)
      }
      
      setIsDirty(true)
      addToast?.(`"${fileName}" ${t('editorFileImported')}`, 'success')
      setSelectedClipId(newClip.id)
      setSelectedTrackId(trackId)
      
      return newClip
      
    } catch (e) {
      addToast?.(e.message || 'Erreur lors de l\'import du fichier', 'error')
      return null
    }
  }, [project, addToast, store, t, getAudioDuration, generateUniqueId])

  const removeClip = useCallback((trackId, clipId) => {
    if (!project) return
    
    const track = project.tracks.find(t => t.id === trackId)
    if (!track) return
    
    const clipExists = track.clips.some(c => c.id === clipId)
    if (!clipExists) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            clips: t.clips.filter(c => c.id !== clipId)
          }
        }
        return t
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    setClipDurations(prev => {
      const newDurations = { ...prev }
      delete newDurations[clipId]
      return newDurations
    })
    
    if (loopState.clips[clipId]) {
      const updatedLoopState = {
        ...loopState,
        clips: { ...loopState.clips }
      }
      delete updatedLoopState.clips[clipId]
      setLoopState(updatedLoopState)
      
      const projectWithLoopUpdate = {
        ...updatedProject,
        loops: updatedLoopState
      }
      setProject(projectWithLoopUpdate)
      projectRef.current = projectWithLoopUpdate
      
      if (store?.updateEditorProject) {
        store.updateEditorProject(projectWithLoopUpdate).catch(() => {})
      }
    }
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    if (selectedClipId === clipId) {
      setSelectedClipId(null)
      setSelectedTrackId(null)
    }
    
    setIsDirty(true)
    addToast?.('Clip supprimé', 'info')
  }, [project, selectedClipId, addToast, store, loopState])

  const updateClip = useCallback((trackId, clipId, updates) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id !== clipId) return clip
              return { ...clip, ...updates }
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  const duplicateClip = useCallback((trackId, clipId) => {
    if (!project) return null
    
    const track = project.tracks.find(t => t.id === trackId)
    if (!track) return null
    
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) return null
    
    const duration = clipDurations[clip.id] || clip.duration || 3
    
    const newClip = {
      ...clip,
      id: generateUniqueId('clip'),
      start: (clip.start || 0) + duration + 0.5,
      effects: (clip.effects || []).map(e => ({ 
        ...e, 
        id: generateUniqueId('effect') 
      }))
    }
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(t => {
        if (t.id === trackId) {
          const clips = [...t.clips, newClip]
          clips.sort((a, b) => a.start - b.start)
          return { ...t, clips }
        }
        return t
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    setClipDurations(prev => ({
      ...prev,
      [newClip.id]: newClip.duration || 3
    }))
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
    addToast?.('Clip dupliqué', 'success')
    return newClip
  }, [project, clipDurations, addToast, store, generateUniqueId])

  const moveClip = useCallback((trackId, clipId, newStart, newTrackId, options = {}) => {
    if (!project) return
    
    let sourceTrack = project.tracks.find(t => t.id === trackId)
    let clipToMove = sourceTrack?.clips.find(c => c.id === clipId)
    
    if (!clipToMove) {
      for (const track of project.tracks) {
        const clip = track.clips.find(c => c.id === clipId)
        if (clip) {
          clipToMove = clip
          sourceTrack = track
          break
        }
      }
    }
    
    if (!clipToMove) return
    
    const actualTrackId = sourceTrack?.id || trackId
    const targetTrackId = newTrackId || actualTrackId
    const clampedStart = Math.max(0, newStart)
    
    const updatedClip = { ...clipToMove, start: clampedStart }
    
    let finalTracks
    
    if (actualTrackId === targetTrackId) {
      finalTracks = project.tracks.map(track => {
        if (track.id === actualTrackId) {
          const clips = track.clips.map(c => 
            c.id === clipId ? updatedClip : c
          )
          clips.sort((a, b) => a.start - b.start)
          return { ...track, clips }
        }
        return track
      })
    } else {
      const tracksWithoutClip = project.tracks.map(track => {
        if (track.id === actualTrackId) {
          return { ...track, clips: track.clips.filter(c => c.id !== clipId) }
        }
        return track
      })
      
      finalTracks = tracksWithoutClip.map(track => {
        if (track.id === targetTrackId) {
          const clips = [...track.clips, updatedClip]
          clips.sort((a, b) => a.start - b.start)
          return { ...track, clips }
        }
        return track
      })
    }
    
    const updatedProject = {
      ...project,
      tracks: finalTracks,
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    setIsDirty(true)
    
    const newDurations = { ...clipDurations }
    if (updatedClip.duration) {
      newDurations[clipId] = updatedClip.duration
    }
    setClipDurations(newDurations)
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
  }, [project, store, clipDurations])

  // ─── FONCTIONS SELECTION ──────────────────────────────────────────────

  const selectClip = useCallback((clipId, trackId) => {
    setSelectedClipId(clipId)
    setSelectedTrackId(trackId)
  }, [])

  const deselectClip = useCallback(() => {
    setSelectedClipId(null)
    setSelectedTrackId(null)
  }, [])

  // ─── SPLIT CLIP ──────────────────────────────────────────────────────

  const splitClip = useCallback((trackId, clipId, splitTime) => {
    if (!project) {
      addToast?.('Aucun projet', 'error')
      return null
    }
    
    const track = project.tracks.find(t => t.id === trackId)
    if (!track) {
      addToast?.('Piste non trouvée', 'error')
      return null
    }
    
    const clipIndex = track.clips.findIndex(c => c.id === clipId)
    if (clipIndex === -1) {
      addToast?.('Clip non trouvé', 'error')
      return null
    }
    
    const clip = track.clips[clipIndex]
    const duration = clipDurations[clip.id] || clip.duration || 3
    const start = clip.start || 0
    const end = start + duration
    
    const clampedSplitTime = Math.max(start + 0.05, Math.min(end - 0.05, splitTime))
    
    if (clampedSplitTime - start < 0.05 || end - clampedSplitTime < 0.05) {
      addToast?.('Position de coupe trop proche du bord', 'warning')
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
      start: start,
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
      const fadeOutEffect = leftClip.effects.find(e => e.type === 'fadeOut')
      if (fadeOutEffect && fadeOutEffect.params.duration > leftDuration * 0.5) {
        fadeOutEffect.params.duration = Math.min(fadeOutEffect.params.duration, leftDuration * 0.5)
      }
    }
    
    if (rightClip.effects) {
      const fadeInEffect = rightClip.effects.find(e => e.type === 'fadeIn')
      if (fadeInEffect && fadeInEffect.params.duration > rightDuration * 0.5) {
        fadeInEffect.params.duration = Math.min(fadeInEffect.params.duration, rightDuration * 0.5)
      }
    }
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(t => {
        if (t.id === trackId) {
          const newClips = [
            ...track.clips.slice(0, clipIndex),
            leftClip,
            rightClip,
            ...track.clips.slice(clipIndex + 1)
          ]
          newClips.sort((a, b) => a.start - b.start)
          return { ...t, clips: newClips }
        }
        return t
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    setClipDurations(prev => ({
      ...prev,
      [leftClip.id]: leftDuration,
      [rightClip.id]: rightDuration,
    }))
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
    addToast?.(`Clip "${clip.name}" coupé en deux`, 'success')
    selectClip(leftClip.id, trackId)
    
    return { leftClip, rightClip }
  }, [project, clipDurations, store, addToast, selectClip, generateUniqueId])

  // ─── FONCTIONS EFFETS ──────────────────────────────────────────────────

  const addEffectToClip = useCallback(async (trackId, clipId, effectType, params = {}) => {
    if (!project) return null
    
    const effect = {
      id: generateUniqueId('effect'),
      type: effectType,
      params: params,
      enabled: true
    }
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: [...(clip.effects || []), effect]
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
    return effect
  }, [project, store, generateUniqueId])

  const removeEffectFromClip = useCallback(async (trackId, clipId, effectId) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: (clip.effects || []).filter(e => e.id !== effectId)
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  const updateEffectParam = useCallback(async (trackId, clipId, effectId, param, value) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: (clip.effects || []).map(effect => {
                    if (effect.id === effectId) {
                      return {
                        ...effect,
                        params: { ...effect.params, [param]: value }
                      }
                    }
                    return effect
                  })
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  const toggleEffect = useCallback(async (trackId, clipId, effectId, enabled) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                return {
                  ...clip,
                  effects: (clip.effects || []).map(effect => {
                    if (effect.id === effectId) {
                      return { ...effect, enabled }
                    }
                    return effect
                  })
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store])

  const setClipFade = useCallback(async (trackId, clipId, edge, duration) => {
    if (!project) return
    
    const clampedDuration = Math.max(0.05, Math.min(10, duration))
    const effectType = edge === 'in' ? 'fadeIn' : 'fadeOut'
    
    const updatedProject = {
      ...project,
      tracks: project.tracks.map(track => {
        if (track.id === trackId) {
          return {
            ...track,
            clips: track.clips.map(clip => {
              if (clip.id === clipId) {
                const existingEffect = (clip.effects || []).find(e => e.type === effectType)
                
                if (existingEffect) {
                  return {
                    ...clip,
                    effects: (clip.effects || []).map(e => {
                      if (e.type === effectType) {
                        return {
                          ...e,
                          params: { duration: clampedDuration },
                          enabled: clampedDuration > 0.05
                        }
                      }
                      return e
                    })
                  }
                } else {
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
                }
              }
              return clip
            })
          }
        }
        return track
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      await store.updateEditorProject(updatedProject)
    }
    
    setIsDirty(true)
  }, [project, store, generateUniqueId])

  // ─── FONCTIONS BOUCLE ──────────────────────────────────────────────────

  const toggleClipLoop = useCallback((clipId, options = {}) => {
    console.log('🔄 [EditorContext] toggleClipLoop appelé:', { clipId, options })
    
    if (!project) {
      console.warn('🔄 [EditorContext] Aucun projet')
      return
    }
    
    const track = project.tracks.find(t => 
      t.clips.some(c => c.id === clipId)
    )
    if (!track) {
      console.warn('🔄 [EditorContext] Piste non trouvée pour le clip:', clipId)
      return
    }
    
    const clip = track.clips.find(c => c.id === clipId)
    if (!clip) {
      console.warn('🔄 [EditorContext] Clip non trouvé:', clipId)
      return
    }
    
    const duration = clipDurations[clip.id] || clip.duration || 3
    const start = clip.start || 0
    
    console.log('🔄 [EditorContext] Clip trouvé:', clip.name, 'durée:', duration, 'début:', start)
    
    if (options.enabled === false) {
      console.log('🔄 [EditorContext] Désactivation de la boucle pour:', clip.name)
      
      const updatedLoopState = {
        ...loopState,
        clips: {
          ...loopState.clips,
          [clipId]: {
            ...loopState.clips[clipId],
            enabled: false
          }
        }
      }
      setLoopState(updatedLoopState)
      
      const updatedProject = {
        ...project,
        loops: updatedLoopState,
        updatedAt: Date.now()
      }
      setProject(updatedProject)
      projectRef.current = updatedProject
      
      if (store?.updateEditorProject) {
        store.updateEditorProject(updatedProject).catch(() => {})
      }
      
      addToast?.(`Boucle désactivée sur "${clip.name}"`, 'info')
      return
    }
    
    if (loopState.clips[clipId]?.enabled) {
      console.log('🔄 [EditorContext] Désactivation de la boucle (toggle) pour:', clip.name)
      
      const updatedLoopState = {
        ...loopState,
        clips: {
          ...loopState.clips,
          [clipId]: {
            ...loopState.clips[clipId],
            enabled: false
          }
        }
      }
      setLoopState(updatedLoopState)
      
      const updatedProject = {
        ...project,
        loops: updatedLoopState,
        updatedAt: Date.now()
      }
      setProject(updatedProject)
      projectRef.current = updatedProject
      
      if (store?.updateEditorProject) {
        store.updateEditorProject(updatedProject).catch(() => {})
      }
      
      addToast?.(`Boucle désactivée sur "${clip.name}"`, 'info')
      return
    }
    
    const arrowColor = options.arrowColor || '#22c55e'
    const loopMode = options.loopMode || 'endOfTrack'
    const cycleCount = options.cycleCount || 3
    const manualDuration = options.manualDuration || 10
    
    let loopEnd = totalDuration
    
    if (loopMode === 'endOfTrack') {
      const normalClips = project.tracks.flatMap(t => t.clips)
        .filter(c => c.id !== clipId && !loopState.clips[c.id]?.enabled)
      
      if (normalClips.length > 0) {
        const lastNormalClip = normalClips.reduce((max, c) => {
          const end = (c.start || 0) + (clipDurations[c.id] || c.duration || 3)
          return end > max ? end : max
        }, 0)
        loopEnd = Math.max(lastNormalClip + 2, start + duration * 2)
      } else {
        loopEnd = Math.max(totalDuration, start + duration * 4)
      }
    } else if (loopMode === 'cycles') {
      loopEnd = start + (duration * cycleCount)
    } else if (loopMode === 'manualDuration') {
      loopEnd = Math.max(start + duration, start + manualDuration)
    } else if (loopMode === 'manualClick') {
      loopEnd = Math.max(start + duration, totalDuration)
    }
    
    console.log('🔄 [EditorContext] Activation de la boucle pour:', clip.name, 'loopEnd:', loopEnd, 'mode:', loopMode, 'cycleCount:', cycleCount)
    
    const updatedLoopState = {
      ...loopState,
      clips: {
        ...loopState.clips,
        [clipId]: {
          enabled: true,
          start: start,
          end: loopEnd,
          visual: 'arrow',
          arrowColor: arrowColor,
          followClip: true,
          loopMode: loopMode,
          cycleCount: loopMode === 'cycles' ? cycleCount : undefined,
          manualDuration: loopMode === 'manualDuration' ? manualDuration : undefined,
          manualEndTime: loopMode === 'manualClick' ? null : undefined,
          cycleCountCurrent: 0,
          totalCycles: loopMode === 'cycles' ? cycleCount : undefined,
        }
      }
    }
    setLoopState(updatedLoopState)
    
    const updatedProject = {
      ...project,
      loops: updatedLoopState,
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    let toastMessage = `Boucle activée sur "${clip.name}"`
    if (loopMode === 'cycles') {
      toastMessage += ` (${cycleCount} cycles)`
    } else if (loopMode === 'endOfTrack') {
      toastMessage += ` (jusqu'à la fin de la piste)`
    } else if (loopMode === 'manualDuration') {
      toastMessage += ` (${manualDuration}s)`
    } else if (loopMode === 'manualClick') {
      toastMessage += ` (clic sur la timeline)`
    }
    addToast?.(toastMessage, 'success')
  }, [project, loopState, clipDurations, totalDuration, store, addToast])

  const updateClipLoopOptions = useCallback((clipId, options) => {
    if (!project || !loopState.clips[clipId]) return
    
    const updatedLoopState = {
      ...loopState,
      clips: {
        ...loopState.clips,
        [clipId]: {
          ...loopState.clips[clipId],
          ...options
        }
      }
    }
    setLoopState(updatedLoopState)
    
    const updatedProject = {
      ...project,
      loops: updatedLoopState,
      updatedAt: Date.now()
    }
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
  }, [project, loopState, store])

  // ─── FONCTIONS POUR LE MODE D'ATTENTE ──────────────────────────────────

  const activateLoopManualClick = useCallback((clipId, trackId, options = {}) => {
    console.log('🖱️ [EditorContext] Activation du mode clic pour boucle:', { clipId, trackId, options })
    
    if (isPendingAction) {
      cancelPendingAction()
    }
    
    setPendingAction({
      type: 'loop',
      clipId,
      trackId,
      options: {
        arrowColor: options.arrowColor || '#22c55e',
        loopMode: 'manualClick',
        ...options
      }
    })
    setIsPendingAction(true)
    
    addToast?.('🖱️ Cliquez sur la timeline pour définir la fin de la boucle', 'info')
  }, [isPendingAction, addToast])

  const activateSplitManualClick = useCallback((clipId, trackId) => {
    console.log('✂️ [EditorContext] Activation du mode clic pour split:', { clipId, trackId })
    
    if (isPendingAction) {
      cancelPendingAction()
    }
    
    setPendingAction({
      type: 'split',
      clipId,
      trackId
    })
    setIsPendingAction(true)
    
    addToast?.('✂️ Cliquez sur la timeline pour couper le clip', 'info')
  }, [isPendingAction, addToast])

  const cancelPendingAction = useCallback(() => {
    console.log('🖱️ [EditorContext] Annulation du mode clic')
    setPendingAction(null)
    setIsPendingAction(false)
  }, [])

  // ✅ executePendingAction - utilise toggleClipLoop qui est maintenant défini
  const executePendingAction = useCallback((clickTime) => {
    if (!isPendingAction || !pendingAction) {
      return
    }
    
    const { type, clipId, trackId, options } = pendingAction
    const clampedTime = Math.max(0, Math.min(clickTime, totalDuration))
    
    console.log(`🖱️ [EditorContext] Exécution de l'action ${type} à ${clampedTime}s`, { clipId, trackId })
    
    if (type === 'loop') {
      const clip = project?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        addToast?.('Clip non trouvé', 'error')
        setIsPendingAction(false)
        setPendingAction(null)
        return
      }
      
      const duration = clipDurations[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const manualDuration = Math.max(duration, clampedTime - start)
      
      console.log('🖱️ [EditorContext] Boucle manuelle:', { start, manualDuration, clampedTime })
      
      const updatedOptions = {
        ...options,
        loopMode: 'manualDuration',
        manualDuration: manualDuration
      }
      
      toggleClipLoop(clipId, updatedOptions)
      
      setIsPendingAction(false)
      setPendingAction(null)
      
      addToast?.(`🖱️ Boucle définie jusqu'à ${manualDuration.toFixed(1)}s`, 'success')
      
    } else if (type === 'split') {
      const clip = project?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        addToast?.('Clip non trouvé', 'error')
        setIsPendingAction(false)
        setPendingAction(null)
        return
      }
      
      const duration = clipDurations[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const end = start + duration
      
      if (clampedTime > start + 0.05 && clampedTime < end - 0.05) {
        splitClip(trackId, clipId, clampedTime)
        addToast?.(`✂️ Clip coupé à ${clampedTime.toFixed(1)}s`, 'success')
      } else {
        addToast?.('❌ Position invalide pour couper le clip', 'warning')
      }
      
      setIsPendingAction(false)
      setPendingAction(null)
    }
  }, [isPendingAction, pendingAction, totalDuration, project, clipDurations, toggleClipLoop, splitClip, addToast])

  // ─── FONCTIONS LOOP ──────────────────────────────────────────────────

  const setLoopRegionFn = useCallback((start, end) => {
    setLoopRegion(prev => ({
      ...prev,
      start: Math.max(0, start),
      end: Math.min(totalDuration, end)
    }))
  }, [totalDuration])

  const toggleLoop = useCallback(() => {
    setLoopRegion(prev => ({
      ...prev,
      enabled: !prev.enabled
    }))
  }, [])

  const clearLoop = useCallback(() => {
    setLoopRegion({ enabled: false, start: 0, end: 10 })
  }, [])

  // ─── ZOOM ─────────────────────────────────────────────────────────────

  const handleZoomChange = useCallback((newZoom) => {
    setZoomLevel(Math.max(0.05, Math.min(10, newZoom)))
  }, [])

  // ─── FONCTIONS MARKERS ──────────────────────────────────────────────────

  const addMarker = useCallback((markerData) => {
    if (!project) return null
    
    const newMarker = {
      id: `marker-${Date.now()}-${idCounterRef.current}`,
      name: markerData.name || `Marqueur ${(project.markers?.length || 0) + 1}`,
      time: markerData.time || currentTime,
      color: markerData.color || '#3b82f6'
    }
    idCounterRef.current += 1
    
    const updatedProject = {
      ...project,
      markers: [...(project.markers || []), newMarker],
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
    addToast?.(`Marqueur "${newMarker.name}" ajouté`, 'success')
    return newMarker
  }, [project, store, currentTime, addToast])

  const removeMarker = useCallback((markerId) => {
    if (!project) return
    
    const markerToRemove = project.markers?.find(m => m.id === markerId)
    if (!markerToRemove) return
    
    const updatedProject = {
      ...project,
      markers: (project.markers || []).filter(m => m.id !== markerId),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
    addToast?.(`Marqueur "${markerToRemove.name}" supprimé`, 'info')
  }, [project, store, addToast])

  const updateMarker = useCallback((markerId, updates) => {
    if (!project) return
    
    const updatedProject = {
      ...project,
      markers: (project.markers || []).map(marker => {
        if (marker.id === markerId) {
          return { ...marker, ...updates }
        }
        return marker
      }),
      updatedAt: Date.now()
    }
    
    setProject(updatedProject)
    projectRef.current = updatedProject
    
    if (store?.updateEditorProject) {
      store.updateEditorProject(updatedProject).catch(() => {})
    }
    
    setIsDirty(true)
  }, [project, store])

  const navigateToMarker = useCallback((time) => {
    seek(time)
  }, [seek])

  // ─── VALUE ──────────────────────────────────────────────────────────────

  const value = {
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
    // ✅ Boucles
    loopState,
    setLoopState,
    toggleClipLoop,
    updateClipLoopOptions,
    // ✅ Mode d'attente
    isPendingAction,
    pendingAction,
    activateLoopManualClick,
    activateSplitManualClick,
    cancelPendingAction,
    executePendingAction,
    // ✅ Fonctions
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
    store,
    addToast,
    t,
  }

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