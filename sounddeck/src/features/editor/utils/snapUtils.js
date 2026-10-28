/**
 * @file Snap target calculation for the timeline.
 *
 * Given a clip being dragged (start position + duration), computes the
 * closest snap target among:
 * - **Timeline edges** — 0 and `totalDuration`.
 * - **Other clips** — their start and end edges.
 * - **Markers** — their `time`.
 * - **Playhead** — the current playhead position (if > 0).
 * - **Grid** — a zoom-adaptive grid (1s / 0.5s / 0.25s / 0.1s).
 *
 * Each candidate can snap the **start** of the clip or its **end**. The
 * closest of the two wins (within `snapThresholdPx`, converted to seconds
 * via `pixelsPerSecond`).
 *
 * @see ./timeUtils.js (`getPixelsPerSecond`)
 */

/**
 * Computes the snap target for a clip being dragged.
 *
 * @param {Object} options
 * @param {number} options.proposedStart - Proposed start position (s).
 * @param {number} options.clipDuration - Duration of the clip being dragged.
 * @param {string} options.clipId - ID of the clip being dragged (excluded from candidates).
 * @param {Array<{id: string, start: number, duration?: number}>} [options.allClips]
 * @param {Array<{id: string, time: number}>} [options.markers]
 * @param {number} [options.playhead=0]
 * @param {number} [options.totalDuration=0]
 * @param {number} [options.pixelsPerSecond=80]
 * @param {number} [options.snapThresholdPx=10]
 * @param {boolean} [options.useGrid=true]
 * @returns {{
 *   start: number,
 *   snappedTo: number|null,
 *   edge: 'start'|'end'|null,
 *   type: string|null,
 * }} Where `type` is `'clip-start' | 'clip-end' | 'marker' | 'playhead' | 'grid' | 'timeline'`.
 */
export function computeSnapTarget({
  proposedStart,
  clipDuration,
  clipId,
  allClips,
  markers,
  playhead,
  totalDuration,
  pixelsPerSecond,
  snapThresholdPx = 10,
  useGrid = true,
}) {
  const threshold = snapThresholdPx / pixelsPerSecond
  const proposedEnd = proposedStart + clipDuration

  // ─── Build the candidate list ────────────────────────────────────────
  const targets = []

  // Timeline edges
  targets.push({ time: 0, type: 'timeline' })
  if (totalDuration > 0) {
    targets.push({ time: totalDuration, type: 'timeline' })
  }

  // Other clips (start and end edges)
  if (allClips) {
    for (const c of allClips) {
      if (c.id === clipId) continue
      targets.push({ time: c.start, type: 'clip-start' })
      targets.push({ time: c.start + (c.duration || 0), type: 'clip-end' })
    }
  }

  // Markers
  if (markers) {
    for (const m of markers) {
      targets.push({ time: m.time, type: 'marker' })
    }
  }

  // Playhead (skip if at 0 to avoid competing with timeline-start)
  if (playhead > 0.01) {
    targets.push({ time: playhead, type: 'playhead' })
  }

  // Zoom-adaptive grid
  if (useGrid) {
    let gridStep = 1
    if (pixelsPerSecond > 200) gridStep = 0.1
    else if (pixelsPerSecond > 100) gridStep = 0.25
    else if (pixelsPerSecond > 50) gridStep = 0.5
    else gridStep = 1

    const gridStart = Math.round(proposedStart / gridStep) * gridStep
    targets.push({ time: gridStart, type: 'grid' })
  }

  // ─── Best candidate for the START edge ───────────────────────────────
  let bestStartTarget = null
  let bestStartDist = Infinity
  for (const t of targets) {
    const dist = Math.abs(t.time - proposedStart)
    if (dist <= threshold && dist < bestStartDist) {
      bestStartDist = dist
      bestStartTarget = t
    }
  }

  // ─── Best candidate for the END edge ─────────────────────────────────
  let bestEndTarget = null
  let bestEndDist = Infinity
  for (const t of targets) {
    const dist = Math.abs(t.time - proposedEnd)
    if (dist <= threshold && dist < bestEndDist) {
      bestEndDist = dist
      bestEndTarget = t
    }
  }

  // ─── Pick the closest of the two ─────────────────────────────────────
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