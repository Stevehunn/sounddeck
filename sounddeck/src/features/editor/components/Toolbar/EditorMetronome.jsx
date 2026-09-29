// src/features/editor/components/Toolbar/EditorMetronome.jsx
import { useState, useRef, useEffect, useCallback } from 'react'

export default function EditorMetronome({
  bpm = 120,
  onBpmChange,
  isPlaying = false,
  currentTime = 0,
  totalDuration = 0,
  enabled = false,
  onToggle,
  tr,
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

  const lastEmittedBpmRef = useRef(bpm || 120)

  useEffect(() => {
    const incoming = bpm || 120
    if (incoming !== lastEmittedBpmRef.current) {
      setTempo(incoming)
      lastEmittedBpmRef.current = incoming
      // Feedback sonore si activé
      if (enabled) {
        setTimeout(() => generateClickSound(true), 50)
      }
    }
  }, [bpm])

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
        audioContextRef.current = new (window.AudioContext ||
          window.webkitAudioContext)()
      } catch (e) {
        console.warn('Erreur création contexte audio:', e)
        return false
      }
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch((e) =>
        console.warn('Erreur reprise contexte:', e)
      )
    }

    return true
  }, [])

  const generateClickSound = useCallback(
    (isAccent = false) => {
      try {
        if (!initAudioContext()) return false

        const ctx = audioContextRef.current
        if (!ctx || ctx.state === 'closed') return false

        if (ctx.state === 'suspended') {
          ctx.resume().catch((e) =>
            console.warn('Erreur reprise contexte:', e)
          )
        }

        const now = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.value = isAccent ? 1200 : 800

        const vol = isAccent ? accentVolume / 100 : volume / 100
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
    },
    [volume, accentVolume, initAudioContext]
  )

  const previewClick = useCallback(() => {
    if (!enabled) return
    generateClickSound(true)
  }, [enabled, generateClickSound])

  useEffect(() => {
    if (enabled) {
      setTimeout(previewClick, 100)
    }
  }, [enabled, previewClick])

  const playClick = useCallback(
    (isAccent = false) => {
      const now = performance.now()
      if (now - lastClickTimeRef.current < 10) return

      const success = generateClickSound(isAccent)
      if (success) {
        lastClickTimeRef.current = now
      }
    },
    [generateClickSound]
  )

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

    setIsClicking(true)
    setCount(0)
    lastClickTimeRef.current = -1000

    initAudioContext()
    animationFrameRef.current = requestAnimationFrame(metronomeLoop)
  }, [enabled, isPlaying, initAudioContext, metronomeLoop])

  const handleToggle = useCallback(() => {
    const newState = !enabled
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

  const handleBpmChange = useCallback(
    (newBpm) => {
      const clamped = Math.max(40, Math.min(240, newBpm))
      setTempo(clamped)
      lastEmittedBpmRef.current = clamped
      onBpmChange?.(clamped)
      setCount(0)

      if (enabled) {
        setTimeout(() => generateClickSound(true), 50)
      }
    },
    [onBpmChange, enabled, generateClickSound]
  )

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
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== 'closed'
      ) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  return (
    <div
      data-testid="metronome-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        background: enabled ? 'rgba(124,111,247,0.08)' : 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'all 0.2s ease',
        height: 32,
      }}
    >
      <button
        data-testid="metronome-toggle"
        className={enabled ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
        onClick={handleToggle}
        style={{
          fontSize: 11,
          padding: '2px 6px',
          minHeight: 24,
          minWidth: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          background: enabled ? 'var(--accent)' : 'var(--bg-tertiary)',
          borderColor: enabled ? 'var(--accent)' : 'var(--border)',
          color: enabled ? 'white' : 'var(--text-secondary)',
        }}
        title={tr('editorMetronome') || 'Métronome'}
      >
        <i className="ti ti-music" style={{ fontSize: 14 }} />
        {enabled && isClicking && (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--success)',
              display: 'inline-block',
              animation: 'pulse 0.5s ease-in-out infinite',
              marginLeft: 2,
            }}
          />
        )}
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          minWidth: 80,
        }}
      >
        <input
          data-testid="metronome-bpm-slider"
          type="range"
          min="40"
          max="240"
          value={tempo}
          onChange={(e) => {
            const newBpm = Number(e.target.value)
            handleBpmChange(newBpm)
          }}
          style={{
            width: 60,
            accentColor: 'var(--accent)',
            height: 3,
            cursor: 'pointer',
          }}
          title={tr('editorTempo') || 'Tempo (BPM)'}
        />
        <span
          data-testid="metronome-bpm-value"
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
            minWidth: 32,
            textAlign: 'center',
          }}
        >
          {tempo}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          opacity: 0.7,
        }}
      >
        <i
          className="ti ti-volume"
          style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
        />
        <input
          data-testid="metronome-volume-slider"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={{
            width: 30,
            accentColor: 'var(--accent)',
            height: 3,
            cursor: 'pointer',
          }}
          title={tr('editorMetronomeVolume') || 'Volume du métronome'}
        />
      </div>

      {enabled && isClicking && (
        <span
          data-testid="metronome-beat-indicator"
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            fontFamily: 'monospace',
            minWidth: 24,
            textAlign: 'center',
            background: 'var(--bg-tertiary)',
            padding: '1px 6px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}
        >
          {count + 1}/{timeSignature.beats}
        </span>
      )}

      {!enabled && (
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            opacity: 0.5,
            fontFamily: 'monospace',
            padding: '0 4px',
          }}
        >
          {tempo} BPM
        </span>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.7); }
        }
      `}</style>
    </div>
  )
}