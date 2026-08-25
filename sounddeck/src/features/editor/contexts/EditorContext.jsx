// src/features/editor/contexts/EditorContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

const EditorContext = createContext(null)

// ✅ CONSTANTES POUR LA BOUCLE GÉNÉRALE
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

// ✅ ÉTAT INITIAL DE L'OVERLAY UNIFIÉ
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

  // ✅ VOLUME MAÎTRE
  const [masterGain, setMasterGain] = useState(1)

  // ✅ OVERLAY UNIFIÉ
  const [actionOverlay, setActionOverlay] = useState(INITIAL_OVERLAY_STATE)

  // ✅ BOUCLES
  const [loopState, setLoopState] = useState({
    clips: {},
    tracks: {},
    timeline: {
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
  const masterGainRef = useRef(1)

  // Mettre à jour les refs
  useEffect(() => { projectRef.current = project }, [project])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])
  useEffect(() => { selectedClipIdRef.current = selectedClipId }, [selectedClipId])
  useEffect(() => { stopAtTimeRef.current = stopAtTime }, [stopAtTime])
  useEffect(() => { soloPlayClipIdRef.current = soloPlayClipId }, [soloPlayClipId])

  // ─── SYNC masterGain avec la ref et mettre à jour les sources ──────

  // ✅ Fonction pour mettre à jour le gain de toutes les sources
  const updateMasterGain = useCallback((newGain) => {
    console.log(`🎚️ [EditorContext] Mise à jour du volume maître: ${newGain.toFixed(2)}`)
    
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
        const newGainValue = trackVolume * newGain
        entry.gainNode.gain.value = newGainValue
      }
    }
  }, [projectRef])

  // ✅ Mettre à jour masterGainRef et toutes les sources quand masterGain change
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
                timeline: { 
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
            timeline: { 
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

  // ✅ playClip - AVEC VOLUME MAÎTRE ET OFFSET CORRECT
  const playClip = useCallback(async (clip, track, customOffset = null) => {
    if (!clip?.path) {
      console.warn('⚠️ [playClip] clip.path est undefined pour:', clip?.name)
      return
    }
    
    console.log(`🎵 [playClip] Tentative de lecture: ${clip.name} (${clip.id}) path: ${clip.path}`)
    
    // ✅ Supprimer l'ancienne source si elle existe
    const oldEntry = audioSourcesRef.current[clip.id]
    if (oldEntry) {
      try {
        oldEntry.source.stop()
        oldEntry.source.disconnect()
      } catch (e) {
        // Ignorer les erreurs de stop
      }
      delete audioSourcesRef.current[clip.id]
    }
    
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
      const masterVolume = masterGainRef.current || 1
      gainNode.gain.value = trackVolume * masterVolume
      
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
            gainNode.gain.linearRampToValueAtTime(trackVolume * masterVolume, now + fadeDuration)
          }
        }
      }
      
      source.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // ✅ CALCULER L'OFFSET CORRECTEMENT
      let offset = 0
      if (customOffset !== null && customOffset !== undefined) {
        // ✅ UTILISER L'OFFSET PERSONNALISÉ (prioritaire)
        offset = Math.max(0, Math.min(customOffset, sourceBuffer.duration - 0.01))
        console.log(`🎵 [playClip] Lecture avec offset personnalisé: ${offset.toFixed(2)}s`)
      } else {
        // ✅ CALCULER L'OFFSET NORMAL
        const clipOffset = clip.offset || 0
        const timeInClip = Math.max(0, currentTime - (clip.start || 0))
        offset = Math.min(clipOffset + timeInClip, sourceBuffer.duration - 0.01)
        console.log(`🎵 [playClip] Lecture avec offset calculé: ${offset.toFixed(2)}s (clipOffset=${clipOffset.toFixed(2)}s, timeInClip=${timeInClip.toFixed(2)}s)`)
      }
      
      console.log(`🎵 [playClip] Lecture: ${clip.name} offset=${offset.toFixed(2)}s, duration=${sourceBuffer.duration.toFixed(2)}s`)
      
      // ✅ DÉMARRER LA SOURCE
      source.start(0, offset)
      audioSourcesRef.current[clip.id] = { source, gainNode }
      
      source.onended = () => {
        console.log(`⏹️ [playClip] Fin du clip: ${clip.name}`)
      }
      
    } catch (e) {
      console.error('❌ [playClip] Erreur:', e)
    }
  }, [loadAudioBuffer, currentTime, autoCrossfade, findPreviousClip, calculateOverlap])

  // ✅ startPlaybackLoop - VERSION CORRIGÉE POUR BOUCLE GÉNÉRALE
  const startPlaybackLoop = useCallback(() => {
    console.log('[LOOP-FIX] 🔄 startPlaybackLoop() appelée')
    
    if (animationRef.current) {
      console.log('[LOOP-FIX] 🛑 Arrêt de l\'ancienne animation')
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    let lastTime = performance.now()
    let accumulated = 0
    let isLoopRunning = true

    // ✅ SUIVI DES CLIPS EN COURS DE LECTURE
    const playingClips = new Set()
    
    // ✅ SUIVI DES CLIPS DÉJÀ LANCÉS DANS LE CYCLE ACTUEL (boucle individuelle)
    const clipsStartedThisCycle = new Map()
    
    // ✅ SUIVI DES CLIPS LANCÉS POUR LA BOUCLE GÉNÉRALE
    const generalLoopClipsStarted = new Map()

    const loop = () => {
      // ✅ Vérifier l'état de lecture
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
        
        // ✅ RÉCUPÉRER LA BOUCLE GÉNÉRALE
        const timelineLoop = loopState?.timeline || { 
          enabled: false, 
          start: 0, 
          end: 10,
          durationMode: 'cycles',
          cycleCount: 3,
          manualDuration: 10
        }
        
        const loopStart = timelineLoop.start || 0
        const loopEnd = timelineLoop.end || 10
        const loopTotalDuration = Math.max(0.1, loopEnd - loopStart)
        
        // ✅ Calcul de la durée maximale
        let maxLoopDuration = loopTotalDuration
        const cycleCount = timelineLoop.cycleCount || 3
        const manualDuration = timelineLoop.manualDuration || 10
        
        if (timelineLoop.durationMode === 'cycles') {
          maxLoopDuration = loopTotalDuration * cycleCount
        } else if (timelineLoop.durationMode === 'manualDuration') {
          maxLoopDuration = manualDuration
        }
        
        // ✅ Vérifier si on est dans la zone de boucle générale
        const elapsedSinceLoopStart = globalTime - loopStart
        const isInLoopZone = timelineLoop.enabled && 
          elapsedSinceLoopStart >= 0 && 
          elapsedSinceLoopStart < maxLoopDuration
        
        // ✅ Calculer la position cyclique
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
          
          // ✅ NOUVEAU SET POUR SUIVRE LES CLIPS ACTIFS CE FRAME
          const activeClipsThisFrame = new Set()
          
          // ✅ PREMIER PASSAGE : Trouver les clips avec boucle individuelle
          const individualLoopClips = new Set()
          for (const track of tracks) {
            for (const clip of track.clips) {
              const isClipLooping = loopState?.clips?.[clip.id]?.enabled || false
              if (isClipLooping) {
                individualLoopClips.add(clip.id)
              }
            }
          }
          
          for (const track of tracks) {
            if (track.muted) continue
            
            for (const clip of track.clips) {
              const duration = clipDurations[clip.id] || clip.duration || 3
              const start = clip.start || 0
              const end = start + duration
              
              // ✅ RÉCUPÉRER LES INFOS DE BOUCLE DU CLIP
              const isClipLooping = individualLoopClips.has(clip.id)
              const clipLoopData = loopState?.clips?.[clip.id]
              const clipLoopStart = clipLoopData?.start || start
              const clipLoopEnd = clipLoopData?.end || end
              
              // ✅ GESTION DU MODE SOLO
              if (soloClipId && clip.id !== soloClipId) {
                if (playingClips.has(clip.id)) {
                  console.log(`[LOOP-FIX] 🛑 ${clip.name} - Arrêt (mode solo)`)
                  const entry = audioSourcesRef.current[clip.id]
                  if (entry) {
                    try { 
                      entry.source.stop() 
                      entry.source.disconnect()
                    } catch (e) {}
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
              let clipTime = globalTime
              let isGeneralLoop = false
              
              // ============================================================
              // ✅ CAS 1: BOUCLE INDIVIDUELLE DU CLIP (PRIORITAIRE ABSOLUE)
              // ============================================================
              if (isClipLooping) {
                // ✅ Vérifier si on est dans la zone de boucle du clip
                if (globalTime >= clipLoopStart && globalTime < clipLoopEnd) {
                  const elapsedInLoop = globalTime - clipLoopStart
                  const positionInClip = elapsedInLoop % duration
                  const currentCycleNumber = Math.floor(elapsedInLoop / duration)
                  
                  if (positionInClip < duration) {
                    shouldPlay = true
                    customOffset = positionInClip
                    clipTime = clipLoopStart + positionInClip
                    
                    const lastCycleForClip = clipsStartedThisCycle.get(clip.id)
                    if (lastCycleForClip !== currentCycleNumber) {
                      console.log(`[LOOP-FIX] 🚀 ${clip.name} - Cycle ${currentCycleNumber + 1} à ${clipTime.toFixed(2)}s (offset ${customOffset.toFixed(2)}s)`)
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
                    console.log(`[LOOP-FIX] 🛑 ${clip.name} - Fin de la boucle individuelle`)
                    const entry = audioSourcesRef.current[clip.id]
                    if (entry) {
                      try { 
                        entry.source.stop() 
                        entry.source.disconnect()
                      } catch (e) {}
                      delete audioSourcesRef.current[clip.id]
                    }
                    playingClips.delete(clip.id)
                    clipsStartedThisCycle.delete(clip.id)
                  }
                }
                // ✅ CRUCIAL : On continue pour ne PAS traiter ce clip dans la boucle générale
                continue
              }
              
              // ============================================================
              // ✅ CAS 2: BOUCLE GÉNÉRALE (UNIQUEMENT pour les clips SANS boucle individuelle)
              // ============================================================
              if (!isClipLooping && isInLoopZone) {
                // ✅ VÉRIFIER SI LE CLIP EST DANS LA ZONE DE BOUCLE
                const isClipInZone = (start >= loopStart && start < loopEnd) || 
                                     (end > loopStart && end <= loopEnd) ||
                                     (start <= loopStart && end >= loopEnd)
                
                if (isClipInZone) {
                  // ✅ Calculer la position dans le clip en tenant compte de la boucle
                  const offsetInClip = (loopTime - start) % duration
                  const positionInClip = Math.max(0, Math.min(duration, offsetInClip))
                  
                  // ✅ Le clip est joué si la position est dans sa durée
                  if (positionInClip < duration && positionInClip >= 0) {
                    shouldPlay = true
                    customOffset = positionInClip
                    clipTime = loopTime
                    isGeneralLoop = true
                    
                    // ✅ VÉRIFIER SI LE CLIP A DÉJÀ ÉTÉ LANCÉ DANS CE CYCLE
                    const lastCycleForClip = generalLoopClipsStarted.get(clip.id)
                    if (lastCycleForClip !== currentCycle) {
                      console.log(`[LOOP-FIX] 🔄 ${clip.name} - Boucle générale cycle ${currentCycle + 1} à ${clipTime.toFixed(2)}s (offset ${customOffset.toFixed(2)}s)`)
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
              
              // ============================================================
              // ✅ CAS 3: LECTURE NORMALE (hors boucle)
              // ============================================================
              if (!shouldPlay && !isClipLooping && !isInLoopZone) {
                // ✅ Vérifier si le temps global est dans le clip
                if (globalTime >= start && globalTime < end) {
                  shouldPlay = true
                  clipTime = globalTime
                  // ✅ CORRECTION : Utiliser l'offset du clip + le temps écoulé
                  const clipOffset = clip.offset || 0
                  customOffset = clipOffset + (globalTime - start)
                }
              }
              
              // ============================================================
              // ✅ GESTION DES LANCEMENTS
              // ============================================================
              
              if (shouldPlay && !isClipLooping) {
                activeClipsThisFrame.add(clip.id)
                
                // ✅ Vérifier si le clip est déjà en cours de lecture
                if (!playingClips.has(clip.id)) {
                  if (isGeneralLoop) {
                    console.log(`[LOOP-FIX] 🔄 ${clip.name} - Boucle générale cycle ${currentCycle + 1} à ${clipTime.toFixed(2)}s (offset ${customOffset.toFixed(2)}s)`)
                  } else {
                    console.log(`[LOOP-FIX] ▶️ ${clip.name} - Lancement à ${clipTime.toFixed(2)}s (offset ${customOffset?.toFixed(2) || 0}s)`)
                  }
                  playClip(clip, track, customOffset || 0)
                  playingClips.add(clip.id)
                }
              }
            }
          }
          
          // ✅ GESTION DES ARRÊTS
          for (const clipId of playingClips) {
            if (!activeClipsThisFrame.has(clipId)) {
              let clip = null
              let isClipLooping = false
              
              for (const t of tracks) {
                const found = t.clips.find(c => c.id === clipId)
                if (found) {
                  clip = found
                  isClipLooping = loopState?.clips?.[clipId]?.enabled || false
                  break
                }
              }
              
              if (isClipLooping) continue
              
              let shouldContinue = false
              if (isInLoopZone && clip) {
                const start = clip.start || 0
                const duration = clipDurations[clip.id] || clip.duration || 3
                const isClipInZone = (start >= loopStart && start < loopEnd) || 
                                     (start + duration > loopStart && start + duration <= loopEnd) ||
                                     (start <= loopStart && start + duration >= loopEnd)
                if (isClipInZone) {
                  const offsetInClip = (loopTime - start) % duration
                  const positionInClip = Math.max(0, Math.min(duration, offsetInClip))
                  if (positionInClip >= 0 && positionInClip < duration) {
                    shouldContinue = true
                  }
                }
              }
              
              if (!shouldContinue) {
                console.log(`[LOOP-FIX] ⏹️ ${clip?.name || clipId} - Arrêt (fini)`)
                const entry = audioSourcesRef.current[clipId]
                if (entry) {
                  try { 
                    entry.source.stop() 
                    entry.source.disconnect()
                  } catch (e) {}
                  delete audioSourcesRef.current[clipId]
                }
                playingClips.delete(clipId)
                generalLoopClipsStarted.delete(clipId)
                clipsStartedThisCycle.delete(clipId)
              }
            }
          }
          
          // ✅ NETTOYAGE DES CYCLES ANCIENS
          if (isInLoopZone) {
            const keysToRemove = []
            for (const [clipId, cycle] of generalLoopClipsStarted) {
              if (cycle < currentCycle) {
                keysToRemove.push(clipId)
              }
            }
            for (const clipId of keysToRemove) {
              if (!playingClips.has(clipId)) {
                generalLoopClipsStarted.delete(clipId)
              }
            }
          } else {
            generalLoopClipsStarted.clear()
          }
        }
        
        // ✅ Mettre à jour le temps global
        setCurrentTime(globalTime)
        currentTimeRef.current = globalTime
        
        // ✅ Arrêter la lecture à la fin du projet
        if (globalTime >= totalDuration) {
          console.log(`[LOOP-FIX] ⏹️ Fin de la lecture à ${globalTime.toFixed(2)}s`)
          setIsPlaying(false)
          setCurrentTime(totalDuration)
          setStopAtTime(null)
          stopAtTimeRef.current = null
          setSoloPlayClipId(null)
          soloPlayClipIdRef.current = null
          
          for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
            try { 
              entry.source.stop() 
              entry.source.disconnect()
            } catch (e) {}
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
    
    // ✅ NETTOYAGE AVANT DÉMARRAGE
    console.log('[LOOP-FIX] 🧹 Nettoyage avant démarrage')
    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { 
        entry.source.stop() 
        entry.source.disconnect()
      } catch (e) {}
    }
    audioSourcesRef.current = {}
    
    animationRef.current = requestAnimationFrame(loop)
    console.log('[LOOP-FIX] ✅ Animation démarrée')
  }, [totalDuration, playClip, clipDurations, loopState])

  // ─── PLAYBACK CONTROLS ──────────────────────────────────────────────

  const play = useCallback(async () => {
    console.log('[LOOP-FIX] 🎬 play() appelé - RÉINITIALISATION TOTALE')
    
    setIsPaused(false)
    isPausedRef.current = false
    setStopAtTime(null)
    stopAtTimeRef.current = null
    
    console.log('[LOOP-FIX] 🔇 Arrêt de toutes les sources audio')
    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { 
        console.log(`[LOOP-FIX]   - Arrêt de la source: ${id}`)
        entry.source.stop() 
        entry.source.disconnect()
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
      
      setCurrentTime(0)
      currentTimeRef.current = 0
      
      setIsPlaying(true)
      isPlayingRef.current = true
      setIsPaused(false)
      isPausedRef.current = false
      
      console.log('[LOOP-FIX] ▶️ Lecture démarrée, appel à startPlaybackLoop dans 50ms')
      
      setTimeout(() => {
        startPlaybackLoop()
      }, 50)
      
    } catch (e) {
      console.error('[LOOP-FIX] ❌ Erreur dans play():', e)
      setIsPlaying(false)
      isPlayingRef.current = false
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
      isPlayingRef.current = true
      setIsPaused(false)
      isPausedRef.current = false
      lastPlayedClipsRef.current = new Set()
      
      setTimeout(() => {
        startPlaybackLoop()
      }, 50)
      
    } catch (e) {
      setIsPlaying(false)
      isPlayingRef.current = false
      setSoloPlayClipId(null)
      soloPlayClipIdRef.current = null
    }
  }, [clipDurations, startPlaybackLoop])

  const resume = useCallback(async () => {
    console.log('[LOOP-FIX] ▶️ resume() appelé - Reprise de la lecture')
    console.log(`[LOOP-FIX]   - Position actuelle: ${currentTimeRef.current.toFixed(2)}s`)
    console.log(`[LOOP-FIX]   - isPaused avant: ${isPausedRef.current}`)
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume()
      console.log('[LOOP-FIX]   - AudioContext repris')
    }
    
    setIsPaused(false)
    isPausedRef.current = false
    setIsPlaying(true)
    isPlayingRef.current = true
    
    lastPlayedClipsRef.current = new Set()
    
    console.log(`[LOOP-FIX] ▶️ Reprise de la lecture à ${currentTimeRef.current.toFixed(2)}s`)
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    
    setTimeout(() => {
      startPlaybackLoop()
    }, 50)
  }, [startPlaybackLoop])

  const pause = useCallback(() => {
    console.log('[LOOP-FIX] ⏸️ pause() appelée')
    console.log(`[LOOP-FIX]   - Position actuelle: ${currentTimeRef.current.toFixed(2)}s`)
    console.log(`[LOOP-FIX]   - isPlaying avant: ${isPlayingRef.current}`)
    
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
      console.log('[LOOP-FIX]   - AudioContext suspendu')
    }
    
    console.log(`[LOOP-FIX]   - isPausedRef après: ${isPausedRef.current}`)
    console.log(`[LOOP-FIX]   - isPlayingRef après: ${isPlayingRef.current}`)
  }, [])

  const stop = useCallback(() => {
    console.log('[LOOP-FIX] ⏹️ stop() appelée')
    
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
      try { 
        console.log(`[LOOP-FIX]   - Arrêt de la source (stop): ${id}`)
        entry.source.stop() 
        entry.source.disconnect()
      } catch (e) {}
    }
    audioSourcesRef.current = {}
  }, [])

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(time, totalDuration))
    setCurrentTime(clamped)
    currentTimeRef.current = clamped
    
    for (const [id, entry] of Object.entries(audioSourcesRef.current)) {
      try { 
        entry.source.stop() 
        entry.source.disconnect()
      } catch (e) {}
    }
    audioSourcesRef.current = {}
    lastPlayedClipsRef.current = new Set()
  }, [totalDuration])

  const togglePlay = useCallback(() => {
    console.log('[LOOP-FIX] 🔄 togglePlay() appelée')
    console.log(`[LOOP-FIX]   - isPlayingRef: ${isPlayingRef.current}, isPausedRef: ${isPausedRef.current}`)
    console.log(`[LOOP-FIX]   - isPlaying state: ${isPlaying}, isPaused state: ${isPaused}`)
    
    const currentlyPlaying = isPlayingRef.current
    const currentlyPaused = isPausedRef.current
    
    console.log(`[LOOP-FIX]   - currentlyPlaying: ${currentlyPlaying}, currentlyPaused: ${currentlyPaused}`)
    
    if (currentlyPlaying) {
      console.log('[LOOP-FIX]   ➜ Pause')
      pause()
      return
    }
    
    if (currentlyPaused) {
      console.log('[LOOP-FIX]   ➜ Reprise')
      resume()
      return
    }
    
    console.log('[LOOP-FIX]   ➜ Démarrage depuis le début')
    setSoloPlayClipId(null)
    soloPlayClipIdRef.current = null
    setCurrentTime(0)
    currentTimeRef.current = 0
    play()
  }, [pause, resume, play])

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
            timeline: { 
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
    
    // ✅ RÉCUPÉRER L'OFFSET EXISTANT DU CLIP
    const currentOffset = clip.offset || 0
    
    // ✅ CLIP GAUCHE : garde l'offset original
    const leftClip = {
      ...clip,
      id: generateUniqueId('clip'),
      duration: leftDuration,
      offset: currentOffset,
      start: start,
      effects: clip.effects ? clip.effects.map(e => ({ ...e })) : [],
    }
    
    // ✅ CLIP DROIT : offset décalé de la durée de gauche
    const rightClip = {
      ...clip,
      id: generateUniqueId('clip'),
      duration: rightDuration,
      offset: currentOffset + leftDuration,
      start: clampedSplitTime,
      effects: clip.effects ? clip.effects.map(e => ({ ...e })) : [],
    }
    
    // ✅ AJUSTER LES FADES
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
    
    console.log(`✂️ Split: left ${leftDuration.toFixed(2)}s (offset ${leftClip.offset.toFixed(2)}s), right ${rightDuration.toFixed(2)}s (offset ${rightClip.offset.toFixed(2)}s)`)
    
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

  // ─── FONCTIONS BOUCLE CLIP ──────────────────────────────────────────────────

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

  // ─── FONCTIONS BOUCLE TIMELINE ──────────────────────────────────────────

  const setTimelineLoop = useCallback((options) => {
    console.log('🔄 [EditorContext] setTimelineLoop appelé:', options)
    
    if (!project) {
      console.warn('🔄 [EditorContext] Aucun projet')
      return
    }
    
    const updatedLoopState = {
      ...loopState,
      timeline: {
        ...loopState.timeline,
        ...options
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
    
    setIsDirty(true)
  }, [project, loopState, store])

  const toggleTimelineLoop = useCallback(() => {
    const newEnabled = !loopState.timeline.enabled
    console.log('🔄 [EditorContext] toggleTimelineLoop:', newEnabled)
    
    if (newEnabled) {
      const start = loopState.timeline.start
      const end = loopState.timeline.end
      if (start >= end) {
        setTimelineLoop({
          enabled: true,
          end: Math.max(start + 1, 10)
        })
        return
      }
    }
    
    setTimelineLoop({
      enabled: newEnabled
    })
  }, [loopState.timeline, setTimelineLoop])

  // ─── FONCTIONS OVERLAY UNIFIÉES ──────────────────────────────────────────

  const isActionOverlayActive = actionOverlay.type !== null

  const cancelActionOverlay = useCallback(() => {
    console.log('🔍 [OVERLAY] cancelActionOverlay appelé')
    setActionOverlay(INITIAL_OVERLAY_STATE)
  }, [])

  const activateLoopManualClick = useCallback((clipId, trackId, options = {}) => {
    console.log('🔍 [OVERLAY] activateLoopManualClick appelé:', { clipId, trackId, options })
    
    const clip = project?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
    
    setActionOverlay({
      type: 'loop-clip',
      clipId,
      trackId,
      options: {
        arrowColor: options.arrowColor || '#22c55e',
        loopMode: 'manualClick',
        ...options
      },
      step: 0,
      totalSteps: 1,
      clipName: clip?.name || null,
      data: {}
    })
    
    console.log('🔍 [OVERLAY] actionOverlay défini pour loop-clip avec step: 0')
    addToast?.('🖱️ Mode clic activé', 'info')
  }, [project, addToast])

  const activateTimelineLoopManualClick = useCallback(() => {
    console.log('🔍 [OVERLAY] activateTimelineLoopManualClick appelé')
    
    setActionOverlay({
      type: 'loop-timeline',
      clipId: null,
      trackId: null,
      options: null,
      step: 0,
      totalSteps: 3,
      clipName: null,
      data: {
        start: null,
        end: null,
        duration: null
      }
    })
    
    console.log('🔍 [OVERLAY] actionOverlay défini pour loop-timeline avec step: 0')
    addToast?.('🖱️ Mode clic activé - Étape 1/3', 'info')
  }, [addToast])

  const activateSplitManualClick = useCallback((clipId, trackId) => {
    console.log('🔍 [OVERLAY] activateSplitManualClick appelé:', { clipId, trackId })
    
    const clip = project?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
    
    setActionOverlay({
      type: 'split',
      clipId,
      trackId,
      options: null,
      step: 0,
      totalSteps: 1,
      clipName: clip?.name || null,
      data: {}
    })
    
    console.log('🔍 [OVERLAY] actionOverlay défini pour split avec step: 0')
    addToast?.('✂️ Mode clic activé', 'info')
  }, [project, addToast])

  const executeActionOverlay = useCallback((clickTime) => {
    console.log('🔍 [OVERLAY] executeActionOverlay appelé')
    console.log(`🔍 [OVERLAY]   - actionOverlay.type: ${actionOverlay.type}`)
    console.log(`🔍 [OVERLAY]   - actionOverlay.step avant: ${actionOverlay.step}`)
    console.log(`🔍 [OVERLAY]   - clickTime: ${clickTime}`)
    
    if (!actionOverlay.type) {
      console.warn('🔍 [OVERLAY] ⚠️ Aucune action en cours')
      return
    }
    
    const { type, clipId, trackId, options, step, data } = actionOverlay
    const clampedTime = Math.max(0, Math.min(clickTime, totalDuration))
    
    console.log(`🔍 [OVERLAY] Exécution action ${type} à ${clampedTime.toFixed(2)}s, étape ${step}`)
    
    if (type === 'loop-clip') {
      console.log('🔍 [OVERLAY] 📦 loop-clip - un seul clic')
      const clip = project?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        console.warn('🔍 [OVERLAY] ⚠️ Clip non trouvé')
        addToast?.('Clip non trouvé', 'error')
        cancelActionOverlay()
        return
      }
      
      const duration = clipDurations[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const manualDuration = Math.max(duration, clampedTime - start)
      
      console.log(`🔍 [OVERLAY]   - duration: ${duration}, start: ${start}, manualDuration: ${manualDuration}`)
      
      const updatedOptions = {
        ...options,
        loopMode: 'manualDuration',
        manualDuration: manualDuration
      }
      
      toggleClipLoop(clipId, updatedOptions)
      addToast?.(`🔄 Boucle définie jusqu'à ${manualDuration.toFixed(1)}s`, 'success')
      
      cancelActionOverlay()
      
    } else if (type === 'loop-timeline') {
      console.log(`🔍 [OVERLAY] 📦 loop-timeline - étape actuelle: ${step}`)
      
      const newStep = step + 1
      const newData = { ...data }
      
      if (step === 0) {
        newData.start = clampedTime
        console.log(`🔍 [OVERLAY]   📍 Étape 1: Début défini à ${clampedTime.toFixed(2)}s`)
        
        setActionOverlay(prev => {
          console.log(`🔍 [OVERLAY]   🔄 setActionOverlay - nouvelle étape: 1`)
          const updated = {
            ...prev,
            step: 1,
            data: newData
          }
          console.log(`🔍 [OVERLAY]   🔄 updated.step: ${updated.step}`)
          return updated
        })
        
        console.log('🔍 [OVERLAY]   ✅ actionOverlay mis à jour avec step: 1')
        addToast?.(`🖱️ Début défini à ${clampedTime.toFixed(1)}s (2/3)`, 'info')
        
      } else if (step === 1) {
        console.log(`🔍 [OVERLAY]   📍 Étape 2: Fin à ${clampedTime.toFixed(2)}s, start: ${data.start}`)
        
        if (clampedTime > data.start) {
          newData.end = clampedTime
          
          setActionOverlay(prev => {
            console.log(`🔍 [OVERLAY]   🔄 setActionOverlay - nouvelle étape: 2`)
            const updated = {
              ...prev,
              step: 2,
              data: newData
            }
            console.log(`🔍 [OVERLAY]   🔄 updated.step: ${updated.step}`)
            return updated
          })
          
          console.log('🔍 [OVERLAY]   ✅ actionOverlay mis à jour avec step: 2')
          addToast?.(`🖱️ Fin définie à ${clampedTime.toFixed(1)}s (3/3)`, 'info')
        } else {
          console.warn('🔍 [OVERLAY]   ⚠️ Fin doit être après le début')
          addToast?.('⚠️ La fin doit être après le début', 'warning')
        }
        
      } else if (step === 2) {
        console.log(`🔍 [OVERLAY]   📍 Étape 3: Durée à ${clampedTime.toFixed(2)}s, start: ${data.start}`)
        
        const duration = clampedTime - data.start
        console.log(`🔍 [OVERLAY]   - duration calculée: ${duration.toFixed(2)}s`)
        
        if (duration > 0.1) {
          console.log(`🔍 [OVERLAY]   ✅ Durée valide, application de la boucle`)
          setTimelineLoop({
            enabled: true,
            start: data.start,
            end: data.end || clampedTime,
            manualDuration: duration,
            durationMode: 'manualDuration'
          })
          console.log(`🔍 [OVERLAY]   ✅ Boucle définie: ${data.start.toFixed(2)}s → ${(data.end || clampedTime).toFixed(2)}s (${duration.toFixed(2)}s)`)
          addToast?.(`✅ Boucle définie: ${data.start.toFixed(1)}s → ${(data.end || clampedTime).toFixed(1)}s (${duration.toFixed(1)}s)`, 'success')
          
          cancelActionOverlay()
        } else {
          console.warn('🔍 [OVERLAY]   ⚠️ Durée trop courte:', duration)
          addToast?.('⚠️ La durée doit être d\'au moins 0.1s', 'warning')
        }
      }
      
    } else if (type === 'split') {
      console.log('🔍 [OVERLAY] 📦 split')
      const clip = project?.tracks?.flatMap(t => t.clips).find(c => c.id === clipId)
      if (!clip) {
        console.warn('🔍 [OVERLAY] ⚠️ Clip non trouvé')
        addToast?.('Clip non trouvé', 'error')
        cancelActionOverlay()
        return
      }
      
      const duration = clipDurations[clip.id] || clip.duration || 3
      const start = clip.start || 0
      const end = start + duration
      
      console.log(`🔍 [OVERLAY]   - duration: ${duration}, start: ${start}, end: ${end}, clampedTime: ${clampedTime}`)
      
      if (clampedTime > start + 0.05 && clampedTime < end - 0.05) {
        splitClip(trackId, clipId, clampedTime)
        addToast?.(`✂️ Clip coupé à ${clampedTime.toFixed(1)}s`, 'success')
      } else {
        console.warn('🔍 [OVERLAY]   ⚠️ Position invalide pour couper le clip')
        addToast?.('❌ Position invalide pour couper le clip', 'warning')
      }
      cancelActionOverlay()
    }
    
  }, [actionOverlay, totalDuration, project, clipDurations, toggleClipLoop, setTimelineLoop, splitClip, addToast, cancelActionOverlay])

  // ─── FONCTIONS LOOP ──────────────────────────────────────────────────

  const setLoopRegionFn = useCallback((start, end) => {
    setLoopRegion(prev => ({
      ...prev,
      start: Math.max(0, start),
      end: Math.min(totalDuration, end)
    }))
  }, [totalDuration])

  const toggleLoop = useCallback(() => {
    toggleTimelineLoop()
  }, [toggleTimelineLoop])

  const clearLoop = useCallback(() => {
    setLoopRegion({ enabled: false, start: 0, end: 10 })
    setTimelineLoop({
      enabled: false,
      start: 0,
      end: 10
    })
  }, [setTimelineLoop])

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
    // ✅ VOLUME MAÎTRE
    masterGain,
    setMasterGain,
    // ✅ OVERLAY UNIFIÉ
    actionOverlay,
    isActionOverlayActive,
    cancelActionOverlay,
    executeActionOverlay,
    // ✅ Boucles
    loopState,
    setLoopState,
    toggleClipLoop,
    updateClipLoopOptions,
    // ✅ Boucle timeline
    setTimelineLoop,
    toggleTimelineLoop,
    activateTimelineLoopManualClick,
    // ✅ Mode d'attente (compatibilité)
    isPendingAction: isActionOverlayActive,
    pendingAction: actionOverlay,
    activateLoopManualClick,
    activateSplitManualClick,
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