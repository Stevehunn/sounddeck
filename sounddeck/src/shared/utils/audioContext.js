// src/shared/utils/audioContext.js
import { buildFileUrl } from './fileUrl.js'
import { logError } from './logger'

let sharedContext = null

export function getSharedAudioContext() {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return sharedContext
}

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
      } catch (e) {}
    }
  }
}

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