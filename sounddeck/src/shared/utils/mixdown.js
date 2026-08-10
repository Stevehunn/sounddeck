/**
 * Mixdown réel - Fusionne tous les clips en un seul fichier audio
 */

/**
 * Mixe tous les clips d'un projet en un seul buffer audio
 * @param {Object} project - Le projet avec ses pistes et clips
 * @param {Object} clipDurations - Durées des clips
 * @param {number} sampleRate - Taux d'échantillonnage (44100 par défaut)
 * @param {Function} onProgress - Callback de progression
 * @param {number} exportStart - Début de l'export (secondes)
 * @param {number|null} exportEnd - Fin de l'export (secondes, null = tout)
 * @returns {Promise<AudioBuffer>} Le buffer audio mixé
 */
export async function mixdownProject(project, clipDurations, sampleRate = 44100, onProgress, exportStart = 0, exportEnd = null) {
  if (!project || !project.tracks || project.tracks.length === 0) {
    throw new Error('Projet vide')
  }

  // 1. Calculer la durée totale et filtrer les clips
  let totalDuration = 0
  const clipsWithInfo = []

  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const duration = clipDurations[clip.id] || clip.duration || 3
      const end = clip.start + duration
      
      // Filtrer les clips qui sont dans la zone d'export
      if (exportEnd !== null) {
        if (clip.start > exportEnd || end < exportStart) {
          continue
        }
      }
      
      const endTime = exportEnd !== null ? Math.min(end, exportEnd) : end
      if (endTime > totalDuration) totalDuration = endTime
      
      clipsWithInfo.push({
        ...clip,
        trackId: track.id,
        duration: duration,
        end: end,
        trackVolume: track.volume || 1,
        trackMuted: track.muted || false,
        trackSolo: track.solo || false
      })
    }
  }

  // Ajuster la durée totale
  if (exportEnd !== null && exportEnd > totalDuration) {
    totalDuration = exportEnd
  } else {
    totalDuration += 0.1
  }

  if (clipsWithInfo.length === 0) {
    throw new Error('Aucun clip à mixer dans la sélection')
  }

  const offlineContext = new OfflineAudioContext(
    2,
    Math.ceil(totalDuration * sampleRate),
    sampleRate
  )

  const hasSolo = clipsWithInfo.some(c => c.trackSolo)
  const soloTrackIds = hasSolo 
    ? clipsWithInfo.filter(c => c.trackSolo).map(c => c.trackId)
    : []

  const trackGains = {}
  for (const clip of clipsWithInfo) {
    if (!trackGains[clip.trackId]) {
      trackGains[clip.trackId] = {
        volume: clip.trackVolume || 1,
        muted: clip.trackMuted || false,
        solo: clip.trackSolo || false
      }
    }
  }

  let processed = 0
  const totalClips = clipsWithInfo.length

  let applyEffectsToBufferFn = null
  try {
    const effectsModule = await import('./realTimeEffects')
    applyEffectsToBufferFn = effectsModule.applyEffectsToBuffer
  } catch (e) {
    console.warn('⚠️ realTimeEffects non disponible, les effets ne seront pas appliqués')
  }

  const mixPromises = clipsWithInfo.map(async (clipInfo) => {
    if (hasSolo && !soloTrackIds.includes(clipInfo.trackId)) {
      processed++
      if (onProgress) onProgress(processed / totalClips)
      return null
    }

    if (trackGains[clipInfo.trackId]?.muted) {
      processed++
      if (onProgress) onProgress(processed / totalClips)
      return null
    }

    try {
      const fileUrl = clipInfo.path.startsWith('file://') 
        ? clipInfo.path 
        : 'file:///' + clipInfo.path.replace(/\\/g, '/')
      
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await offlineContext.decodeAudioData(arrayBuffer)

      let processedBuffer = audioBuffer
      if (clipInfo.effects && clipInfo.effects.length > 0 && applyEffectsToBufferFn) {
        try {
          processedBuffer = applyEffectsToBufferFn(audioBuffer, clipInfo.effects, sampleRate, true)
        } catch (e) {
          console.warn(`Erreur application effets sur "${clipInfo.name}":`, e)
        }
      }

      const source = offlineContext.createBufferSource()
      source.buffer = processedBuffer

      const clipGain = offlineContext.createGain()
      
      const clipVolumeDb = clipInfo.volumeDb || clipInfo.volume || 0
      const clipVolumeLinear = Math.pow(10, clipVolumeDb / 20)
      const trackVolume = trackGains[clipInfo.trackId]?.volume || 1
      const masterVolume = 0.9
      const finalVolume = Math.min(1, clipVolumeLinear * trackVolume * masterVolume)
      clipGain.gain.value = finalVolume

      source.connect(clipGain)
      clipGain.connect(offlineContext.destination)

      // Ajuster le début si on a un offset d'export
      const startTime = Math.max(0, clipInfo.start - exportStart)
      const duration = clipInfo.duration || 3
      const offset = clipInfo.offset || 0
      
      // Si le clip commence avant exportStart, ajuster l'offset
      let adjustedOffset = offset
      let adjustedDuration = duration
      if (clipInfo.start < exportStart) {
        adjustedOffset = offset + (exportStart - clipInfo.start)
        adjustedDuration = duration - (exportStart - clipInfo.start)
      }
      
      // Si le clip dépasse exportEnd, ajuster la durée
      if (exportEnd !== null && clipInfo.start + duration > exportEnd) {
        adjustedDuration = exportEnd - Math.max(clipInfo.start, exportStart)
      }
      
      if (adjustedDuration > 0) {
        source.start(startTime, adjustedOffset, adjustedDuration)
      }

      processed++
      if (onProgress) onProgress(processed / totalClips)

      return source

    } catch (e) {
      console.warn(`⚠️ Erreur lors du mixage du clip "${clipInfo.name}":`, e.message)
      processed++
      if (onProgress) onProgress(processed / totalClips)
      return null
    }
  })

  await Promise.allSettled(mixPromises)

  let renderedBuffer
  try {
    renderedBuffer = await offlineContext.startRendering()
  } catch (e) {
    console.error('Erreur lors du rendu:', e)
    throw new Error('Erreur lors du rendu audio')
  }

  return renderedBuffer
}

