/**
 * @file Spotify / SoundCloud URL parsing + download helpers.
 *
 * ## Spotify
 *
 * Spotify's public API was closed in 2024, so we **cannot** fetch track
 * metadata (title, artist, cover, duration) anymore. The current
 * implementation:
 * - Parses the track ID from the URL.
 * - Returns a placeholder title (`"Spotify - <id>"`).
 * - Relies on `downloadPlatformTrack` (yt-dlp) to find a matching track on
 *   YouTube using the title the user typed.
 *
 * ⚠️ The user must fill in the title manually in the YouTube import UI.
 *
 * ## SoundCloud
 *
 * SoundCloud metadata is fetched via `electronAPI.soundcloudTrackInfo()`.
 * If the IPC is unavailable (e.g. dev without the main process), a
 * placeholder is returned.
 *
 * ## Utility helpers
 *
 * - `detectPlatform(url)` — returns `'spotify'`, `'soundcloud'`, `'youtube'`,
 *   or `null`.
 * - `sanitizeFilename(title)` — safe filename for downloads.
 *
 * User-facing placeholder / error strings are translated via `translate()`.
 *
 * @see src/plugins/youtube/YouTube.jsx
 * @see electron/modules/fileHandlers.js (`downloadPlatformTrack`)
 * @see @shared/utils/translator.js
 */

import { logInfo, logWarn } from './logger'
import { translate } from './translator'

/**
 * Parses a Spotify track URL into a placeholder track object.
 *
 * @param {string} url
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {id: string, title: string, artist: string, duration: number, cover: null, previewUrl: null},
 *   platform: 'spotify',
 *   error?: string,
 * }>}
 */
export async function getSpotifyTrack(url) {
  try {
    const match = url.match(
      /spotify\.com\/(?:intl-\w+\/)?track\/([a-zA-Z0-9]+)/
    )
    if (!match) {
      return { success: false, error: translate('platformErrorInvalidSpotifyUrl') }
    }

    const trackId = match[1]
    const prefix = translate('platformSpotifyPrefix')

    return {
      success: true,
      data: {
        id: trackId,
        title: `${prefix} ${trackId.slice(0, 8)}`,
        artist: translate('platformArtistPlaceholder'),
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

/**
 * Downloads a Spotify track via yt-dlp (matched by title).
 *
 * @param {{id: string, title: string, artist: string}} trackInfo
 * @param {string} outputPath
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function downloadSpotifyTrack(trackInfo, outputPath) {
  try {
    const url = `https://open.spotify.com/track/${trackInfo.id}`
    logInfo('platformImport', `🎵 Downloading Spotify: ${url}`)

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

/**
 * Parses a SoundCloud URL and (optionally) fetches its metadata via IPC.
 *
 * @param {string} url
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {id: string, title: string, artist: string, duration: number, cover: string|null, streamUrl: string|null},
 *   platform: 'soundcloud',
 *   error?: string,
 * }>}
 */
export async function getSoundCloudTrack(url) {
  try {
    const match = url.match(/soundcloud\.com\/(?:.*)\/([a-zA-Z0-9_-]+)/)
    if (!match) {
      return { success: false, error: translate('platformErrorInvalidSoundCloudUrl') }
    }

    const trackId = match[1]

    try {
      const result = await window.electronAPI.soundcloudTrackInfo(url)
      if (result && result.success) {
        return {
          success: true,
          data: {
            id: trackId,
            title: result.title || translate('platformSoundCloudTrack'),
            artist: result.artist || translate('platformUnknownArtist'),
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
        'SoundCloud IPC API unavailable',
        e
      )
    }

    return {
      success: true,
      data: {
        id: trackId,
        title: `${translate('platformSoundCloudTrack')} (ID: ${trackId.slice(0, 8)})`,
        artist: translate('platformSoundCloudArtist'),
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

/**
 * Downloads a SoundCloud track via yt-dlp.
 *
 * @param {{id: string, title: string, artist: string}} trackInfo
 * @param {string} outputPath
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function downloadSoundCloudTrack(trackInfo, outputPath) {
  try {
    const url = `https://soundcloud.com/${trackInfo.artist || 'artist'}/${trackInfo.id}`
    logInfo('platformImport', `🎵 Downloading SoundCloud: ${url}`)

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

/**
 * Detects which streaming platform a URL belongs to.
 *
 * @param {string} url
 * @returns {'spotify'|'soundcloud'|'youtube'|null}
 */
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

/**
 * Sanitizes a string for use as a filename.
 *
 * @param {string} title
 * @returns {string} Safe filename (max 50 chars, `[a-zA-Z0-9_]` only).
 */
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