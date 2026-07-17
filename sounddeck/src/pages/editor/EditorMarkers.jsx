import { useState, useRef, useEffect, useCallback } from 'react'

export default function EditorMarkers({
  markers = [],
  currentTime = 0,
  totalDuration = 0,
  pixelsPerSecond = 80,
  onAddMarker,
  onRemoveMarker,
  onSeek,
  onMarkersChange,
  tr,
  lang
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newMarkerName, setNewMarkerName] = useState('')
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null)
  const [draggingMarker, setDraggingMarker] = useState(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartTime, setDragStartTime] = useState(0)
  const containerRef = useRef(null)

  const handleAddMarker = useCallback(() => {
    const name = newMarkerName.trim() || `Marqueur ${markers.length + 1}`
    onAddMarker?.({
      id: `marker-${Date.now()}`,
      name: name,
      time: currentTime,
      color: getMarkerColor(markers.length)
    })
    setNewMarkerName('')
    setIsAdding(false)
  }, [newMarkerName, currentTime, markers.length, onAddMarker])

  const handleRulerClick = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    let time = x / pixelsPerSecond
    time = Math.max(0, Math.min(totalDuration, time))
    
    onAddMarker?.({
      id: `marker-${Date.now()}`,
      name: `M${markers.length + 1}`,
      time: time,
      color: getMarkerColor(markers.length)
    })
  }, [pixelsPerSecond, totalDuration, markers.length, onAddMarker])

  // Drag d'un marqueur
  const handleMarkerMouseDown = useCallback((e, marker) => {
    e.stopPropagation()
    setDraggingMarker(marker)
    setDragStartX(e.clientX)
    setDragStartTime(marker.time)
  }, [])

  const handleMarkerMove = useCallback((e) => {
    if (!draggingMarker) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const deltaX = e.clientX - dragStartX
    const deltaTime = deltaX / pixelsPerSecond
    const newTime = Math.max(0, Math.min(totalDuration, dragStartTime + deltaTime))

    const updatedMarker = { ...draggingMarker, time: newTime }
    const updatedMarkers = markers.map(m => 
      m.id === draggingMarker.id ? updatedMarker : m
    )
    
    onMarkersChange?.(updatedMarkers)
  }, [draggingMarker, dragStartX, dragStartTime, pixelsPerSecond, totalDuration, markers, onMarkersChange])

  const handleMarkerMouseUp = useCallback(() => {
    setDraggingMarker(null)
  }, [])

  useEffect(() => {
    if (draggingMarker) {
      document.addEventListener('mousemove', handleMarkerMove)
      document.addEventListener('mouseup', handleMarkerMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMarkerMove)
      document.removeEventListener('mouseup', handleMarkerMouseUp)
    }
  }, [draggingMarker, handleMarkerMove, handleMarkerMouseUp])

  // Raccourci clavier pour ajouter un marqueur
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault()
        onAddMarker?.({
          id: `marker-${Date.now()}`,
          name: `M${markers.length + 1}`,
          time: currentTime,
          color: getMarkerColor(markers.length)
        })
      }
      // Supprimer le marqueur sous le curseur avec Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const markerUnderCursor = markers.find(m => Math.abs(m.time - currentTime) < 0.5)
        if (markerUnderCursor) {
          onRemoveMarker?.(markerUnderCursor.id)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTime, markers.length, onAddMarker, onRemoveMarker, markers])

  const navigateToMarker = useCallback((time) => {
    onSeek?.(time)
  }, [onSeek])

  const goToPreviousMarker = useCallback(() => {
    const prevMarkers = markers.filter(m => m.time < currentTime - 0.1)
    if (prevMarkers.length > 0) {
      const closest = prevMarkers.reduce((a, b) => b.time > a.time ? b : a)
      navigateToMarker(closest.time)
    }
  }, [markers, currentTime, navigateToMarker])

  const goToNextMarker = useCallback(() => {
    const nextMarkers = markers.filter(m => m.time > currentTime + 0.1)
    if (nextMarkers.length > 0) {
      const closest = nextMarkers.reduce((a, b) => b.time < a.time ? b : a)
      navigateToMarker(closest.time)
    }
  }, [markers, currentTime, navigateToMarker])

  const MARKER_COLORS = [
    '#f44336', '#e91e63', '#9c27b0', '#3f51b5', '#2196f3',
    '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ffeb3b',
    '#ff9800', '#795548'
  ]

  function getMarkerColor(index) {
    return MARKER_COLORS[index % MARKER_COLORS.length]
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', height: 40 }}>
      {/* Zone de clic pour ajouter un marqueur */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          cursor: 'pointer',
          zIndex: 10,
          opacity: 0.7,
          borderRadius: 'var(--radius-sm)',
          background: 'transparent'
        }}
        onClick={handleRulerClick}
        onDoubleClick={handleRulerClick}
        title={tr('editorClickToAddMarker') || 'Cliquer pour ajouter un marqueur (Ctrl+M)'}
      />

      {/* Marqueurs */}
      {markers.map(marker => {
        const position = marker.time * pixelsPerSecond
        const isNear = Math.abs(marker.time - currentTime) < 0.5
        const isDragging = draggingMarker?.id === marker.id
        
        return (
          <div
            key={marker.id}
            style={{
              position: 'absolute',
              top: 0,
              left: position,
              transform: 'translateX(-50%)',
              zIndex: 20,
              cursor: isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: (hoveredMarkerId === marker.id || isNear || isDragging) ? 1 : 0.6,
              transition: 'opacity 0.2s ease'
            }}
            onMouseEnter={() => setHoveredMarkerId(marker.id)}
            onMouseLeave={() => setHoveredMarkerId(null)}
            onMouseDown={(e) => handleMarkerMouseDown(e, marker)}
          >
            {/* Triangle du marqueur */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `10px solid ${marker.color || '#f44336'}`,
                filter: isNear ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : 'none',
                transform: isDragging ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.15s ease'
              }}
            />
            
            {/* Nom du marqueur */}
            <div
              style={{
                fontSize: 9,
                color: 'var(--text-secondary)',
                background: 'var(--bg-secondary)',
                padding: '1px 6px',
                borderRadius: 3,
                border: `1px solid ${marker.color || '#f44336'}`,
                whiteSpace: 'nowrap',
                marginTop: 2,
                maxWidth: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'grab'
              }}
              title={`${marker.name} (${formatTime(marker.time)}) - Glisser pour déplacer`}
            >
              {marker.name}
            </div>

            {/* Ligne verticale du marqueur */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                bottom: -500,
                left: '50%',
                width: 2,
                background: marker.color || '#f44336',
                opacity: isNear || isDragging ? 0.4 : 0.15,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease'
              }}
            />

            {/* Bouton supprimer au survol ou si proche */}
            {(hoveredMarkerId === marker.id || isNear) && (
              <button
                style={{
                  position: 'absolute',
                  top: -10,
                  right: -18,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'var(--danger)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  zIndex: 25,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transition: 'transform 0.15s ease'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Supprimer le marqueur "${marker.name}" ?`)) {
                    onRemoveMarker?.(marker.id)
                  }
                }}
                title={tr('editorRemoveMarker') || 'Supprimer le marqueur'}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>
        )
      })}

      {/* Navigation des marqueurs */}
      <div style={{
        position: 'absolute',
        bottom: -32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        zIndex: 30,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)'
      }}>
        <button
          className="btn-ghost btn-sm"
          onClick={goToPreviousMarker}
          disabled={markers.filter(m => m.time < currentTime).length === 0}
          style={{ fontSize: 10, padding: '2px 6px', color: 'var(--text-secondary)' }}
          title={tr('editorPreviousMarker') || 'Marqueur précédent'}
        >
          <i className="ti ti-arrow-left" />
        </button>
        
        <span style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          padding: '0 4px',
          minWidth: 30,
          textAlign: 'center'
        }}>
          {markers.length}
        </span>
        
        <button
          className="btn-ghost btn-sm"
          onClick={goToNextMarker}
          disabled={markers.filter(m => m.time > currentTime).length === 0}
          style={{ fontSize: 10, padding: '2px 6px', color: 'var(--text-secondary)' }}
          title={tr('editorNextMarker') || 'Marqueur suivant'}
        >
          <i className="ti ti-arrow-right" />
        </button>

        <div style={{ width: 1, background: 'var(--border)' }} />

        <button
          className="btn-ghost btn-sm"
          onClick={() => setIsAdding(!isAdding)}
          style={{ fontSize: 10, padding: '2px 6px', color: 'var(--text-secondary)' }}
          title={tr('editorAddMarker') || 'Ajouter un marqueur (Ctrl+M)'}
        >
          <i className="ti ti-plus" />
        </button>
        
        {/* Bouton pour supprimer tous les marqueurs */}
        {markers.length > 0 && (
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              if (confirm('Supprimer tous les marqueurs ?')) {
                markers.forEach(m => onRemoveMarker?.(m.id))
              }
            }}
            style={{ fontSize: 10, padding: '2px 6px', color: 'var(--text-tertiary)' }}
            title="Supprimer tous les marqueurs"
          >
            <i className="ti ti-trash" />
          </button>
        )}
      </div>

      {/* Modal d'ajout de marqueur avec nom */}
      {isAdding && (
        <div style={{
          position: 'absolute',
          bottom: -50,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 8,
          zIndex: 40,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.15s ease'
        }}>
          <input
            type="text"
            value={newMarkerName}
            onChange={e => setNewMarkerName(e.target.value)}
            placeholder={tr('editorMarkerName') || 'Nom du marqueur'}
            style={{
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              minWidth: 120
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddMarker()
              if (e.key === 'Escape') setIsAdding(false)
            }}
          />
          <button
            className="btn-primary btn-sm"
            onClick={handleAddMarker}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            {tr('add')}
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setIsAdding(false)}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            {tr('cancel')}
          </button>
        </div>
      )}
    </div>
  )
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`
}