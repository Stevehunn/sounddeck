/**
 * @file Track color palette for the editor.
 *
 * Uses pre-defined HSL hues (evenly spaced ~120° apart, offset to avoid
 * the "danger red" range) so adjacent tracks are always visually distinct.
 * Falls back to `generateTrackColor` in `./index.js` for custom indices
 * outside the palette.
 */

/**
 * Fixed color palette. Cycles via `getTrackColor()`.
 * @type {string[]}
 */
export const TRACK_COLORS = [
  'hsl(220, 70%, 55%)',
  'hsl(340, 70%, 55%)',
  'hsl(40, 70%, 55%)',
  'hsl(160, 70%, 55%)',
  'hsl(280, 70%, 55%)',
  'hsl(10, 70%, 55%)',
  'hsl(190, 70%, 55%)',
  'hsl(70, 70%, 55%)',
]

/**
 * Returns the palette color for the given track index (modulo palette length).
 *
 * @param {number} index
 * @returns {string}
 */
export function getTrackColor(index) {
  return TRACK_COLORS[index % TRACK_COLORS.length]
}

export default { TRACK_COLORS, getTrackColor }