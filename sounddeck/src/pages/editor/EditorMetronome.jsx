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
  const [count, setCount] = useState(0)
  
  const audioContextRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isEnabledRef = useRef(false)
  const isPlayingRef = useRef(false)
  const currentTimeRef = useRef(0)
  const nextClickTimeRef = useRef(0)
  const lastClickTimeRef = useRef(-1000) // ✅ Pour éviter les doubles clics

  // ─── SYNC DES REFS ──────────────────────────────────────────────────────
  useEffect(() => {
    isEnabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  // ─── INITIALISATION DU CONTEXTE AUDIO ──────────────────────────────────
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

  // ─── GÉNÉRATION DU SON DE CLIC ─────────────────────────────────────────
  const generateClickSound = useCallback((isAccent = false) => {
    try {
      // ✅ Initialiser le contexte si nécessaire
      if (!initAudioContext()) {
        console.warn('❌ Impossible d\'initialiser le contexte audio')
        return false
      }
      
      const ctx = audioContextRef.current
      if (!ctx || ctx.state === 'closed') {
        console.warn('❌ Contexte audio fermé')
        return false
      }
      
      // ✅ S'assurer que le contexte est running
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

  // ─── JOUE UN CLIC ──────────────────────────────────────────────────────
  const playClick = useCallback((isAccent = false) => {
    const now = performance.now()
    
    // ✅ Éviter les doubles clics trop rapprochés (moins de 10ms)
    if (now - lastClickTimeRef.current < 10) {
      return
    }
    
    const success = generateClickSound(isAccent)
    if (success) {
      lastClickTimeRef.current = now
      if (isAccent) {
        // console.log('🔊 Clic accentué')
      } else {
        // console.log('🔊 Clic normal')
      }
    }
  }, [generateClickSound])

  // ─── BOUCLE PRINCIPALE DU MÉTRONOME ──────────────────────────────────────
  const metronomeLoop = useCallback(() => {
    const isEnabled = isEnabledRef.current
    const isPlayingNow = isPlayingRef.current
    
    // ✅ Si le métronome est désactivé ou que la lecture est en pause, ne rien faire
    if (!isEnabled || !isPlayingNow) {
      setIsClicking(false)
      animationFrameRef.current = requestAnimationFrame(metronomeLoop)
      return
    }

    const current = currentTimeRef.current
    const beatDuration = 60 / (tempo || 120)
    
    // ✅ Calculer le prochain temps de clic aligné sur la grille
    // On utilise un seuil de 0.01s pour éviter les erreurs d'arrondi
    const currentBeat = Math.floor(current / beatDuration)
    const nextBeatTime = (currentBeat + 1) * beatDuration
    const timeUntilNextBeat = nextBeatTime - current
    
    // ✅ Vérifier si on doit jouer un clic (si on est proche du prochain battement)
    if (timeUntilNextBeat < 0.02 && timeUntilNextBeat >= 0) {
      const isAccent = (currentBeat + 1) % timeSignature.beats === 1
      
      // ✅ Vérifier qu'on n'a pas déjà joué ce clic
      const lastClickTime = lastClickTimeRef.current
      const timeSinceLastClick = (performance.now() - lastClickTime) / 1000
      
      if (timeSinceLastClick > beatDuration * 0.5) {
        playClick(isAccent)
        setCount((currentBeat + 1) % timeSignature.beats)
        setIsClicking(true)
        console.log(`🎵 Clic métronome ${isAccent ? 'accentué' : 'normal'} à ${current.toFixed(2)}s (battement ${(currentBeat + 1) % timeSignature.beats + 1}/${timeSignature.beats})`)
      }
    }
    
    // ✅ Continuer la boucle
    animationFrameRef.current = requestAnimationFrame(metronomeLoop)
  }, [tempo, timeSignature.beats, playClick])

  // ─── DÉMARRER/ARRÊTER LE MÉTRONOME ──────────────────────────────────────
  const startMetronome = useCallback(() => {
    // ✅ Arrêter la boucle précédente
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
    
    // ✅ Initialiser le contexte audio
    initAudioContext()
    
    // ✅ Démarrer la boucle
    animationFrameRef.current = requestAnimationFrame(metronomeLoop)
  }, [enabled, isPlaying, initAudioContext, metronomeLoop])

  // ─── TOGGLE MÉTRONOME ──────────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    const newState = !enabled
    console.log(`🎵 Toggle métronome: ${newState ? 'ON' : 'OFF'}`)
    onToggle?.(newState)
    
    if (newState) {
      // ✅ Activer
      if (isPlaying) {
        startMetronome()
      } else {
        setIsClicking(false)
        setCount(0)
      }
    } else {
      // ✅ Désactiver
      setIsClicking(false)
      setCount(0)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [enabled, onToggle, isPlaying, startMetronome])

  // ─── CHANGEMENT DE BPM ──────────────────────────────────────────────────
  const handleBpmChange = useCallback((newBpm) => {
    const clamped = Math.max(40, Math.min(240, newBpm))
    setTempo(clamped)
    onBpmChange?.(clamped)
    
    // ✅ Réinitialiser le compteur
    setCount(0)
  }, [onBpmChange])

  // ─── EFFET : SYNC AVEC LA LECTURE ──────────────────────────────────────
  useEffect(() => {
    console.log(`🎵 État métronome: enabled=${enabled}, isPlaying=${isPlaying}`)
    
    if (enabled && isPlaying) {
      startMetronome()
    } else if (!isPlaying) {
      setIsClicking(false)
      setCount(0)
    }
  }, [isPlaying, enabled, startMetronome])

  // ─── EFFET : RÉINITIALISATION QUAND LE TEMPO CHANGE ────────────────────
  useEffect(() => {
    if (enabled && isPlaying) {
      // ✅ Redémarrer la boucle avec le nouveau tempo
      startMetronome()
    }
  }, [tempo, enabled, isPlaying, startMetronome])

  // ─── NETTOYAGE ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
        console.log('🎵 Contexte audio du métronome fermé')
      }
    }
  }, [])

  // ─── RENDU ──────────────────────────────────────────────────────────────

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
      {/* Bouton Toggle */}
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

      {/* Contrôle du BPM */}
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

      {/* Contrôle du volume */}
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

      {/* Indicateur de compteur */}
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