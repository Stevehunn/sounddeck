import { useState, useEffect, useRef, useCallback } from 'react'

export default function AudioTrimmer({ filePath, onConfirm, onCancel }) {
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [trimming, setTrimming] = useState(false)
  const [trimWarning, setTrimWarning] = useState('')
  const [dragging, setDragging] = useState(null) // 'start' | 'end' | 'playhead'

  const audioRef = useRef(null)
  const timelineRef = useRef(null)

  const fileUrl = filePath.startsWith('file://') ? filePath : 'file:///' + filePath.replace(/\\/g, '/')

  useEffect(() => {
    const audio = new Audio(fileUrl)
    audioRef.current = audio
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
      setEnd(audio.duration)
    })
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('ended', () => { setPlaying(false); setCurrentTime(0) })
    return () => { audio.pause(); audio.src = '' }
  }, [fileUrl])

  // Arrêter la lecture quand on dépasse le end
  useEffect(() => {
    if (audioRef.current && currentTime >= end && playing) {
      audioRef.current.pause()
      audioRef.current.currentTime = start
      setCurrentTime(start)
      setPlaying(false)
    }
  }, [currentTime, end, start, playing])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.currentTime = start
      audio.play()
      setPlaying(true)
    }
  }

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const getPosFromEvent = useCallback((e) => {
    const timeline = timelineRef.current
    if (!timeline || !duration) return 0
    const rect = timeline.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    return Math.max(0, Math.min(duration, x * duration))
  }, [duration])

  const handleMouseDown = (type) => (e) => {
    e.preventDefault()
    setDragging(type)
  }

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return
    const pos = getPosFromEvent(e)
    if (dragging === 'start') {
      const newStart = Math.min(pos, end - 0.1)
      setStart(Math.max(0, newStart))
    } else if (dragging === 'end') {
      const newEnd = Math.max(pos, start + 0.1)
      setEnd(Math.min(duration, newEnd))
    } else if (dragging === 'playhead') {
      if (audioRef.current) audioRef.current.currentTime = pos
      setCurrentTime(pos)
    }
  }, [dragging, getPosFromEvent, start, end, duration])

  const handleMouseUp = useCallback(() => setDragging(null), [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleTimelineClick = (e) => {
    if (dragging) return
    const pos = getPosFromEvent(e)
    if (audioRef.current) audioRef.current.currentTime = pos
    setCurrentTime(pos)
  }

  const handleTrim = async () => {
    setTrimming(true)
    if (playing) { audioRef.current?.pause(); setPlaying(false) }
    const result = await window.electronAPI.trimSoundFile(filePath, start, end)
    setTrimming(false)
    if (result.success) {
      if (result.warning) {
        setTrimWarning(result.warning)
      }
      onConfirm(result.path)
    } else {
      setTrimWarning('Erreur : ' + result.error)
    }
  }

  const pct = (v) => `${(v / (duration || 1)) * 100}%`
  const selLeft = pct(start)
  const selWidth = `${((end - start) / (duration || 1)) * 100}%`
  const playheadLeft = pct(currentTime)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-cut" style={{ color: 'var(--accent)' }} />
        Rogner le son
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 4 }}>
          Sélection : {formatTime(start)} → {formatTime(end)} ({formatTime(end - start)})
        </span>
      </div>

      {/* Waveform / timeline */}
      <div style={{ position: 'relative', height: 60, userSelect: 'none' }}>
        {/* Fond */}
        <div ref={timelineRef} onClick={handleTimelineClick}
          style={{ position: 'absolute', inset: 0, background: 'var(--bg-tertiary)', borderRadius: 8, cursor: 'crosshair', overflow: 'hidden' }}>

          {/* Waveform simulée avec des barres */}
          <WaveformBars duration={duration} />

          {/* Zone sélectionnée */}
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: selLeft, width: selWidth,
            background: 'rgba(124,111,247,0.25)', border: '1px solid var(--accent)',
            pointerEvents: 'none'
          }} />

          {/* Playhead */}
          <div onMouseDown={handleMouseDown('playhead')}
            style={{
              position: 'absolute', top: 0, bottom: 0, left: playheadLeft,
              width: 2, background: 'white', cursor: 'col-resize', zIndex: 10,
              transform: 'translateX(-1px)'
            }}>
            <div style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderRadius: '50%', background: 'white', border: '2px solid var(--accent)' }} />
          </div>
        </div>

        {/* Poignée start */}
        <div onMouseDown={handleMouseDown('start')}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: selLeft,
            width: 10, cursor: 'ew-resize', zIndex: 11, transform: 'translateX(-5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
          <div style={{ width: 4, height: '80%', background: 'var(--accent)', borderRadius: 2 }} />
        </div>

        {/* Poignée end */}
        <div onMouseDown={handleMouseDown('end')}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: `calc(${selLeft} + ${selWidth})`,
            width: 10, cursor: 'ew-resize', zIndex: 11, transform: 'translateX(-5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
          <div style={{ width: 4, height: '80%', background: 'var(--accent)', borderRadius: 2 }} />
        </div>
      </div>

      {/* Timestamps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)' }}>
        <span>{formatTime(0)}</span>
        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Contrôles sliders précis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Début : {formatTime(start)}</label>
          <input type="range" min="0" max={duration} step="0.01" value={start}
            onChange={e => setStart(Math.min(Number(e.target.value), end - 0.1))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Fin : {formatTime(end)}</label>
          <input type="range" min="0" max={duration} step="0.01" value={end}
            onChange={e => setEnd(Math.max(Number(e.target.value), start + 0.1))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
        </div>
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={togglePlay} className="btn-secondary" style={{ gap: 6 }}>
          <i className={`ti ${playing ? 'ti-player-pause' : 'ti-player-play'}`} />
          {playing ? 'Pause' : 'Écouter la sélection'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} className="btn-secondary">Retour</button>
          <button onClick={handleTrim} className="btn-primary" disabled={trimming}>
            {trimming ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Traitement...</> : <><i className="ti ti-check" /> Confirmer</>}
          </button>
        </div>
      </div>

      {trimWarning ? (
        <div style={{ fontSize: 11, color: 'var(--warning)', padding: '8px 10px', background: 'rgba(239,159,39,0.1)', borderRadius: 6, border: '1px solid var(--warning)' }}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />
          {trimWarning}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
          <i className="ti ti-info-circle" style={{ marginRight: 4 }} />
          Installez <strong>ffmpeg-static</strong> via npm pour le rognage précis.
        </div>
      )}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

// Waveform simulée avec des barres pseudo-aléatoires mais déterministes
function WaveformBars({ duration }) {
  const bars = 80
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 1, padding: '4px 2px', pointerEvents: 'none' }}>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 20 + Math.abs(Math.sin(i * 2.3 + duration * 0.1) * Math.cos(i * 1.7) * 70)
        return (
          <div key={i} style={{ flex: 1, height: `${h}%`, background: 'rgba(124,111,247,0.35)', borderRadius: 1, minWidth: 1 }} />
        )
      })}
    </div>
  )
}