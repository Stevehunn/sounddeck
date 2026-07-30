// src/pages/editor/components/EditorMasterVolume/index.jsx
import { useState, useCallback } from 'react'

export default function EditorMasterVolume({
  volume = 100,
  onVolumeChange,
  isMuted = false,
  onMuteToggle,
  peakMeter = 0,
  tr
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleVolumeChange = useCallback((e) => {
    const val = Number(e.target.value)
    onVolumeChange?.(val)
  }, [onVolumeChange])

  const getColor = () => {
    if (isMuted) return 'var(--text-tertiary)'
    if (peakMeter > 0.9) return 'var(--danger)'
    if (peakMeter > 0.7) return 'var(--warning)'
    return 'var(--success)'
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        minWidth: 160
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className="btn-ghost btn-sm"
        onClick={onMuteToggle}
        style={{
          fontSize: 14,
          padding: '2px 4px',
          color: isMuted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none'
        }}
        title={isMuted ? tr('editorUnmute') || 'Réactiver le son' : tr('editorMute') || 'Couper le son'}
      >
        <i className={`ti ${isMuted ? 'ti-volume-off' : 'ti-volume'}`} />
      </button>

      <div style={{ flex: 1, position: 'relative' }}>
        <input
          type="range"
          min="0"
          max="200"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          style={{
            width: '100%',
            accentColor: getColor(),
            height: 4,
            opacity: isMuted ? 0.4 : 1
          }}
          title={tr('editorMasterVolume') || 'Volume global'}
        />
        
        {!isMuted && peakMeter > 0 && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: -4,
              width: Math.min(100, peakMeter * 100) + '%',
              height: 12,
              background: `linear-gradient(90deg, 
                ${peakMeter > 0.7 ? 'var(--warning)' : 'var(--success)'} 
                ${peakMeter > 0.9 ? ', var(--danger)' : ''}
              )`,
              opacity: 0.15,
              borderRadius: 2,
              pointerEvents: 'none',
              transition: 'width 0.1s ease'
            }}
          />
        )}
      </div>

      <span
        style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: isMuted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          minWidth: 30,
          textAlign: 'center'
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {isMuted ? 'OFF' : `${Math.round(volume)}%`}
      </span>

      {showTooltip && !isMuted && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
          fontSize: 10,
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          zIndex: 10,
          marginBottom: 4
        }}>
          {tr('editorPeak') || 'Pic'}: {Math.round(peakMeter * 100)}%
        </div>
      )}
    </div>
  )
}