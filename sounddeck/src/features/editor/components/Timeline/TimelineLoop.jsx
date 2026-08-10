// src/features/editor/components/Timeline/TimelineLoop.jsx
import React, { useState, useEffect, useRef, memo } from 'react'

const TimelineLoop = memo(({
  loopRegion,
  pixelsPerSecond,
  onSetLoopRegion,
  onClearLoop,
  onToggleLoop,
  tr,
  totalDuration
}) => {
  const [loopDrag, setLoopDrag] = useState(null)
  const containerRef = useRef(null)

  const handleLoopStripMouseDown = (e) => {
    e.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration))
    setLoopDrag({ mode: 'create', anchor: time })
    onSetLoopRegion?.(time, Math.min(time + 0.5, totalDuration))
  }

  const handleLoopHandleMouseDown = (mode) => (e) => {
    e.stopPropagation()
    const anchor = mode === 'start' ? loopRegion.end : loopRegion.start
    setLoopDrag({ mode, anchor })
  }

  useEffect(() => {
    if (!loopDrag) return

    const handleMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const time = Math.max(0, Math.min(x / pixelsPerSecond, totalDuration))
      
      if (loopDrag.mode === 'create') {
        onSetLoopRegion?.(
          Math.min(loopDrag.anchor, time),
          Math.max(loopDrag.anchor, time)
        )
      } else if (loopDrag.mode === 'start') {
        onSetLoopRegion?.(
          Math.min(time, loopDrag.anchor),
          Math.max(time, loopDrag.anchor)
        )
      } else if (loopDrag.mode === 'end') {
        onSetLoopRegion?.(
          Math.min(loopDrag.anchor, time),
          Math.max(loopDrag.anchor, time)
        )
      }
    }
    
    const handleUp = () => setLoopDrag(null)

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [loopDrag, onSetLoopRegion, pixelsPerSecond, totalDuration])

  const hasLoop = loopRegion && loopRegion.end > loopRegion.start + 0.01

  if (!hasLoop) {
    return (
      <div
        ref={containerRef}
        className="loop-strip"
        onMouseDown={handleLoopStripMouseDown}
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
        {tr('editorClickToAddMarker') || 'Cliquez pour définir une boucle'}
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
      {/* Zone de boucle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: loopRegion.start * pixelsPerSecond,
          width: (loopRegion.end - loopRegion.start) * pixelsPerSecond,
          background: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
          opacity: 0.4,
          cursor: 'pointer'
        }}
        onDoubleClick={() => onClearLoop?.()}
        title={tr('editorDoubleClickToRename') || 'Double-clic pour supprimer la boucle'}
      />

      {/* Étiquette de boucle */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: 7,
        color: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        pointerEvents: 'none',
        opacity: 0.8
      }}>
        <i className="ti ti-repeat" style={{ marginRight: 2 }} />
        {loopRegion.enabled ? 'LOOP ON' : 'LOOP OFF'}
        <span style={{ marginLeft: 4, fontWeight: 400 }}>
          {loopRegion.start.toFixed(1)}s → {loopRegion.end.toFixed(1)}s
        </span>
      </div>

      {/* Poignée de début */}
      <div
        onMouseDown={handleLoopHandleMouseDown('start')}
        style={{
          position: 'absolute',
          top: -4,
          bottom: -4,
          left: loopRegion.start * pixelsPerSecond - 4,
          width: 8,
          cursor: 'ew-resize',
          zIndex: 6,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{
          width: 2,
          height: '100%',
          background: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
          opacity: 0.8,
          borderRadius: 1
        }} />
        <div style={{
          position: 'absolute',
          top: -6,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
          border: '1px solid var(--bg-primary)'
        }} />
      </div>

      {/* Poignée de fin */}
      <div
        onMouseDown={handleLoopHandleMouseDown('end')}
        style={{
          position: 'absolute',
          top: -4,
          bottom: -4,
          left: loopRegion.end * pixelsPerSecond - 4,
          width: 8,
          cursor: 'ew-resize',
          zIndex: 6,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div style={{
          width: 2,
          height: '100%',
          background: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
          opacity: 0.8,
          borderRadius: 1
        }} />
        <div style={{
          position: 'absolute',
          bottom: -6,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
          border: '1px solid var(--bg-primary)'
        }} />
      </div>

      {/* Bouton toggle loop */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleLoop?.()
        }}
        style={{
          position: 'absolute',
          right: 4,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '1px 6px',
          fontSize: 8,
          border: '1px solid var(--border)',
          borderRadius: 3,
          background: loopRegion.enabled ? 'var(--accent-light)' : 'var(--bg-tertiary)',
          color: loopRegion.enabled ? 'var(--accent)' : 'var(--text-tertiary)',
          cursor: 'pointer'
        }}
        title={tr('toggleLoop') || 'Activer/désactiver la boucle'}
      >
        {loopRegion.enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  )
})

TimelineLoop.displayName = 'TimelineLoop'

export default TimelineLoop