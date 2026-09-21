// src/features/editor/components/Clip/index.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react'
import ClipWaveform from './ClipWaveform'
import ClipFadeHandles from './ClipFadeHandles'
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
  loopState = {},
  totalDuration = 10,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragMode, setDragMode] = useState('move')
  const [isHovering, setIsHovering] = useState(false)
  const [isClipPlaying, setIsClipPlaying] = useState(false)

  const [localStart, setLocalStart] = useState(start)

  const clipRef = useRef(null)
  const clipContainerRef = useRef(null)
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

  const isClipLooping = clip?.id && loopState?.clips?.[clip.id]?.enabled || false
  const clipLoopData = clip?.id ? loopState?.clips?.[clip.id] : null

  const loopVisual = clipLoopData?.visual || 'arrow'
  const loopColor = clipLoopData?.arrowColor || '#22c55e'
  const loopEnd = clipLoopData?.end || totalDuration
  const loopMode = clipLoopData?.loopMode || 'endOfTrack'

  const clipEndPosition = clipWidth
  const loopEndRelativePosition = Math.max(0, (loopEnd - start) * pixelsPerSecond)
  const loopWidth = Math.max(0, loopEndRelativePosition - clipEndPosition)

  const cycleCount = clipLoopData?.cycleCount || 1
  const totalCycles = clipLoopData?.totalCycles || 1

  useEffect(() => {
    dragStartTimeRef.current = start

    if (!isDragging && localStart !== start) {
      setLocalStart(start)
    }
  }, [start, isDragging, localStart])

  useEffect(() => {
    setIsClipPlaying(isPlaying && currentTime >= start && currentTime <= start + duration)
  }, [isPlaying, currentTime, start, duration])

  const playheadPosition = Math.max(0, Math.min((currentTime - start) * pixelsPerSecond, clipWidth - 2))

  // ✅ FIX : on passe trackId en 3ème argument pour que Editor.jsx puisse le propager
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onContextMenu) {
      onContextMenu(e, clip.id, trackId)
    }
  }, [clip.id, trackId, onContextMenu])

  const handleMouseDown = (e) => {
    if (e.button !== 0) return

    const target = e.target

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

  const renderLoopOverlay = () => {
    if (!isClipLooping) return null
    if (loopWidth <= 0) return null

    const loopStart = clipWidth

    return (
      <div
        ref={clipContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: loopStart,
          width: loopWidth,
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
          background: `linear-gradient(90deg, ${loopColor}15, ${loopColor}05)`,
          borderLeft: `2px dashed ${loopColor}50`,
          borderRight: `2px solid ${loopColor}`,
          borderRadius: '0 4px 4px 0',
        }}
      >
        <div style={{
          position: 'absolute',
          right: -2,
          top: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: 34,
            fontWeight: 900,
            color: loopColor,
            opacity: 0.9,
            textShadow: `0 0 20px ${loopColor}60, 0 0 40px ${loopColor}30`,
            lineHeight: 1,
          }}>
            ]
          </span>
        </div>

        <div style={{
          position: 'absolute',
          right: -2,
          bottom: 4,
          fontSize: 7,
          fontWeight: 600,
          color: loopColor,
          opacity: 0.7,
          background: 'rgba(0,0,0,0.8)',
          padding: '2px 8px',
          borderRadius: 3,
          border: `1px solid ${loopColor}40`,
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          pointerEvents: 'none'
        }}>
          FIN {(loopWidth / pixelsPerSecond).toFixed(1)}s
        </div>

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: loopWidth,
            height: 2,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `repeating-linear-gradient(90deg, ${loopColor}, ${loopColor} 6px, transparent 6px, transparent 12px)`,
            opacity: 0.4,
          }} />

          <div style={{
            position: 'absolute',
            right: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 0,
            height: 0,
            borderLeft: `6px solid ${loopColor}`,
            borderTop: '4px solid transparent',
            borderBottom: '4px solid transparent',
            opacity: 0.6
          }} />
        </div>

        <div style={{
          position: 'absolute',
          top: -24,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 8,
          fontWeight: 600,
          color: loopColor,
          background: 'rgba(0,0,0,0.9)',
          padding: '2px 12px',
          borderRadius: 4,
          border: `1px solid ${loopColor}`,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
          zIndex: 6
        }}>
          <span>🔁 LOOP</span>
          {loopMode === 'cycles' && totalCycles > 1 && (
            <span style={{
              fontSize: 7,
              opacity: 0.7,
              background: 'rgba(255,255,255,0.1)',
              padding: '0 6px',
              borderRadius: 2
            }}>
              {totalCycles}x
            </span>
          )}
          {loopMode === 'manualDuration' && (
            <span style={{
              fontSize: 7,
              opacity: 0.7,
              fontFamily: 'monospace'
            }}>
              {(loopWidth / pixelsPerSecond).toFixed(1)}s
            </span>
          )}
          <span style={{
            fontSize: 7,
            opacity: 0.5,
            fontFamily: 'monospace',
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            paddingLeft: 6
          }}>
            +{(loopWidth / pixelsPerSecond).toFixed(1)}s
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={clipRef}
      data-testid="editor-clip"
      data-clip-id={clip.id}
      data-track-id={trackId}
      className="editor-clip-wrapper"
      style={{
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: clipLeft,
        width: clipWidth,
        minWidth: 10,
        background: getClipColor(trackColor),
        border: `2px solid ${isSelected ? 'var(--accent)' : isClipLooping ? 'var(--success)' : trackColor}`,
        borderRadius: 6,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'border-color 0.15s, box-shadow 0.15s, left 0.05s ease',
        boxShadow: isSelected ? '0 0 20px rgba(124,111,247,0.3)' : isClipLooping ? '0 0 15px rgba(34,197,94,0.2)' : 'none',
        zIndex: isDragging ? 10 : isSelected ? 3 : 2,
        opacity: isDragging ? 0.8 : 1,
        overflow: 'visible',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {renderLoopOverlay()}

      {isClipLooping && (
        <div style={{
          position: 'absolute',
          top: 2,
          left: 4,
          zIndex: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(0,0,0,0.8)',
          padding: '1px 8px 1px 4px',
          borderRadius: 3,
          pointerEvents: 'none',
          border: `1px solid ${loopColor}40`
        }}>
          <span style={{ fontSize: 10 }}>🔁</span>
          <span style={{
            fontSize: 7,
            fontWeight: 600,
            color: 'var(--success)'
          }}>
            LOOP
          </span>
          {loopMode === 'cycles' && totalCycles > 1 && (
            <span style={{
              fontSize: 7,
              color: 'var(--text-tertiary)',
              opacity: 0.7
            }}>
              {totalCycles}x
            </span>
          )}
          <span style={{
            fontSize: 7,
            color: 'var(--text-tertiary)',
            opacity: 0.5,
            fontFamily: 'monospace'
          }}>
            → {loopEnd.toFixed(1)}s
          </span>
        </div>
      )}

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
        {isClipLooping && (
          <span style={{
            marginLeft: 4,
            fontSize: 7,
            color: 'var(--success)',
            opacity: 0.8
          }}>
            🔁
          </span>
        )}
        {isClipLooping && loopMode === 'cycles' && totalCycles > 1 && (
          <span style={{
            marginLeft: 4,
            fontSize: 7,
            color: 'var(--text-tertiary)',
            opacity: 0.6
          }}>
            {totalCycles}x
          </span>
        )}
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