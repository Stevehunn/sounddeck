export function getSnapStep(zoomLevel) {
  if (zoomLevel < 0.08) return 60
  if (zoomLevel < 0.15) return 30
  if (zoomLevel < 0.3) return 10
  if (zoomLevel < 0.6) return 5
  if (zoomLevel < 1.5) return 1
  if (zoomLevel < 3) return 0.5
  return 0.1
}

export function snapTime(time, track, clipId, clipDurations, pixelsPerSecond, snapEnabled) {
  if (!snapEnabled) return time

  const step = getSnapStep(pixelsPerSecond / 80)
  let best = Math.round(time / step) * step
  let bestDist = Math.abs(time - best)

  const thresholdSeconds = 8 / pixelsPerSecond
  
  if (track) {
    const edges = track.clips
      .filter(c => c.id !== clipId)
      .flatMap(c => {
        const dur = clipDurations?.[c.id] || c.duration || 3
        return [c.start, c.start + dur]
      })
    
    for (const edge of edges) {
      const dist = Math.abs(time - edge)
      if (dist < bestDist) {
        best = edge
        bestDist = dist
      }
    }
  }

  return bestDist <= thresholdSeconds ? best : Math.round(time / step) * step
}

export function snapPosition(position, step, snapEnabled) {
  if (!snapEnabled) return position
  return Math.round(position / step) * step
}

export default {
  getSnapStep,
  snapTime,
  snapPosition
}