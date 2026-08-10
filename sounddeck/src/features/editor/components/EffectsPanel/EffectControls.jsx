// src/features/editor/components/EffectsPanel/EffectControls.jsx
import React, { memo } from 'react'

const EffectControls = memo(({
  effect,
  onUpdate,
  tr
}) => {
  if (!effect?.params) return null

  const renderParam = (key, value) => {
    if (typeof value === 'number') {
      const meta = effect.meta?.[key] || {}
      const min = meta.min ?? 0
      const max = meta.max ?? 1
      const step = meta.step ?? 0.01
      const label = meta.label || key
      const unit = meta.unit || ''

      return (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginBottom: 2
          }}>
            <span>{label}</span>
            <span>{typeof value === 'number' ? value.toFixed(2) : value}{unit}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value)
              onUpdate?.(effect.id, key, newValue)
            }}
            style={{
              width: '100%',
              height: 4,
              accentColor: 'var(--accent)',
              cursor: 'pointer',
              background: 'var(--bg-tertiary)',
              borderRadius: 2
            }}
          />
        </div>
      )
    }

    if (typeof value === 'boolean') {
      return (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onUpdate?.(effect.id, key, e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 'auto', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {effect.meta?.[key]?.label || key}
          </span>
        </div>
      )
    }

    if (typeof value === 'string') {
      const options = effect.meta?.[key]?.options || []
      if (options.length > 0) {
        return (
          <div key={key} style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>
              {effect.meta?.[key]?.label || key}
            </label>
            <select
              value={value}
              onChange={(e) => onUpdate?.(effect.id, key, e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                fontSize: 11,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )
      }
    }

    return null
  }

  return (
    <div style={{ marginTop: 8 }}>
      {Object.entries(effect.params).map(([key, value]) => renderParam(key, value))}
    </div>
  )
})

EffectControls.displayName = 'EffectControls'

export default EffectControls