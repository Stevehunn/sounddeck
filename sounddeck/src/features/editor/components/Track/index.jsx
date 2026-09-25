// src/features/editor/components/Track/index.jsx
import React, { useMemo } from 'react'
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
  snapContext,
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

  const handlers = useMemo(
    () => ({
      onSelect: (clipId) => onClipSelect?.(clipId, track.id),
      onMove: (clipId, newStart, newTrackId, options) =>
        onClipMove?.(track.id, clipId, newStart, newTrackId, options),
      onUpdate: (clipId, updates) => onClipUpdate?.(track.id, clipId, updates),
      onRemove: (trackId, clipId) => onClipRemove?.(trackId, clipId),
      onDuplicate: (clipId) => onClipDuplicate?.(clipId, track.id),
      onFade: (clipId, edge, duration) =>
        onClipFade?.(track.id, clipId, edge, duration),
      onContextMenu: (e, clipId) => {
        if (onClipContextMenu) {
          onClipContextMenu(e, clipId, track.id)
        }
      },
      onUpdateDuration: onUpdateClipDuration,
      onPlayClip,
      onStopClip,
      onCopyClip,
      onCutClip,
      onPasteClip,
    }),
    [
      track.id,
      onClipSelect,
      onClipMove,
      onClipUpdate,
      onClipRemove,
      onClipDuplicate,
      onClipFade,
      onClipContextMenu,
      onUpdateClipDuration,
      onPlayClip,
      onStopClip,
      onCopyClip,
      onCutClip,
      onPasteClip,
    ]
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
          selectedTrackId === track.id
            ? 'rgba(124,111,247,0.05)'
            : 'transparent',
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
            key={clip.id}
            clip={clip}
            layout={{
              start: clipStart,
              duration,
              pixelsPerSecond,
              totalDuration,
              snapEnabled,
            }}
            state={{
              isSelected,
              isPlaying,
              currentTime,
              loopState,
            }}
            handlers={handlers}
            ui={{
              trackId: track.id,
              trackColor: color,
              waveformData: waveformData?.[clip.id],
              tr,
            }}
            snapContext={snapContext}
          />
        )
      })}
    </div>
  )
}

export default EditorTrack