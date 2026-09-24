// src/features/editor/components/Timeline/useClipIndex.js
import { useMemo } from 'react'

/**
 * Construit un index Map<clipId, {clip, track, start, duration}> pour
 * des lookups O(1). Remplace les boucles imbriquées dans renderLoopMarkers.
 *
 * @param {Array} tracks
 * @param {Object} clipDurations - { [clipId]: number }
 * @returns {Map}
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
          duration: clipDurations?.[clip.id] || clip.duration || 3,
        })
      }
    }
    return map
  }, [tracks, clipDurations])
}

export default useClipIndex