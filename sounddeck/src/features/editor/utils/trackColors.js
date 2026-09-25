// src/features/editor/utils/trackColors.js
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

export function getTrackColor(index) {
  return TRACK_COLORS[index % TRACK_COLORS.length]
}

export default { TRACK_COLORS, getTrackColor }