/**
 * @file Memoized Map<clipId, {clip, track, start, duration}> builder.
 *
 * Replaces the O(n²) loop inside `renderLoopMarkers` (looping through every
 * track to find every clip). With this index, loop-marker rendering is
 * O(loops) instead of O(tracks × clips).
 *
 * The map is rebuilt only when `tracks` or `clipDurations` change
 * (`useMemo`), so per-frame renders stay cheap.
 *
 * @see ../Timeline/index.jsx
 * @see ./TimelineLoopMarkers.jsx
 */

import { useMemo } from 'react'

/** Default clip duration (seconds) when no data is available. */
const DEFAULT_CLIP_DURATION = 3

/**
 * Builds an O(1) lookup map for every clip in the project.
 *
 * Entry shape: `{ clip, track, start, duration }` where `duration` falls
 * back to `clipDurations[clip.id]`, then `clip.duration`, then
 * `DEFAULT_CLIP_DURATION`.
 *
 * @param {Array<{id: string, clips?: Array}>|null} tracks
 * @param {Object<string, number>} [clipDurations]
 * @returns {Map<string, {clip: Object, track: Object, start: number, duration: number}>}
 */
export function useClipIndex(tracks, clipDurations) {
  return useMemo(() => {
    const map = new Map()
    if (!tracks) return map

    for (const track of tracks) {
      if (!track.clips) continue
      for (const clip of track.clips) {
        map.set(clip.id, {
          clip,
          track,
          start: clip.start || 0,
          duration:
            clipDurations?.[clip.id] || clip.duration || DEFAULT_CLIP_DURATION,
        })
      }
    }
    return map
  }, [tracks, clipDurations])
}

export default useClipIndex