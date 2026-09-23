// src/shared/utils/audioContext.js
import { buildFileUrl } from './fileUrl.js'

let sharedContext = null

/**
 * Retourne un AudioContext partagé (singleton).
 * Le contexte reste vivant entre les appels — pas de close() automatique.
 */
export function getSharedAudioContext() {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return sharedContext
}

/**
 * Charge un AudioBuffer depuis une URL de fichier.
 *
 * @param {string} filePath - Chemin disque OU URL file:// déjà construite
 * @returns {Promise<AudioBuffer|null>}
 */
export async function loadAudioBuffer(filePath) {
  try {
    const fileUrl = filePath.startsWith('file://') || filePath.startsWith('http')
      ? filePath
      : buildFileUrl(filePath)

    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const arrayBuffer = await response.arrayBuffer()
    const ctx = getSharedAudioContext()

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    return await ctx.decodeAudioData(arrayBuffer)
  } catch (e) {
    console.error('[audioContext] loadAudioBuffer error:', e)
    return null
  }
}

/**
 * Wrapper qui garantit la fermeture d'un AudioContext temporaire
 * (utile quand on ne veut PAS partager le contexte partagé).
 *
 * @param {string} fileUrl
 * @param {(buffer: AudioBuffer, ctx: AudioContext) => any} callback
 */
export async function withTemporaryAudioContext(fileUrl, callback) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = await ctx.decodeAudioData(arrayBuffer)
    return await callback(buffer, ctx)
  } finally {
    if (ctx.state !== 'closed') {
      try { await ctx.close() } catch (e) {}
    }
  }
}

/**
 * Récupère la durée en secondes d'un fichier audio.
 * Retourne 3s par défaut en cas d'erreur (compat avec le code existant).
 *
 * @param {string} filePath
 * @param {number} fallback - Valeur de repli (par défaut 3)
 * @returns {Promise<number>}
 */
export async function getAudioFileDuration(filePath, fallback = 3) {
  const buffer = await loadAudioBuffer(filePath)
  return buffer ? buffer.duration : fallback
}

export default {
  getSharedAudioContext,
  loadAudioBuffer,
  withTemporaryAudioContext,
  getAudioFileDuration,
}