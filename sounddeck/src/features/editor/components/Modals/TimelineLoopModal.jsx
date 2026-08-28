// src/features/editor/components/Modals/TimelineLoopModal.jsx
import React, { useState, useEffect } from 'react'
import { useLanguage } from '@core/i18n/LanguageContext'

const LOOP_COLORS = [
  { id: 'purple', color: '#7C6FF7', labelKey: 'loopColorPurple' },
  { id: 'blue', color: '#3b82f6', labelKey: 'loopColorBlue' },
  { id: 'green', color: '#22c55e', labelKey: 'loopColorGreen' },
  { id: 'cyan', color: '#06b6d4', labelKey: 'loopColorCyan' },
  { id: 'pink', color: '#ec4899', labelKey: 'loopColorPink' },
  { id: 'red', color: '#ef4444', labelKey: 'loopColorRed' },
  { id: 'orange', color: '#f97316', labelKey: 'loopColorOrange' },
  { id: 'yellow', color: '#eab308', labelKey: 'loopColorYellow' },
]

const DURATION_OPTIONS = [
  { id: 'cycles', labelKey: 'loopDurationCycles', icon: 'ti-repeat' },
  { id: 'manualDuration', labelKey: 'loopDurationManual', icon: 'ti-clock' },
]

export default function TimelineLoopModal({
  isOpen,
  onClose,
  loopState,
  onApply,
  currentTime,
  totalDuration,
  tr,
  onActivateClickMode,
  isClickModeActive,
  clickModeData
}) {
  const { t } = useLanguage()
  
  const timelineLoop = loopState?.timeline || { 
    enabled: false, 
    start: 0, 
    end: 10, 
    color: '#7C6FF7',
    durationMode: 'cycles',
    cycleCount: 3,
    manualDuration: 10,
  }

  const [enabled, setEnabled] = useState(timelineLoop.enabled || false)
  const [color, setColor] = useState(timelineLoop.color || '#7C6FF7')
  const [durationMode, setDurationMode] = useState(timelineLoop.durationMode || 'cycles')
  const [cycleCount, setCycleCount] = useState(timelineLoop.cycleCount || 3)
  const [manualDuration, setManualDuration] = useState(timelineLoop.manualDuration || 10)
  const [startValue, setStartValue] = useState(timelineLoop.start || 0)
  const [endValue, setEndValue] = useState(timelineLoop.end || 10)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectionMode, setSelectionMode] = useState('manual')

  useEffect(() => {
    if (isOpen) {
      setEnabled(timelineLoop.enabled || false)
      setColor(timelineLoop.color || '#7C6FF7')
      setDurationMode(timelineLoop.durationMode || 'cycles')
      setCycleCount(timelineLoop.cycleCount || 3)
      setManualDuration(timelineLoop.manualDuration || 10)
      setStartValue(timelineLoop.start || 0)
      setEndValue(timelineLoop.end || 10)
      setSelectionMode('manual')
    }
  }, [isOpen, timelineLoop])

  useEffect(() => {
    if (clickModeData && isClickModeActive) {
      if (clickModeData.start !== undefined) {
        setStartValue(clickModeData.start)
      }
      if (clickModeData.end !== undefined) {
        setEndValue(clickModeData.end)
      }
      if (clickModeData.duration !== undefined) {
        setManualDuration(clickModeData.duration)
      }
    }
  }, [clickModeData, isClickModeActive])

  if (!isOpen) return null

  const effectiveStart = startValue
  const effectiveEnd = Math.max(effectiveStart + 0.5, endValue)
  const effectiveDuration = Math.max(0.1, effectiveEnd - effectiveStart)

  const getTotalDuration = () => {
    switch (durationMode) {
      case 'cycles':
        return effectiveDuration * cycleCount
      case 'manualDuration':
        return manualDuration
      default:
        return effectiveDuration
    }
  }

  const handleApply = () => {
    const finalStart = startValue
    const finalEnd = Math.max(finalStart + 0.5, endValue)
    const totalDurationValue = getTotalDuration()
    
    onApply({
      enabled,
      start: finalStart,
      end: finalEnd,
      color,
      durationMode,
      cycleCount: durationMode === 'cycles' ? cycleCount : undefined,
      manualDuration: durationMode === 'manualDuration' || durationMode === 'cycles' ? manualDuration : undefined,
    })
    
    onClose()
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    if (m > 0) {
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return `${s.toFixed(1)}s`
  }

  const handleActivateClickMode = () => {
    setSelectionMode('click')
    if (onActivateClickMode) {
      onActivateClickMode(true)
    }
  }

  const handleDeactivateClickMode = () => {
    setSelectionMode('manual')
    if (onActivateClickMode) {
      onActivateClickMode(false)
    }
  }

  const isClickActive = selectionMode === 'click' && isClickModeActive

  const colorLabels = {}
  LOOP_COLORS.forEach(c => {
    colorLabels[c.id] = tr(c.labelKey) || c.id
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <i className="ti ti-repeat" style={{ color: 'var(--accent)' }} />
          {tr('timelineLoop') || 'Boucle générale'}
        </div>

        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
          marginBottom: 12
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className={`ti ${enabled ? 'ti-repeat' : 'ti-repeat-off'}`} 
                 style={{ color: enabled ? 'var(--accent)' : 'var(--text-tertiary)' }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {tr('enableLoop') || 'Activer la boucle'}
              </span>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              style={{
                padding: '4px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: enabled ? 'var(--accent)' : 'var(--bg-secondary)',
                color: enabled ? 'white' : 'var(--text-tertiary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
                border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`
              }}
            >
              {enabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              {tr('loopColor') || 'Couleur'}
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {LOOP_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.color)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c.color,
                    border: color === c.color ? '3px solid var(--accent)' : '2px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none'
                  }}
                  title={colorLabels[c.id]}
                />
              ))}
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: color,
                  border: '2px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}
                title={tr('customColor') || 'Couleur personnalisée'}
              >
                +
              </button>
            </div>
            {showColorPicker && (
              <div style={{
                marginTop: 6,
                padding: 6,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{
                    width: '100%',
                    height: 36,
                    padding: 2,
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          padding: 12,
          marginBottom: 12
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-arrows-horizontal" style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {tr('loopZone') || 'Définir la zone de boucle'}
              </span>
            </div>
            <span style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              fontFamily: 'monospace'
            }}>
              {formatTime(effectiveStart)} → {formatTime(effectiveEnd)}
            </span>
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 8
          }}>
            <button
              onClick={handleActivateClickMode}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${isClickActive ? 'var(--accent)' : 'var(--border)'}`,
                background: isClickActive ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: isClickActive ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: isClickActive ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <i className="ti ti-click" />
              <span>{tr('clickToSelect') || '🖱️ Sélectionner par clics'}</span>
              {isClickActive && (
                <span style={{
                  fontSize: 8,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: 'white'
                }}>
                  ACTIF
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setSelectionMode('manual')
                if (onActivateClickMode) onActivateClickMode(false)
              }}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${!isClickActive ? 'var(--accent)' : 'var(--border)'}`,
                background: !isClickActive ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: !isClickActive ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: !isClickActive ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <i className="ti ti-pencil" />
              <span>{tr('manualSelect') || 'Sélectionner manuellement'}</span>
            </button>
          </div>

          {isClickActive && (
            <div style={{
              padding: '6px 10px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent)',
              marginBottom: 8
            }}>
              <div style={{ 
                fontSize: 11, 
                color: 'var(--text-secondary)', 
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                <span>
                  <i className="ti ti-info-circle" style={{ color: 'var(--accent)', marginRight: 4 }} />
                  {tr('clickInstructions') || 'Cliquez sur la timeline :'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  1️⃣ {tr('clickStart') || 'Début'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  2️⃣ {tr('clickEnd') || 'Fin'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                  3️⃣ {tr('clickDuration') || 'Durée'}
                </span>
                <span style={{
                  fontSize: 9,
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary)',
                  marginLeft: 'auto'
                }}>
                  {formatTime(startValue)} → {formatTime(endValue)} ({formatTime(effectiveDuration)})
                </span>
              </div>
              <button
                onClick={handleDeactivateClickMode}
                style={{
                  marginTop: 4,
                  padding: '2px 10px',
                  fontSize: 9,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <i className="ti ti-x" /> {tr('cancel') || 'Annuler le mode clic'}
              </button>
            </div>
          )}

          {!isClickActive && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8
            }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  <i className="ti ti-arrow-right" style={{ marginRight: 4 }} />
                  {tr('loopStart') || 'Début (s)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalDuration - 0.5}
                  step="0.1"
                  value={startValue}
                  onChange={(e) => setStartValue(Math.max(0, Math.min(parseFloat(e.target.value) || 0, totalDuration - 0.5)))}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 11,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  <i className="ti ti-arrow-left" style={{ marginRight: 4 }} />
                  {tr('loopEnd') || 'Fin (s)'}
                </label>
                <input
                  type="number"
                  min={startValue + 0.5}
                  max={totalDuration}
                  step="0.1"
                  value={endValue}
                  onChange={(e) => setEndValue(Math.max(startValue + 0.5, Math.min(parseFloat(e.target.value) || 0, totalDuration)))}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 11,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {!isClickActive && (
          <div style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            marginBottom: 16
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10
            }}>
              <i className="ti ti-clock" style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {tr('loopDuration') || 'Durée de la boucle'}
              </span>
              <span style={{
                fontSize: 10,
                color: 'var(--text-tertiary)',
                fontFamily: 'monospace',
                marginLeft: 'auto'
              }}>
                {formatTime(getTotalDuration())}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DURATION_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${durationMode === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: durationMode === opt.id ? 'var(--accent-light)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 10,
                    flex: 1,
                    minWidth: 100
                  }}
                >
                  <input
                    type="radio"
                    name="durationMode"
                    checked={durationMode === opt.id}
                    onChange={() => setDurationMode(opt.id)}
                    style={{ width: 'auto', accentColor: 'var(--accent)', margin: 0 }}
                  />
                  <i className={`ti ${opt.icon}`} style={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                  <span>{tr(opt.labelKey) || opt.id}</span>
                </label>
              ))}
            </div>

            {durationMode === 'cycles' && (
              <div style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {tr('cycleCount') || 'Nombre de cycles'}:
                </span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={cycleCount}
                  onChange={(e) => setCycleCount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: 60,
                    padding: '2px 6px',
                    fontSize: 11,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>cycles</span>
                <span style={{
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  marginLeft: 'auto',
                  fontFamily: 'monospace'
                }}>
                  → {formatTime(effectiveDuration * cycleCount)}
                </span>
              </div>
            )}

            {durationMode === 'manualDuration' && (
              <div style={{
                marginTop: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {tr('duration') || 'Durée totale (s)'}:
                </span>
                <input
                  type="number"
                  min="0.1"
                  max="999"
                  step="0.1"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                  style={{
                    width: 80,
                    padding: '2px 6px',
                    fontSize: 11,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    textAlign: 'center'
                  }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>secondes</span>
                <span style={{
                  fontSize: 9,
                  color: 'var(--text-tertiary)',
                  marginLeft: 'auto',
                  fontFamily: 'monospace'
                }}>
                  → {formatTime(manualDuration)}
                </span>
              </div>
            )}
          </div>
        )}

        <div style={{
          padding: '8px 12px',
          background: `linear-gradient(90deg, ${color}20, ${color}05)`,
          borderRadius: 'var(--radius-sm)',
          marginBottom: 16,
          fontSize: 12,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: `1px solid ${color}40`
        }}>
          <span>
            <i className="ti ti-arrows-horizontal" style={{ marginRight: 4, color }} />
            {tr('loopPreview') || 'Résumé'}:
          </span>
          <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
            {formatTime(effectiveStart)} → {formatTime(effectiveEnd)}
          </span>
          <span style={{ fontSize: 10, color, fontFamily: 'monospace' }}>
            ⌛ {formatTime(getTotalDuration())}
          </span>
        </div>

        <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            className="btn-secondary btn-lg"
            onClick={onClose}
            style={{
              borderRadius: 'var(--radius-md)',
              minHeight: 40,
              minWidth: 120,
              padding: '8px 20px',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <i className="ti ti-x" /> {tr('cancel') || 'Annuler'}
          </button>
          <button
            className="btn-primary btn-lg"
            onClick={handleApply}
            style={{
              borderRadius: 'var(--radius-md)',
              minHeight: 40,
              minWidth: 140,
              padding: '8px 20px',
              background: 'var(--accent)',
              color: 'white',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}
          >
            <i className="ti ti-check" /> {tr('apply') || 'Appliquer'}
          </button>
        </div>

        <div style={{
          marginTop: 12,
          fontSize: 10,
          color: 'var(--text-tertiary)',
          padding: '6px 10px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <i className="ti ti-info-circle" style={{ color: 'var(--accent)' }} />
          <span>{tr('timelineLoopNote') || 'La boucle répète les clips dans la zone définie. Le temps continue d\'avancer.'}</span>
        </div>
      </div>
    </div>
  )
}