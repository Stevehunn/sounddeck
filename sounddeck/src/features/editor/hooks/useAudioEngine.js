// src/features/editor/hooks/useAudioEngine.js
import { useState, useCallback, useRef, useEffect } from 'react'

export function useAudioEngine() {
  const [audioContext, setAudioContext] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const sourcesRef = useRef(new Map())
  const gainNodesRef = useRef(new Map())
  const buffersRef = useRef(new Map())

  const initAudioContext = useCallback(async () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      setAudioContext(ctx)
      setIsInitialized(true)
      return ctx
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [])

  const loadAudioBuffer = useCallback(async (filePath) => {
    if (buffersRef.current.has(filePath)) {
      return buffersRef.current.get(filePath)
    }

    setIsLoading(true)
    try {
      const ctx = audioContext || await initAudioContext()
      if (!ctx) throw new Error('AudioContext non disponible')

      const fileUrl = filePath.startsWith('file://') 
        ? filePath 
        : 'file:///' + filePath.replace(/\\/g, '/')

      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      
      buffersRef.current.set(filePath, audioBuffer)
      setIsLoading(false)
      return audioBuffer
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
      return null
    }
  }, [audioContext, initAudioContext])

  const playClip = useCallback(async (clip, track, startTime) => {
    if (!audioContext) {
      const ctx = await initAudioContext()
      if (!ctx) return null
    }

    const clipId = clip.id
    if (sourcesRef.current.has(clipId)) {
      const source = sourcesRef.current.get(clipId)
      try { source.stop() } catch (e) {}
      sourcesRef.current.delete(clipId)
    }

    try {
      const buffer = await loadAudioBuffer(clip.path)
      if (!buffer) return null

      const ctx = audioContext
      const source = ctx.createBufferSource()
      source.buffer = buffer

      const gainNode = ctx.createGain()
      gainNode.gain.value = track?.volume || 1

      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      const offset = startTime - clip.start
      const seekPos = Math.max(0, Math.min(offset, buffer.duration - 0.01))
      
      source.start(0, seekPos)
      sourcesRef.current.set(clipId, source)
      gainNodesRef.current.set(clipId, gainNode)

      source.onended = () => {
        sourcesRef.current.delete(clipId)
        gainNodesRef.current.delete(clipId)
      }

      return source
    } catch (err) {
      setError(err.message)
      return null
    }
  }, [audioContext, initAudioContext, loadAudioBuffer])

  const stopClip = useCallback((clipId) => {
    if (sourcesRef.current.has(clipId)) {
      const source = sourcesRef.current.get(clipId)
      try { source.stop() } catch (e) {}
      sourcesRef.current.delete(clipId)
      gainNodesRef.current.delete(clipId)
    }
  }, [])

  const stopAllClips = useCallback(() => {
    for (const [clipId, source] of sourcesRef.current) {
      try { source.stop() } catch (e) {}
    }
    sourcesRef.current.clear()
    gainNodesRef.current.clear()
  }, [])

  const setVolume = useCallback((clipId, volume) => {
    if (gainNodesRef.current.has(clipId)) {
      const gain = gainNodesRef.current.get(clipId)
      gain.gain.value = Math.max(0, Math.min(5, volume))
    }
  }, [])

  const dispose = useCallback(async () => {
    stopAllClips()
    buffersRef.current.clear()
    if (audioContext && audioContext.state !== 'closed') {
      await audioContext.close()
    }
    setAudioContext(null)
    setIsInitialized(false)
  }, [audioContext, stopAllClips])

  return {
    audioContext,
    isInitialized,
    isLoading,
    error,
    initAudioContext,
    loadAudioBuffer,
    playClip,
    stopClip,
    stopAllClips,
    setVolume,
    dispose
  }
}

export default useAudioEngine