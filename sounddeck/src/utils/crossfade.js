const CROSSFADE_DURATION = 0.1

export function detectOverlaps(clips, clipDurations) {
  const overlaps = []
  const sorted = [...clips].sort((a, b) => a.start - b.start)
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    
    const currentEnd = current.start + (clipDurations[current.id] || current.duration || 3)
    
    if (currentEnd > next.start) {
      const overlapDuration = Math.min(
        currentEnd - next.start,
        CROSSFADE_DURATION
      )
      
      if (overlapDuration > 0.01) {
        overlaps.push({
          clip1: current,
          clip2: next,
          overlapDuration,
          fadeOut: Math.min(overlapDuration, 0.1),
          fadeIn: Math.min(overlapDuration, 0.1)
        })
      }
    }
  }
  
  return overlaps
}

export function applyCrossfadeToClips(clips, clipDurations, onUpdate) {
  const overlaps = detectOverlaps(clips, clipDurations)
  
  for (const overlap of overlaps) {
    const clip1 = overlap.clip1
    const clip2 = overlap.clip2
    
    const existingFadeOut = clip1.effects?.find(e => e.type === 'fadeOut')
    const existingFadeIn = clip2.effects?.find(e => e.type === 'fadeIn')
    
    if (!existingFadeOut || existingFadeOut.params.duration < overlap.fadeOut) {
      onUpdate(clip1.id, {
        effects: [
          ...(clip1.effects?.filter(e => e.type !== 'fadeOut') || []),
          {
            id: `effect-${Date.now()}-fadeout`,
            type: 'fadeOut',
            params: { duration: overlap.fadeOut },
            enabled: true
          }
        ]
      })
    }
    
    if (!existingFadeIn || existingFadeIn.params.duration < overlap.fadeIn) {
      onUpdate(clip2.id, {
        effects: [
          ...(clip2.effects?.filter(e => e.type !== 'fadeIn') || []),
          {
            id: `effect-${Date.now()}-fadein`,
            type: 'fadeIn',
            params: { duration: overlap.fadeIn },
            enabled: true
          }
        ]
      })
    }
  }
  
  return overlaps
}

export function getCrossfadeDuration(clips, clipDurations) {
  const overlaps = detectOverlaps(clips, clipDurations)
  if (overlaps.length === 0) return 0
  return Math.max(...overlaps.map(o => o.overlapDuration))
}

export default {
  detectOverlaps,
  applyCrossfadeToClips,
  getCrossfadeDuration
}