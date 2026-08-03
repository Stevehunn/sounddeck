// src/core/services/AudioEditorService.js
import { audioCache } from './AudioCache'
import * as AudioMixerService from './AudioMixerService'

// ─── ÉTAT ──────────────────────────────────────────────────────────────────

let audioContext = null
let sources = new Map()
let gainNodes = new Map()
let effectChains = new Map()
let buffers = new Map()
let isPlaying = false
let isPaused = false
let currentTime = 0
let totalDuration = 10
let animationFrame = null
let projectRef = null
let clipDurationsRef = {}
let loopRegionRef = null
let onError = null

// ─── UTILITAIRES ────────────────────────────────────────────────────────────

function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      onError?.('Impossible de créer le contexte audio')
    }
  }
  return audioContext
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── LOAD BUFFER ────────────────────────────────────────────────────────────

async function loadBuffer(filePath) {
  if (buffers.has(filePath)) {
    return buffers.get(filePath)
  }

  try {
    const ctx = getAudioContext()
    if (!ctx) throw new Error('AudioContext non disponible')

    const fileUrl = filePath.startsWith('file://') 
      ? filePath 
      : 'file:///' + filePath.replace(/\\/g, '/')

    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    buffers.set(filePath, audioBuffer)
    return audioBuffer
  } catch (e) {
    console.error('❌ Erreur chargement buffer:', e)
    throw e
  }
}

// ─── APPLY EFFECTS ─────────────────────────────────────────────────────────

async function applyEffects(source, clip, track) {
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

  const volumeScale = 1 // master volume géré ailleurs
  const trackVolume = track?.volume || 1
  const totalGain = volumeLinear * volumeScale * trackVolume
  const clampedGain = Math.max(0, Math.min(5, totalGain))

  const gainNode = ctx.createGain()
  gainNode.gain.value = clampedGain
  source.connect(gainNode)
  gainNodes.set(clipId, gainNode)

  // Appliquer les autres effets
  let currentNode = gainNode

  if (currentNode !== ctx.destination) {
    try {
      currentNode.connect(ctx.destination)
    } catch (e) {
      // Déjà connecté
    }
  }

  return { lastNode: currentNode, nodes: [] }
}

// ─── START CLIP ─────────────────────────────────────────────────────────────

async function startClip(clip, track, time) {
  const clipId = clip.id
  const ctx = getAudioContext()
  if (!ctx) return null

  // Nettoyer l'ancienne source
  if (sources.has(clipId)) {
    const oldSource = sources.get(clipId)
    try {
      oldSource.stop()
      oldSource.disconnect()
    } catch (e) {}
    sources.delete(clipId)
  }

  if (effectChains.has(clipId)) {
    effectChains.get(clipId).dispose?.()
    effectChains.delete(clipId)
  }

  try {
    const buffer = await loadBuffer(clip.path)
    if (!buffer) return null

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const clipDuration = buffer.duration
    const offset = time - clip.start
    const seekPos = Math.max(0, Math.min(offset, clipDuration - 0.01))

    console.log(`▶️ Démarrage "${clip.name}" à ${seekPos.toFixed(2)}s`)

    const result = await applyEffects(source, clip, track)

    let finalSource = source
    if (result?.lastNode && result.lastNode !== source) {
      if (result.lastNode.constructor.name === 'AudioBufferSourceNode') {
        finalSource = result.lastNode
        sources.set(clipId, finalSource)
      }
    }

    const now = ctx.currentTime

    if (!finalSource || finalSource === source) {
      source.start(now, seekPos)
      source.onended = () => {
        console.log(`⏹️ Fin du clip "${clip.name}"`)
        sources.delete(clipId)
        gainNodes.delete(clipId)
        if (effectChains.has(clipId)) {
          effectChains.get(clipId).dispose?.()
          effectChains.delete(clipId)
        }
      }
      sources.set(clipId, source)
    } else {
      sources.set(clipId, finalSource)
      finalSource.onended = () => {
        console.log(`⏹️ Fin du clip "${clip.name}" (effets)`)
        sources.delete(clipId)
        gainNodes.delete(clipId)
        if (effectChains.has(clipId)) {
          effectChains.get(clipId).dispose?.()
          effectChains.delete(clipId)
        }
      }
    }

    return finalSource || source

  } catch (e) {
    console.error(`❌ Erreur lecture clip "${clip.name}":`, e)
    onError?.(`Erreur lecture: ${clip.name}`)
    return null
  }
}

// ─── GET ACTIVE CLIPS ──────────────────────────────────────────────────────

function getActiveClips(time) {
  if (!projectRef?.tracks) return []
  const active = []
  for (const track of projectRef.tracks) {
    if (track.muted) continue
    for (const clip of track.clips) {
      const duration = clipDurationsRef[clip.id] || clip.duration || 3
      const start = clip.start
      const end = start + duration
      if (time >= start && time < end + 0.05) {
        active.push({ clip, track })
      }
    }
  }
  return active
}

// ─── ANIMATION LOOP ─────────────────────────────────────────────────────────

