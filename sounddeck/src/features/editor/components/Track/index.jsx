// src/features/editor/components/Track/index.jsx

import React, { useMemo, useCallback } from 'react'
import EditorClip from '../Clip'
import { TRACK_COLORS, getTrackColor } from '../../utils/trackColors'

const EditorTrack = ({
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
  snapEnabled,
  tr,
  onPlayClip,
  onStopClip,
  onCopyClip,
  onCutClip,
  onPasteClip,
  loopState = {},
}) => {
  const color = useMemo(
    () => trackColor || getTrackColor(trackIndex),
    [trackColor, trackIndex]
  )

  // ✅ Handlers stables (évitent de recréer les fonctions)
  const handleClipSelect = useCallback(
    (clipId) => onClipSelect?.(clipId, track.id),
    [onClipSelect, track.id]
  )

  const handleClipMove = useCallback(
    (clipId, newStart, newTrackId, options) =>
      onClipMove?.(track.id, clipId, newStart, newTrackId, options),
    [onClipMove, track.id]
  )

  const handleClipUpdate = useCallback(
    (clipId, updates) => onClipUpdate?.(track.id, clipId, updates),
    [onClipUpdate, track.id]
  )

  const handleClipRemove = useCallback(
    (trackId, clipId) => onClipRemove?.(trackId, clipId),
    [onClipRemove]
  )

  const handleClipDuplicate = useCallback(
    (clipId) => onClipDuplicate?.(clipId, track.id),
    [onClipDuplicate, track.id]
  )

  const handleClipFade = useCallback(
    (clipId, edge, duration) => onClipFade?.(track.id, clipId, edge, duration),
    [onClipFade, track.id]
  )

  const handleClipContextMenu = useCallback(
    (e, clipId) => {
      if (onClipContextMenu) {
        onClipContextMenu(e, clipId, track.id)
      }
    },
    [onClipContextMenu, track.id]
  )

  return (
    <div
      style={{
        position: 'relative',
        height: 96,
        minHeight: 96,
        width: '100%',
        borderBottom: '1px solid var(--border)',
        background:
          selectedTrackId === track.id ? 'rgba(124,111,247,0.05)' : 'transparent',
        userSelect: 'none',
        transition: 'background 0.15s',
      }}
    >
      {track.clips?.map((clip) => {
        const duration = clipDurations?.[clip.id] || clip.duration || 3
        const clipStart = clip.start || 0
        const isSelected = selectedClipId === clip.id

        return (
          <EditorClip
            // ✅ FIX : la key est juste clip.id — plus de clipVersion / loopStateHash
            // → React préserve l'état interne (isDragging, isHovering, etc.)
            key={clip.id}
            clip={clip}
            duration={duration}
            start={clipStart}
            trackId={track.id}
            trackColor={color}
            isSelected={isSelected}
            pixelsPerSecond={pixelsPerSecond}
            snapEnabled={snapEnabled}
            onSelect={handleClipSelect}
            onMove={handleClipMove}
            onUpdate={handleClipUpdate}
            onRemove={handleClipRemove}
            onDuplicate={handleClipDuplicate}
            onFade={handleClipFade}
            onContextMenu={handleClipContextMenu}
            onUpdateDuration={onUpdateClipDuration}
            waveformData={waveformData?.[clip.id]}
            isPlaying={isPlaying}
            currentTime={currentTime}
            tr={tr}
            onPlayClip={onPlayClip}
            onStopClip={onStopClip}
            onCopyClip={onCopyClip}
            onCutClip={onCutClip}
            onPasteClip={onPasteClip}
            loopState={loopState}
            totalDuration={totalDuration}
          />
        )
      })}
    </div>
  )
}

export default EditorTrack