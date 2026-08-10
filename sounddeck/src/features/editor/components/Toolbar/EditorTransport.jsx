// src/features/editor/components/Toolbar/EditorTransport.jsx
import React, { memo } from 'react'

const EditorTransport = memo(({
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop,
  currentTime,
  totalDuration,
  formatTime,
  tr
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      flexShrink: 0
    }}>
      <button
        className="btn-ghost btn-sm"
        onClick={onStop}
        style={{ fontSize: 14, color: 'var(--text-secondary)' }}
        title={tr('editorStop') || 'Arrêter'}
      >
        <i className="ti ti-player-stop" />
      </button>

      <button
        className="btn-primary btn-sm"
        onClick={isPlaying ? onPause : onPlay}
        style={{ 
          fontSize: 14, 
          minWidth: 36,
          padding: '4px 12px',
          background: isPlaying ? 'var(--warning)' : 'var(--accent)'
        }}
        title={isPlaying ? tr('editorPause') || 'Pause' : tr('editorPlay') || 'Lecture'}
      >
        <i className={`ti ${isPlaying ? 'ti-player-pause' : 'ti-player-play'}`} />
      </button>

      <div style={{
        fontSize: 12,
        fontFamily: 'monospace',
        color: 'var(--text-secondary)',
        minWidth: 80,
        textAlign: 'center'
      }}>
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </div>

      {/* Progress bar */}
      <div style={{
        flex: 1,
        height: 4,
        background: 'var(--bg-tertiary)',
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        minWidth: 60
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width
        const time = x * totalDuration
        onPlay?.(time)
      }}>
        <div style={{
          width: `${(currentTime / totalDuration) * 100}%`,
          height: '100%',
          background: 'var(--accent)',
          borderRadius: 2,
          transition: isPlaying ? 'none' : 'width 0.1s ease'
        }} />
      </div>
    </div>
  )
})

EditorTransport.displayName = 'EditorTransport'

export default EditorTransport