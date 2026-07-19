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
  addToast,
  tr,
  lang
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newMarkerName, setNewMarkerName] = useState('')
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null)
  const [draggingMarker, setDraggingMarker] = useState(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartTime, setDragStartTime] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [markerToDelete, setMarkerToDelete] = useState(null)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

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

  // Gestion de la confirmation de suppression
  const handleDeleteClick = useCallback((marker, e) => {
    e.stopPropagation()
    setMarkerToDelete(marker)
    setShowDeleteConfirm(true)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (markerToDelete) {
      onRemoveMarker?.(markerToDelete.id)
      addToast?.(tr('editorMarkerDeleted'), 'info')
    }
    setShowDeleteConfirm(false)
    setMarkerToDelete(null)
  }, [markerToDelete, onRemoveMarker, addToast, tr])

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false)
    setMarkerToDelete(null)
  }, [])

  const handleDeleteAll = useCallback(() => {
    markers.forEach(m => onRemoveMarker?.(m.id))
    setShowDeleteConfirm(false)
    setMarkerToDelete(null)
    addToast?.(tr('editorAllMarkersDeleted'), 'info')
  }, [markers, onRemoveMarker, addToast, tr])

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
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const markerUnderCursor = markers.find(m => Math.abs(m.time - currentTime) < 0.5)
        if (markerUnderCursor) {
          setMarkerToDelete(markerUnderCursor)
          setShowDeleteConfirm(true)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTime, markers.length, onAddMarker, markers])

  // Focus sur l'input quand le modal d'ajout s'ouvre
  useEffect(() => {
    if (isAdding && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus()
      }, 100)
    }
  }, [isAdding])

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
        const isHovered = hoveredMarkerId === marker.id
        
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
              opacity: (isHovered || isNear || isDragging) ? 1 : 0.6,
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
            
            {/* Nom du marqueur avec bouton supprimer à droite */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 2,
                background: 'var(--bg-secondary)',
                borderRadius: 3,
                border: `1px solid ${marker.color || '#f44336'}`,
                padding: '1px 4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                maxWidth: 120
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'grab',
                  flex: 1
                }}
                title={`${marker.name} (${formatTime(marker.time)}) - Glisser pour déplacer`}
              >
                {marker.name}
              </span>

              {/* Bouton supprimer - à droite du nom */}
              <button
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: isHovered || isNear ? 'rgba(224,82,82,0.8)' : 'transparent',
                  border: 'none',
                  color: isHovered || isNear ? 'white' : 'transparent',
                  cursor: 'pointer',
                  fontSize: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onClick={(e) => handleDeleteClick(marker, e)}
                title={tr('editorRemoveMarker') || 'Supprimer le marqueur'}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--danger)'
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.transform = 'scale(1.15)'
                }}
                onMouseLeave={e => {
                  if (!isHovered && !isNear) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'transparent'
                  }
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <i className="ti ti-x" style={{ fontSize: 8 }} />
              </button>
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
          onClick={() => setIsAdding(true)}
          style={{ fontSize: 10, padding: '2px 6px', color: 'var(--text-secondary)' }}
          title={tr('editorAddMarker') || 'Ajouter un marqueur (Ctrl+M)'}
        >
          <i className="ti ti-plus" />
        </button>
        
        {markers.length > 0 && (
          <button
            className="btn-ghost btn-sm"
            onClick={() => {
              setMarkerToDelete(null)
              setShowDeleteConfirm(true)
            }}
            style={{ fontSize: 10, padding: '2px 6px', color: 'var(--text-tertiary)' }}
            title={tr('editorDeleteAllMarkers') || 'Supprimer tous les marqueurs'}
          >
            <i className="ti ti-trash" />
          </button>
        )}
      </div>

      {/* Modal d'ajout de marqueur avec nom */}
      {isAdding && (
        <div className="modal-overlay" onClick={() => {
          setIsAdding(false)
          setNewMarkerName('')
        }}>
          <div className="modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <i className="ti ti-bookmark" style={{ color: 'var(--accent)' }} />
              {tr('editorAddMarker') || 'Ajouter un marqueur'}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                {tr('editorMarkerName') || 'Nom du marqueur'}
              </label>
              <input
                ref={inputRef}
                type="text"
                value={newMarkerName}
                onChange={e => setNewMarkerName(e.target.value)}
                placeholder={tr('editorMarkerName') || 'Nom du marqueur'}
                className="input-lg"
                style={{ fontSize: 13 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddMarker()
                  if (e.key === 'Escape') {
                    setIsAdding(false)
                    setNewMarkerName('')
                  }
                }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary btn-lg"
                onClick={() => {
                  setIsAdding(false)
                  setNewMarkerName('')
                }}
              >
                {tr('cancel') || 'Annuler'}
              </button>
              <button
                className="btn-primary btn-lg"
                onClick={handleAddMarker}
                disabled={!newMarkerName.trim()}
              >
                <i className="ti ti-check" /> {tr('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression - style standard */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <i className="ti ti-trash" style={{ color: 'var(--danger)' }} />
              {markerToDelete 
                ? tr('editorDeleteMarkerConfirm').replace('{name}', markerToDelete.name)
                : tr('editorDeleteAllMarkers')}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {markerToDelete 
                ? tr('editorDeleteMarkerMessage').replace('{name}', markerToDelete.name)
                : tr('editorDeleteAllMarkersMessage')}
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary btn-lg"
                onClick={handleDeleteCancel}
              >
                {tr('cancel') || 'Annuler'}
              </button>
              <button
                className="btn-danger btn-lg"
                onClick={markerToDelete ? handleDeleteConfirm : handleDeleteAll}
                style={{
                  background: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 20px',
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.8'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <i className="ti ti-trash" style={{ marginRight: 6 }} />
                {tr('editorDelete') || 'Supprimer'}
              </button>
            </div>
          </div>
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