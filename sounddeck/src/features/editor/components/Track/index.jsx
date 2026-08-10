// src/features/editor/components/Track/index.jsx
import React, { useState, useRef, useCallback, memo } from 'react'
import EditorClip from '../Clip'

const EditorTrack = memo(({
  track,
  trackIndex,
  totalDuration,
  pixelsPerSecond,
  selectedClipId,
  selectedTrackId,
  onClipSelect,
  onClipMove,
  onClipUpdate,
  onClipRemove,
  onClipDuplicate,
  onClipFade,
  onClipContextMenu,
  onDragCheckpoint,
  waveformData,
  isPlaying,
  currentTime,
  clipDurations,
  onUpdateClipDuration,
  trackColor,
  snapEnabled,  // ✅ AJOUTÉ
  tr,
  onPlayClip,
  onStopClip,
  onCopyClip,
  onCutClip,
  onPasteClip,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragClipId, setDragClipId] = useState(null)
  const [dragStartTime, setDragStartTime] = useState(0)
  
  const trackRef = useRef(null)

  // Utiliser trackColor s'il est fourni, sinon générer
  const getTrackColor = useCallback((index) => {
    if (trackColor) return trackColor
    const colors = [
      'hsl(220, 70%, 55%)',
      'hsl(340, 70%, 55%)',
      'hsl(40, 70%, 55%)',
      'hsl(160, 70%, 55%)',
      'hsl(280, 70%, 55%)',
      'hsl(10, 70%, 55%)',
      'hsl(190, 70%, 55%)',
      'hsl(70, 70%, 55%)'
    ]
    return colors[index % colors.length]
  }, [trackColor])

  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const time = Math.max(0, x / pixelsPerSecond)
    
    setIsDragging(true)
    setDragStartX(e.clientX)
    setDragClipId(null)
    setDragStartTime(time)
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const time = Math.max(0, x / pixelsPerSecond)
    
    if (dragClipId) {
      onClipMove?.(track.id, dragClipId, time - dragStartTime, track.id)
    }
  }, [isDragging, dragClipId, dragStartTime, track.id, onClipMove, pixelsPerSecond])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      onDragCheckpoint?.()
    }
  }, [isDragging, onDragCheckpoint])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const color = getTrackColor(trackIndex)

  // Handlers avec ordre correct (clipId, trackId)
  const handleClipSelect = useCallback((clipId) => {
    console.log('🎯 [Track] handleClipSelect:', clipId)
    onClipSelect?.(clipId, track.id)
  }, [onClipSelect, track.id])

  const handleClipMove = useCallback((clipId, newStart, newTrackId) => {
    console.log('🔄 [Track] handleClipMove:', { clipId, newStart, newTrackId })
    onClipMove?.(track.id, clipId, newStart, newTrackId)
  }, [onClipMove, track.id])

  const handleClipUpdate = useCallback((clipId, updates) => {
    console.log('✏️ [Track] handleClipUpdate:', { clipId, updates })
    onClipUpdate?.(track.id, clipId, updates)
  }, [onClipUpdate, track.id])

  const handleClipRemove = useCallback((clipId) => {
    console.log('🗑️ [Track] handleClipRemove:', clipId)
    onClipRemove?.(clipId, track.id)
  }, [onClipRemove, track.id])

  const handleClipDuplicate = useCallback((clipId) => {
    console.log('📋 [Track] handleClipDuplicate:', clipId)
    onClipDuplicate?.(clipId, track.id)
  }, [onClipDuplicate, track.id])

  const handleClipFade = useCallback((clipId, edge, duration) => {
    console.log('🌊 [Track] handleClipFade:', { clipId, edge, duration })
    onClipFade?.(track.id, clipId, edge, duration)
  }, [onClipFade, track.id])

  const handleUpdateClipDuration = useCallback((clipId, newDuration) => {
    console.log('📏 [Track] handleUpdateClipDuration:', { clipId, newDuration })
    onUpdateClipDuration?.(clipId, newDuration)
  }, [onUpdateClipDuration])

  return (
    <div
      ref={trackRef}
      style={{
        position: 'relative',
        height: 80,
        minHeight: 80,
        width: '100%',
        borderBottom: '1px solid var(--border)',
        background: selectedTrackId === track.id ? 'rgba(124,111,247,0.05)' : 'transparent',
        userSelect: 'none',
        transition: 'background 0.15s'
      }}
      onMouseDown={handleMouseDown}
    >
      {track.clips?.map((clip) => {
        const duration = clipDurations?.[clip.id] || clip.duration || 3
        const clipStart = clip.start || 0
        const isSelected = selectedClipId === clip.id

        return (
          <EditorClip
            key={clip.id}
            clip={clip}
            duration={duration}
            start={clipStart}
            trackId={track.id}
            trackColor={color}
            isSelected={isSelected}
            pixelsPerSecond={pixelsPerSecond}
            snapEnabled={snapEnabled}  // ✅ AJOUTÉ
            onSelect={handleClipSelect}
            onMove={handleClipMove}
            onUpdate={handleClipUpdate}
            onRemove={handleClipRemove}
            onDuplicate={handleClipDuplicate}
            onFade={handleClipFade}
            onContextMenu={(e) => {
              onClipContextMenu?.(e, track.id, clip.id)
            }}
            onUpdateDuration={handleUpdateClipDuration}
            waveformData={waveformData?.[clip.id]}
            isPlaying={isPlaying}
            currentTime={currentTime}
            tr={tr}
            onPlayClip={onPlayClip}
            onStopClip={onStopClip}
            onCopyClip={onCopyClip}
            onCutClip={onCutClip}
            onPasteClip={onPasteClip}
          />
        )
      })}
    </div>
  )
})

EditorTrack.displayName = 'EditorTrack'

export default EditorTrack