// src/pages/editor/utils/index.js
import { formatTime as sharedFormatTime } from '@shared/utils/format'

export const formatTime = (seconds) =>
  sharedFormatTime(seconds, { alwaysMMSS: true })

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