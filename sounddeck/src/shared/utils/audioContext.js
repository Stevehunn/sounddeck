/**
 * @file Audio decoding helpers built on the Web Audio API.
 *
 * Exposes:
 * - **`getSharedAudioContext()`** — a singleton `AudioContext` reused
 *   across the app (avoids the "too many AudioContexts" warning).
 * - **`loadAudioBuffer(filePath)`** — fetches a file and decodes it into an
 *   `AudioBuffer` using the shared context.
 * - **`withTemporaryAudioContext(fileUrl, callback)`** — creates a
 *   short-lived context, decodes, runs `callback(buffer, ctx)`, then
 *   **always** closes the context in a `finally`.
 * - **`getAudioFileDuration(filePath)`** — convenience wrapper returning
 *   the buffer's duration (or a fallback).
 *
 * Used by waveform generators, normalizers, the trimmer, and the mixdown
 * pipeline. Everything here is renderer-side (no Node access).
 *
 * @see ./waveformGenerator.js
 * @see ./normalizeUtils.js
 * @see ./mixdown.js
 */

import { buildFileUrl } from './fileUrl.js'
import { logError } from './logger'

let sharedContext = null

/**
 * Returns the process-wide `AudioContext`, creating it on first use.
 *
 * Recreates the context if it was previously closed (e.g. after a browser
 * suspend). The context may be `suspended` — callers should call
 * `ctx.resume()` before playback if needed.
 *
 * @returns {AudioContext}
 */
export function getSharedAudioContext() {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return sharedContext
}

/**
 * Fetches and decodes an audio file into an `AudioBuffer`.
 *
 * @param {string} filePath - Absolute path or `http(s)://` URL.
 * @returns {Promise<AudioBuffer|null>} The decoded buffer, or `null` on error.
 */
export async function loadAudioBuffer(filePath) {
  try {
    const fileUrl =
      filePath.startsWith('file://') || filePath.startsWith('http')
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
    logError('audioContext', 'loadAudioBuffer error', e)
    return null
  }
}

/**
 * Runs `callback` with a freshly-decoded `AudioBuffer` from a **dedicated**
 * `AudioContext`, then always closes that context.
 *
 * Use this for one-shot decoding operations (waveform, normalization) where
 * the shared context's state must not be disturbed. The context is closed
 * in a `finally` even if `callback` throws.
 *
 * @param {string} fileUrl - A URL the `fetch` API can load (http(s), file, blob, etc.).
 * @param {(buffer: AudioBuffer, ctx: AudioContext) => Promise<any>|any} callback
 * @returns {Promise<any>} The value returned by `callback`.
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
      try {
        await ctx.close()
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Returns the duration of an audio file, in seconds.
 *
 * @param {string} filePath
 * @param {number} [fallback=3] - Returned if decoding fails.
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