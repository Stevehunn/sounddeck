import { useState, useCallback } from 'react'

export default function EditorNormalize({
  clip,
  onNormalize,
  onNormalizeAll,
  isNormalizing,
  tr
}) {
  const [targetPeak, setTargetPeak] = useState(0.95)
  const [mode, setMode] = useState('clip')

  const handleNormalize = useCallback(async () => {
    if (mode === 'clip' && clip) {
      await onNormalize?.(clip.id, targetPeak)
    } else if (mode === 'track') {
      await onNormalizeAll?.('track', targetPeak)
    } else if (mode === 'project') {
      await onNormalizeAll?.('project', targetPeak)
    }
  }, [mode, clip, targetPeak, onNormalize, onNormalizeAll])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '4px 12px',
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)'
    }}>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        style={{
          fontSize: 11,
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        }}
      >
        <option value="clip">{tr('editorNormalizeScopeClip') || 'Clip actuel'}</option>
        <option value="track">{tr('editorNormalizeScopeTrack') || 'Piste entière'}</option>
        <option value="project">{tr('editorNormalizeScopeProject') || 'Projet entier'}</option>
      </select>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {tr('editorTargetPeak') || 'Pic cible'}:
        </span>
        <input
          type="range"
          min="0.5"
          max="1.0"
          step="0.01"
          value={targetPeak}
          onChange={(e) => setTargetPeak(Number(e.target.value))}
          style={{
            width: 60,
            accentColor: 'var(--accent)',
            height: 4
          }}
        />
        <span style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: 'var(--text-secondary)',
          minWidth: 35
        }}>
          {Math.round(targetPeak * 100)}%
        </span>
      </div>

      <button
        className="btn-primary btn-sm"
        onClick={handleNormalize}
        disabled={isNormalizing || !clip}
        style={{
          fontSize: 11,
          padding: '2px 10px',
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        {isNormalizing ? (
          <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> {tr('editorNormalizing') || 'Normalisation...'}</>
        ) : (
          <><i className="ti ti-wave" /> {tr('editorNormalize') || 'Normaliser'}</>
        )}
      </button>
    </div>
  )
}