function animationLoop() {
  if (!isPlaying || isPaused) {
    animationFrame = requestAnimationFrame(animationLoop)
    return
  }

  const delta = 0.016
  let newTime = currentTime + delta

  const loop = loopRegionRef
  if (loop?.enabled && loop.end > loop.start) {
    if (newTime >= loop.end) {
      console.log(`🔄 Boucle: retour à ${loop.start.toFixed(2)}s`)
      newTime = loop.start
      for (const [clipId, source] of sources) {
        try { source.stop(); source.disconnect() } catch (e) {}
      }
      sources.clear()
      gainNodes.clear()
      effectChains.clear()

      const activeClips = getActiveClips(newTime)
      for (const { clip, track } of activeClips) {
        startClip(clip, track, newTime)
      }
    }
  }

  if (newTime >= totalDuration) {
    console.log(`⏹️ Fin atteinte (${newTime.toFixed(2)}s)`)
    stopEditor()
    return
  }

  currentTime = newTime

  animationFrame = requestAnimationFrame(animationLoop)
}

// ─── API PUBLIQUE ──────────────────────────────────────────────────────────

export function initEditor(project, clipDurations, loopRegion, errorCallback) {
  projectRef = project
  clipDurationsRef = clipDurations
  loopRegionRef = loopRegion
  onError = errorCallback

  // Calculer la durée totale
  if (project?.tracks) {
    let maxDuration = 10
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        const duration = clipDurations[clip.id] || clip.duration || 3
        const end = clip.start + duration
        if (end > maxDuration) maxDuration = end
      }
    }
    totalDuration = Math.max(maxDuration + 2, 10)
  }

  return { totalDuration, currentTime, isPlaying, isPaused }
}

export function playEditor(startAt = 0) {
  console.log(`▶️ [Editor] Démarrer à ${startAt.toFixed(2)}s`)

  if (!projectRef || projectRef.tracks.length === 0) {
    onError?.('Aucune piste à jouer')
    return
  }

  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  // Nettoyer les sources existantes
  for (const [clipId, source] of sources) {
    try { source.stop(); source.disconnect() } catch (e) {}
  }
  sources.clear()
  gainNodes.clear()
  effectChains.clear()

  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume()
  }

  const start = Math.max(0, Math.min(totalDuration, startAt))
  currentTime = start
  isPlaying = true
  isPaused = false

  const activeClips = getActiveClips(start)
  for (const { clip, track } of activeClips) {
    startClip(clip, track, start)
  }

  animationFrame = requestAnimationFrame(animationLoop)
  console.log('✅ [Editor] Lecture démarrée')
}

export function pauseEditor() {
  console.log('⏸️ [Editor] Pause')
  isPaused = true
  isPlaying = false

  const ctx = audioContext
  if (ctx && ctx.state === 'running') {
    ctx.suspend()
  }
}

export function resumeEditor() {
  console.log('▶️ [Editor] Reprise')
  const ctx = audioContext
  if (ctx && ctx.state === 'suspended') {
    ctx.resume()
  }
  isPaused = false
  isPlaying = true
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  animationFrame = requestAnimationFrame(animationLoop)
}

export function stopEditor() {
  console.log('⏹️ [Editor] Stop')
  isPlaying = false
  isPaused = false
  currentTime = 0

  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  for (const [clipId, source] of sources) {
    try { source.stop(); source.disconnect() } catch (e) {}
  }
  sources.clear()
  gainNodes.clear()
  effectChains.clear()

  const ctx = audioContext
  if (ctx && ctx.state === 'running') {
    ctx.suspend()
  }
}

export function seekEditor(time) {
  const clamped = Math.max(0, Math.min(totalDuration, time))
  console.log(`🎯 [Editor] Seek ${time.toFixed(2)}s -> ${clamped.toFixed(2)}s`)
  currentTime = clamped

  if (isPlaying && !isPaused) {
    // Recalculer les clips actifs
    for (const [clipId, source] of sources) {
      try { source.stop(); source.disconnect() } catch (e) {}
    }
    sources.clear()
    gainNodes.clear()
    effectChains.clear()

    const activeClips = getActiveClips(clamped)
    for (const { clip, track } of activeClips) {
      startClip(clip, track, clamped)
    }
  }
}

export function toggleEditorPlay() {
  if (isPlaying) {
    pauseEditor()
  } else if (isPaused) {
    resumeEditor()
  } else {
    playEditor(currentTime > 0 ? currentTime : 0)
  }
}

export function getEditorState() {
  return {
    isPlaying,
    isPaused,
    currentTime,
    totalDuration,
    isEngineReady: true
  }
}

export function disposeEditor() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  for (const [clipId, source] of sources) {
    try { source.stop(); source.disconnect() } catch (e) {}
  }
  sources.clear()
  gainNodes.clear()
  effectChains.clear()
  buffers.clear()

  isPlaying = false
  isPaused = false
  currentTime = 0

  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close()
    audioContext = null
  }
}

// ─── EXPORT DEFAULT ──────────────────────────────────────────────────────────

export default {
  initEditor,
  playEditor,
  pauseEditor,
  resumeEditor,
  stopEditor,
  seekEditor,
  toggleEditorPlay,
  getEditorState,
  disposeEditor,
  formatTime
}