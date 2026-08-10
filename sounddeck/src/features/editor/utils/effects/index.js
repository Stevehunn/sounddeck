// src/features/editor/utils/effects/index.js

/**
 * Applique un effet de volume
 * @param {AudioBuffer} buffer - Buffer audio
 * @param {number} gain - Gain (0 à 5, 1 = normal)
 * @returns {AudioBuffer} Buffer modifié
 */
export function applyVolumeEffect(buffer, gain) {
  const clampedGain = Math.max(0, Math.min(5, gain))
  if (clampedGain === 1) return buffer
  
  const newBuffer = buffer.context.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  )
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const inputData = buffer.getChannelData(channel)
    const outputData = newBuffer.getChannelData(channel)
    for (let i = 0; i < inputData.length; i++) {
      outputData[i] = inputData[i] * clampedGain
    }
  }
  
  return newBuffer
}

/**
 * Applique un effet de fade in/out
 * @param {AudioBuffer} buffer - Buffer audio
 * @param {number} fadeInDuration - Durée du fade in en secondes
 * @param {number} fadeOutDuration - Durée du fade out en secondes
 * @param {number} sampleRate - Taux d'échantillonnage
 * @returns {AudioBuffer} Buffer modifié
 */
export function applyFadeEffect(buffer, fadeInDuration = 0, fadeOutDuration = 0, sampleRate = 44100) {
  if (fadeInDuration <= 0 && fadeOutDuration <= 0) return buffer
  
  const newBuffer = buffer.context.createBuffer(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  )
  
  const fadeInSamples = Math.floor(fadeInDuration * sampleRate)
  const fadeOutSamples = Math.floor(fadeOutDuration * sampleRate)
  const totalSamples = buffer.length
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const inputData = buffer.getChannelData(channel)
    const outputData = newBuffer.getChannelData(channel)
    
    for (let i = 0; i < totalSamples; i++) {
      let gain = 1
      
      // Fade in
      if (i < fadeInSamples && fadeInSamples > 0) {
        gain = i / fadeInSamples
      }
      
      // Fade out
      if (i > totalSamples - fadeOutSamples && fadeOutSamples > 0) {
        const fadePos = (i - (totalSamples - fadeOutSamples)) / fadeOutSamples
        gain *= (1 - fadePos)
      }
      
      outputData[i] = inputData[i] * gain
    }
  }
  
  return newBuffer
}

/**
 * Applique un effet de réverbération (simplifié)
 * @param {AudioBuffer} buffer - Buffer audio
 * @param {number} decay - Temps de réverbération en secondes (0.1 à 5)
 * @param {number} mix - Mix (0 à 1)
 * @param {number} sampleRate - Taux d'échantillonnage
 * @returns {AudioBuffer} Buffer modifié
 */
export function applyReverbEffect(buffer, decay = 1, mix = 0.3, sampleRate = 44100) {
  if (mix <= 0) return buffer
  
  const decaySamples = Math.floor(decay * sampleRate)
  const bufferLength = buffer.length
  const reverbBuffer = buffer.context.createBuffer(
    buffer.numberOfChannels,
    bufferLength + decaySamples,
    buffer.sampleRate
  )
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const inputData = buffer.getChannelData(channel)
    const outputData = reverbBuffer.getChannelData(channel)
    
    // Copier le signal original
    for (let i = 0; i < bufferLength; i++) {
      outputData[i] = inputData[i] * (1 - mix)
    }
    
    // Ajouter la réverbération (simplifiée)
    for (let i = 0; i < bufferLength; i++) {
      for (let j = 0; j < decaySamples && i + j < bufferLength + decaySamples; j += Math.floor(decaySamples / 10)) {
        const gain = (1 - j / decaySamples) * mix * 0.5
        outputData[i + j] += inputData[i] * gain
      }
    }
  }
  
  return reverbBuffer
}

/**
 * Applique un effet d'écho (simplifié)
 * @param {AudioBuffer} buffer - Buffer audio
 * @param {number} delay - Délai en secondes (0.05 à 2)
 * @param {number} feedback - Feedback (0 à 0.9)
 * @param {number} mix - Mix (0 à 1)
 * @param {number} sampleRate - Taux d'échantillonnage
 * @returns {AudioBuffer} Buffer modifié
 */
export function applyEchoEffect(buffer, delay = 0.3, feedback = 0.5, mix = 0.4, sampleRate = 44100) {
  if (mix <= 0) return buffer
  
  const delaySamples = Math.floor(delay * sampleRate)
  const bufferLength = buffer.length
  const echoBuffer = buffer.context.createBuffer(
    buffer.numberOfChannels,
    bufferLength + delaySamples * 2,
    buffer.sampleRate
  )
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const inputData = buffer.getChannelData(channel)
    const outputData = echoBuffer.getChannelData(channel)
    
    // Copier le signal original
    for (let i = 0; i < bufferLength; i++) {
      outputData[i] = inputData[i] * (1 - mix)
    }
    
    // Ajouter l'écho
    let echoGain = mix
    for (let repeat = 0; repeat < 5 && echoGain > 0.01; repeat++) {
      const offset = delaySamples * (repeat + 1)
      for (let i = 0; i < bufferLength; i++) {
        if (i + offset < bufferLength + delaySamples * 2) {
          outputData[i + offset] += inputData[i] * echoGain
        }
      }
      echoGain *= feedback
    }
  }
  
  return echoBuffer
}

export default {
  applyVolumeEffect,
  applyFadeEffect,
  applyReverbEffect,
  applyEchoEffect
}