/**
 * Exporte le mixdown vers un fichier audio
 * @param {AudioBuffer} buffer - Le buffer audio mixé
 * @param {string} format - 'mp3', 'wav', 'ogg'
 * @param {number} bitrate - Qualité (kbps)
 * @param {string} outputPath - Chemin de sortie
 * @param {Function} onProgress - Callback de progression
 * @returns {Promise<Object>} Résultat de l'export
 */
export async function exportMixdown(buffer, format = 'mp3', bitrate = 192, outputPath, onProgress) {
  try {
    if (!outputPath) {
      console.error('❌ [mixdown] outputPath est undefined !')
      return { success: false, error: 'outputPath manquant' }
    }
    console.log(`📄 [mixdown] exportMixdown appelé avec outputPath: ${outputPath}`)

    if (onProgress) onProgress(0.1)
    
    const wavData = audioBufferToWav(buffer)
    if (onProgress) onProgress(0.2)
    
    if (format === 'wav') {
      const result = await saveAudioFileViaElectron(wavData, outputPath)
      if (onProgress) onProgress(1)
      return result
    }

    try {
      const tempPath = outputPath + '.temp.wav'
      const saveResult = await saveAudioFileViaElectron(wavData, tempPath)
      
      if (!saveResult.success) {
        const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
        const result = await saveAudioFileViaElectron(wavData, fallbackPath)
        if (onProgress) onProgress(1)
        return { 
          success: true, 
          path: fallbackPath, 
          format: 'wav',
          warning: 'Conversion impossible, export en WAV' 
        }
      }

      if (onProgress) onProgress(0.4)

      const result = await window.electronAPI.convertAudio?.(tempPath, outputPath, format, bitrate)
      
      if (onProgress) onProgress(0.9)

      try {
        await window.electronAPI.deleteSoundFile?.(tempPath)
      } catch (e) {}

      if (result?.success) {
        if (onProgress) onProgress(1)
        return { 
          success: true, 
          path: outputPath, 
          format: format,
          size: result.size || 0
        }
      }

      const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
      const fallbackResult = await saveAudioFileViaElectron(wavData, fallbackPath)
      if (onProgress) onProgress(1)
      return { 
        success: true, 
        path: fallbackPath, 
        format: 'wav',
        warning: 'Conversion impossible, export en WAV' 
      }

    } catch (e) {
      console.warn('⚠️ Erreur conversion:', e.message)
      
      const fallbackPath = outputPath.replace(/\.(mp3|ogg)$/, '.wav')
      const result = await saveAudioFileViaElectron(wavData, fallbackPath)
      if (onProgress) onProgress(1)
      return { 
        success: true, 
        path: fallbackPath, 
        format: 'wav',
        warning: 'Erreur conversion, export en WAV' 
      }
    }

  } catch (e) {
    console.error('❌ Erreur export:', e)
    return { 
      success: false, 
      error: e.message 
    }
  }
}

