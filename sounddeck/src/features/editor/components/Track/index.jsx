/**
 * @file Track row in the timeline — renders one header (color bar, name,
 * controls) and one `<EditorClip>` per clip on the track.
 *
 * Drag, resize, fade, loop, and action handlers are all delegated to the
 * clip children; this component only wires `handlers` (via `useMemo` so
 * `EditorClip` re-renders don't recreate the callbacks) and `ui` (per-clip
 * waveform + track color).
 *
 * @see ./TrackHeader.jsx
 * @see ./TrackControls.jsx
 * @see ../Clip/index.jsx
 * @see ../../utils/trackColors.js
 */

import { useMemo } from 'react'
import EditorClip from '../Clip'
import { getTrackColor } from '../../utils/trackColors'

/** Default clip duration (seconds) when neither `clipDurations` nor
 *  `clip.duration` is available. */
const DEFAULT_CLIP_DURATION = 3

/**
 * One timeline track row.
 *
 * @param {Object} props
 * @param {{id: string, name?: string, clips: Array<Object>}} props.track
 * @param {number} props.trackIndex - Fallback color index.
 * @param {number} props.totalDuration - Total timeline duration (seconds).
 * @param {number} props.pixelsPerSecond - Horizontal scale (px / s).
 * @param {string|null} props.selectedClipId
 * @param {string|null} props.selectedTrackId
 * @param {Function} [props.onClipSelect]
 * @param {Function} [props.onClipMove]
 * @param {Function} [props.onClipUpdate]
 * @param {Function} [props.onClipRemove]
 * @param {Function} [props.onClipDuplicate]
 * @param {Function} [props.onClipFade]
 * @param {Function} [props.onClipContextMenu]
 * @param {Function} [props.onDragCheckpoint]
 * @param {Object} [props.waveformData] - `{ [clipId]: number[] }`.
 * @param {boolean} props.isPlaying
 * @param {number} props.currentTime
 * @param {Object} [props.clipDurations] - `{ [clipId]: number }`.
 * @param {Function} [props.onUpdateClipDuration]
 * @param {string} [props.trackColor] - Overrides the fallback color.
 * @param {boolean} props.snapEnabled
 * @param {Object} [props.snapContext]
 * @param {(key: string, params?: Object) => string} props.tr
 * @param {Function} [props.onPlayClip]
 * @param {Function} [props.onStopClip]
 * @param {Function} [props.onCopyClip]
 * @param {Function} [props.onCutClip]
 * @param {Function} [props.onPasteClip]
 * @param {Object} [props.loopState]
 * @returns {JSX.Element}
 */
export default function EditorTrack({
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
}) {
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
        const duration =
          clipDurations?.[clip.id] || clip.duration || DEFAULT_CLIP_DURATION
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