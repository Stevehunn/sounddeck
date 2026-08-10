// src/features/editor/components/EffectsPanel/index.jsx
import { useState, useEffect, useCallback, useRef } from 'react'

// ✅ Effets disponibles
const EFFECT_TYPES = [
  { id: 'volume', label: 'Volume', icon: 'ti-volume', params: ['value'] },
  { id: 'fadeIn', label: 'Fade In', icon: 'ti-sun', params: ['duration'] },
  { id: 'fadeOut', label: 'Fade Out', icon: 'ti-moon', params: ['duration'] },
  { id: 'speed', label: 'Vitesse', icon: 'ti-speedometer', params: ['value'] },
  { id: 'echo', label: 'Écho', icon: 'ti-repeat', params: ['delay', 'decay', 'mix'] },
  { id: 'reverb', label: 'Réverbération', icon: 'ti-wave', params: ['roomSize', 'mix'] },
]

const PARAM_LABELS = {
  value: 'Volume',
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
  duration: { min: 0.05, max: 10, step: 0.05 },
  semitones: { min: -24, max: 24, step: 1 },
  delay: { min: 0.05, max: 3, step: 0.05 },
  decay: { min: 0, max: 1, step: 0.05 },
  mix: { min: 0, max: 1, step: 0.05 },
  roomSize: { min: 0, max: 1, step: 0.05 },
}

const formatParamValue = (effectType, param, value) => {
  if (effectType === 'volume' && param === 'value') {
    const percent = value * 100
    return `${Math.round(percent)}%`
  }
  if (param === 'duration') {
    return `${value.toFixed(2)}s`
  }
  if (effectType === 'volume') {
    return `${value.toFixed(1)}x`
  }
  return typeof value === 'number' ? value.toFixed(2) : value
}

