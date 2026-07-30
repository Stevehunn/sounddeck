// src/pages/editor/components/EditorToolbar/EditorMetronome.jsx
import { useState, useRef, useEffect, useCallback } from 'react'

export default function EditorMetronome({
  bpm = 120,
  onBpmChange,
  isPlaying = false,
  currentTime = 0,
  totalDuration = 0,
  enabled = false,
  onToggle,
  tr
}) {
  const [tempo, setTempo] = useState(bpm || 120)
  const [volume, setVolume] = useState(50)
  const [accentVolume, setAccentVolume] = useState(80)
  const [timeSignature] = useState({ beats: 4, noteValue: 4 })
  const [isClicking, setIsClicking] = useState(false)
  const [count, setCount] = useState(0)
  
  const audioContextRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isEnabledRef = useRef(false)
  const isPlayingRef = useRef(false)
  const currentTimeRef = useRef(0)
  const lastClickTimeRef = useRef(-1000)

  useEffect(() => {
    isEnabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        console.log('🎵 Contexte audio du métronome créé')
      } catch (e) {
        console.warn('Erreur création contexte audio:', e)
        return false
      }
    }
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => console.warn('Erreur reprise contexte:', e))
    }
    
    return true
  }, [])

  const generateClickSound = useCallback((isAccent = false) => {
    try {
      if (!initAudioContext()) {
        console.warn('❌ Impossible d\'initialiser le contexte audio')
        return false
      }
      
      const ctx = audioContextRef.current
      if (!ctx || ctx.state === 'closed') {
        console.warn('❌ Contexte audio fermé')
        return false
      }
      
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn('Erreur reprise contexte:', e))
      }
      
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.frequency.value = isAccent ? 1200 : 800
      
      const vol = isAccent ? (accentVolume / 100) : (volume / 100)
      const gainValue = Math.max(0.01, vol * 0.3)
      
      gain.gain.setValueAtTime(gainValue, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(now)
      osc.stop(now + 0.05)
      
      return true
    } catch (e) {
      console.warn('❌ Erreur génération clic métronome:', e.message)
      return false
    }
  }, [volume, accentVolume, initAudioContext])

  const playClick = useCallback((isAccent = false) => {
    const now = performance.now()
    
    if (now - lastClickTimeRef.current < 10) return
    
    const success = generateClickSound(isAccent)
    if (success) {
      lastClickTimeRef.current = now
    }
  }, [generateClickSound])

  const metronomeLoop = useCallback(() => {
    const isEnabled = isEnabledRef.current
    const isPlayingNow = isPlayingRef.current
    
    if (!isEnabled || !isPlayingNow) {
      setIsClicking(false)
      animationFrameRef.current = requestAnimationFrame(metronomeLoop)
      return
    }

    const current = currentTimeRef.current
    const beatDuration = 60 / (tempo || 120)
    
    const currentBeat = Math.floor(current / beatDuration)
    const nextBeatTime = (currentBeat + 1) * beatDuration
    const timeUntilNextBeat = nextBeatTime - current
    
    if (timeUntilNextBeat < 0.02 && timeUntilNextBeat >= 0) {
      const isAccent = (currentBeat + 1) % timeSignature.beats === 1
      
      const lastClickTime = lastClickTimeRef.current
      const timeSinceLastClick = (performance.now() - lastClickTime) / 1000
      
      if (timeSinceLastClick > beatDuration * 0.5) {
        playClick(isAccent)
        setCount((currentBeat + 1) % timeSignature.beats)
        setIsClicking(true)
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(metronomeLoop)
  }, [tempo, timeSignature.beats, playClick])

  const startMetronome = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (!enabled || !isPlaying) {
      setIsClicking(false)
      setCount(0)
      return
    }

    console.log('🎵 Démarrage du métronome')
    setIsClicking(true)
    setCount(0)
    lastClickTimeRef.current = -1000
    
    initAudioContext()
    animationFrameRef.current = requestAnimationFrame(metronomeLoop)
  }, [enabled, isPlaying, initAudioContext, metronomeLoop])

  const handleToggle = useCallback(() => {
    const newState = !enabled
    console.log(`🎵 Toggle métronome: ${newState ? 'ON' : 'OFF'}`)
    onToggle?.(newState)
    
    if (newState) {
      if (isPlaying) {
        startMetronome()
      } else {
        setIsClicking(false)
        setCount(0)
      }
    } else {
      setIsClicking(false)
      setCount(0)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [enabled, onToggle, isPlaying, startMetronome])

  const handleBpmChange = useCallback((newBpm) => {
    const clamped = Math.max(40, Math.min(240, newBpm))
    setTempo(clamped)
    onBpmChange?.(clamped)
    setCount(0)
  }, [onBpmChange])

  useEffect(() => {
    if (enabled && isPlaying) {
      startMetronome()
    } else if (!isPlaying) {
      setIsClicking(false)
      setCount(0)
    }
  }, [isPlaying, enabled, startMetronome])

  useEffect(() => {
    if (enabled && isPlaying) {
      startMetronome()
    }
  }, [tempo, enabled, isPlaying, startMetronome])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '2px 10px',
      background: enabled ? 'var(--accent-light)' : 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
      transition: 'all 0.2s ease'
    }}>
      <button
        className={enabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
        onClick={handleToggle}
        style={{
          fontSize: 11,
          padding: '2px 8px',
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
        title={tr('editorMetronome') || 'Métronome'}
      >
        <i className="ti ti-music" />
        {enabled && isClicking && (
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--success)',
            display: 'inline-block',
            animation: 'pulse 0.5s ease-in-out infinite'
          }} />
        )}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="range"
          min="40"
          max="240"
          value={tempo}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          style={{
            width: 80,
            accentColor: 'var(--accent)',
            height: 4
          }}
          title={tr('editorTempo') || 'Tempo (BPM)'}
        />
        <span style={{
          fontSize: 11,
          fontFamily: 'monospace',
          color: 'var(--text-secondary)',
          minWidth: 35,
          textAlign: 'center'
        }}>
          {tempo}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <i className="ti ti-volume" style={{ fontSize: 12, color: 'var(--text-tertiary)' }} />
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{
            width: 40,
            accentColor: 'var(--accent)',
            height: 3
          }}
          title={tr('editorMetronomeVolume') || 'Volume du métronome'}
        />
      </div>

      {enabled && isClicking && (
        <span style={{
          fontSize: 9,
          color: 'var(--text-tertiary)',
          fontFamily: 'monospace',
          minWidth: 20,
          textAlign: 'center'
        }}>
          {count + 1}/{timeSignature.beats}
        </span>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.6); }
        }
      `}</style>
    </div>
  )
}