/**
 * Sauvegarde un fichier audio via l'API Electron avec fallback
 */
async function saveAudioFileViaElectron(data, outputPath) {
  console.log(`💾 [mixdown] saveAudioFileViaElectron: ${outputPath}`)
  
  // ✅ Méthode 1: writeSoundFile
  try {
    const uint8Array = new Uint8Array(data)
    const result = await window.electronAPI.writeSoundFile?.(outputPath, Array.from(uint8Array))
    if (result?.success) {
      console.log('✅ [mixdown] writeSoundFile réussi:', outputPath)
      return { success: true, path: outputPath }
    }
  } catch (e) {
    console.warn('⚠️ [mixdown] writeSoundFile exception:', e)
  }
  
  // ✅ Méthode 2: saveFileDialog
  try {
    const fileName = outputPath.split('/').pop() || outputPath.split('\\').pop() || 'exported.wav'
    const result = await window.electronAPI.saveFileDialog?.(fileName, data)
    if (result?.success && result?.path) {
      console.log('✅ [mixdown] saveFileDialog réussi:', result.path)
      return { success: true, path: result.path }
    }
  } catch (e) {
    console.warn('⚠️ [mixdown] saveFileDialog exception:', e)
  }
  
  // ✅ Méthode 3: exportAudioFile
  try {
    const fileName = outputPath.split('/').pop() || outputPath.split('\\').pop() || 'exported.wav'
    const result = await window.electronAPI.exportAudioFile?.({
      data: Array.from(new Uint8Array(data)),
      fileName: fileName,
      format: 'wav'
    })
    if (result?.success && result?.path) {
      console.log('✅ [mixdown] exportAudioFile réussi:', result.path)
      return { success: true, path: result.path }
    }
  } catch (e) {
    console.warn('⚠️ [mixdown] exportAudioFile exception:', e)
  }
  
  // ✅ Dernier fallback: téléchargement navigateur
  try {
    console.log('📥 [mixdown] Dernier fallback: téléchargement navigateur')
    const blob = new Blob([data], { type: 'audio/wav' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = outputPath.split('/').pop() || outputPath.split('\\').pop() || 'exported.wav'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    console.log('✅ [mixdown] Téléchargement navigateur réussi')
    return { success: true, path: 'download://' + a.download, downloaded: true }
  } catch (e) {
    console.error('❌ [mixdown] Échec de tous les fallbacks:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Convertit un AudioBuffer en WAV (ArrayBuffer)
 */
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample
  
  const samples = buffer.length
  const dataSize = samples * numChannels * bytesPerSample
  const headerSize = 44
  const totalSize = headerSize + dataSize
  
  const wav = new ArrayBuffer(totalSize)
  const view = new DataView(wav)
  
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')
  
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  
  const offset = 44
  const dataView = new DataView(wav, offset)
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    let idx = channel * bytesPerSample
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      dataView.setInt16(idx + i * blockAlign, int16, true)
    }
  }
  
  return wav
}



function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

export default {
  mixdownProject,
  exportMixdown,
  audioBufferToWav
}