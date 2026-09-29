import { describe, it, expect } from 'vitest'
import { computeSnapTarget } from '@features/editor/utils/snapUtils'

// ─── HELPERS ──────────────────────────────────────────────────────────
// pixelsPerSecond=100 + snapThresholdPx=10 → seuil = 0.1 seconde
const PPS = 100
const THRESHOLD_PX = 10

const baseArgs = {
  pixelsPerSecond: PPS,
  snapThresholdPx: THRESHOLD_PX,
  totalDuration: 20,
  allClips: [],
  markers: [],
  playhead: 0,
  useGrid: false,
}

describe('computeSnapTarget', () => {
  // ─── AUCUN SNAP ──────────────────────────────────────────────────────

  it('ne devrait rien snapper si aucune cible n\'est assez proche', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      proposedStart: 5,
      clipDuration: 3,
      clipId: 'myclip',
    })

    expect(result.start).toBe(5)
    expect(result.snappedTo).toBeNull()
    expect(result.edge).toBeNull()
    expect(result.type).toBeNull()
  })

  // ─── TIMELINE ────────────────────────────────────────────────────────

  it('devrait snapper le START au début de la timeline (0)', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      proposedStart: 0.05,
      clipDuration: 3,
      clipId: 'myclip',
    })

    expect(result.start).toBe(0)
    expect(result.edge).toBe('start')
    expect(result.type).toBe('timeline')
  })

  it('devrait snapper le END à la fin de la timeline', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      proposedStart: 16.95, // END = 19.95 → à 0.05 de 20
      clipDuration: 3,
      clipId: 'myclip',
    })

    expect(result.start).toBe(17) // 20 - 3
    expect(result.snappedTo).toBe(20)
    expect(result.edge).toBe('end')
    expect(result.type).toBe('timeline')
  })

  // ─── AUTRES CLIPS ────────────────────────────────────────────────────

  it('devrait snapper le START au clip-start d\'un autre clip', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      allClips: [{ id: 'other', start: 10, duration: 2 }],
      proposedStart: 10.05,
      clipDuration: 1.5,
      clipId: 'myclip',
    })

    expect(result.start).toBe(10)
    expect(result.edge).toBe('start')
    expect(result.type).toBe('clip-start')
  })

  it('devrait snapper le END au clip-end d\'un autre clip', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      allClips: [{ id: 'other', start: 10, duration: 2 }], // clip-end = 12
      proposedStart: 10.5,
      clipDuration: 1.45, // END = 11.95 → à 0.05 de 12
      clipId: 'myclip',
    })

    expect(result.start).toBeCloseTo(10.55, 5)
    expect(result.snappedTo).toBe(12)
    expect(result.edge).toBe('end')
    expect(result.type).toBe('clip-end')
  })

  // ─── MARQUEURS ───────────────────────────────────────────────────────

  it('devrait snapper au marqueur le plus proche', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      markers: [{ id: 'm1', time: 7 }],
      proposedStart: 7.03,
      clipDuration: 2,
      clipId: 'myclip',
    })

    expect(result.start).toBe(7)
    expect(result.edge).toBe('start')
    expect(result.type).toBe('marker')
  })

  // ─── PLAYHEAD ────────────────────────────────────────────────────────

  it('devrait snapper au playhead', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      playhead: 12,
      proposedStart: 12.05,
      clipDuration: 2,
      clipId: 'myclip',
    })

    expect(result.start).toBe(12)
    expect(result.edge).toBe('start')
    expect(result.type).toBe('playhead')
  })

  // ─── GRILLE ──────────────────────────────────────────────────────────

  it('devrait snapper à la grille (0.5s pour pixelsPerSecond=100)', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      useGrid: true,
      proposedStart: 5.05,
      clipDuration: 1,
      clipId: 'myclip',
    })

    expect(result.start).toBe(5)
    expect(result.edge).toBe('start')
    expect(result.type).toBe('grid')
  })

  // ─── PRIORITÉ START vs END ───────────────────────────────────────────

  it('devrait privilégier le START quand il est plus proche que le END', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      allClips: [
        { id: 'a', start: 5.05, duration: 0.5 }, // clip-start = 5.05
        { id: 'b', start: 6.08, duration: 1 },   // clip-start = 6.08
      ],
      proposedStart: 5,     // START à 0.05 de 5.05
      clipDuration: 1,      // END = 6 → à 0.08 de 6.08
      clipId: 'myclip',
    })

    expect(result.edge).toBe('start')
    expect(result.snappedTo).toBe(5.05)
  })

  it('devrait privilégier le END quand il est plus proche que le START', () => {
    const result = computeSnapTarget({
      ...baseArgs,
      allClips: [
        { id: 'a', start: 5.08, duration: 1 },  // clip-start = 5.08
        { id: 'b', start: 6.05, duration: 1 },  // clip-start = 6.05
      ],
      proposedStart: 5,     // START à 0.08 de 5.08
      clipDuration: 1,      // END = 6 → à 0.05 de 6.05
      clipId: 'myclip',
    })

    expect(result.edge).toBe('end')
    expect(result.snappedTo).toBe(6.05)
    expect(result.start).toBeCloseTo(5.05, 5) // 6.05 - 1
  })
})