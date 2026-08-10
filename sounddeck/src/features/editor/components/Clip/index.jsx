// src/features/editor/components/Clip/index.jsx
import React, { useState, useRef, useCallback, memo, useEffect } from 'react'
import ClipWaveform from './ClipWaveform'
import ClipFadeHandles from './ClipFadeHandles'
import ClipResizeHandles from './ClipResizeHandles'
import ClipActions from './ClipActions'

const EditorClip = memo(({
  clip,
  duration,
  start,
  trackId,
  trackColor,
  isSelected,
  pixelsPerSecond,
  snapEnabled,  // ✅ AJOUTÉ
  onSelect,
  onMove,
  onUpdate,
  onRemove,
  onDuplicate,
  onFade,
  onContextMenu,
  onUpdateDuration,
  waveformData,
  isPlaying,
  currentTime,
  tr,
  onPlayClip,
  onStopClip,
  onCopyClip,
  onCutClip,
  onPasteClip,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartTime, setDragStartTime] = useState(0)
  const [dragMode, setDragMode] = useState('move')
  const [isHovering, setIsHovering] = useState(false)
  const [isClipPlaying, setIsClipPlaying] = useState(false)
  const clipRef = useRef(null)
  const dragStartClipId = useRef(null)

  const clipWidth = Math.max(duration * pixelsPerSecond, 20)
  const clipLeft = start * pixelsPerSecond

  // ✅ Valeur de snap (0.1 seconde)
  const SNAP_VALUE = 0.1

  // Calculer si le clip est en cours de lecture
  useEffect(() => {
    setIsClipPlaying(isPlaying && currentTime >= start && currentTime <= start + duration)
  }, [isPlaying, currentTime, start, duration])

  // Calculer si le curseur doit être affiché
  const showPlayhead = currentTime >= start && currentTime <= start + duration

  // Calculer la position du curseur en pixels
  const playheadPosition = Math.max(0, Math.min((currentTime - start) * pixelsPerSecond, clipWidth - 2))

  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    
    const target = e.target
    const isResizeStart = target.dataset.resize === 'start'
    const isResizeEnd = target.dataset.resize === 'end'
    
    if (isResizeStart || isResizeEnd) {
      setDragMode(isResizeStart ? 'resize-start' : 'resize-end')
    } else {
      setDragMode('move')
      onSelect?.(clip.id)
      dragStartClipId.current = clip.id
    }
    
    setIsDragging(true)
    setDragStartX(e.clientX)
    setDragStartTime(start)
    e.stopPropagation()
    e.preventDefault()
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    
    const deltaX = (e.clientX - dragStartX) / pixelsPerSecond
    
    if (dragMode === 'move') {
      let newStart = Math.max(0, dragStartTime + deltaX)
      // ✅ Appliquer le snap si activé
      if (snapEnabled) {
        newStart = Math.round(newStart / SNAP_VALUE) * SNAP_VALUE
        newStart = Math.round(newStart * 100) / 100
      }
      if (onMove && dragStartClipId.current) {
        onMove(dragStartClipId.current, newStart, trackId)
      }
    } else if (dragMode === 'resize-start') {
      let newStart = Math.max(0, dragStartTime + deltaX)
      // ✅ Appliquer le snap pour le resize-start
      if (snapEnabled) {
        newStart = Math.round(newStart / SNAP_VALUE) * SNAP_VALUE
        newStart = Math.round(newStart * 100) / 100
      }
      const newDuration = duration + (dragStartTime - newStart)
      if (newDuration > 0.05) {
        onUpdate?.(clip.id, { start: newStart, duration: newDuration })
        onUpdateDuration?.(clip.id, newDuration)
      }
    } else if (dragMode === 'resize-end') {
      let newDuration = Math.max(0.05, duration + deltaX)
      // ✅ Appliquer le snap pour le resize-end
      if (snapEnabled) {
        newDuration = Math.round(newDuration / SNAP_VALUE) * SNAP_VALUE
        newDuration = Math.round(newDuration * 100) / 100
      }
      onUpdate?.(clip.id, { duration: newDuration })
      onUpdateDuration?.(clip.id, newDuration)
    }
  }, [isDragging, dragMode, dragStartX, dragStartTime, duration, pixelsPerSecond, clip.id, onMove, onUpdate, onUpdateDuration, trackId, snapEnabled])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      dragStartClipId.current = null
    }
  }, [isDragging])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const getClipColor = (baseColor) => {
    const opacity = isSelected ? 0.35 : 0.15
    return `color-mix(in srgb, ${baseColor} ${opacity * 100}%, var(--bg-secondary))`
  }

  // Handlers avec ordre correct (clipId, trackId)
  const handlePlay = (e) => {
    e?.stopPropagation?.()
    console.log('▶️ [Clip] Jouer:', clip.name, 'à', start)
    if (onPlayClip) {
      onPlayClip(clip, trackId)
    }
  }

  const handleStop = (e) => {
    e?.stopPropagation?.()
    console.log('⏹️ [Clip] Arrêter:', clip.name)
    onStopClip?.(clip.id)
  }

  const handleDuplicate = (clipId, trackId) => {
    console.log('📋 [Clip] Dupliquer:', clipId, trackId)
    if (onDuplicate && clipId && trackId) {
      onDuplicate(clipId, trackId)
    }
  }

  const handleRemove = (clipId, trackId) => {
    console.log('🗑️ [Clip] Supprimer:', clipId, trackId)
    if (onRemove && clipId && trackId) {
      onRemove(clipId, trackId)
    }
  }

  const handleCopy = (e) => {
    e?.stopPropagation?.()
    console.log('📋 [Clip] Copier:', clip.name)
    onCopyClip?.(clip)
  }

  const handleCut = (e) => {
    e?.stopPropagation?.()
    console.log('✂️ [Clip] Couper:', clip.name)
    onCutClip?.(clip)
  }

  return (
    <div
      ref={clipRef}
      style={{
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: clipLeft,
        width: clipWidth,
        minWidth: 10,
        background: getClipColor(trackColor),
        border: `2px solid ${isSelected ? 'var(--accent)' : trackColor}`,
        borderRadius: 6,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: isSelected ? '0 0 20px rgba(124,111,247,0.3)' : 'none',
        zIndex: isSelected ? 3 : 1,
        opacity: isDragging ? 0.7 : 1,
        overflow: 'hidden',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.(e)
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <ClipWaveform
        waveformData={waveformData}
        trackColor={trackColor}
        duration={duration}
      />

      <div style={{
        position: 'absolute',
        bottom: 4,
        left: 6,
        right: 6,
        fontSize: 9,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        textShadow: '0 1px 4px rgba(0,0,0,0.5)'
      }}>
        {clip.name || 'Clip'}
        <span style={{
          marginLeft: 4,
          fontSize: 8,
          opacity: 0.6,
          color: 'var(--text-tertiary)'
        }}>
          {duration.toFixed(1)}s
        </span>
      </div>

      {isHovering && (
        <div style={{
          position: 'absolute',
          top: 2,
          left: 4,
          display: 'flex',
          gap: 2,
          zIndex: 7,
          pointerEvents: 'auto'
        }}>
          {isClipPlaying ? (
            <button
              onClick={handleStop}
              style={{
                padding: '2px 5px',
                fontSize: 10,
                color: 'var(--warning)',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
              }}
              title="Arrêter"
            >
              <i className="ti ti-player-stop" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              style={{
                padding: '2px 5px',
                fontSize: 10,
                color: 'var(--success)',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
              }}
              title="Jouer le clip"
            >
              <i className="ti ti-player-play" />
            </button>
          )}
          
          <button
            onClick={handleCopy}
            style={{
              padding: '2px 5px',
              fontSize: 10,
              color: 'var(--text-secondary)',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }}
            title="Copier"
          >
            <i className="ti ti-copy" />
          </button>
          
          <button
            onClick={handleCut}
            style={{
              padding: '2px 5px',
              fontSize: 10,
              color: 'var(--warning)',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }}
            title="Couper"
          >
            <i className="ti ti-cut" />
          </button>
        </div>
      )}

      <ClipFadeHandles
        clip={clip}
        trackId={trackId}
        isSelected={isSelected}
        isHovering={isHovering}
        onFade={onFade}
        pixelsPerSecond={pixelsPerSecond}
      />

      <ClipResizeHandles
        isSelected={isSelected}
        isHovering={isHovering}
        duration={duration}
        pixelsPerSecond={pixelsPerSecond}
        onResizeStart={(e) => {
          e.stopPropagation()
          setDragMode('resize-start')
          setIsDragging(true)
          setDragStartX(e.clientX)
          setDragStartTime(start)
        }}
        onResizeEnd={(e) => {
          e.stopPropagation()
          setDragMode('resize-end')
          setIsDragging(true)
          setDragStartX(e.clientX)
          setDragStartTime(start)
        }}
      />

      <ClipActions
        isSelected={isSelected}
        isHovering={isHovering}
        clipId={clip.id}
        trackId={trackId}
        onDuplicate={handleDuplicate}
        onRemove={handleRemove}
        tr={tr}
      />

      {/* CURSEUR DU CLIP - Position exacte en pixels */}
      {showPlayhead && (
        <div style={{
          position: 'absolute',
          left: playheadPosition,
          top: 0,
          bottom: 0,
          width: 2,
          background: isClipPlaying ? 'var(--accent)' : 'rgba(124,111,247,0.4)',
          zIndex: 4,
          boxShadow: isClipPlaying ? '0 0 10px rgba(124,111,247,0.5)' : 'none',
          pointerEvents: 'none',
          transition: isClipPlaying ? 'none' : 'left 0.05s ease'
        }} />
      )}
    </div>
  )
})

EditorClip.displayName = 'EditorClip'

export default EditorClip