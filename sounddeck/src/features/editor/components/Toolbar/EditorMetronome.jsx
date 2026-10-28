/**
 * @file Editor metronome widget.
 *
 * Plays a click sound at the configured BPM while the timeline is
 * playing. Two accent levels:
 * - **Accent** — first beat of each bar (1200 Hz).
 * - **Normal** — remaining beats (800 Hz).
 *
 * The metronome is **synchronized with the timeline** via `requestAnimationFrame`:
 * `metronomeLoop` runs every frame, computes the current beat from
 * `currentTime`, and triggers a click when we cross a beat boundary
 * (with a 10 ms dedup window to avoid double-clicks on frame overlap).
 *
 * The `AudioContext` is created lazily on first click and closed on unmount.
 *
 * @see ./index.jsx — the toolbar that mounts this component
 * @see @shared/utils/logger.js
 */

import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Plays a single metronome click through the given `AudioContext`.
 *
 * Extracted to module scope so the React Compiler can preserve the
 * memoization of the wrapping `useCallback` in the component (the
 * try/catch and ref-mutation pattern inside the callback body was
 * preventing compiler optimization).
 *
 * @param {React.MutableRefObject<AudioContext|null>} audioContextRef
 * @param {() => boolean} initAudioContext - Idempotent context initializer.
 * @param {number} volume - Normal click volume (0-100).
 * @param {number} accentVolume - Accent click volume (0-100).
 * @param {boolean} isAccent - `true` for a higher-pitched accent click.
 * @returns {boolean} `true` if the click was scheduled.
 */
function playClickSound(
  audioContextRef,
  initAudioContext,
  volume,
  accentVolume,
  isAccent
) {
  try {
    if (!initAudioContext()) return false

    const ctx = audioContextRef.current
    if (!ctx || ctx.state === 'closed') return false

    if (ctx.state === 'suspended') {
      ctx.resume().catch((e) => console.warn('Erreur reprise contexte:', e))
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
}

/**
 * Editor metronome widget.
 *
 * @param {Object} props
 * @param {number} [props.bpm=120] - Beats per minute (40-240).
 * @param {(bpm: number) => void} [props.onBpmChange] - Called when the user drags the slider.
 * @param {boolean} [props.isPlaying=false] - Mirrors the timeline state.
 * @param {number} [props.currentTime=0] - Current playhead position (seconds).
 * @param {number} [props.totalDuration=0] - Total project duration (seconds).
 * @param {boolean} [props.enabled=false] - `true` if the metronome is ON.
 * @param {(enabled: boolean) => void} [props.onToggle] - Called when the user clicks the toggle.
 * @param {(key: string) => string} props.tr - i18n translator.
 * @returns {JSX.Element}
 */
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

  // Sync `bpm` prop → local tempo when the parent changes it externally
  // (avoid feedback loops with `onBpmChange`).
  useEffect(() => {
    const incoming = bpm || 120
    if (incoming !== lastEmittedBpmRef.current) {
      setTempo(incoming)
      lastEmittedBpmRef.current = incoming
      if (enabled) {
        setTimeout(() => generateClickSound(true), 50)
      }
    }
  }, [bpm])

  // Keep refs in sync with props (used by the rAF loop).
  useEffect(() => {
    isEnabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  /**
   * Lazily creates (or resumes) the shared AudioContext.
   *
   * @returns {boolean} `true` if the context is ready for playback.
   */
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
      audioContextRef.current
        .resume()
        .catch((e) => console.warn('Erreur reprise contexte:', e))
    }

    return true
  }, [])

  /**
   * Plays a click (delegates to `playClickSound`).
   *
   * **Why the eslint-disable**: the React Compiler cannot statically
   * prove that this `useCallback` is safely memoizable because:
   * - `audioContextRef` is a mutable ref (compiler can't assume stable).
   * - `playClickSound` calls `performance.now()`/`Date.now()` indirectly
   *   via the `AudioContext` (impure from the compiler's POV).
   *
   * In practice the callback **IS stable**: its deps are `[volume,
   * accentVolume, initAudioContext]` and `initAudioContext` has `[]` deps,
   * so it's created once per volume/accent change (i.e. only on user
   * slider input). The compiler skip is a false positive — no actual
   * re-render storm occurs.
   *
   * @param {boolean} [isAccent=false]
   * @returns {boolean}
   */
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const generateClickSound = useCallback(
    (isAccent = false) =>
      playClickSound(
        audioContextRef,
        initAudioContext,
        volume,
        accentVolume,
        isAccent
      ),
    [volume, accentVolume, initAudioContext]
  )

  /**
   * Emits a preview accent click (called when the metronome is toggled on).
   * @returns {void}
   */
  const previewClick = useCallback(() => {
    if (!enabled) return
    generateClickSound(true)
  }, [enabled, generateClickSound])

  useEffect(() => {
    if (enabled) {
      setTimeout(previewClick, 100)
    }
  }, [enabled, previewClick])

  /**
   * Plays a click with a 10ms dedup window (avoids double-clicks when
   * the rAF loop catches a beat boundary twice).
   *
   * @param {boolean} [isAccent=false]
   * @returns {void}
   */
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

  /**
   * Main rAF loop: called on every frame, computes the current beat
   * from `currentTimeRef`, triggers a click when we cross a beat
   * boundary. Runs continuously even when paused (early-returns).
   *
   * @returns {void}
   */
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

  /**
   * Starts (or restarts) the rAF loop.
   * @returns {void}
   */
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

  /**
   * Toggles the metronome on/off (notifies the parent).
   * @returns {void}
   */
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

  /**
   * Clamps the BPM to 40-240, updates the local tempo, notifies the
   * parent, and triggers a preview accent click.
   *
   * @param {number} newBpm
   * @returns {void}
   */
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

  // Restart the loop when isPlaying / enabled changes.
  useEffect(() => {
    if (enabled && isPlaying) {
      startMetronome()
    } else if (!isPlaying) {
      setIsClicking(false)
      setCount(0)
    }
  }, [isPlaying, enabled, startMetronome])

  // Restart the loop when the tempo changes (beat boundaries shift).
  useEffect(() => {
    if (enabled && isPlaying) {
      startMetronome()
    }
  }, [tempo, enabled, isPlaying, startMetronome])

  // Cleanup on unmount.
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