export default function EditorEffectsPanel({
  clip,
  trackId,
  onEffectAdd,
  onEffectRemove,
  onEffectUpdate,
  onEffectToggle,
  onClipUpdate,
  onFadeUpdate,
  onPreview,
  isPreviewing,
  tr,
  lang
}) {
  const [showAddEffect, setShowAddEffect] = useState(false)
  const previewTimeoutRef = useRef(null)
  const [isProcessingPreview, setIsProcessingPreview] = useState(false)

  // ✅ Vérifier que les handlers existent
  console.log('🎛️ [EffectsPanel] Handlers reçus:', {
    onEffectAdd: typeof onEffectAdd,
    onEffectRemove: typeof onEffectRemove,
    onEffectUpdate: typeof onEffectUpdate,
    onEffectToggle: typeof onEffectToggle,
    onFadeUpdate: typeof onFadeUpdate,
    onPreview: typeof onPreview,
  })

  // ✅ PRÉVISUALISATION RÉELLE DES EFFETS
  const previewEffects = useCallback(async () => {
    if (!clip || !clip.path) {
      console.warn('⚠️ [EffectsPanel] Aucun clip à prévisualiser')
      return
    }
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }

    const hasActiveEffects = clip.effects?.some(e => e.enabled) || false
    if (!hasActiveEffects) {
      console.log('ℹ️ [EffectsPanel] Aucun effet actif')
      if (onPreview) {
        onPreview(clip, null)
      }
      return
    }

    console.log(`🎛️ [EffectsPanel] Prévisualisation des effets pour ${clip.name}`)
    console.log(`📊 [EffectsPanel] Effets actifs:`, clip.effects.filter(e => e.enabled))

    setIsProcessingPreview(true)

    try {
      const fileUrl = clip.path.startsWith('file://') 
        ? clip.path 
        : 'file:///' + clip.path.replace(/\\/g, '/')
      
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const { applyEffectsToBuffer } = await import('@shared/utils/realTimeEffects')
      const processedBuffer = applyEffectsToBuffer(audioBuffer, clip.effects, audioContext.sampleRate, true)
      
      if (processedBuffer && processedBuffer !== audioBuffer) {
        console.log('✅ [EffectsPanel] Effets appliqués avec succès')
        const source = audioContext.createBufferSource()
        source.buffer = processedBuffer
        
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 0.5
        
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        source.start(0)
        
        source.onended = () => {
          audioContext.close().catch(() => {})
          setIsProcessingPreview(false)
        }
        
        setTimeout(() => {
          try {
            source.stop()
            audioContext.close().catch(() => {})
            setIsProcessingPreview(false)
          } catch (e) {}
        }, Math.min(processedBuffer.duration * 1000, 5000))
        
      } else {
        console.warn('⚠️ [EffectsPanel] Aucun effet appliqué, lecture normale')
        if (onPreview) {
          onPreview(clip, null)
        }
        setTimeout(() => {
          audioContext.close().catch(() => {})
          setIsProcessingPreview(false)
        }, 100)
      }
      
    } catch (e) {
      console.error('❌ [EffectsPanel] Erreur prévisualisation effets:', e)
      if (onPreview) {
        onPreview(clip, null)
      }
      setIsProcessingPreview(false)
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
    if (clip && clip.effects) {
      schedulePreview()
    }
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [clip?.effects, clip?.id, schedulePreview])

  const handleParamChange = (effectId, param, value) => {
    console.log('📝 [EffectsPanel] handleParamChange:', { effectId, param, value })
    if (onEffectUpdate) {
      onEffectUpdate(trackId, clip.id, effectId, param, value)
    }
  }

  const handleEffectToggle = (effectId, enabled) => {
    console.log('🔄 [EffectsPanel] handleEffectToggle:', { effectId, enabled })
    if (onEffectToggle) {
      onEffectToggle(trackId, clip.id, effectId, enabled)
    }
  }

  const handleEffectRemove = (effectId) => {
    console.log('🗑️ [EffectsPanel] handleEffectRemove:', { effectId })
    if (onEffectRemove) {
      onEffectRemove(trackId, clip.id, effectId)
    }
  }

  const handleFadeInChange = useCallback((duration) => {
    console.log('🌅 [EffectsPanel] handleFadeInChange:', { duration, trackId, clipId: clip.id })
    const clampedDuration = Math.max(0.05, Math.min(10, duration))
    if (onFadeUpdate) {
      onFadeUpdate(trackId, clip.id, 'in', clampedDuration)
    } else {
      console.warn('⚠️ [EffectsPanel] onFadeUpdate est undefined')
    }
  }, [onFadeUpdate, trackId, clip])

  const handleFadeOutChange = useCallback((duration) => {
    console.log('🌇 [EffectsPanel] handleFadeOutChange:', { duration, trackId, clipId: clip.id })
    const clampedDuration = Math.max(0.05, Math.min(10, duration))
    if (onFadeUpdate) {
      onFadeUpdate(trackId, clip.id, 'out', clampedDuration)
    } else {
      console.warn('⚠️ [EffectsPanel] onFadeUpdate est undefined')
    }
  }, [onFadeUpdate, trackId, clip])

  if (!clip) return null

  const handleAddEffect = (effectType) => {
    console.log('➕ [EffectsPanel] handleAddEffect:', { effectType, trackId, clipId: clip.id })
    
    if (!onEffectAdd) {
      console.error('❌ [EffectsPanel] onEffectAdd est undefined')
      return
    }
    
    const defaults = {}
    const effectDef = EFFECT_TYPES.find(e => e.id === effectType)
    effectDef?.params.forEach(param => {
      defaults[param] = PARAM_DEFAULTS[param] !== undefined ? PARAM_DEFAULTS[param] : 0
    })
    
    console.log('📦 [EffectsPanel] Ajout de l\'effet avec params:', defaults)
    onEffectAdd(trackId, clip.id, effectType, defaults)
    setShowAddEffect(false)
  }

  return (
    <div style={{
      padding: '10px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      flexShrink: 0,
      maxHeight: 250,
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
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
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

          const isFade = effect.type === 'fadeIn' || effect.type === 'fadeOut'
          const handleFadeChange = effect.type === 'fadeIn' ? handleFadeInChange : handleFadeOutChange

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
                const value = effect.params[param] !== undefined ? effect.params[param] : PARAM_DEFAULTS[param] || 0
                
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
                      onChange={e => {
                        const newValue = parseFloat(e.target.value)
                        console.log(`🎛️ [EffectsPanel] Changement de ${param}: ${newValue}`)
                        if (isFade && param === 'duration') {
                          handleFadeChange(newValue)
                        } else {
                          handleParamChange(effect.id, param, newValue)
                        }
                      }}
                      style={{ 
                        flex: 1, 
                        accentColor: 'var(--accent)',
                        background: 'transparent'
                      }}
                    />
                    <span style={{
                      fontSize: 9,
                      color: 'var(--text-secondary)',
                      minWidth: 40,
                      textAlign: 'right',
                      fontWeight: 600,
                      fontFamily: 'monospace'
                    }}>
                      {formatParamValue(effect.type, param, value)}
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
      {(isPreviewing || isProcessingPreview) && (
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
          {isProcessingPreview ? 'Génération de l\'aperçu...' : tr('editorEffectPreview') || 'Aperçu des effets...'}
        </div>
      )}
    </div>
  )
}