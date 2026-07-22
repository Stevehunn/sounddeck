import { useState, useEffect, useCallback, useRef } from 'react'
import TrimModal from './TrimModal'
import useConfirm from '../../hooks/useConfirm'

const EFFECT_TYPES = [
  { id: 'volume', label: 'Volume', icon: 'ti-volume', params: ['value'] },
  { id: 'fadeIn', label: 'Fade In', icon: 'ti-sun', params: ['duration'] },
  { id: 'fadeOut', label: 'Fade Out', icon: 'ti-moon', params: ['duration'] },
  { id: 'pitch', label: 'Hauteur', icon: 'ti-arrow-up', params: ['semitones'] },
  { id: 'speed', label: 'Vitesse', icon: 'ti-speedometer', params: ['value'] },
  { id: 'echo', label: 'Écho', icon: 'ti-repeat', params: ['delay', 'decay', 'mix'] },
  { id: 'reverb', label: 'Réverbération', icon: 'ti-wave', params: ['roomSize', 'mix'] },
]

const PARAM_LABELS = {
  value: 'Valeur',
  duration: 'Durée (s)',
  semitones: 'Demi-tons',
  delay: 'Délai (s)',
  decay: 'Atténuation',
  mix: 'Mix',
  roomSize: 'Taille',
}

const PARAM_DEFAULTS = {
  value: 1.0,
  duration: 0.5,
  semitones: 0,
  delay: 0.3,
  decay: 0.5,
  mix: 0.3,
  roomSize: 0.5,
}

const PARAM_RANGES = {
  value: { min: 0, max: 5, step: 0.05 },
  duration: { min: 0.1, max: 10, step: 0.1 },
  semitones: { min: -24, max: 24, step: 1 },
  delay: { min: 0.05, max: 3, step: 0.05 },
  decay: { min: 0, max: 1, step: 0.05 },
  mix: { min: 0, max: 1, step: 0.05 },
  roomSize: { min: 0, max: 1, step: 0.05 },
}

