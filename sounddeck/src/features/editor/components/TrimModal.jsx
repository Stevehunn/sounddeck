import { useState, useEffect } from 'react'

export default function TrimModal({ clip, onConfirm, onCancel, tr }) {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(clip?.duration || 3)
  const [duration, setDuration] = useState(clip?.duration || 3)

  useEffect(() => {
    if (clip) {
      setEnd(clip.duration || 3)
      setDuration(clip.duration || 3)
    }
  }, [clip])

  if (!clip) return null

  const handleConfirm = () => {
    const startVal = Math.max(0, Math.min(start, end - 0.1))
    const endVal = Math.min(duration, Math.max(start + 0.1, end))
    onConfirm(clip.id, startVal, endVal)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-cut" style={{ color: 'var(--accent)' }} />
          Rogner : {clip.name}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Début (secondes) : {start.toFixed(1)}s
            </label>
            <input
              type="range"
              min={0}
              max={duration - 0.1}
              step={0.05}
              value={start}
              onChange={e => setStart(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Fin (secondes) : {end.toFixed(1)}s
            </label>
            <input
              type="range"
              min={0.1}
              max={duration}
              step={0.05}
              value={end}
              onChange={e => setEnd(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            padding: '4px 8px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)'
          }}>
            Durée sélectionnée : {(end - start).toFixed(1)}s
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary btn-lg" onClick={onCancel}>
            {tr('cancel') || 'Annuler'}
          </button>
          <button className="btn-primary btn-lg" onClick={handleConfirm} disabled={end - start < 0.1}>
            <i className="ti ti-check" /> Rogner
          </button>
        </div>
      </div>
    </div>
  )
}