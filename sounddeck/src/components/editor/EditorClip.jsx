import { useState, useRef, useEffect } from 'react'

export default function EditorClip({
  clip,
  index,
  totalDuration,
  pixelsPerSecond,
  trackHeight,
  isSelected,
  isPlaying,
  waveformData,
  clipDuration,
  onSelect,
  onMove,
  onUpdate,
  onRemove,
  onDuplicate,
  onDragStart,
  tr
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeSide, setResizeSide] = useState(null)
  const clipRef = useRef(null)

  // ✅ Utiliser la durée réelle du clip
  const duration = clipDuration || clip.duration || 3
  const left = clip.start * pixelsPerSecond
  const width = Math.max(duration * pixelsPerSecond, 10)

  // Couleur du clip
  const hue = (index * 30 + 200) % 360
  const color = `hsl(${hue}, 70%, 50%)`
  const colorLight = `hsl(${hue}, 70%, 65%)`

  // Gestion du drag
  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('.clip-actions')) return

    setIsDragging(true)
    setDragStartX(e.clientX)
    onSelect()
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStartX
    const deltaSeconds = deltaX / pixelsPerSecond
    const newStart = Math.max(0, clip.start + deltaSeconds)

    onMove(newStart)
    setDragStartX(e.clientX)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Gestion du resize
  const handleResizeStart = (e, side) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeSide(side)
    setDragStartX(e.clientX)
  }

  const handleResizeMove = (e) => {
    if (!isResizing) return

    const deltaX = e.clientX - dragStartX
    const deltaSeconds = deltaX / pixelsPerSecond

    if (resizeSide === 'end') {
      const newDuration = Math.max(0.5, duration + deltaSeconds)
      onUpdate({ duration: newDuration })
    } else if (resizeSide === 'start') {
      const newStart = Math.max(0, clip.start + deltaSeconds)
      const newDuration = duration - deltaSeconds
      if (newDuration >= 0.5) {
        onUpdate({ start: newStart, duration: newDuration })
      }
    }

    setDragStartX(e.clientX)
  }

  const handleResizeUp = () => {
    setIsResizing(false)
    setResizeSide(null)
  }

  // Effets globaux
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', isDragging ? handleMouseMove : handleResizeMove)
      document.addEventListener('mouseup', isDragging ? handleMouseUp : handleResizeUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeUp)
    }
  }, [isDragging, isResizing])

  // Effets appliqués au clip
  const effectBadges = clip.effects?.filter(e => e.enabled).map(e => e.type) || []

  // Afficher la durée sur le clip si elle est significative
  const showDuration = duration > 5

  return (
    <div
      ref={clipRef}
      style={{
        position: 'absolute',
        left: left,
        top: 4,
        width: width,
        height: trackHeight,
        background: isSelected ? color : 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm)',
        border: `2px solid ${isSelected ? color : 'var(--border)'}`,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging || isResizing ? 'none' : 'all 0.15s ease',
        boxShadow: isSelected ? `0 0 20px ${color}44` : 'none',
        zIndex: isSelected ? 3 : 1,
        overflow: 'hidden',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Waveform */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        opacity: 0.6,
        pointerEvents: 'none'
      }}>
        {waveformData && waveformData.length > 0 ? (
          waveformData.map((value, i) => {
            const barHeight = Math.max(2, value * trackHeight * 0.8)
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: barHeight,
                  minWidth: 1,
                  background: isSelected ? 'white' : 'var(--text-secondary)',
                  borderRadius: 1,
                  opacity: 0.7,
                  marginRight: 0.5
                }}
              />
            )
          })
        ) : (
          <div style={{
            width: '100%',
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-tertiary)'
          }}>
            <i className="ti ti-music" style={{ fontSize: 14 }} />
          </div>
        )}
      </div>

      {/* Nom du clip */}
      <div style={{
        position: 'absolute',
        bottom: 4,
        left: 6,
        right: 6,
        fontSize: 9,
        fontWeight: 600,
        color: isSelected ? 'white' : 'var(--text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
        zIndex: 2,
        pointerEvents: 'none'
      }}>
        {clip.name}
        {showDuration && (
          <span style={{ marginLeft: 4, opacity: 0.7 }}>
            ({Math.round(duration)}s)
          </span>
        )}
      </div>

      {/* Badges d'effets */}
      {effectBadges.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 2,
          right: 4,
          display: 'flex',
          gap: 2,
          zIndex: 2,
          pointerEvents: 'none'
        }}>
          {effectBadges.slice(0, 3).map(type => (
            <span key={type} style={{
              fontSize: 7,
              padding: '0 4px',
              borderRadius: 2,
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              textTransform: 'uppercase'
            }}>
              {type.slice(0, 3)}
            </span>
          ))}
        </div>
      )}

      {/* Indicateur de lecture */}
      {isPlaying && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'var(--accent)',
          zIndex: 4,
          animation: 'pulse 0.8s ease-in-out infinite'
        }} />
      )}

      {/* Poignées de resize */}
      {isSelected && (
        <>
          <div
            style={{
              position: 'absolute',
              left: -3,
              top: 0,
              bottom: 0,
              width: 6,
              cursor: 'ew-resize',
              zIndex: 5
            }}
            onMouseDown={(e) => handleResizeStart(e, 'start')}
          />
          <div
            style={{
              position: 'absolute',
              right: -3,
              top: 0,
              bottom: 0,
              width: 6,
              cursor: 'ew-resize',
              zIndex: 5
            }}
            onMouseDown={(e) => handleResizeStart(e, 'end')}
          />
        </>
      )}

      {/* Actions contextuelles au survol */}
      <div className="clip-actions" style={{
        position: 'absolute',
        top: 2,
        right: 4,
        display: isSelected ? 'flex' : 'none',
        gap: 2,
        zIndex: 6
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate() }}
          style={{
            padding: '1px 4px',
            fontSize: 9,
            background: 'rgba(0,0,0,0.6)',
            border: 'none',
            borderRadius: 2,
            color: 'white',
            cursor: 'pointer'
          }}
          title={tr('editorDuplicateClip')}
        >
          <i className="ti ti-copy" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          style={{
            padding: '1px 4px',
            fontSize: 9,
            background: 'rgba(224,82,82,0.6)',
            border: 'none',
            borderRadius: 2,
            color: 'white',
            cursor: 'pointer'
          }}
          title={tr('editorRemoveClip')}
        >
          <i className="ti ti-trash" />
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}