export default function EditorEffectsPanel({
  clip,
  trackId,
  onEffectAdd,
  onEffectRemove,
  onEffectUpdate,
  onEffectToggle,
  onClipUpdate,
  onPreview,
  isPreviewing,
  onNormalize,
  onTrim,
  lang,
  tr,
  autoPlayOnClick = false
}) {
  const [showAddEffect, setShowAddEffect] = useState(false)
  const [showTrimModal, setShowTrimModal] = useState(false)
  const [normalizeTarget, setNormalizeTarget] = useState(0.95)
  const previewTimeoutRef = useRef(null)
  
  const { confirm, ConfirmWrapper } = useConfirm({ lang })

  const getTargetPeakOptions = () => [
    { value: 0.5, label: tr('normalizationTargetVeryLow') || '-6 dB (Très doux)' },
    { value: 0.65, label: tr('normalizationTargetLow') || '-3.7 dB (Doux)' },
    { value: 0.8, label: tr('normalizationTargetModerate') || '-2 dB (Modéré)' },
    { value: 0.9, label: tr('normalizationTargetHigh') || '-0.9 dB (Fort)' },
    { value: 0.95, label: tr('normalizationTargetVeryHigh') || '-0.4 dB (Très fort)' },
    { value: 1.0, label: tr('normalizationTargetMax') || '0 dB (Max)' },
  ]

  const previewEffects = useCallback(async () => {
    if (!clip || !clip.path) return
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }

    const hasActiveEffects = clip.effects?.some(e => e.enabled) || false
    if (!hasActiveEffects) {
      onPreview?.(clip, null)
      return
    }

    try {
      onPreview?.(clip, null)
    } catch (e) {
      console.warn('Erreur prévisualisation effets:', e)
      onPreview?.(clip, null)
    }
  }, [clip, onPreview])

  const schedulePreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }
    previewTimeoutRef.current = setTimeout(() => {
      previewEffects()
    }, 300)
  }, [previewEffects])

  useEffect(() => {
    if (clip && clip.effects && autoPlayOnClick === true) {
      schedulePreview()
    }
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [clip?.effects, clip?.id, schedulePreview, autoPlayOnClick])

  const handleParamChange = (effectId, param, value) => {
    onEffectUpdate(trackId, clip.id, effectId, param, value)
  }

  const handleEffectToggle = (effectId, enabled) => {
    onEffectToggle(trackId, clip.id, effectId, enabled)
  }

  const handleEffectRemove = (effectId) => {
    onEffectRemove(trackId, clip.id, effectId)
  }

  if (!clip) return null

  const handleAddEffect = (effectType) => {
    const defaults = {}
    const effectDef = EFFECT_TYPES.find(e => e.id === effectType)
    effectDef?.params.forEach(param => {
      defaults[param] = PARAM_DEFAULTS[param] || 0
    })
    onEffectAdd(trackId, clip.id, effectType, defaults)
    setShowAddEffect(false)
  }

  const handleTrimClick = () => {
    setShowTrimModal(true)
  }

  const handleTrimConfirm = (clipId, start, end) => {
    onTrim?.(clipId, start, end)
    setShowTrimModal(false)
  }

  // ✅ Gestion de la normalisation avec popup personnalisée
  const handleNormalizeClick = async () => {
    if (!clip) return

    let localTarget = normalizeTarget

    const result = await new Promise((resolve) => {
      const closePopup = () => {
        setShowNormalizePopup(false)
      }

      let selectedTarget = localTarget

      const handleConfirm = () => {
        setNormalizeTarget(selectedTarget)
        closePopup()
        resolve(true)
      }

      const handleCancel = () => {
        closePopup()
        resolve(false)
      }

      const handleTargetChange = (e) => {
        e.stopPropagation()
        selectedTarget = Number(e.target.value)
        setNormalizeTarget(selectedTarget)
      }

      setShowNormalizePopup({
        onConfirm: handleConfirm,
        onCancel: handleCancel,
        onTargetChange: handleTargetChange,
        currentTarget: selectedTarget
      })
    })

    if (result) {
      onNormalize?.(clip.id, normalizeTarget)
    }
  }

  const [showNormalizePopup, setShowNormalizePopup] = useState(null)

  // Fonction pour formater l'affichage des valeurs
  const formatValue = (param, value) => {
    if (param === 'semitones') {
      return `${value > 0 ? '+' : ''}${value}`
    }
    if (param === 'value') {
      return `${value.toFixed(1)}x`
    }
    if (typeof value === 'number') {
      return value.toFixed(1)
    }
    return value
  }

  // Fonction pour obtenir la couleur en fonction de la valeur
  const getValueColor = (param, value) => {
    const range = PARAM_RANGES[param]
    if (!range) return 'var(--text-secondary)'
    
    const ratio = (value - range.min) / (range.max - range.min)
    
    if (param === 'value') {
      if (value < 0.5) return 'var(--danger)'
      if (value < 0.8) return 'var(--warning)'
      if (value > 2) return 'var(--success)'
      return 'var(--text-secondary)'
    }
    if (param === 'semitones') {
      if (Math.abs(value) > 12) return 'var(--danger)'
      if (Math.abs(value) > 6) return 'var(--warning)'
      return 'var(--success)'
    }
    return 'var(--text-secondary)'
  }

  return (
    <>
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        maxHeight: 200,
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-wand" style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {tr('editorEffects')} — {clip.name}
            </span>
            <span style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '1px 8px',
              borderRadius: 10
            }}>
              {clip.effects?.filter(e => e.enabled).length || 0} {tr('editorEffectsActive')}
            </span>
            {/* ✅ SUPPRESSION DE L'AFFICHAGE AUTO/MANUAL */}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-secondary btn-sm"
              onClick={handleTrimClick}
              style={{ fontSize: 11 }}
              title={tr('editorTrim') || 'Rogner le son'}
            >
              <i className="ti ti-cut" /> {tr('editorTrim') || 'Rogner'}
            </button>

            <button
              className="btn-secondary btn-sm"
              onClick={handleNormalizeClick}
              style={{ fontSize: 11 }}
              title={tr('editorNormalizeClip') || 'Normaliser le volume'}
            >
              <i className="ti ti-wave" /> {tr('editorNormalize') || 'Normaliser'}
            </button>

            <button
              className="btn-secondary btn-sm"
              onClick={() => setShowAddEffect(!showAddEffect)}
              style={{ fontSize: 12 }}
            >
              <i className={`ti ${showAddEffect ? 'ti-x' : 'ti-plus'}`} />
              {showAddEffect ? tr('cancel') : tr('editorAddEffect')}
            </button>
          </div>
        </div>

        {/* Liste des effets actuels */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {clip.effects?.map(effect => {
            const def = EFFECT_TYPES.find(e => e.id === effect.type)
            if (!def) return null

            return (
              <div
                key={effect.id}
                style={{
                  background: effect.enabled ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  border: `1px solid ${effect.enabled ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  opacity: effect.enabled ? 1 : 0.5,
                  minWidth: 180,
                  flex: '1 1 auto'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className={`ti ${def.icon}`} style={{ fontSize: 14, color: 'var(--accent)' }} />
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{def.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => handleEffectToggle(effect.id, !effect.enabled)}
                      style={{
                        padding: '1px 4px',
                        fontSize: 10,
                        color: effect.enabled ? 'var(--accent)' : 'var(--text-tertiary)'
                      }}
                    >
                      <i className={`ti ${effect.enabled ? 'ti-eye' : 'ti-eye-off'}`} />
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => handleEffectRemove(effect.id)}
                      style={{
                        padding: '1px 4px',
                        fontSize: 10,
                        color: 'var(--danger)'
                      }}
                    >
                      <i className="ti ti-x" />
                    </button>
                  </div>
                </div>

                {/* Paramètres */}
                {def.params.map(param => {
                  const range = PARAM_RANGES[param]
                  const value = effect.params[param] || 0
                  const color = getValueColor(param, value)
                  const formattedValue = formatValue(param, value)
                  
                  return (
                    <div key={param} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 2
                    }}>
                      <span style={{
                        fontSize: 9,
                        color: 'var(--text-tertiary)',
                        minWidth: 50
                      }}>
                        {PARAM_LABELS[param] || param}
                      </span>
                      <input
                        type="range"
                        min={range?.min || 0}
                        max={range?.max || 1}
                        step={range?.step || 0.05}
                        value={value}
                        onChange={e => handleParamChange(effect.id, param, parseFloat(e.target.value))}
                        style={{ 
                          flex: 1, 
                          accentColor: color,
                          background: 'transparent'
                        }}
                      />
                      <span style={{
                        fontSize: 9,
                        color: color,
                        minWidth: 40,
                        textAlign: 'right',
                        fontWeight: 600,
                        fontFamily: 'monospace'
                      }}>
                        {formattedValue}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {(!clip.effects || clip.effects.length === 0) && (
            <div style={{
              padding: '8px 12px',
              color: 'var(--text-tertiary)',
              fontSize: 12,
              fontStyle: 'italic'
            }}>
              {tr('editorNoEffects')}
            </div>
          )}
        </div>

        {/* Ajout d'effet */}
        {showAddEffect && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '8px 0',
            borderTop: '1px solid var(--border)'
          }}>
            {EFFECT_TYPES.map(effect => (
              <button
                key={effect.id}
                className="btn-secondary btn-sm"
                onClick={() => handleAddEffect(effect.id)}
                style={{
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px'
                }}
              >
                <i className={`ti ${effect.icon}`} style={{ fontSize: 13 }} />
                {effect.label}
              </button>
            ))}
          </div>
        )}

        {/* Indicateur de prévisualisation */}
        {isPreviewing && (
          <div style={{
            marginTop: 8,
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(124,111,247,0.1)',
            border: '1px solid var(--accent)',
            fontSize: 10,
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
            {tr('editorEffectPreview') || 'Aperçu des effets...'}
          </div>
        )}

        {/* Modal de rognage */}
        {showTrimModal && (
          <TrimModal
            clip={clip}
            onConfirm={handleTrimConfirm}
            onCancel={() => setShowTrimModal(false)}
            tr={tr}
          />
        )}
      </div>

      {/* ✅ Popup de normalisation personnalisée avec traductions des options */}
      {showNormalizePopup && (
        <div 
          className="modal-overlay" 
          onClick={showNormalizePopup.onCancel}
          style={{ zIndex: 10000 }}
        >
          <div 
            className="modal" 
            style={{ width: 420 }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title" style={{ color: 'var(--accent)' }}>
              <i className="ti ti-wave" style={{ color: 'var(--accent)', marginRight: 8 }} />
              {tr('editorNormalize') || 'Normaliser le volume'}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {tr('editorNormalizeConfirm') || 'Normaliser le volume de ce clip ?'}
              </div>
              
              <div>
                <label style={{ 
                  fontSize: 12, 
                  color: 'var(--text-secondary)', 
                  display: 'block', 
                  marginBottom: 6,
                  fontWeight: 500
                }}>
                  <i className="ti ti-wave" style={{ marginRight: 4 }} />
                  {tr('normalizationTarget') || 'Pic cible'}
                </label>
                <select
                  value={normalizeTarget}
                  onChange={showNormalizePopup.onTargetChange}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ 
                    width: '100%', 
                    fontSize: 12,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {getTargetPeakOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                padding: '6px 10px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                lineHeight: 1.5
              }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4, color: 'var(--accent)' }} />
                {tr('normalizationTargetDesc') || 'Plus la valeur est élevée, plus les sons sont amplifiés'}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button 
                className="btn-secondary btn-lg" 
                onClick={showNormalizePopup.onCancel}
                style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}
              >
                <i className="ti ti-x" /> {tr('cancel') || 'Annuler'}
              </button>
              <button 
                className="btn-primary btn-lg" 
                onClick={showNormalizePopup.onConfirm}
                style={{ borderRadius: 'var(--radius-md)', minHeight: 40, padding: '8px 20px' }}
              >
                <i className="ti ti-check" /> {tr('confirm') || 'Normaliser'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmWrapper />
    </>
  )
}