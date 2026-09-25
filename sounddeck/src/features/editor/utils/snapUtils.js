// src/features/editor/utils/snapUtils.js

/**
 * Calcule la cible de snap la plus proche pour un clip en cours de drag.
 *
 * Teste 2 candidats :
 *   - l'aimantation du START du clip à une cible
 *   - l'aimantation du END du clip à une cible
 * Et retourne le plus proche des deux (si sous le seuil).
 *
 * @returns {{
 *   start: number,        // nouvelle position start
 *   snappedTo: number|null, // position temporelle de la cible
 *   edge: 'start'|'end'|null,
 *   type: string|null,    // 'clip-start' | 'clip-end' | 'marker' | 'playhead' | 'grid' | 'timeline'
 * }}
 */
export function computeSnapTarget({
  proposedStart,
  clipDuration,
  clipId,
  allClips,            // [{ id, start, duration }]
  markers,             // [{ id, time }]
  playhead,            // currentTime
  totalDuration,
  pixelsPerSecond,
  snapThresholdPx = 10,  // seuil en pixels (visuel)
  useGrid = true,
}) {
  const threshold = snapThresholdPx / pixelsPerSecond
  const proposedEnd = proposedStart + clipDuration

  // Construit la liste des cibles
  const targets = []

  // Début/fin timeline
  targets.push({ time: 0, type: 'timeline' })
  if (totalDuration > 0) {
    targets.push({ time: totalDuration, type: 'timeline' })
  }

  // Bords des autres clips
  if (allClips) {
    for (const c of allClips) {
      if (c.id === clipId) continue
      targets.push({ time: c.start, type: 'clip-start' })
      targets.push({ time: c.start + (c.duration || 0), type: 'clip-end' })
    }
  }

  // Marqueurs
  if (markers) {
    for (const m of markers) {
      targets.push({ time: m.time, type: 'marker' })
    }
  }

  // Playhead (si > 0)
  if (playhead > 0.01) {
    targets.push({ time: playhead, type: 'playhead' })
  }

  // Grille (adaptée au zoom)
  if (useGrid) {
    let gridStep = 1
    if (pixelsPerSecond > 200) gridStep = 0.1
    else if (pixelsPerSecond > 100) gridStep = 0.25
    else if (pixelsPerSecond > 50) gridStep = 0.5
    else gridStep = 1

    const gridStart = Math.round(proposedStart / gridStep) * gridStep
    targets.push({ time: gridStart, type: 'grid' })
  }

  // Cherche la meilleure cible pour START
  let bestStartTarget = null
  let bestStartDist = Infinity
  for (const t of targets) {
    const dist = Math.abs(t.time - proposedStart)
    if (dist <= threshold && dist < bestStartDist) {
      bestStartDist = dist
      bestStartTarget = t
    }
  }

  // Cherche la meilleure cible pour END
  let bestEndTarget = null
  let bestEndDist = Infinity
  for (const t of targets) {
    const dist = Math.abs(t.time - proposedEnd)
    if (dist <= threshold && dist < bestEndDist) {
      bestEndDist = dist
      bestEndTarget = t
    }
  }

  // Priorité au plus proche des deux
  if (bestStartTarget && (!bestEndTarget || bestStartDist <= bestEndDist)) {
    return {
      start: bestStartTarget.time,
      snappedTo: bestStartTarget.time,
      edge: 'start',
      type: bestStartTarget.type,
    }
  }

  if (bestEndTarget) {
    return {
      start: bestEndTarget.time - clipDuration,
      snappedTo: bestEndTarget.time,
      edge: 'end',
      type: bestEndTarget.type,
    }
  }

  return { start: proposedStart, snappedTo: null, edge: null, type: null }
}

export default { computeSnapTarget }