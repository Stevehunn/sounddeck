// src/pages/editor/utils/index.js

// ✅ playb ackEngine supprimé - remplacé par les hooks Web Audio API

// Utilitaires divers
export const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const getClipById = (tracks, clipId) => {
  for (const track of tracks) {
    const clip = track.clips.find(c => c.id === clipId)
    if (clip) return clip
  }
  return null
}

export const getTrackById = (tracks, trackId) => {
  return tracks.find(t => t.id === trackId) || null
}

export const getTrackIndex = (tracks, trackId) => {
  return tracks.findIndex(t => t.id === trackId)
}

export const generateTrackColor = (index) => {
  return `hsl(${(index * 30 + 200) % 360}, 60%, 50%)`
}