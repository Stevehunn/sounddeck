// src/features/editor/components/Clip/ClipWaveform.jsx
import React, { memo } from 'react'

const ClipWaveform = memo(({ waveformData, trackColor, duration }) => {
  if (!waveformData || waveformData.length === 0) {
    return null
  }

  const data = waveformData.slice(0, Math.min(waveformData.length, 100))

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.2,
      pointerEvents: 'none',
      padding: '8px 4px'
    }}>
      {data.map((value, index) => {
        const height = Math.max(4, Math.min(80, Math.abs(value) * 100))
        return (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${height}%`,
              minHeight: 2,
              maxHeight: '100%',
              background: trackColor,
              margin: '0 0.5px',
              borderRadius: 1,
              transform: `scaleY(${value > 0 ? 1 : -1})`,
              transformOrigin: 'center',
              transition: 'height 0.2s ease'
            }}
          />
        )
      })}
    </div>
  )
})

ClipWaveform.displayName = 'ClipWaveform'

export default ClipWaveform