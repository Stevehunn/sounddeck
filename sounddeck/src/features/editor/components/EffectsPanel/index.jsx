// src/features/editor/components/EffectsPanel/index.jsx
import { useState, useEffect, useCallback, useRef } from 'react'

// ✅ Effets disponibles avec leurs icônes
const EFFECT_TYPES = [
  { id: 'volume', label: 'Volume', icon: 'ti-volume', params: ['value'] },
  { id: 'fadeIn', label: 'Fade In', icon: 'ti-sunrise', params: ['duration'] },
  { id: 'fadeOut', label: 'Fade Out', icon: 'ti-sunset', params: ['duration'] },
  { id: 'speed', label: 'Vitesse', icon: 'ti-gauge', params: ['value'] },           // ✅ ti-gauge
  { id: 'echo', label: 'Écho', icon: 'ti-repeat', params: ['delay', 'decay', 'mix'] },
  { id: 'reverb', label: 'Réverbération', icon: 'ti-wave-sine', params: ['roomSize', 'mix'] },
]

// ✅ Map des icônes pour l'affichage dans la liste des effets actifs
const EFFECT_ICON_MAP = {
  volume: 'ti-volume',
  fadeIn: 'ti-sunrise',
  fadeOut: 'ti-sunset',
  speed: 'ti-gauge',        // ✅ ti-gauge
  echo: 'ti-repeat',
  reverb: 'ti-wave-sine',
}

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
  isPreviewing: isPreviewingProp,
  tr,
  lang,
  showAddMenu: showAddMenuProp = false,
  onShowAddMenuChange
}) {
  const [showAddEffect, setShowAddEffect] = useState(false)
  const [isProcessingPreview, setIsProcessingPreview] = useState(false)
  
  // ✅ ÉTATS POUR LE CONTRÔLE DE LA PRÉVISUALISATION
  const [autoPreview, setAutoPreview] = useState(true)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewProgress, setPreviewProgress] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(0)
  const previewSourceRef = useRef(null)
  const previewContextRef = useRef(null)
  const previewProgressIntervalRef = useRef(null)
  const autoPreviewTimerRef = useRef(null)
  const isUserInteractingRef = useRef(false)
  const PREVIEW_MAX_DURATION = 5
  const AUTO_PREVIEW_DELAY = 1000

  // ✅ LOG pour vérifier que le panneau s'affiche
  console.log('🎛️ [EffectsPanel] Rendu, clip:', clip?.id, clip?.name, 'trackId:', trackId)
  console.log('🎛️ [EffectsPanel] showAddMenuProp:', showAddMenuProp)

  // ✅ Synchroniser l'état du menu d'ajout avec la prop
  useEffect(() => {
    if (showAddMenuProp) {
      console.log('🎛️ [EffectsPanel] Ouverture automatique du menu d\'ajout')
      setShowAddEffect(true)
      // ✅ Réinitialiser la prop après ouverture
      if (onShowAddMenuChange) {
        onShowAddMenuChange(false)
      }
    }
  }, [showAddMenuProp, onShowAddMenuChange])

  // ✅ Vérifier que les handlers existent
  console.log('🎛️ [EffectsPanel] Handlers reçus:', {
    onEffectAdd: typeof onEffectAdd,
    onEffectRemove: typeof onEffectRemove,
    onEffectUpdate: typeof onEffectUpdate,
    onEffectToggle: typeof onEffectToggle,
    onFadeUpdate: typeof onFadeUpdate,
    onPreview: typeof onPreview,
  })

  // ✅ Arrêter la prévisualisation
  const stopPreview = useCallback(() => {
    console.log('⏹️ [EffectsPanel] Arrêt de la prévisualisation')
    
    // ✅ Annuler le timer auto-preview
    if (autoPreviewTimerRef.current) {
      clearTimeout(autoPreviewTimerRef.current)
      autoPreviewTimerRef.current = null
    }
    
    if (previewProgressIntervalRef.current) {
      clearInterval(previewProgressIntervalRef.current)
      previewProgressIntervalRef.current = null
    }
    
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop()
        previewSourceRef.current.disconnect()
      } catch (e) {}
      previewSourceRef.current = null
    }
    
    if (previewContextRef.current && previewContextRef.current.state !== 'closed') {
      try {
        previewContextRef.current.close()
      } catch (e) {}
      previewContextRef.current = null
    }
    
    setIsPreviewPlaying(false)
    setPreviewProgress(0)
    setPreviewDuration(0)
    setIsProcessingPreview(false)
  }, [])

  // ✅ Jouer la prévisualisation
  const playPreview = useCallback(async () => {
    if (!clip || !clip.path) {
      console.warn('⚠️ [EffectsPanel] Aucun clip à prévisualiser')
      return
    }

    // ✅ Arrêter la preview en cours
    stopPreview()

    const hasActiveEffects = clip.effects?.some(e => e.enabled) || false
    if (!hasActiveEffects) {
      console.log('ℹ️ [EffectsPanel] Aucun effet actif')
      if (onPreview) {
        onPreview(clip, null)
      }
      return
    }

    console.log(`🎛️ [EffectsPanel] Lecture de la prévisualisation pour ${clip.name}`)
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
      previewContextRef.current = audioContext
      
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // ✅ Appliquer les effets
      const { applyEffectsToBuffer } = await import('@shared/utils/realTimeEffects')
      const processedBuffer = applyEffectsToBuffer(audioBuffer, clip.effects, audioContext.sampleRate, true)
      
      if (processedBuffer && processedBuffer !== audioBuffer) {
        console.log('✅ [EffectsPanel] Effets appliqués avec succès')
        
        const actualDuration = Math.min(processedBuffer.duration, PREVIEW_MAX_DURATION)
        setPreviewDuration(actualDuration)
        
        const source = audioContext.createBufferSource()
        source.buffer = processedBuffer
        previewSourceRef.current = source
        
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 0.5
        
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        source.start(0)
        setIsPreviewPlaying(true)
        setPreviewProgress(0)
        setIsProcessingPreview(false)
        
        if (previewProgressIntervalRef.current) {
          clearInterval(previewProgressIntervalRef.current)
        }
        
        const startTime = Date.now()
        previewProgressIntervalRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000
          const progress = Math.min(100, (elapsed / actualDuration) * 100)
          setPreviewProgress(progress)
          
          if (progress >= 100) {
            stopPreview()
          }
        }, 50)
        
        source.onended = () => {
          stopPreview()
        }
        
      } else {
        console.warn('⚠️ [EffectsPanel] Aucun effet appliqué, lecture normale')
        if (onPreview) {
          onPreview(clip, null)
        }
        stopPreview()
      }
      
    } catch (e) {
      console.error('❌ [EffectsPanel] Erreur prévisualisation effets:', e)
      if (onPreview) {
        onPreview(clip, null)
      }
      stopPreview()
    }
  }, [clip, onPreview, stopPreview])

  // ✅ Planifier la prévisualisation avec délai de 1s
  const schedulePreview = useCallback(() => {
    if (!autoPreview) {
      console.log('ℹ️ [EffectsPanel] Auto-preview désactivée')
      return
    }
    
    if (autoPreviewTimerRef.current) {
      clearTimeout(autoPreviewTimerRef.current)
      autoPreviewTimerRef.current = null
    }
    
    stopPreview()
    
    console.log(`⏳ [EffectsPanel] Planification de la preview dans ${AUTO_PREVIEW_DELAY}ms`)
    
    autoPreviewTimerRef.current = setTimeout(() => {
      console.log('▶️ [EffectsPanel] Déclenchement de l\'auto-preview après délai')
      playPreview()
      autoPreviewTimerRef.current = null
    }, AUTO_PREVIEW_DELAY)
  }, [autoPreview, stopPreview, playPreview])

  // ✅ Gestion des changements de paramètres
  const handleParamChange = (effectId, param, value) => {
    console.log('📝 [EffectsPanel] handleParamChange:', { effectId, param, value })
    if (onEffectUpdate) {
      onEffectUpdate(trackId, clip.id, effectId, param, value)
    }
    schedulePreview()
  }

  const handleEffectToggle = (effectId, enabled) => {
    console.log('🔄 [EffectsPanel] handleEffectToggle:', { effectId, enabled })
    if (onEffectToggle) {
      onEffectToggle(trackId, clip.id, effectId, enabled)
    }
    schedulePreview()
  }

  const handleEffectRemove = (effectId) => {
    console.log('🗑️ [EffectsPanel] handleEffectRemove:', { effectId })
    if (onEffectRemove) {
      onEffectRemove(trackId, clip.id, effectId)
    }
    schedulePreview()
  }

  // ✅ Gestion des Fades
  const handleFadeChange = useCallback((edge, duration) => {
    console.log('🌅 [EffectsPanel] handleFadeChange:', { edge, duration, trackId, clipId: clip.id })
    const clampedDuration = Math.max(0.05, Math.min(10, duration))
    if (onFadeUpdate) {
      onFadeUpdate(trackId, clip.id, edge, clampedDuration)
    }
    schedulePreview()
  }, [onFadeUpdate, trackId, clip, schedulePreview])

  // ✅ Nettoyage au démontage
  useEffect(() => {
    return () => {
      stopPreview()
      if (autoPreviewTimerRef.current) {
        clearTimeout(autoPreviewTimerRef.current)
        autoPreviewTimerRef.current = null
      }
    }
  }, [stopPreview])

  // ✅ Quand un effet est ajouté
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
    
    schedulePreview()
  }

  // ✅ Toggle auto-preview
  const toggleAutoPreview = () => {
    const newState = !autoPreview
    setAutoPreview(newState)
    if (!newState) {
      if (autoPreviewTimerRef.current) {
        clearTimeout(autoPreviewTimerRef.current)
        autoPreviewTimerRef.current = null
      }
      stopPreview()
    } else {
      schedulePreview()
    }
    console.log(`🔄 [EffectsPanel] Auto-preview: ${newState ? 'ON' : 'OFF'}`)
  }

  // ✅ Toggle play/stop preview
  const togglePlayPreview = () => {
    if (isPreviewPlaying) {
      stopPreview()
    } else {
      if (autoPreviewTimerRef.current) {
        clearTimeout(autoPreviewTimerRef.current)
        autoPreviewTimerRef.current = null
      }
      playPreview()
    }
  }

  if (!clip) return null

  return (
    <div style={{
      padding: '10px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      flexShrink: 0,
      maxHeight: 280,
      overflowY: 'auto'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        flexWrap: 'wrap',
        gap: 6
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

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`btn-${isPreviewPlaying ? 'danger' : 'success'} btn-sm`}
            onClick={togglePlayPreview}
            disabled={isProcessingPreview && !isPreviewPlaying}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              minHeight: 28
            }}
          >
            <i className={`ti ${isPreviewPlaying ? 'ti-player-stop' : isProcessingPreview ? 'ti-loader' : 'ti-player-play'}`} 
               style={isProcessingPreview && !isPreviewPlaying ? { animation: 'spin 1s linear infinite' } : {}} />
            {isPreviewPlaying ? 'Arrêter' : isProcessingPreview ? 'Génération...' : 'Écouter'}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${autoPreview ? 'var(--accent)' : 'var(--border)'}`,
            background: autoPreview ? 'var(--accent-light)' : 'var(--bg-tertiary)',
            cursor: 'pointer'
          }}
          onClick={toggleAutoPreview}
          title={autoPreview ? 'Désactiver l\'auto-preview (délai 1s)' : 'Activer l\'auto-preview (délai 1s)'}
          >
            <span style={{ fontSize: 10, color: autoPreview ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              <i className={`ti ${autoPreview ? 'ti-player-play' : 'ti-player-pause'}`} />
            </span>
            <span style={{ fontSize: 10, color: autoPreview ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              Auto
            </span>
            <span style={{
              fontSize: 8,
              padding: '1px 6px',
              borderRadius: 10,
              background: autoPreview ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: autoPreview ? 'white' : 'var(--text-tertiary)'
            }}>
              {autoPreview ? 'ON' : 'OFF'}
            </span>
            <span style={{
              fontSize: 7,
              color: 'var(--text-tertiary)',
              opacity: 0.6
            }}>
              1s
            </span>
          </div>

          <button
            className="btn-secondary btn-sm"
            onClick={() => setShowAddEffect(!showAddEffect)}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            <i className={`ti ${showAddEffect ? 'ti-x' : 'ti-plus'}`} />
            {showAddEffect ? tr('cancel') : tr('editorAddEffect')}
          </button>
        </div>
      </div>

      {isPreviewPlaying && (
        <div style={{
          marginBottom: 8,
          padding: '2px 0'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginBottom: 2
          }}>
            <span>🔊 Prévisualisation</span>
            <span>{Math.round(previewProgress)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: 3,
            background: 'var(--bg-tertiary)',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${previewProgress}%`,
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width 0.1s linear'
            }} />
          </div>
        </div>
      )}

      {autoPreview && !isPreviewPlaying && !isProcessingPreview && clip.effects?.some(e => e.enabled) && (
        <div style={{
          marginBottom: 8,
          padding: '2px 6px',
          fontSize: 9,
          color: 'var(--text-tertiary)',
          opacity: 0.6,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <i className="ti ti-clock" />
          Auto-preview dans 1s après modification...
        </div>
      )}

      {/* Liste des effets actuels */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {clip.effects?.map(effect => {
          const def = EFFECT_TYPES.find(e => e.id === effect.type)
          if (!def) return null

          const isFade = effect.type === 'fadeIn' || effect.type === 'fadeOut'
          // ✅ Récupérer l'icône de l'effet depuis EFFECT_ICON_MAP
          const effectIcon = EFFECT_ICON_MAP[effect.type] || 'ti-wand'

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
                  {/* ✅ Icône de l'effet à gauche */}
                  <i className={`ti ${effectIcon}`} style={{ 
                    fontSize: 14, 
                    color: effect.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
                    minWidth: 16
                  }} />
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
                
                const min = range?.min !== undefined ? range.min : 0
                const max = range?.max !== undefined ? range.max : 1
                const step = range?.step !== undefined ? range.step : 0.05
                
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
                      min={min}
                      max={max}
                      step={step}
                      value={value}
                      onChange={e => {
                        const newValue = parseFloat(e.target.value)
                        console.log(`🎛️ [EffectsPanel] Changement de ${param}: ${newValue}`)
                        if (isFade && param === 'duration') {
                          const edge = effect.type === 'fadeIn' ? 'in' : 'out'
                          handleFadeChange(edge, newValue)
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

      {/* ✅ Ajout d'effet */}
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

      {(isProcessingPreview && !isPreviewPlaying) && (
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

      {isPreviewPlaying && (
        <div style={{
          marginTop: 8,
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(29,158,117,0.1)',
          border: '1px solid var(--success)',
          fontSize: 10,
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <i className="ti ti-volume" style={{ animation: 'pulse 0.8s ease-in-out infinite' }} />
          Lecture en cours... {Math.round(previewProgress)}%
        </div>
      )}
    </div>
  )
}