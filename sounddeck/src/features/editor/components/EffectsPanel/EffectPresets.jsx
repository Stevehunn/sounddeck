// src/features/editor/components/EffectsPanel/EffectPresets.jsx
import React, { useState, memo } from 'react'

const PRESETS = {
  volume: {
    label: 'Volume',
    presets: [
      { name: 'Normal', params: { gain: 1 } },
      { name: 'Soft (-3dB)', params: { gain: 0.7 } },
      { name: 'Loud (+3dB)', params: { gain: 1.4 } },
      { name: 'Boost (+6dB)', params: { gain: 2 } },
      { name: 'Max', params: { gain: 5 } },
    ]
  },
  reverb: {
    label: 'Réverbération',
    presets: [
      { name: 'Léger', params: { decay: 0.5, mix: 0.15 } },
      { name: 'Moyen', params: { decay: 1.5, mix: 0.3 } },
      { name: 'Ambient', params: { decay: 3, mix: 0.4 } },
      { name: 'Cathedral', params: { decay: 5, mix: 0.5 } },
      { name: 'Dense', params: { decay: 2, mix: 0.6 } },
    ]
  },
  echo: {
    label: 'Écho',
    presets: [
      { name: 'Léger', params: { delay: 0.2, feedback: 0.3, mix: 0.2 } },
      { name: 'Moyen', params: { delay: 0.4, feedback: 0.5, mix: 0.35 } },
      { name: 'Slapback', params: { delay: 0.08, feedback: 0.3, mix: 0.25 } },
      { name: 'Dub', params: { delay: 0.6, feedback: 0.7, mix: 0.4 } },
      { name: 'Echo', params: { delay: 0.3, feedback: 0.8, mix: 0.5 } },
    ]
  },
  fadeIn: {
    label: 'Fade In',
    presets: [
      { name: 'Rapide (0.1s)', params: { duration: 0.1 } },
      { name: 'Court (0.3s)', params: { duration: 0.3 } },
      { name: 'Moyen (0.5s)', params: { duration: 0.5 } },
      { name: 'Long (1s)', params: { duration: 1 } },
      { name: 'Très long (3s)', params: { duration: 3 } },
    ]
  },
  fadeOut: {
    label: 'Fade Out',
    presets: [
      { name: 'Rapide (0.1s)', params: { duration: 0.1 } },
      { name: 'Court (0.3s)', params: { duration: 0.3 } },
      { name: 'Moyen (0.5s)', params: { duration: 0.5 } },
      { name: 'Long (1s)', params: { duration: 1 } },
      { name: 'Très long (3s)', params: { duration: 3 } },
    ]
  },
  normalize: {
    label: 'Normalisation',
    presets: [
      { name: 'Léger (-6dB)', params: { target: 0.5 } },
      { name: 'Moyen (-3dB)', params: { target: 0.7 } },
      { name: 'Standard', params: { target: 0.9 } },
      { name: 'Fort (-0.5dB)', params: { target: 0.95 } },
      { name: 'Max (0dB)', params: { target: 1 } },
    ]
  }
}

const EffectPresets = memo(({
  effectType,
  onApplyPreset,
  tr
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const presets = PRESETS[effectType]
  if (!presets || presets.presets.length === 0) return null

  return (
    <div style={{ marginTop: 4 }}>
      <button
        className="btn-ghost btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          padding: '2px 8px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        <i className="ti ti-template" />
        {tr('editorPresets') || 'Presets'}
        <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 8 }} />
      </button>

      {isOpen && (
        <div style={{
          marginTop: 4,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4
        }}>
          {presets.presets.map((preset, index) => (
            <button
              key={index}
              className="btn-secondary btn-sm"
              onClick={() => {
                onApplyPreset?.(preset.params)
                setIsOpen(false)
              }}
              style={{
                fontSize: 9,
                padding: '2px 8px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

EffectPresets.displayName = 'EffectPresets'

export default EffectPresets