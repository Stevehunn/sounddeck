// src/features/editor/components/Timeline/TimelineLoop.jsx
import React, { useState, useRef, memo } from 'react'

const TimelineLoop = memo(({
  loopRegion,
  pixelsPerSecond,
  onSetLoopRegion,
  onClearLoop,
  onToggleLoop,
  tr,
  totalDuration,
  loopState = {},
  onOpenLoopPanel,
  onActivateManualClick
}) => {
  const [loopDrag, setLoopDrag] = useState(null)
  const containerRef = useRef(null)

  // ✅ VALEURS PAR DÉFAUT SÉCURISÉES
  const timelineLoop = loopState?.timeline || { 
    enabled: false, 
    start: 0, 
    end: 10, 
    color: '#7C6FF7',
    startMode: 'startZero',
    endMode: 'endOfTrack',
    durationMode: 'cycles',
    cycleCount: 3,
    manualDuration: 10,
    manualTime: 10
  }
  
  const hasLoop = timelineLoop.enabled && timelineLoop.end > timelineLoop.start + 0.01

  const handleLoopStripMouseDown = (e) => {
    e.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration))
    setLoopDrag({ mode: 'create', anchor: time })
    
    const start = Math.min(time, totalDuration)
    const end = Math.min(time + 1, totalDuration)
    onSetLoopRegion?.(start, end)
  }

  const handleLoopHandleMouseDown = (mode) => (e) => {
    e.stopPropagation()
    const anchor = mode === 'start' ? timelineLoop.end : timelineLoop.start
    setLoopDrag({ mode, anchor })
  }

  // Gestion du drag pour redimensionner la boucle
  React.useEffect(() => {
    if (!loopDrag) return

    const handleMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration))
      
      if (loopDrag.mode === 'create') {
        const start = Math.min(loopDrag.anchor, time)
        const end = Math.max(loopDrag.anchor, time)
        onSetLoopRegion?.(start, end)
      } else if (loopDrag.mode === 'start') {
        if (time < timelineLoop.end) {
          onSetLoopRegion?.(time, timelineLoop.end)
        }
      } else if (loopDrag.mode === 'end') {
        if (time > timelineLoop.start) {
          onSetLoopRegion?.(timelineLoop.start, time)
        }
      }
    }
    
    const handleUp = () => setLoopDrag(null)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [loopDrag, onSetLoopRegion, pixelsPerSecond, totalDuration, timelineLoop.start, timelineLoop.end])

  // ✅ Sécurisation des valeurs
  const loopStart = timelineLoop.start ?? 0
  const loopEnd = timelineLoop.end ?? 10
  const loopColor = timelineLoop.color ?? '#7C6FF7'

  // ✅ Calcul des positions
  const loopStartPx = Math.max(0, loopStart * pixelsPerSecond)
  const loopWidthPx = Math.max(0, (loopEnd - loopStart) * pixelsPerSecond)

  // ✅ Calcul de la durée de la zone de boucle
  const loopDuration = Math.max(0, loopEnd - loopStart)
  
  // ✅ Calcul de la durée maximale en fonction du mode
  let maxLoopDuration = loopDuration
  let durationLabel = ''
  const cycleCount = timelineLoop.cycleCount || 3
  const manualDuration = timelineLoop.manualDuration || 10
  
  if (timelineLoop.durationMode === 'cycles') {
    maxLoopDuration = loopDuration * cycleCount
    durationLabel = `${cycleCount}x`
  } else if (timelineLoop.durationMode === 'manualDuration') {
    maxLoopDuration = manualDuration
    durationLabel = `${manualDuration}s`
  } else if (timelineLoop.durationMode === 'manualTime') {
    maxLoopDuration = timelineLoop.manualTime || 10
    durationLabel = `${timelineLoop.manualTime || 10}s`
  }

  // ✅ Calcul de la position de fin de boucle générale (durée totale)
  const loopEndTotalPx = Math.min((loopStart + maxLoopDuration) * pixelsPerSecond, totalDuration * pixelsPerSecond)

  // ✅ Calcul de la position de fin de zone de boucle
  const loopEndZonePx = loopStartPx + loopWidthPx

  // ✅ Largeur de la zone étendue (au-delà de la zone originale)
  const extendedWidthPx = Math.max(0, loopEndTotalPx - loopEndZonePx)

  if (!hasLoop) {
    return (
      <div
        ref={containerRef}
        className="loop-strip"
        onMouseDown={handleLoopStripMouseDown}
        onDoubleClick={() => onOpenLoopPanel?.()}
        style={{
          position: 'sticky',
          top: 36,
          height: 10,
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border)',
          zIndex: 5,
          cursor: 'text',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 8,
          color: 'var(--text-tertiary)',
          opacity: 0.5
        }}
      >
        <i className="ti ti-repeat" style={{ marginRight: 4 }} />
        {tr('clickToDefineLoop') || 'Cliquez pour définir une boucle générale'}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenLoopPanel?.()
          }}
          style={{
            marginLeft: 8,
            padding: '1px 8px',
            fontSize: 8,
            border: '1px solid var(--border)',
            borderRadius: 3,
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <i className="ti ti-settings" /> {tr('settings') || 'Réglages'}
        </button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'sticky',
        top: 36,
        height: 10,
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border)',
        zIndex: 5,
        cursor: 'text'
      }}
    >
      {/* ✅ Zone de boucle avec la couleur personnalisée */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: loopStartPx,
          width: loopWidthPx,
          background: loopColor,
          opacity: 0.3,
          cursor: 'pointer',
          borderLeft: `2px solid ${loopColor}`,
          borderRight: `2px solid ${loopColor}`
        }}
        onDoubleClick={() => onOpenLoopPanel?.()}
        title={tr('doubleClickToEditLoop') || 'Double-clic pour modifier la boucle'}
      />

      {/* ✅ Zone étendue avec motif de barres obliques "///" */}
      {extendedWidthPx > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: loopEndZonePx,
            width: extendedWidthPx,
            pointerEvents: 'none',
            zIndex: 4,
            overflow: 'hidden',
            opacity: 0.5
          }}
        >
          {/* ✅ Motif de barres obliques */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `repeating-linear-gradient(
                45deg,
                ${loopColor} 0px,
                ${loopColor} 2px,
                transparent 2px,
                transparent 8px
              )`,
              opacity: 0.6
            }}
          />
          
          {/* ✅ Indicateur de répétition */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 7,
            fontWeight: 700,
            color: loopColor,
            textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
            opacity: 0.8,
            letterSpacing: 1,
            whiteSpace: 'nowrap'
          }}>
            {durationLabel}
          </div>
        </div>
      )}

      {/* ✅ Marqueur de début "[" avec flèche vers le bas */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: loopStartPx - 2,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 6
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: loopColor
        }}>
          <span style={{
            fontSize: 8,
            fontWeight: 900,
            opacity: 0.7,
            lineHeight: 1,
            marginBottom: 1
          }}>
            ▼
          </span>
          <span style={{
            fontSize: 16,
            fontWeight: 900,
            opacity: 0.9,
            textShadow: `0 0 10px ${loopColor}40`,
            lineHeight: 1
          }}>
            [
          </span>
        </div>
      </div>

      {/* ✅ Marqueur de fin de zone "]" avec flèche vers le bas */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: loopEndZonePx - 2,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 6
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: loopColor
        }}>
          <span style={{
            fontSize: 8,
            fontWeight: 900,
            opacity: 0.7,
            lineHeight: 1,
            marginBottom: 1
          }}>
            ▼
          </span>
          <span style={{
            fontSize: 16,
            fontWeight: 900,
            opacity: 0.9,
            textShadow: `0 0 10px ${loopColor}40`,
            lineHeight: 1
          }}>
            ]
          </span>
        </div>
      </div>

      {/* ✅ Indicateur de FIN avec un simple trait vertical */}
      {extendedWidthPx > 5 && (
        <div style={{
          position: 'absolute',
          top: -4,
          bottom: -4,
          left: loopEndTotalPx,
          width: 2,
          background: loopColor,
          opacity: 0.8,
          zIndex: 10,
          pointerEvents: 'none',
          boxShadow: `0 0 12px ${loopColor}60`,
        }}>
          {/* ✅ Petit label "FIN" au-dessus du trait */}
          <div style={{
            position: 'absolute',
            top: -16,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 7,
            fontWeight: 700,
            color: 'white',
            background: `linear-gradient(135deg, ${loopColor}, ${loopColor}dd)`,
            padding: '1px 6px',
            borderRadius: 3,
            border: `1px solid ${loopColor}`,
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            opacity: 0.9,
            boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
            letterSpacing: '0.5px'
          }}>
            FIN
          </div>
        </div>
      )}

      {/* ✅ Marqueurs de cycle (comme pour les clips individuels) */}
      {timelineLoop.durationMode === 'cycles' && cycleCount > 1 && (
        <>
          {Array.from({ length: Math.min(cycleCount - 1, 10) }).map((_, i) => {
            const cycleNumber = i + 1
            const cyclePosition = loopStartPx + (loopWidthPx / cycleCount) * cycleNumber
            if (cyclePosition >= loopEndTotalPx) return null
            
            return (
              <div
                key={`cycle-marker-${cycleNumber}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: cyclePosition,
                  width: 1,
                  background: loopColor,
                  zIndex: 3,
                  opacity: 0.3,
                  pointerEvents: 'none',
                  borderLeft: `1px dashed ${loopColor}50`
                }}
              >
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 6,
                  color: loopColor,
                  opacity: 0.5,
                  fontFamily: 'monospace',
                  background: 'var(--bg-tertiary)',
                  padding: '0 2px'
                }}>
                  {cycleNumber + 1}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ✅ Informations de la boucle */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: 7,
        color: loopColor,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        pointerEvents: 'none',
        opacity: 0.8,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <i className="ti ti-repeat" style={{ fontSize: 8 }} />
        <span>BOUCLE</span>
        <span style={{ fontWeight: 400, opacity: 0.6 }}>
          {loopStart.toFixed(1)}s → {loopEnd.toFixed(1)}s
        </span>
        <span style={{ fontWeight: 400, opacity: 0.4, fontFamily: 'monospace' }}>
          ({(loopEnd - loopStart).toFixed(1)}s)
        </span>
        {timelineLoop.durationMode === 'cycles' && cycleCount > 1 && (
          <span style={{
            fontWeight: 400,
            opacity: 0.5,
            fontFamily: 'monospace',
            fontSize: 6,
            background: `${loopColor}30`,
            padding: '0 4px',
            borderRadius: 2
          }}>
            {cycleCount}x
          </span>
        )}
        {timelineLoop.durationMode === 'manualDuration' && (
          <span style={{
            fontWeight: 400,
            opacity: 0.5,
            fontFamily: 'monospace',
            fontSize: 6,
            background: `${loopColor}30`,
            padding: '0 4px',
            borderRadius: 2
          }}>
            {manualDuration}s
          </span>
        )}
        {extendedWidthPx > 0 && (
          <span style={{
            fontWeight: 400,
            opacity: 0.4,
            fontFamily: 'monospace',
            fontSize: 6,
            color: loopColor
          }}>
            +{(maxLoopDuration - loopDuration).toFixed(1)}s
          </span>
        )}
      </div>

      {/* ✅ Poignée de début */}
      <div
        onMouseDown={handleLoopHandleMouseDown('start')}
        style={{
          position: 'absolute',
          top: -4,
          bottom: -4,
          left: loopStartPx - 3,
          width: 6,
          cursor: 'ew-resize',
          zIndex: 7,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{
          width: 2,
          height: '100%',
          background: loopColor,
          opacity: 0.8,
          borderRadius: 1
        }} />
        <div style={{
          position: 'absolute',
          top: -6,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: loopColor,
          border: '1px solid var(--bg-primary)',
          boxShadow: '0 0 8px rgba(0,0,0,0.3)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -6,
          fontSize: 6,
          color: loopColor,
          opacity: 0.5,
          fontFamily: 'monospace'
        }}>
          ◀
        </div>
      </div>

      {/* ✅ Poignée de fin */}
      <div
        onMouseDown={handleLoopHandleMouseDown('end')}
        style={{
          position: 'absolute',
          top: -4,
          bottom: -4,
          left: loopEndZonePx - 3,
          width: 6,
          cursor: 'ew-resize',
          zIndex: 7,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{
          width: 2,
          height: '100%',
          background: loopColor,
          opacity: 0.8,
          borderRadius: 1
        }} />
        <div style={{
          position: 'absolute',
          bottom: -6,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: loopColor,
          border: '1px solid var(--bg-primary)',
          boxShadow: '0 0 8px rgba(0,0,0,0.3)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -6,
          fontSize: 6,
          color: loopColor,
          opacity: 0.5,
          fontFamily: 'monospace'
        }}>
          ▶
        </div>
      </div>

      {/* ✅ Bouton pour ouvrir le panneau de configuration */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onOpenLoopPanel?.()
        }}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '1px 6px',
          fontSize: 8,
          border: '1px solid var(--border)',
          borderRadius: 3,
          background: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          zIndex: 8
        }}
        title={tr('editLoopSettings') || 'Modifier les paramètres de la boucle'}
      >
        <i className="ti ti-settings" />
      </button>

      {/* ✅ Bouton toggle loop */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleLoop?.()
        }}
        style={{
          position: 'absolute',
          right: 28,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '1px 6px',
          fontSize: 7,
          border: '1px solid var(--border)',
          borderRadius: 3,
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          cursor: 'pointer',
          zIndex: 8,
          fontWeight: 600
        }}
        title={tr('toggleLoop') || 'Activer/désactiver la boucle'}
      >
        {timelineLoop.enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  )
})

TimelineLoop.displayName = 'TimelineLoop'

export default TimelineLoop