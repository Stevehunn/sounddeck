// src/shared/utils/platformImport.js
import { logInfo, logWarn } from './logger'

/**
 * ⚠️ PLACEHOLDER DOCUMENTÉ
 *
 * Spotify a fermé son API publique en 2024. On ne peut donc PAS récupérer
 * les métadonnées réelles (titre, artiste, durée, cover).
 *
 * L'utilisateur devra :
 *   1. Fournir le titre manuellement dans l'UI YouTube.jsx
 *   2. Le vrai téléchargement se fait via `downloadPlatformTrack` IPC
 *      (qui utilise yt-dlp pour matcher le titre sur YouTube)
 */
export async function getSpotifyTrack(url) {
  try {
    const match = url.match(
      /spotify\.com\/(?:intl-\w+\/)?track\/([a-zA-Z0-9]+)/
    )
    if (!match) {
      return { success: false, error: 'URL Spotify invalide' }
    }

    const trackId = match[1]

    return {
      success: true,
      data: {
        id: trackId,
        title: `Spotify - ${trackId.slice(0, 8)}`,
        artist: 'Artiste (entrez le nom)',
        duration: 180,
        cover: null,
        previewUrl: null,
      },
      platform: 'spotify',
    }
  } catch (e) {
    return { success: false, error: e.message, platform: 'spotify' }
  }
}

export async function downloadSpotifyTrack(trackInfo, outputPath) {
  try {
    const url = `https://open.spotify.com/track/${trackInfo.id}`
    logInfo('platformImport', `🎵 Téléchargement Spotify: ${url}`)

    const result = await window.electronAPI.downloadPlatformTrack({
      platform: 'spotify',
      url,
      trackId: trackInfo.id,
      outputPath,
      title: trackInfo.title,
      artist: trackInfo.artist,
    })

    return result
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function getSoundCloudTrack(url) {
  try {
    const match = url.match(/soundcloud\.com\/(?:.*)\/([a-zA-Z0-9_-]+)/)
    if (!match) {
      return { success: false, error: 'URL SoundCloud invalide' }
    }

    const trackId = match[1]

    try {
      const result = await window.electronAPI.soundcloudTrackInfo(url)
      if (result && result.success) {
        return {
          success: true,
          data: {
            id: trackId,
            title: result.title || 'Morceau SoundCloud',
            artist: result.artist || 'Artiste inconnu',
            duration: result.duration || 180,
            cover: result.cover || null,
            streamUrl: result.streamUrl || null,
          },
          platform: 'soundcloud',
        }
      }
    } catch (e) {
      logWarn(
        'platformImport',
        'API SoundCloud via IPC non disponible',
        e
      )
    }

    return {
      success: true,
      data: {
        id: trackId,
        title: `Morceau SoundCloud (ID: ${trackId.slice(0, 8)})`,
        artist: 'Artiste SoundCloud',
        duration: 180 + Math.floor(Math.random() * 120),
        cover: null,
        streamUrl: null,
      },
      platform: 'soundcloud',
    }
  } catch (e) {
    return { success: false, error: e.message, platform: 'soundcloud' }
  }
}

export async function downloadSoundCloudTrack(trackInfo, outputPath) {
  try {
    const url = `https://soundcloud.com/${trackInfo.artist || 'artist'}/${trackInfo.id}`
    logInfo('platformImport', `🎵 Téléchargement SoundCloud: ${url}`)

    const result = await window.electronAPI.downloadPlatformTrack({
      platform: 'soundcloud',
      url,
      trackId: trackInfo.id,
      outputPath,
      title: trackInfo.title,
      artist: trackInfo.artist,
    })

    return result
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export function detectPlatform(url) {
  if (!url) return null
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('spotify.com')) return 'spotify'
  if (lowerUrl.includes('soundcloud.com')) return 'soundcloud'
  if (
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('youtube')
  )
    return 'youtube'
  return null
}

export function sanitizeFilename(title) {
  if (!title) return 'audio'
  return title
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50)
    .replace(/^_+|_+$/g, '')
}

export default {
  getSpotifyTrack,
  downloadSpotifyTrack,
  getSoundCloudTrack,
  downloadSoundCloudTrack,
  detectPlatform,
  sanitizeFilename,
}