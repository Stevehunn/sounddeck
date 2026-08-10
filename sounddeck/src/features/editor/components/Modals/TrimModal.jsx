// src/features/editor/components/Modals/TrimModal.jsx
import React, { useState, useRef, useEffect } from 'react'

export default function TrimModal({ isOpen, onClose, onTrim, clip, duration, tr }) {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(duration || 3)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (clip?.path) {
      setStart(0)
      setEnd(duration || 3)
    }
  }, [clip, duration])

  if (!isOpen || !clip) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedStart = Math.max(0, Math.min(start, end - 0.05))
    const trimmedEnd = Math.min(duration || 3, Math.max(start + 0.05, end))
    onTrim?.(trimmedStart, trimmedEnd)
    onClose()
  }

  const handlePlay = () => {
    // Logique de lecture du clip
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return `${s.toFixed(1)}s`
  }

  const totalDuration = duration || 3

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-cut" style={{ color: 'var(--accent)' }} />
          {tr('editorTrim') || 'Rogner'}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
            {clip.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {tr('duration') || 'Durée'}: {formatTime(totalDuration)}
          </div>
        </div>

        {/* Waveform simplifié */}
        <div style={{
          height: 60,
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          marginBottom: 16,
          overflow: 'hidden'
        }}>
          {/* Zone de sélection */}
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${(start / totalDuration) * 100}%`,
            width: `${((end - start) / totalDuration) * 100}%`,
            background: 'rgba(124,111,247,0.2)',
            border: '2px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            pointerEvents: 'none'
          }}>
            <div style={{
              position: 'absolute',
              top: -18,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 9,
              color: 'var(--accent)',
              background: 'var(--bg-secondary)',
              padding: '1px 6px',
              borderRadius: 3,
              whiteSpace: 'nowrap'
            }}>
              {formatTime(end - start)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {tr('start') || 'Début'}
              </label>
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.01}
                value={start}
                onChange={(e) => setStart(Math.min(parseFloat(e.target.value), end - 0.05))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                {formatTime(start)}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {tr('end') || 'Fin'}
              </label>
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.01}
                value={end}
                onChange={(e) => setEnd(Math.max(parseFloat(e.target.value), start + 0.05))}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                {formatTime(end)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={isPlaying ? handlePause : handlePlay}
            >
              <i className={`ti ${isPlaying ? 'ti-player-pause' : 'ti-player-play'}`} />
              {isPlaying ? tr('editorPause') || 'Pause' : tr('editorListenClip') || 'Écouter'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => { setStart(0); setEnd(totalDuration) }}
            >
              <i className="ti ti-select-all" /> {tr('selectAll') || 'Tout sélectionner'}
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {tr('cancel') || 'Annuler'}
            </button>
            <button type="submit" className="btn-primary">
              <i className="ti ti-cut" /> {tr('editorTrim') || 'Rogner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}