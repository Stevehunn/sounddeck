// src/features/editor/components/EffectsPanel/EffectItem.jsx
import React, { useState, memo } from 'react'
import { DeleteButton } from '@shared/components/ui'

const EFFECT_ICONS = {
  volume: 'ti-volume',
  fadeIn: 'ti-sunrise',
  fadeOut: 'ti-sunset',
  reverb: 'ti-wave-sine',
  echo: 'ti-refresh',
  speed: 'ti-speed',
  pitch: 'ti-music',
  normalize: 'ti-adjustments',
  compressor: 'ti-compress',
  equalizer: 'ti-sliders'
}

const EffectItem = memo(({
  effect,
  onUpdate,
  onRemove,
  onToggle,
  tr
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const icon = EFFECT_ICONS[effect.type] || 'ti-wand'

  const renderParams = () => {
    if (!effect.params) return null

    return Object.entries(effect.params).map(([key, value]) => {
      if (typeof value === 'number') {
        const min = effect.meta?.[key]?.min ?? 0
        const max = effect.meta?.[key]?.max ?? 1
        const step = effect.meta?.[key]?.step ?? 0.01
        const label = effect.meta?.[key]?.label || key

        return (
          <div key={key} style={{ marginBottom: 4 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--text-secondary)'
            }}>
              <span>{label}</span>
              <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
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
                height: 3,
                accentColor: 'var(--accent)',
                cursor: 'pointer'
              }}
            />
          </div>
        )
      }

      if (typeof value === 'boolean') {
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onUpdate?.(effect.id, key, e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 'auto' }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              {effect.meta?.[key]?.label || key}
            </span>
          </div>
        )
      }

      return null
    })
  }

  return (
    <div
      data-testid="editor-effect-item"
      className="effect-item"
      style={{
        background: 'var(--bg-tertiary)',
        border: `1px solid ${effect.enabled ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: 8,
        marginBottom: 4,
        opacity: effect.enabled ? 1 : 0.5,
        transition: 'all 0.15s'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer'
      }}
      onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className={`ti ${icon}`} style={{ color: effect.enabled ? 'var(--accent)' : 'var(--text-tertiary)' }} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>
            {effect.type}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="btn-ghost btn-sm"
            onClick={(e) => { e.stopPropagation(); onToggle?.(effect.id, !effect.enabled) }}
            style={{
              padding: '2px 4px',
              fontSize: 9,
              color: effect.enabled ? 'var(--success)' : 'var(--text-tertiary)'
            }}
          >
            <i className={`ti ${effect.enabled ? 'ti-check' : 'ti-x'}`} />
          </button>
          
          {/* ✅ Bouton Supprimer avec data-testid */}
          <DeleteButton
            data-testid="editor-effect-delete"
            onDelete={() => onRemove?.(effect.id)}
            confirmTitle={tr('confirmDeleteEffect') || 'Confirmer la suppression de l\'effet'}
            confirmMessage={tr('confirmDeleteEffectMessage') || 'Voulez-vous vraiment supprimer cet effet ?'}
            itemName={effect.type}
            size="sm"
            variant="ghost"
            icon="ti-trash"
          />
          
          <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 10, color: 'var(--text-tertiary)' }} />
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          {renderParams()}
        </div>
      )}
    </div>
  )
})

EffectItem.displayName = 'EffectItem'

export default EffectItem