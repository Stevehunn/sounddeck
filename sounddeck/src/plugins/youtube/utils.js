// src/plugins/youtube/utils.js

/**
 * Formate une durée en secondes → "M:SS"
 */
export function formatDuration(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}