// src/pages/editor/hooks/useAudioEngine.js
import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  loadAudioBuffer, 
  createGainNode
} from './audioUtils'
import { EffectChain } from '../utils/effects'

export function useAudioEngine({
  project,
  clipDurations,
  masterVolume = 100,
  isMasterMuted = false,
  loopRegion = null,
  onError = null
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(10)

  const audioContextRef = useRef(null)
  const sourcesRef = useRef(new Map())
  const gainNodesRef = useRef(new Map())
  const effectChainsRef = useRef(new Map())
  const buffersRef = useRef(new Map())
  
  const animationRef = useRef(null)
  const isMountedRef = useRef(true)
  const currentTimeRef = useRef(0)
  const isPlayingRef = useRef(false)
  const isPausedRef = useRef(false)
  const masterVolumeRef = useRef(masterVolume)
  const isMasterMutedRef = useRef(isMasterMuted)
  const projectRef = useRef(project)
  const clipDurationsRef = useRef(clipDurations)
  const loopRef = useRef(loopRegion)

  // Mettre à jour les refs
  useEffect(() => {
    masterVolumeRef.current = masterVolume
  }, [masterVolume])

  useEffect(() => {
    isMasterMutedRef.current = isMasterMuted
  }, [isMasterMuted])

  useEffect(() => {
    projectRef.current = project
  }, [project])

  useEffect(() => {
    clipDurationsRef.current = clipDurations
  }, [clipDurations])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    isPausedRef.current = isPaused
  }, [isPaused])

  useEffect(() => {
    loopRef.current = loopRegion
  }, [loopRegion])

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        console.log('🔊 AudioContext créé')
      } catch (e) {
        console.error('❌ Erreur création AudioContext:', e)
        onError?.('Impossible de créer le contexte audio')
      }
    }
    return audioContextRef.current
  }, [onError])

  const loadBuffer = useCallback(async (filePath) => {
    if (buffersRef.current.has(filePath)) {
      return buffersRef.current.get(filePath)
    }

    try {
      const ctx = getAudioContext()
      if (!ctx) throw new Error('AudioContext non disponible')
      
      const buffer = await loadAudioBuffer(ctx, filePath)
      buffersRef.current.set(filePath, buffer)
      return buffer
    } catch (e) {
      console.error('❌ Erreur chargement buffer:', e)
      throw e
    }
  }, [getAudioContext])

  const getActiveClips = useCallback((time) => {
    const currentProject = projectRef.current
    if (!currentProject?.tracks) return []
    const active = []
    for (const track of currentProject.tracks) {
      if (track.muted) continue
      for (const clip of track.clips) {
        const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
        const start = clip.start
        const end = start + duration
        if (time >= start && time < end + 0.05) {
          active.push({ clip, track })
        }
      }
    }
    return active
  }, [])

  // ✅ Appliquer les effets avec EffectChain
  const applyEffects = useCallback(async (source, clip, track) => {
    const ctx = getAudioContext()
    if (!ctx) return { lastNode: source, nodes: [] }

    const clipId = clip.id
    const effects = clip.effects || []

    // Volume
    let volumeLinear = 1.0
    for (const effect of effects) {
      if (!effect.enabled) continue
      if (effect.type === 'volume') {
        const val = effect.params?.value
        if (val !== undefined && val !== null) {
          volumeLinear = val
        }
      }
    }

    const volumeScale = isMasterMutedRef.current ? 0 : masterVolumeRef.current / 100
    const trackVolume = track?.volume || 1
    const totalGain = volumeLinear * volumeScale * trackVolume
    const clampedGain = Math.max(0, Math.min(5, totalGain))

    const gainNode = createGainNode(ctx, clampedGain)
    source.connect(gainNode)
    gainNodesRef.current.set(clipId, gainNode)

    let effectChain = effectChainsRef.current.get(clipId)
    if (!effectChain) {
      effectChain = new EffectChain(ctx)
      effectChainsRef.current.set(clipId, effectChain)
    }

    // ✅ Passer le gainNode et le clip.path
    const result = await effectChain.createEffects(
      clipId, 
      effects, 
      source, 
      gainNode,
      clip.path
    )
    
    let currentNode = gainNode
    if (result.nodes.length > 0 && result.lastNode !== gainNode) {
      currentNode = result.lastNode
    }

    // ✅ Pour le PitchEffect, le buffer est déjà remplacé dans la source
    // On s'assure que la source est connectée au gainNode

    if (currentNode !== ctx.destination) {
      try {
        currentNode.connect(ctx.destination)
      } catch (e) {
        // Déjà connecté
      }
    }

    return { lastNode: currentNode, nodes: result.nodes }
  }, [getAudioContext])

  const startClip = useCallback(async (clip, track, time) => {
    const clipId = clip.id
    const ctx = getAudioContext()
    if (!ctx) return null

    // Nettoyer l'ancienne source
    if (sourcesRef.current.has(clipId)) {
      const oldSource = sourcesRef.current.get(clipId)
      try {
        oldSource.stop()
        oldSource.disconnect()
      } catch (e) {}
      sourcesRef.current.delete(clipId)
    }

    if (effectChainsRef.current.has(clipId)) {
      effectChainsRef.current.get(clipId).dispose()
      effectChainsRef.current.delete(clipId)
    }

    try {
      // ✅ Charger le buffer original
      const buffer = await loadBuffer(clip.path)
      if (!buffer) return null

      // ✅ Créer la source
      const source = ctx.createBufferSource()
      source.buffer = buffer

      const clipDuration = buffer.duration
      const offset = time - clip.start
      const seekPos = Math.max(0, Math.min(offset, clipDuration - 0.01))

      console.log(`▶️ Démarrage "${clip.name}" à ${seekPos.toFixed(2)}s (durée: ${clipDuration.toFixed(2)}s)`)
      
      if (clip.effects && clip.effects.length > 0) {
        console.log(`  📋 Effets sur "${clip.name}":`, clip.effects.map(e => `${e.type}(${e.enabled ? 'ON' : 'OFF'})`).join(', '))
      }

      // ✅ Appliquer les effets (peut modifier la source)
      const result = await applyEffects(source, clip, track)

      // ✅ Si un effet a remplacé la source, utiliser la nouvelle
      let finalSource = source
      if (result && result.lastNode && result.lastNode !== source) {
        // Certains effets peuvent retourner un nouveau nœud
        // Dans le cas de PitchEffect, il retourne une nouvelle source
        if (result.lastNode.constructor.name === 'AudioBufferSourceNode') {
          finalSource = result.lastNode
          sourcesRef.current.set(clipId, finalSource)
        }
      }

      // ✅ Si la source a été remplacée par PitchEffect, utiliser la nouvelle
      // La nouvelle source est déjà démarrée dans PitchEffect.apply()
      // Nous devons juste la stocker

      const now = ctx.currentTime
      const startTime = now
      
      // ✅ Si la source n'a pas encore été démarrée (pas de pitch effect)
      if (!finalSource || finalSource === source) {
        source.start(startTime, seekPos)
        source.onended = () => {
          console.log(`⏹️ Fin du clip "${clip.name}"`)
          sourcesRef.current.delete(clipId)
          gainNodesRef.current.delete(clipId)
          if (effectChainsRef.current.has(clipId)) {
            effectChainsRef.current.get(clipId).dispose()
            effectChainsRef.current.delete(clipId)
          }
        }
        sourcesRef.current.set(clipId, source)
      } else {
        // La source a déjà été démarrée par PitchEffect
        // Stocker la nouvelle source
        sourcesRef.current.set(clipId, finalSource)
        // S'assurer que les effets sont nettoyés à la fin
        finalSource.onended = () => {
          console.log(`⏹️ Fin du clip "${clip.name}" (effets)`)
          sourcesRef.current.delete(clipId)
          gainNodesRef.current.delete(clipId)
          if (effectChainsRef.current.has(clipId)) {
            effectChainsRef.current.get(clipId).dispose()
            effectChainsRef.current.delete(clipId)
          }
        }
      }
      
      if (clipDurationsRef.current[clipId] !== clipDuration) {
        clipDurationsRef.current[clipId] = clipDuration
      }

      return finalSource || source

    } catch (e) {
      console.error(`❌ Erreur lecture clip "${clip.name}":`, e)
      onError?.(`Erreur lecture: ${clip.name}`)
      return null
    }
  }, [getAudioContext, loadBuffer, applyEffects, onError])

  // ✅ Gérer le fade out
  const handleFadeOut = useCallback((clipId, clipDuration, time) => {
    const gainNode = gainNodesRef.current.get(clipId)
    if (!gainNode) return

    const clip = projectRef.current?.tracks
      ?.flatMap(t => t.clips)
      ?.find(c => c.id === clipId)
    if (!clip) return

    const effectChain = effectChainsRef.current.get(clipId)
    if (!effectChain) return

    const clipStart = clip.start
    effectChain.applyFadeOut(clipId, gainNode, time, clipDuration, clipStart)
  }, [])

  // ✅ Boucle d'animation
  const animationLoop = useCallback(() => {
    if (!isMountedRef.current) return

    const playing = isPlayingRef.current
    const paused = isPausedRef.current

    if (!playing || paused) {
      animationRef.current = requestAnimationFrame(animationLoop)
      return
    }

    const delta = 0.016
    let newTime = currentTimeRef.current + delta

    const loop = loopRef.current
    if (loop?.enabled && loop.end > loop.start) {
      if (newTime >= loop.end) {
        console.log(`🔄 Boucle: retour à ${loop.start.toFixed(2)}s`)
        newTime = loop.start
        for (const [clipId, source] of sourcesRef.current) {
          try {
            source.stop()
            source.disconnect()
          } catch (e) {}
        }
        sourcesRef.current.clear()
        gainNodesRef.current.clear()
        effectChainsRef.current.clear()
        
        const activeClips = getActiveClips(newTime)
        for (const { clip, track } of activeClips) {
          startClip(clip, track, newTime)
        }
      }
    }

    if (newTime >= totalDuration) {
      console.log(`⏹️ Fin atteinte (${newTime.toFixed(2)}s)`)
      stop()
      return
    }

    for (const [clipId, source] of sourcesRef.current) {
      const duration = clipDurationsRef.current[clipId] || 3
      handleFadeOut(clipId, duration, newTime)
    }

    setCurrentTime(newTime)
    currentTimeRef.current = newTime

    animationRef.current = requestAnimationFrame(animationLoop)
  }, [totalDuration, getActiveClips, startClip, handleFadeOut])

  const play = useCallback(async (startAt = 0) => {
    console.log(`▶️ [play] Démarrer à ${startAt.toFixed(2)}s`)
    
    const currentProject = projectRef.current
    if (!currentProject || currentProject.tracks.length === 0) {
      onError?.('Aucune piste à jouer')
      return
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    for (const [clipId, source] of sourcesRef.current) {
      try {
        source.stop()
        source.disconnect()
      } catch (e) {}
    }
    sourcesRef.current.clear()
    gainNodesRef.current.clear()
    effectChainsRef.current.clear()

    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume()
    }

    const start = Math.max(0, Math.min(totalDuration, startAt))
    setCurrentTime(start)
    currentTimeRef.current = start
    setIsPlaying(true)
    setIsPaused(false)
    isPlayingRef.current = true
    isPausedRef.current = false

    const activeClips = getActiveClips(start)
    console.log(`  📊 ${activeClips.length} clip(s) actif(s) au démarrage`)
    
    for (const { clip, track } of activeClips) {
      await startClip(clip, track, start)
    }

    animationRef.current = requestAnimationFrame(animationLoop)
    console.log('✅ [play] Lecture démarrée')
  }, [totalDuration, getAudioContext, getActiveClips, startClip, onError])

  const pause = useCallback(() => {
    console.log('⏸️ [pause]')
    setIsPaused(true)
    isPausedRef.current = true
    setIsPlaying(false)
    isPlayingRef.current = false
    
    const ctx = audioContextRef.current
    if (ctx && ctx.state === 'running') {
      ctx.suspend()
    }
  }, [])

  const resume = useCallback(async () => {
    console.log('▶️ [resume]')
    const ctx = audioContextRef.current
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume()
    }
    setIsPaused(false)
    isPausedRef.current = false
    setIsPlaying(true)
    isPlayingRef.current = true
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    animationRef.current = requestAnimationFrame(animationLoop)
  }, [])

  const stop = useCallback(() => {
    console.log('⏹️ [stop]')
    setIsPlaying(false)
    isPlayingRef.current = false
    setIsPaused(false)
    isPausedRef.current = false
    setCurrentTime(0)
    currentTimeRef.current = 0

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    for (const [clipId, source] of sourcesRef.current) {
      try {
        source.stop()
        source.disconnect()
      } catch (e) {}
    }
    sourcesRef.current.clear()
    gainNodesRef.current.clear()
    effectChainsRef.current.clear()

    const ctx = audioContextRef.current
    if (ctx && ctx.state === 'running') {
      ctx.suspend()
    }
  }, [])

  const seek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(totalDuration, time))
    console.log(`🎯 [seek] ${time.toFixed(2)}s -> ${clamped.toFixed(2)}s`)
    setCurrentTime(clamped)
    currentTimeRef.current = clamped

    if (isPlayingRef.current && !isPausedRef.current) {
      for (const [clipId, source] of sourcesRef.current) {
        try {
          source.stop()
          source.disconnect()
        } catch (e) {}
      }
      sourcesRef.current.clear()
      gainNodesRef.current.clear()
      effectChainsRef.current.clear()
      
      const activeClips = getActiveClips(clamped)
      for (const { clip, track } of activeClips) {
        startClip(clip, track, clamped)
      }
    }
  }, [totalDuration, getActiveClips, startClip])

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause()
    } else if (isPausedRef.current) {
      resume()
    } else {
      play(currentTimeRef.current > 0 ? currentTimeRef.current : 0)
    }
  }, [play, pause, resume])

  const updateClipEffects = useCallback((clipId) => {
    console.log(`🔄 Mise à jour des effets pour le clip ${clipId}`)
    // La mise à jour se fera au prochain démarrage du clip
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      for (const [clipId, source] of sourcesRef.current) {
        try {
          source.stop()
          source.disconnect()
        } catch (e) {}
      }
      sourcesRef.current.clear()
      gainNodesRef.current.clear()
      effectChainsRef.current.clear()
      buffersRef.current.clear()
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const currentProject = projectRef.current
    if (!currentProject?.tracks) return
    let maxDuration = 10
    for (const track of currentProject.tracks) {
      for (const clip of track.clips) {
        const duration = clipDurationsRef.current[clip.id] || clip.duration || 3
        const end = clip.start + duration
        if (end > maxDuration) maxDuration = end
      }
    }
    const newDuration = Math.max(maxDuration + 2, 10)
    if (newDuration !== totalDuration) {
      setTotalDuration(newDuration)
    }
  }, [projectRef.current?.tracks, clipDurationsRef.current])

  return {
    isPlaying,
    isPaused,
    currentTime,
    totalDuration,
    play,
    pause,
    resume,
    stop,
    seek,
    togglePlay,
    updateClipEffects,
    rebuildEngine: stop,
    isEngineReady: true,
    engine: null,
    getAudioContext,
    loadBuffer,
    startClip,
    applyEffects,
    getActiveClips,
    audioContext: audioContextRef.current,
  }
}

export default useAudioEngine