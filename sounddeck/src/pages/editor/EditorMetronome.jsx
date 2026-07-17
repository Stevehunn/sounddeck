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
  const [timeSignature, setTimeSignature] = useState({ beats: 4, noteValue: 4 })
  const [isClicking, setIsClicking] = useState(false)
  const [nextClickTime, setNextClickTime] = useState(0)
  const [count, setCount] = useState(0)
  
  const audioContextRef = useRef(null)
  const clickIntervalRef = useRef(null)
  const scheduledClicksRef = useRef([])

  const generateClickSound = useCallback((isAccent = false) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      const ctx = audioContextRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.frequency.value = isAccent ? 1200 : 800
      
      const vol = isAccent ? (accentVolume / 100) : (volume / 100)
      gain.gain.setValueAtTime(vol * 0.5, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.05)
      
      return true
    } catch (e) {
      console.warn('Erreur génération clic:', e)
      return false
    }
  }, [volume, accentVolume])

  const playClick = useCallback((isAccent = false) => {
    generateClickSound(isAccent)
  }, [generateClickSound])

  const getNextBeatTime = useCallback(() => {
    const beatDuration = 60 / (tempo || 120)
    const time = nextClickTime || 0
    
    if (time === 0) {
      return currentTime + 0.1
    }
    
    return time + beatDuration
  }, [tempo, nextClickTime, currentTime])

  const startMetronome = useCallback(() => {
    if (clickIntervalRef.current) {
      clearInterval(clickIntervalRef.current)
      clickIntervalRef.current = null
    }
    
    if (!enabled) return
    
    setIsClicking(true)
    setCount(0)
    
    const beatDuration = 60 / (tempo || 120)
    const startTime = Math.ceil(currentTime / beatDuration) * beatDuration
    setNextClickTime(startTime)
    
    const scheduleClicks = () => {
      if (!enabled || !isClicking) return
      
      const now = audioContextRef.current?.currentTime || 0
      const beatDuration = 60 / (tempo || 120)
      
      while (scheduledClicksRef.current.length < 16) {
        const time = scheduledClicksRef.current.length === 0
          ? nextClickTime
          : scheduledClicksRef.current[scheduledClicksRef.current.length - 1] + beatDuration
        
        if (time > totalDuration) break
        
        scheduledClicksRef.current.push(time)
        
        const isAccent = scheduledClicksRef.current.length % timeSignature.beats === 1
        setTimeout(() => {
          if (enabled) {
            playClick(isAccent)
            setCount(prev => (prev + 1) % timeSignature.beats)
          }
        }, (time - now) * 1000)
      }
      
      scheduledClicksRef.current = scheduledClicksRef.current.filter(t => t > now)
    }
    
    scheduleClicks()
    
    clickIntervalRef.current = setInterval(scheduleClicks, 100)
  }, [enabled, tempo, currentTime, totalDuration, timeSignature.beats, playClick, isClicking, nextClickTime])

  const stopMetronome = useCallback(() => {
    if (clickIntervalRef.current) {
      clearInterval(clickIntervalRef.current)
      clickIntervalRef.current = null
    }
    scheduledClicksRef.current = []
    setIsClicking(false)
    setCount(0)
    setNextClickTime(0)
  }, [])

  const handleToggle = useCallback(() => {
    const newState = !enabled
    onToggle?.(newState)
    
    if (newState) {
      startMetronome()
    } else {
      stopMetronome()
    }
  }, [enabled, onToggle, startMetronome, stopMetronome])

  const handleBpmChange = useCallback((newBpm) => {
    const clamped = Math.max(40, Math.min(240, newBpm))
    setTempo(clamped)
    onBpmChange?.(clamped)
    
    if (enabled) {
      stopMetronome()
      startMetronome()
    }
  }, [enabled, onBpmChange, startMetronome, stopMetronome])

  useEffect(() => {
    return () => {
      if (clickIntervalRef.current) {
        clearInterval(clickIntervalRef.current)
        clickIntervalRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (!isPlaying && enabled) {
      stopMetronome()
    }
  }, [isPlaying, enabled, stopMetronome])

  useEffect(() => {
    if (isPlaying && enabled && !isClicking) {
      startMetronome()
    }
  }, [isPlaying, enabled, isClicking, startMetronome])

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