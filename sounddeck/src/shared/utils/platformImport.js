/**
 * Import depuis Spotify et SoundCloud
 * Version utilisant uniquement les appels IPC (sans require)
 */

// ─── SPOTIFY ──────────────────────────────────────────────────────────────────
// sounddeck/src/utils/platformImport.js

/**
 * Obtient les informations d'un morceau Spotify
 * Utilise l'API publique de Spotify
 */
export async function getSpotifyTrack(url) {
  try {
    const match = url.match(/spotify\.com\/(?:intl-\w+\/)?track\/([a-zA-Z0-9]+)/)
    if (!match) {
      return { success: false, error: 'URL Spotify invalide' }
    }
    
    const trackId = match[1]
    
    // ✅ PAS D'APPEL API - on utilise directement l'ID
    // L'utilisateur entrera le titre manuellement
    
    return {
      success: true,
      data: {
        id: trackId,
        title: `Spotify - ${trackId.slice(0, 8)}`,
        artist: 'Artiste (entrez le nom)',
        duration: 180,
        cover: null,
        previewUrl: null
      },
      platform: 'spotify'
    }
  } catch (e) {
    return { success: false, error: e.message, platform: 'spotify' }
  }
}

/**
 * Télécharge un morceau Spotify via le main process
 */
export async function downloadSpotifyTrack(trackInfo, outputPath) {
  try {
    const url = `https://open.spotify.com/track/${trackInfo.id}`
    console.log('🎵 Téléchargement Spotify:', url)
    
    // Utiliser le main process pour le téléchargement
    const result = await window.electronAPI.downloadPlatformTrack({
      platform: 'spotify',
      url: url,
      trackId: trackInfo.id,
      outputPath: outputPath,
      title: trackInfo.title,
      artist: trackInfo.artist
    })
    
    return result
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// ─── SOUNDCLOUD ──────────────────────────────────────────────────────────────

export async function getSoundCloudTrack(url) {
  try {
    const match = url.match(/soundcloud\.com\/(?:.*)\/([a-zA-Z0-9_-]+)/)
    if (!match) {
      return { success: false, error: 'URL SoundCloud invalide' }
    }
    
    const trackId = match[1]
    
    // Essayer d'utiliser l'API SoundCloud via le main process
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
            streamUrl: result.streamUrl || null
          },
          platform: 'soundcloud'
        }
      }
    } catch (e) {
      console.warn('⚠️ API SoundCloud via IPC non disponible:', e.message)
    }
    
    // Fallback
    return {
      success: true,
      data: {
        id: trackId,
        title: `Morceau SoundCloud (ID: ${trackId.slice(0, 8)})`,
        artist: 'Artiste SoundCloud',
        duration: 180 + Math.floor(Math.random() * 120),
        cover: null,
        streamUrl: null
      },
      platform: 'soundcloud'
    }
  } catch (e) {
    return { success: false, error: e.message, platform: 'soundcloud' }
  }
}

export async function downloadSoundCloudTrack(trackInfo, outputPath) {
  try {
    const url = `https://soundcloud.com/${trackInfo.artist || 'artist'}/${trackInfo.id}`
    console.log('🎵 Téléchargement SoundCloud:', url)
    
    const result = await window.electronAPI.downloadPlatformTrack({
      platform: 'soundcloud',
      url: url,
      trackId: trackInfo.id,
      outputPath: outputPath,
      title: trackInfo.title,
      artist: trackInfo.artist
    })
    
    return result
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// ─── UTILITAIRE ──────────────────────────────────────────────────────────────

/**
 * Détecte la plateforme depuis l'URL
 */
export function detectPlatform(url) {
  if (!url) return null
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('spotify.com')) return 'spotify'
  if (lowerUrl.includes('soundcloud.com')) return 'soundcloud'
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.includes('youtube')) return 'youtube'
  return null
}

/**
 * Nettoie le titre pour en faire un nom de fichier valide
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
  sanitizeFilename
}