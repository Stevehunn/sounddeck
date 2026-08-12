// src/features/editor/components/Clip/index.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react'
import ClipWaveform from './ClipWaveform'
import ClipFadeHandles from './ClipFadeHandles'
import ClipResizeHandles from './ClipResizeHandles'
import ClipActions from './ClipActions'

const EditorClip = ({
  clip,
  duration,
  start,
  trackId,
  trackColor,
  isSelected,
  pixelsPerSecond,
  snapEnabled,
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
  const [dragMode, setDragMode] = useState('move')
  const [isHovering, setIsHovering] = useState(false)
  const [isClipPlaying, setIsClipPlaying] = useState(false)
  
  const [localStart, setLocalStart] = useState(start)
  
  const clipRef = useRef(null)
  const dragStartClipId = useRef(null)
  const frameIdRef = useRef(null)
  const dragStartTimeRef = useRef(start)
  const accumulatedDeltaRef = useRef(0)
  const lastClientXRef = useRef(0)
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)

  const clipWidth = Math.max(duration * pixelsPerSecond, 20)
  const clipLeft = localStart * pixelsPerSecond
  const SNAP_VALUE = 0.01
  const DRAG_SENSITIVITY = 1.0

  useEffect(() => {
    if (!isDragging) {
      setLocalStart(start)
      dragStartTimeRef.current = start
    }
  }, [start, isDragging])

  useEffect(() => {
    if (isDragging) {
      dragStartTimeRef.current = start
    }
  }, [start, isDragging])

  useEffect(() => {
    setIsClipPlaying(isPlaying && currentTime >= start && currentTime <= start + duration)
  }, [isPlaying, currentTime, start, duration])

  const playheadPosition = Math.max(0, Math.min((currentTime - start) * pixelsPerSecond, clipWidth - 2))

  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    
    const target = e.target
    const isResizeStart = target.dataset?.resize === 'start' || target.closest?.('[data-resize="start"]')
    const isResizeEnd = target.dataset?.resize === 'end' || target.closest?.('[data-resize="end"]')
    
    if (isResizeStart || isResizeEnd) {
      setDragMode(isResizeStart ? 'resize-start' : 'resize-end')
      setIsDragging(true)
      isDraggingRef.current = true
      setDragStartX(e.clientX)
      lastClientXRef.current = e.clientX
      accumulatedDeltaRef.current = 0
      hasMovedRef.current = false
      dragStartTimeRef.current = start
      e.stopPropagation()
      e.preventDefault()
      return
    }
    
    const isActionButton = target.closest?.('.delete-button') || 
                          target.closest?.('[data-action]') ||
                          target.closest?.('button')
    
    if (isActionButton) {
      e.stopPropagation()
      e.preventDefault()
      return
    }
    
    onSelect?.(clip.id)
    dragStartClipId.current = clip.id
    setIsDragging(true)
    isDraggingRef.current = true
    setDragStartX(e.clientX)
    lastClientXRef.current = e.clientX
    accumulatedDeltaRef.current = 0
    hasMovedRef.current = false
    dragStartTimeRef.current = start
    
    e.stopPropagation()
    e.preventDefault()
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current)
      frameIdRef.current = null
    }
    
    frameIdRef.current = requestAnimationFrame(() => {
      const deltaPixels = e.clientX - lastClientXRef.current
      lastClientXRef.current = e.clientX
      
      accumulatedDeltaRef.current += deltaPixels
      
      const totalDeltaSeconds = (accumulatedDeltaRef.current / pixelsPerSecond) * DRAG_SENSITIVITY
      let newStart = Math.max(0, dragStartTimeRef.current + totalDeltaSeconds)
      
      if (snapEnabled) {
        newStart = Math.round(newStart / SNAP_VALUE) * SNAP_VALUE
        newStart = Math.round(newStart * 1000) / 1000
      }
      
      if (Math.abs(accumulatedDeltaRef.current) > 1) {
        hasMovedRef.current = true
      }
      
      setLocalStart(newStart)
      
      frameIdRef.current = null
    })
  }, [pixelsPerSecond, snapEnabled])

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return
    
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current)
      frameIdRef.current = null
    }
    
    const finalStart = localStart
    
    if (hasMovedRef.current && onMove && dragStartClipId.current) {
      onMove(
        dragStartClipId.current,
        finalStart,
        null,
        { skipHistory: true }
      )
    }
    
    setIsDragging(false)
    isDraggingRef.current = false
    dragStartClipId.current = null
    accumulatedDeltaRef.current = 0
    hasMovedRef.current = false
  }, [localStart, onMove])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
        frameIdRef.current = null
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const getClipColor = (baseColor) => {
    const opacity = isSelected ? 0.35 : 0.15
    return `color-mix(in srgb, ${baseColor} ${opacity * 100}%, var(--bg-secondary))`
  }

  const handlePlay = (e) => {
    e?.stopPropagation?.()
    onPlayClip?.(clip, trackId)
  }

  const handleStop = (e) => {
    e?.stopPropagation?.()
    onStopClip?.(clip.id)
  }

  const handleDuplicate = (clipId, trackId) => {
    if (onDuplicate && clipId && trackId) {
      onDuplicate(clipId, trackId)
    }
  }

  const handleRemove = (trackId, clipId) => {
    if (onRemove && clipId && trackId) {
      onRemove(trackId, clipId)
    }
  }

  const handleCopy = (e) => {
    e?.stopPropagation?.()
    onCopyClip?.(clip)
  }

  const handleCut = (e) => {
    e?.stopPropagation?.()
    onCutClip?.(clip)
  }

  return (
    <div
      ref={clipRef}
      className="editor-clip-wrapper"
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
        transition: isDragging ? 'none' : 'border-color 0.15s, box-shadow 0.15s, left 0.05s ease',
        boxShadow: isSelected ? '0 0 20px rgba(124,111,247,0.3)' : 'none',
        zIndex: isDragging ? 10 : isSelected ? 3 : 2,
        opacity: isDragging ? 0.8 : 1,
        overflow: 'hidden',
        userSelect: 'none',
        pointerEvents: 'auto',
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
          isDraggingRef.current = true
          setDragStartX(e.clientX)
          lastClientXRef.current = e.clientX
          accumulatedDeltaRef.current = 0
          hasMovedRef.current = false
          dragStartTimeRef.current = start
        }}
        onResizeEnd={(e) => {
          e.stopPropagation()
          setDragMode('resize-end')
          setIsDragging(true)
          isDraggingRef.current = true
          setDragStartX(e.clientX)
          lastClientXRef.current = e.clientX
          accumulatedDeltaRef.current = 0
          hasMovedRef.current = false
          dragStartTimeRef.current = start
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

      {isPlaying && currentTime >= start && currentTime <= start + duration && (
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
}

export default EditorClip