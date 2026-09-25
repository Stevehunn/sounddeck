// src/shared/utils/waveformGenerator.js
import { withTemporaryAudioContext } from './audioContext.js'
import { buildFileUrl } from './fileUrl.js'
import { logError, logWarn } from './logger'

const waveformCache = new Map()

export async function generateWaveformData(
  filePath,
  samples = 200,
  startOffset = 0,
  sliceDuration = null,
  useCache = true
) {
  try {
    const cacheKey = `${filePath}_${samples}_${startOffset}_${sliceDuration || 'full'}`
    if (useCache && waveformCache.has(cacheKey)) {
      return waveformCache.get(cacheKey)
    }

    try {
      const exists = await window.electronAPI.fileExists(filePath)
      if (!exists) {
        logError('waveformGenerator', `Fichier non trouvé: ${filePath}`)
        return null
      }
    } catch (e) {
      logWarn('waveformGenerator', 'Erreur vérification existence', e)
    }

    const fileUrl = buildFileUrl(filePath)

    const result = await withTemporaryAudioContext(fileUrl, (audioBuffer) => {
      const fullData = audioBuffer.getChannelData(0)
      const startSample = Math.max(
        0,
        Math.min(
          fullData.length,
          Math.floor(startOffset * audioBuffer.sampleRate)
        )
      )
      const endSample =
        sliceDuration != null
          ? Math.max(
              startSample,
              Math.min(
                fullData.length,
                startSample + Math.floor(sliceDuration * audioBuffer.sampleRate)
              )
            )
          : fullData.length

      const rawData = fullData.subarray(startSample, endSample)

      const blockSize = Math.max(1, Math.floor(rawData.length / samples))
      const data = []

      for (let i = 0; i < samples; i++) {
        let sum = 0
        const start = i * blockSize
        const end = Math.min(start + blockSize, rawData.length)
        for (let j = start; j < end; j++) {
          sum += Math.abs(rawData[j])
        }
        data.push(end > start ? sum / (end - start) : 0)
      }

      const max = Math.max(...data)
      return max > 0 ? data.map((v) => v / max) : data
    })

    if (!result) return null

    if (useCache) {
      waveformCache.set(cacheKey, result)
    }

    return result
  } catch (e) {
    logError('waveformGenerator', 'Generation error', e)
    return null
  }
}

export function invalidateWaveformCache(filePath) {
  if (filePath) {
    const keys = Array.from(waveformCache.keys()).filter((k) =>
      k.startsWith(filePath)
    )
    keys.forEach((k) => waveformCache.delete(k))
  } else {
    waveformCache.clear()
  }
}

export default {
  generateWaveformData,
  invalidateWaveformCache,
}